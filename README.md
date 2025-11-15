# Rockwell Reading

Sistema completo para análise e conversão de arquivos Rockwell, composto por backend Python (API Flask) e frontend React.

## 📁 Estrutura do Projeto

```
RockwellReading/
├── backend/           # Backend Python - API Flask para conversão de arquivos
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

### Backend (Python + Flask API)

O backend funciona como uma API REST que processa arquivos L5K Rockwell + CSV base no formato COMOS.

1. Navegue até o diretório do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

3. **Inicie o servidor API** (sem argumentos):
```bash
python rockwell_to_comos.py
```

O servidor iniciará em `http://localhost:5000`

**Uso alternativo via linha de comando** (legado):
```bash
python rockwell_to_comos.py <arquivo_L5K> <arquivo_CSV_base> <arquivo_CSV_saida>
```

Para mais detalhes, veja [backend/README.md](backend/README.md)

### Frontend (React + TypeScript + Tailwind CSS)

O frontend fornece uma interface visual moderna para upload e análise de dados Rockwell.

1. Navegue até o diretório do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. **Certifique-se de que o backend está rodando** em `http://localhost:5000`

4. Execute o frontend em modo de desenvolvimento:
```bash
npm run dev
```

O aplicativo será aberto automaticamente em `http://localhost:3000`

Para mais detalhes, veja [frontend/README.md](frontend/README.md)

## 📋 Requisitos

### Backend
- Python 3.8+
- pandas 2.0+
- Flask 3.0+
- Flask-CORS 4.0+

### Frontend
- Node.js 18+
- npm ou yarn

## 🔧 Funcionalidades

### Backend (API)
- **API REST** para processar arquivos via upload
- Conversão de arquivos L5K para formato COMOS
- Extração de valores de limites de alarmes (HH/H/L/LL)
- Identificação de habilitação de alarmes
- Mapeamento de interlocks baseado em lógica Ladder
- Endpoints:
  - `GET /api/health` - Verificação de saúde da API
  - `POST /api/process` - Processa arquivos L5K e CSV

### Frontend
- **Interface moderna e profissional** com Tailwind CSS
- Upload de arquivos L5K e CSV via drag-and-drop ou seleção
- Integração com backend via API REST
- Filtros avançados por tipo de alarme, status e interlocks
- Busca de tags específicas
- Estatísticas em tempo real
- Exportação de dados filtrados
- Interface responsiva e moderna com tema escuro

## 🎯 Como Usar

1. **Inicie o backend** (em um terminal):
   ```bash
   cd backend
   python rockwell_to_comos.py
   ```

2. **Inicie o frontend** (em outro terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Acesse o frontend** em http://localhost:3000

4. **Faça upload dos arquivos**:
   - Selecione o arquivo L5K (Rockwell)
   - Selecione o arquivo CSV base (COMOS)
   - Clique em "Processar Arquivos"

5. **Analise os resultados**:
   - Visualize estatísticas
   - Aplique filtros
   - Exporte os dados processados

## 📝 Licença

Este projeto está sob licença MIT.

## 👥 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.
