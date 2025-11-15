# Backend - Rockwell to COMOS Converter

Este é o backend do sistema de análise de arquivos Rockwell, responsável por converter arquivos L5K e CSV para o formato COMOS enriquecido.

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

Execute o script de conversão com os seguintes parâmetros:

```bash
python rockwell_to_comos.py <arquivo_L5K> <arquivo_CSV_base> <arquivo_CSV_saida>
```

### Exemplo:
```bash
python rockwell_to_comos.py CLP01_ETM.L5K CLP01_ETM.csv CLP01_ETM_enriquecido.csv
```

## Funcionalidades

O script converte um arquivo L5K Rockwell + CSV base no formato COMOS para um CSV enriquecido com:
- Valor real dos limites (HHLimit / HLimit / LLimit / LLLimit) em "Value"
- Habilitação dos alarmes (HHEnabled / HEnabled / LEnabled / LLEnabled) em "Signal"
- Equipamento interbloqueado em "Text 0", baseado na lógica Ladder

## Estrutura

- `rockwell_to_comos.py` - Script principal de conversão
- `requirements.txt` - Dependências Python
