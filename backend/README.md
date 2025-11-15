# Backend - Rockwell to COMOS Converter

Este é o backend do sistema de análise de arquivos Rockwell, responsável por converter arquivos L5K e CSV para o formato COMOS enriquecido. Funciona como uma **API REST Flask** ou via **linha de comando**.

## Requisitos

- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)

## Instalação

1. Navegue até o diretório do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

## Uso

### Modo 1: API Server (Recomendado)

Execute o script **sem argumentos** para iniciar o servidor Flask:

```bash
python rockwell_to_comos.py
```

O servidor iniciará em `http://localhost:5000` e exibirá:

```
============================================================
Rockwell to COMOS - Servidor API
============================================================

Servidor iniciando em http://localhost:5000

Endpoints disponíveis:
  GET  /api/health  - Verificação de saúde
  POST /api/process - Processar arquivos L5K e CSV

Para usar via linha de comando:
  python rockwell_to_comos.py <arquivo.L5K> <arquivo.csv> <saida.csv>

Pressione CTRL+C para parar o servidor
============================================================
```

#### Endpoints da API

##### `GET /api/health`
Verifica se a API está funcionando.

**Resposta:**
```json
{
  "status": "ok",
  "message": "Rockwell to COMOS API está rodando"
}
```

##### `POST /api/process`
Processa arquivos L5K e CSV.

**Parâmetros (multipart/form-data):**
- `l5k_file`: Arquivo L5K (arquivo Rockwell)
- `csv_file`: Arquivo CSV base (formato COMOS)

**Resposta de sucesso:**
```json
{
  "success": true,
  "data": [
    {
      "Block": "TE1611001_ALM",
      "I/O name": "HHInAlarm",
      "Block type": "ADD_ON_INSTRUCTIONIHMALMA_2780",
      "Value": 85.5,
      "Signal": 1,
      "Text 0": "M1611001_MTR / XV1611001",
      "Chart": "R_Control_Bombas"
    },
    ...
  ],
  "total_rows": 12
}
```

**Resposta de erro:**
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

### Modo 2: Linha de Comando (Legado)

Execute o script com os seguintes parâmetros:

```bash
python rockwell_to_comos.py <arquivo_L5K> <arquivo_CSV_base> <arquivo_CSV_saida>
```

#### Exemplo:
```bash
python rockwell_to_comos.py CLP01_ETM.L5K CLP01_ETM.csv CLP01_ETM_enriquecido.csv
```

## Funcionalidades

O script converte um arquivo L5K Rockwell + CSV base no formato COMOS para um CSV enriquecido com:
- **Valor real dos limites** (HHLimit / HLimit / LLimit / LLLimit) em "Value"
- **Habilitação dos alarmes** (HHEnabled / HEnabled / LEnabled / LLEnabled) em "Signal"
- **Equipamento interbloqueado** em "Text 0", baseado na lógica Ladder

### Melhorias de Robustez 🛡️

O backend agora possui recursos avançados de processamento para lidar com diferentes formatos de arquivos:

#### 1. **Detecção Automática de Separador CSV**
- Tenta automaticamente três tipos de separadores: `;` (ponto e vírgula), `,` (vírgula) e `\t` (tab)
- Elimina problemas de compatibilidade entre diferentes ferramentas de exportação
- Logs mostram qual separador foi detectado

#### 2. **Tratamento de Espaços em Nomes de Colunas**
- Remove espaços extras no início e fim dos nomes das colunas
- Evita erros de leitura causados por `"Block type "` vs `"Block type"`

#### 3. **Correspondência Flexível de Block Type**
- Busca por substring ao invés de correspondência exata
- Aceita variações como:
  - `"IHMALMA"`
  - `"ADD_ON_INSTRUCTIONIHMALMA"`
  - `"ADD_ON_INSTRUCTION IHMALMA"` (com espaço)
  - `"ADD_ON_INSTRUCTIONIHMALMA_2780"`

#### 4. **Logs Detalhados para Debugging**
- Emoji indicators (📁 ✓ ❌) para facilitar visualização
- Informações sobre arquivos processados, tamanho, separadores detectados
- Stack traces completos em caso de erro

## Integração com Frontend

Para usar com o frontend React:

1. Inicie o servidor API:
   ```bash
   python rockwell_to_comos.py
   ```

2. O frontend (rodando em `http://localhost:3000`) se conectará automaticamente ao backend em `http://localhost:5000`

3. O frontend enviará arquivos via POST para `/api/process` e exibirá os resultados

## Estrutura

- `rockwell_to_comos.py` - Script principal (API + CLI)
- `requirements.txt` - Dependências Python

## Dependências

- `pandas>=2.0.0` - Manipulação de dados
- `flask>=3.0.0` - Framework web
- `flask-cors>=4.0.0` - Suporte CORS para chamadas do frontend
