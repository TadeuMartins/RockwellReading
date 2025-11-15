#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
rockwell_to_comos.py

Converte um arquivo L5K Rockwell + CSV base no formato COMOS para um CSV
enriquecido com:
- Valor real dos limites HHLimit / HLimit / LLimit / LLLimit em "Value"
- Habilitação dos alarmes (HHEnabled / HEnabled / LEnabled / LLEnabled) em "Signal"
- Equipamento interbloqueado em "Text 0", baseado na lógica Ladder.

Uso como API:
    python rockwell_to_comos.py
    
Uso como CLI (legado):
    python rockwell_to_comos.py CLP01_ETM.L5K CLP01_ETM.csv CLP01_ETM_enriquecido.csv
"""

import re
import math
import argparse
import collections
import sys
import io
from typing import Dict, List, Tuple, Set

import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS


# ----------------------------
# Parsing das definições de AOI
# ----------------------------

def parse_aoi_definitions(l5k_text: str,
                          aoi_names: List[str]) -> Dict[str, dict]:
    """
    Localiza ADD_ON_INSTRUCTION_DEFINITION de cada AOI e:
    - lista parâmetros em ordem
    - monta mapa de empacotamento de BOOLs em DINTs (slot, bit)
    """
    aoi_defs = {}

    for name in aoi_names:
        m = re.search(
            rf"ADD_ON_INSTRUCTION_DEFINITION\s+{name}\b(.*?END_ADD_ON_INSTRUCTION_DEFINITION)",
            l5k_text,
            re.DOTALL
        )
        if not m:
            continue

        block = m.group(1)

        # PARAMETERS
        pm = re.search(r"PARAMETERS(.*?)END_PARAMETERS", block, re.DOTALL)
        params = []
        if pm:
            ptext = pm.group(1)
            # Linha típica: Nome : TIPO (
            for pname, ptype in re.findall(
                    r"([A-Za-z0-9_]+)\s*:\s*([A-Z0-9_]+)\s*\(",
                    ptext
            ):
                params.append({"name": pname, "type": ptype})

        # LOCAL_TAGS – só precisamos dos BOOLs para a ordem de empacotamento
        lm = re.search(r"LOCAL_TAGS(.*?)END_LOCAL_TAGS", block, re.DOTALL)
        local_bools = []
        if lm:
            ltext = lm.group(1)
            for lname, ltype in re.findall(
                    r"([A-Za-z0-9_]+)\s*:\s*([A-Z0-9_]+)\s*\(",
                    ltext
            ):
                if ltype == "BOOL":
                    local_bools.append({"name": lname, "type": ltype, "local": True})

        # Ordem de empacotamento: primeiro BOOLs de PARAMETERS, depois BOOLs de LOCAL_TAGS
        bool_names: List[str] = []
        for p in params:
            if p["type"] == "BOOL":
                bool_names.append(p["name"])
        for lb in local_bools:
            bool_names.append(lb["name"])

        bool_map: Dict[str, Tuple[int, int]] = {}
        for idx, pname in enumerate(bool_names):
            slot = idx // 32
            bit = idx % 32
            bool_map[pname] = (slot, bit)

        aoi_defs[name] = {
            "params": params,
            "bool_map": bool_map
        }

    return aoi_defs


# ----------------------------
# Parsing das instâncias de AOI
# ----------------------------

def tokenize_vector(raw: str) -> List[str]:
    """
    Quebra o vetor da instância em elementos de alto nível.
    Mantém arrays [ ... ] como um único item.
    """
    raw = raw.replace("\n", " ").replace("\t", " ")
    tokens: List[str] = []
    buf = ""

    # quebra em tokens básicos: [, ], ,
    for ch in raw:
        if ch in "[],":
            if buf.strip():
                tokens.append(buf.strip())
            buf = ""
            if ch in "[]":
                tokens.append(ch)
            elif ch == ",":
                tokens.append(",")
        else:
            buf += ch

    if buf.strip():
        tokens.append(buf.strip())

    # reconstrói valores top-level, mantendo arrays como um item
    values: List[str] = []
    depth = 0
    current = ""

    for tok in tokens:
        if tok == "[":
            depth += 1
            current += tok
        elif tok == "]":
            depth -= 1
            current += tok
        elif tok == "," and depth == 0:
            if current != "":
                values.append(current)
                current = ""
        else:
            if current:
                current += " " + tok
            else:
                current = tok

    if current:
        values.append(current)

    return values


def parse_aoi_instances(l5k_text: str,
                        aoi_names: List[str]) -> Dict[str, dict]:
    """
    Encontra todas as instâncias das AOIs desejadas e lê o vetor de valores.

    Formato típico:
        NomeInst : IHMALMA (Description := "...") := [val1,val2,...];
    """
    instances: Dict[str, dict] = {}
    pattern = re.compile(
        rf"([A-Za-z0-9_]+)\s*:\s*({'|'.join(aoi_names)})\b(?:[^\[]*)\[((?:[^\]]|\](?!;))+)\];",
        re.DOTALL
    )

    for m in pattern.finditer(l5k_text):
        inst_name, aoi_type, vec = m.group(1), m.group(2), m.group(3)
        values = tokenize_vector(vec)
        instances[inst_name] = {
            "type": aoi_type,
            "values": values,
            "span": m.span()
        }

    return instances


# ----------------------------
# Tags globais (equipamentos reais)
# ----------------------------

def parse_global_tags(l5k_text: str) -> Set[str]:
    """
    Pega todos os nomes de TAG definidos entre TAG ... END_TAG
    (programas, UDTs, etc). Isso inclui motores, válvulas, etc.
    """
    tags: Set[str] = set()

    for tm in re.finditer(r"\bTAG\b(.*?END_TAG)", l5k_text, re.DOTALL):
        tblock = tm.group(1)
        # Captura "Nome :" no início das linhas
        for name in re.findall(r"\n\s*([A-Za-z0-9_]+)\s*:", tblock):
            tags.add(name)

    return tags


# ----------------------------
# Interbloqueios (Ladder)
# ----------------------------

def parse_interlocks(l5k_text: str,
                     aoi_instances: Dict[str, dict],
                     global_tags: Set[str]) -> Dict[Tuple[str, str], Set[str]]:
    """
    Procura rungs do tipo:

        N: [XIC(TE1611001_ALM.HHInAlarm) ,XIO(...)]OTU(E1611AG01M1.Def.7);

    e monta um mapa:
        (instância, membro) -> { tags_de_saida }

    Considera saída como "equipamento" quando o nome base (antes do '.')
    está na lista de TAGs globais.
    """
    interlocks: Dict[Tuple[str, str], Set[str]] = collections.defaultdict(set)

    rung_pattern = re.compile(
        r"N:\s*\[(.*?)\](OTE|OTU|OTL)\(([A-Za-z0-9_\.]+)\);",
        re.DOTALL
    )

    for m in rung_pattern.finditer(l5k_text):
        conds_str, out_type, out_tag = m.group(1), m.group(2), m.group(3)

        base = out_tag.split('.')[0]
        if base not in global_tags:
            # Saída não é tag global → ignora como interbloqueio
            continue

        # Encontra XIC/XIO dentro das condições
        for cm in re.finditer(r"XI[CO]\(([A-Za-z0-9_\.]+)\)", conds_str):
            ref = cm.group(1)
            if '.' not in ref:
                continue
            inst_name, member = ref.split('.', 1)

            if inst_name not in aoi_instances:
                continue

            if member not in {"HHInAlarm", "HInAlarm", "LInAlarm", "LLInAlarm"}:
                continue

            interlocks[(inst_name, member)].add(out_tag)

    return interlocks


# ----------------------------
# Helpers de limites e BOOLs
# ----------------------------

def get_limits_for_instance(inst_name: str,
                            instances: Dict[str, dict]) -> Dict[str, float]:
    """
    Assume, de acordo com o manual:
        valores[0] = DINT com BOOLs empacotados
        valores[1] = HHLimit
        valores[2] = HLimit
        valores[3] = LLimit
        valores[4] = LLLimit
    """
    vals = instances[inst_name]["values"]

    def to_float(s: str):
        try:
            return float(s)
        except Exception:
            return math.nan

    return {
        "HHLimit": to_float(vals[1]) if len(vals) > 1 else math.nan,
        "HLimit":  to_float(vals[2]) if len(vals) > 2 else math.nan,
        "LLimit":  to_float(vals[3]) if len(vals) > 3 else math.nan,
        "LLLimit": to_float(vals[4]) if len(vals) > 4 else math.nan,
    }


def decode_enables_for_instance(inst_name: str,
                                instances: Dict[str, dict],
                                aoi_defs: Dict[str, dict]) -> Dict[str, int]:
    """
    Decodifica HHEnabled / HEnabled / LEnabled / LLEnabled
    a partir do(s) DINT(s) escondidos.

    Regra Rockwell:
    - Todos BOOLs (parâmetros + local tags) são empacotados em DINTs
      ocultos, 32 bits cada, na ordem da lista PARAMETERS (+ LOCAL_TAGS). :contentReference[oaicite:1]{index=1}
    """
    inst = instances[inst_name]
    aoi_def = aoi_defs[inst["type"]]
    values = inst["values"]
    bool_map: Dict[str, Tuple[int, int]] = aoi_def["bool_map"]

    enables: Dict[str, int] = {}
    for pname in ["HHEnabled", "HEnabled", "LEnabled", "LLEnabled"]:
        if pname not in bool_map:
            continue

        slot, bit = bool_map[pname]

        if slot >= len(values):
            enables[pname] = 0
            continue

        try:
            dint_val = int(float(values[slot]))
        except Exception:
            enables[pname] = 0
            continue

        enables[pname] = (dint_val >> bit) & 1

    return enables


# ----------------------------
# Enriquecendo o CSV
# ----------------------------

def process_data(l5k_text: str, df: pd.DataFrame) -> pd.DataFrame:
    """
    Processa o dataframe com base no conteúdo L5K.
    Retorna o dataframe enriquecido.
    """
    # AOIs de alarme que queremos tratar
    alarm_aoi_types = ["IHMALMA", "IHMALMA_2780"]

    aoi_defs = parse_aoi_definitions(l5k_text, alarm_aoi_types)
    instances = parse_aoi_instances(l5k_text, alarm_aoi_types)
    global_tags = parse_global_tags(l5k_text)
    interlocks = parse_interlocks(l5k_text, instances, global_tags)

    # Mapas I/O name -> parâmetro de limite e enabled
    alarm_to_limit = {
        "HHInAlarm": "HHLimit",
        "HInAlarm": "HLimit",
        "LInAlarm": "LLimit",
        "LLInAlarm": "LLLimit",
    }
    alarm_to_enable = {
        "HHInAlarm": "HHEnabled",
        "HInAlarm": "HEnabled",
        "LInAlarm": "LEnabled",
        "LLInAlarm": "LLEnabled",
    }

    df_out = df.copy()
    
    # Remove espaços extras dos nomes das colunas
    df_out.columns = df_out.columns.str.strip()
    
    # Ensure "Text 0" column has object dtype to avoid FutureWarning when assigning strings
    if "Text 0" in df_out.columns:
        df_out["Text 0"] = df_out["Text 0"].astype(object)

    for idx, row in df_out.iterrows():
        block_type = str(row.get("Block type", ""))

        # Verificação flexível: verifica se contém IHMALMA ou IHMALMA_2780
        if not any(aoi in block_type for aoi in alarm_aoi_types):
            continue

        io_name = str(row.get("I/O name", ""))

        if io_name not in alarm_to_limit:
            # Deixa outras linhas do bloco (Status, In, etc.) como estão
            continue

        inst_name = str(row.get("Block", ""))

        if inst_name not in instances:
            # Instância não encontrada no L5K
            continue

        # --- 1) VALUE = limite numérico correspondente ---
        limits = get_limits_for_instance(inst_name, instances)
        limit_param = alarm_to_limit[io_name]
        value = limits.get(limit_param, math.nan)
        df_out.at[idx, "Value"] = value

        # --- 2) SIGNAL = 0/1 conforme BOOL "Enabled" ---
        enables = decode_enables_for_instance(inst_name, instances, aoi_defs)
        enable_param = alarm_to_enable[io_name]
        signal = enables.get(enable_param, 0)
        df_out.at[idx, "Signal"] = signal

        # --- 3) TEXT 0 = equipamento interbloqueado ---
        tags = sorted(interlocks.get((inst_name, io_name), []))
        if tags:
            df_out.at[idx, "Text 0"] = " / ".join(tags)

    return df_out


def enrich_csv(l5k_path: str,
               csv_in_path: str,
               csv_out_path: str) -> None:
    """
    Função legada para uso via CLI.
    Carrega arquivos, processa e salva o resultado.
    """
    # Carrega arquivos
    with open(l5k_path, encoding="latin-1") as f:
        l5k_text = f.read()

    df = pd.read_csv(csv_in_path, sep=';', encoding='latin-1')
    
    df_out = process_data(l5k_text, df)

    # Salva no mesmo formato separador ';'
    df_out.to_csv(csv_out_path, sep=';', index=False, encoding='latin-1')


# ----------------------------
# Flask API
# ----------------------------

app = Flask(__name__)
CORS(app)


@app.route('/api/health', methods=['GET'])
def health():
    """Endpoint de verificação de saúde da API"""
    return jsonify({"status": "ok", "message": "Rockwell to COMOS API está rodando"})


@app.route('/api/process', methods=['POST'])
def process():
    """
    Endpoint para processar arquivos L5K e CSV.
    Espera dois arquivos: 'l5k_file' e 'csv_file'
    Retorna o CSV processado como JSON
    """
    try:
        # Verifica se ambos os arquivos foram enviados
        if 'l5k_file' not in request.files or 'csv_file' not in request.files:
            print("❌ Erro: Arquivos não fornecidos")
            return jsonify({
                "error": "Ambos os arquivos (l5k_file e csv_file) são necessários"
            }), 400

        l5k_file = request.files['l5k_file']
        csv_file = request.files['csv_file']
        
        print(f"📁 Processando: {l5k_file.filename} + {csv_file.filename}")

        # Lê o conteúdo do arquivo L5K
        l5k_text = l5k_file.read().decode('latin-1')
        print(f"  L5K: {len(l5k_text)} caracteres lidos")

        # Lê o CSV com tentativa de múltiplos separadores
        csv_content = csv_file.read().decode('latin-1')
        df = None
        separators = [';', ',', '\t']
        
        for sep in separators:
            try:
                df = pd.read_csv(io.StringIO(csv_content), sep=sep)
                # Verifica se conseguiu ler colunas válidas
                if len(df.columns) > 1:
                    print(f"  CSV: Separador '{sep}' detectado, {len(df)} linhas, {len(df.columns)} colunas")
                    break
            except Exception as e:
                continue
        
        if df is None or len(df.columns) <= 1:
            raise ValueError("Não foi possível detectar o formato do CSV. Tente usar separadores ; , ou tab")

        # Processa os dados
        df_out = process_data(l5k_text, df)
        print(f"  Processado: {len(df_out)} linhas de saída")

        # Converte para formato JSON amigável
        # Substitui NaN por None para JSON (converte para object type primeiro para garantir compatibilidade)
        df_json = df_out.astype(object).where(pd.notnull(df_out), None)
        
        result = {
            "success": True,
            "data": df_json.to_dict(orient='records'),
            "total_rows": len(df_out)
        }
        
        print(f"✓ Sucesso: {result['total_rows']} registros retornados")

        return jsonify(result)

    except Exception as e:
        print(f"❌ Erro no processamento: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ----------------------------
# CLI
# ----------------------------

def main():
    # Se não há argumentos, inicia o servidor Flask
    if len(sys.argv) == 1:
        print("=" * 60)
        print("Rockwell to COMOS - Servidor API")
        print("=" * 60)
        print("\nServidor iniciando em http://localhost:5000")
        print("\nEndpoints disponíveis:")
        print("  GET  /api/health  - Verificação de saúde")
        print("  POST /api/process - Processar arquivos L5K e CSV")
        print("\nPara usar via linha de comando:")
        print("  python rockwell_to_comos.py <arquivo.L5K> <arquivo.csv> <saida.csv>")
        print("\nPressione CTRL+C para parar o servidor")
        print("=" * 60)
        app.run(host='0.0.0.0', port=5000, debug=True)
        return

    # Modo CLI legado
    parser = argparse.ArgumentParser(
        description="Enriquece CSV COMOS com limites, enables e interbloqueios a partir de um L5K Rockwell."
    )
    parser.add_argument("l5k", help="Arquivo L5K de entrada (ex.: CLP01_ETM.L5K)")
    parser.add_argument("csv_in", help="CSV base no formato COMOS (ex.: CLP01_ETM.csv)")
    parser.add_argument("csv_out", help="CSV de saída enriquecido")

    args = parser.parse_args()

    enrich_csv(args.l5k, args.csv_in, args.csv_out)


if __name__ == "__main__":
    main()
