# Frontend - Rockwell Analyzer

Interface web para análise de arquivos Rockwell, construída com React, TypeScript e Vite.

## Requisitos

- Node.js 18 ou superior
- npm ou yarn

## Instalação

1. Navegue até o diretório do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

## Executando o Projeto

### Modo de Desenvolvimento
```bash
npm run dev
```
O aplicativo será aberto automaticamente em `http://localhost:3000`

### Build para Produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`

### Preview da Build de Produção
```bash
npm run preview
```

## Funcionalidades

- Upload de arquivos L5K e CSV
- Processamento e análise de dados
- Filtros avançados (tipo de alarme, status de habilitação, interlocks)
- Busca de tags
- Exportação de dados filtrados
- Interface responsiva e moderna

## Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/
│   │   └── RockwellAnalyzer.tsx  # Componente principal
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Estilos globais
├── index.html                     # HTML template
├── package.json                   # Dependências
├── tsconfig.json                  # Configuração TypeScript
├── vite.config.ts                 # Configuração Vite
└── README.md
```

## Tecnologias

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Lucide React** - Ícones
