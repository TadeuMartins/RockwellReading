# Rockwell Reading

Sistema completo para análise e conversão de arquivos Rockwell, composto por backend Python e frontend React.

## 📁 Estrutura do Projeto

```
RockwellReading/
├── backend/           # Backend Python para conversão de arquivos
│   ├── rockwell_to_comos.py
│   ├── requirements.txt
│   └── README.md
├── frontend/          # Frontend React para análise visual
│   ├── src/
│   ├── package.json
│   └── README.md
└── README.md
```

## 🚀 Início Rápido

### Backend (Python)

O backend é responsável pela conversão de arquivos L5K Rockwell + CSV base no formato COMOS.

1. Navegue até o diretório do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

3. Execute o conversor:
```bash
python rockwell_to_comos.py <arquivo_L5K> <arquivo_CSV_base> <arquivo_CSV_saida>
```

Para mais detalhes, veja [backend/README.md](backend/README.md)

### Frontend (React + TypeScript)

O frontend fornece uma interface visual para análise de dados Rockwell.

1. Navegue até o diretório do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Execute em modo de desenvolvimento:
```bash
npm run dev
```

O aplicativo será aberto automaticamente em `http://localhost:3000`

Para mais detalhes, veja [frontend/README.md](frontend/README.md)

## 📋 Requisitos

### Backend
- Python 3.8+
- pandas 2.0+

### Frontend
- Node.js 18+
- npm ou yarn

## 🔧 Funcionalidades

### Backend
- Conversão de arquivos L5K para formato COMOS
- Extração de valores de limites de alarmes (HH/H/L/LL)
- Identificação de habilitação de alarmes
- Mapeamento de interlocks baseado em lógica Ladder

### Frontend
- Upload e visualização de arquivos
- Filtros avançados por tipo de alarme, status e interlocks
- Busca de tags específicas
- Exportação de dados filtrados
- Interface responsiva e moderna

## 📝 Licença

Este projeto está sob licença MIT.

## 👥 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.
