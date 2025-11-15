# Frontend - Rockwell Analyzer

Interface web moderna para análise de arquivos Rockwell, construída com React, TypeScript, Vite e Tailwind CSS.

## Requisitos

- Node.js 18 ou superior
- npm ou yarn
- **Backend Flask rodando** em `http://localhost:5000`

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

### Passo 1: Inicie o Backend

**IMPORTANTE:** O frontend precisa que o backend esteja rodando!

Em um terminal separado, inicie o servidor backend:

```bash
cd backend
python rockwell_to_comos.py
```

O backend deve estar rodando em `http://localhost:5000`

### Passo 2: Inicie o Frontend

Com o backend rodando, execute o frontend:

#### Modo de Desenvolvimento
```bash
npm run dev
```
O aplicativo será aberto automaticamente em `http://localhost:3000`

#### Build para Produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`

#### Preview da Build de Produção
```bash
npm run preview
```

## Como Usar

1. **Acesse** http://localhost:3000 no navegador
2. **Faça upload dos arquivos:**
   - Clique na área "Arquivo L5K" para selecionar um arquivo `.l5k` ou `.L5K`
   - Clique na área "Arquivo CSV Base" para selecionar um arquivo `.csv` ou `.CSV`
3. **Clique em "Processar Arquivos"**
4. **Aguarde o processamento** (os arquivos são enviados ao backend via API)
5. **Visualize os resultados:**
   - Estatísticas gerais (total, habilitados, desabilitados, interbloqueios)
   - Breakdown por tipo de alarme (HH, H, L, LL)
   - Tabela detalhada com todos os dados
6. **Use os filtros** para refinar os resultados:
   - Busca por texto (block, alarme, equipamento)
   - Filtro por tipo de alarme
   - Filtro por status (habilitado/desabilitado)
   - Filtro por interbloqueio
7. **Exporte os dados filtrados** clicando em "Exportar Resultados"

## Funcionalidades

- ✅ **Upload de arquivos** via interface drag-and-drop
- ✅ **Integração com backend** via API REST
- ✅ **Processamento em tempo real** de arquivos L5K e CSV
- ✅ **Estatísticas detalhadas**:
  - Total de alarmes
  - Alarmes habilitados/desabilitados
  - Alarmes com interbloqueios
  - Breakdown por tipo (HH/H/L/LL)
- ✅ **Filtros avançados**:
  - Busca de texto livre (busca em todos os campos)
  - Tipo de alarme
  - Status de habilitação
  - Presença de interlocks
- ✅ **Exportação de dados** filtrados em formato CSV
- ✅ **Interface responsiva** e moderna com Tailwind CSS
- ✅ **Tema escuro profissional** com gradientes e animações
- ✅ **Tabela expandida** com 9 colunas de dados:
  - Hierarc (hierarquia)
  - Chart (gráfico/área)
  - Block (tag do alarme)
  - Alarme (tipo: HH/H/L/LL)
  - Valor (limite do alarme)
  - Status (habilitado/desabilitado)
  - Interbloqueio (equipamentos afetados)
  - Identification (identificação)
  - Unit (unidade de medida)

### Melhorias de Tratamento de Erros 🛡️

- **Mensagens de erro específicas**: Não mostra mais "erro de conexão" genérico
- **Validação de resposta**: Verifica estrutura dos dados antes de processar
- **Logs no console**: Informações detalhadas para debugging
- **Diferenciação de erros**: Separa erros de rede de erros de processamento

## Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/
│   │   └── RockwellAnalyzer.tsx  # Componente principal
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Estilos globais + Tailwind
├── index.html                     # HTML template
├── package.json                   # Dependências
├── tsconfig.json                  # Configuração TypeScript
├── vite.config.ts                 # Configuração Vite + Proxy
├── tailwind.config.js             # Configuração Tailwind CSS
├── postcss.config.js              # Configuração PostCSS
└── README.md
```

## Tecnologias

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server ultrarrápido
- **Tailwind CSS 3** - Framework CSS utility-first
- **Lucide React** - Ícones modernos e consistentes

## Integração com Backend

O frontend se comunica com o backend via API REST:

- **Endpoint de processamento:** `POST /api/process`
- **Proxy do Vite:** As requisições para `/api/*` são automaticamente redirecionadas para `http://localhost:5000`
- **CORS:** O backend Flask tem suporte CORS habilitado para permitir requisições do frontend

### Fluxo de Processamento

1. Usuário faz upload dos arquivos L5K e CSV
2. Frontend cria um `FormData` com os arquivos
3. Requisição POST é enviada para `/api/process` (proxy redireciona para backend)
4. Backend processa os arquivos e retorna JSON com os dados
5. Frontend mapeia os dados e exibe na interface
6. Usuário pode filtrar, buscar e exportar os resultados

## Desenvolvimento

Durante o desenvolvimento, o Vite oferece:
- ⚡ Hot Module Replacement (HMR)
- 🔥 Recarregamento instantâneo
- 🎯 TypeScript type checking
- 🎨 Tailwind CSS com JIT compilation

## Troubleshooting

**Problema:** Erro "Erro ao conectar com o servidor"
- **Solução:** Verifique se o backend está rodando em `http://localhost:5000`
- Execute `curl http://localhost:5000/api/health` para testar a conexão

**Problema:** Erro "Erro ao processar os arquivos: [mensagem específica]"
- **Solução:** Leia a mensagem de erro específica que indica o problema real
- Verifique os logs do backend no terminal para mais detalhes
- Problemas comuns:
  - Formato de arquivo inválido
  - CSV sem colunas esperadas
  - L5K sem definições de AOI esperadas

**Problema:** Estilos não aparecem
- **Solução:** Execute `npm run build` para garantir que o Tailwind está compilando corretamente

**Problema:** Arquivos não são processados corretamente
- **Solução:** 
  - Verifique os logs do backend (devem mostrar 📁 e ✓)
  - O backend agora suporta diferentes separadores CSV (; , ou tab)
  - Verifique se as colunas do CSV têm os nomes esperados (Block, I/O name, Block type, etc.)
  
**Problema:** Tabela vazia após processamento bem-sucedido
- **Solução:**
  - Verifique no console do navegador (F12) se há mensagens de erro
  - O processamento deve mostrar "✓ Processamento concluído com sucesso: X registros"
  - Verifique se o CSV contém linhas de alarme (HHInAlarm, HInAlarm, etc.)
