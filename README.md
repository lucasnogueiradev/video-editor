# 🎬 Video Cutter - Cortador Automático de Vídeos

Um sistema completo para cortar automaticamente partes silenciosas de vídeos, com interface visual de forma de onda para ajuste preciso do threshold de silêncio.

## ✨ Funcionalidades

### 🎯 **Corte Automático de Vídeos**

- **Detecção inteligente** de partes silenciosas usando `auto-editor`
- **Threshold configurável** de 0% a 30% para controle preciso
- **Múltiplos formatos** suportados: MKV, MP4, AVI, MOV, etc.
- **Processamento rápido** com FFmpeg otimizado

### 📊 **Visualização de Forma de Onda**

- **WaveSurfer.js** para exibição interativa do áudio
- **Linha de threshold** ajustável em tempo real
- **Drag & drop** da linha para ajuste visual
- **Feedback visual** do que será cortado

### 🔄 **Sistema de Progresso**

- **Progresso em tempo real** durante o processamento
- **Mensagens informativas** para cada etapa
- **Polling inteligente** para sincronização backend/frontend
- **Timeout de segurança** para evitar travamentos

### 📥 **Download Automático**

- **Download automático** do vídeo processado
- **Download automático** do áudio extraído
- **Botões de re-download** para arquivos anteriores
- **Nomes descritivos** com threshold aplicado

### 🧹 **Gerenciamento de Arquivos**

- **Limpeza automática** de arquivos temporários
- **Preservação** de arquivos de resultado
- **Endpoints de limpeza** manual
- **Sistema de status** para verificação de arquivos

## 🛠️ Tecnologias Utilizadas

### **Backend**

- **FastAPI** - Framework web moderno e rápido
- **Python 3.13** - Linguagem principal
- **auto-editor** - Biblioteca para corte automático
- **FFmpeg** - Processamento de mídia
- **Uvicorn** - Servidor ASGI

### **Frontend**

- **React 18** - Interface de usuário
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Estilização
- **WaveSurfer.js** - Visualização de áudio
- **Axios** - Cliente HTTP

### **DevOps**

- **Docker** - Containerização
- **Docker Compose** - Orquestração
- **Git** - Controle de versão

## 🚀 Como Executar

### **Opção 1: Docker (Recomendado)**

1. **Clone o repositório:**

```bash
git clone <url-do-repositorio>
cd projeto-video-corte
```

2. **Execute com Docker Compose:**

```bash
docker-compose up --build
```

3. **Acesse a aplicação:**

- Frontend: http://localhost:5174
- Backend: http://localhost:8000

### **Opção 2: Desenvolvimento Local**

#### **Pré-requisitos:**

- Python 3.13+
- Node.js 18+
- FFmpeg instalado
- auto-editor instalado

#### **Backend:**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

#### **Frontend:**

```bash
cd video-cutter/video-cutter
npm install
npm run dev
```

## 📖 Como Usar

### **1. Upload do Vídeo**

- Clique em "Escolher arquivo" ou arraste um vídeo
- Formatos suportados: MKV, MP4, AVI, MOV, WMV, FLV, WebM

### **2. Visualizar Forma de Onda (Opcional)**

- Clique em "Ver forma de onda" para extrair o áudio
- A forma de onda será exibida com uma linha vermelha
- A linha representa o threshold de silêncio (0% = meio)

### **3. Ajustar Threshold**

- Use o slider "Threshold de Silêncio" (0% - 30%)
- **0%** = linha no meio (corta apenas silêncio total)
- **30%** = linha no topo (corta qualquer som baixo)
- Arraste a linha vermelha diretamente na forma de onda

### **4. Processar Vídeo**

- Clique em "Cortar Vídeo"
- Acompanhe o progresso em tempo real
- O vídeo será baixado automaticamente

### **5. Resultados**

- **Vídeo cortado** baixado automaticamente
- **Áudio extraído** disponível para download
- **Arquivos temporários** limpos automaticamente

## 🔧 Configuração Avançada

### **Threshold de Silêncio**

- **0-5%**: Corta apenas silêncio total (recomendado para podcasts)
- **5-15%**: Corta silêncio e ruídos baixos (recomendado para vídeos)
- **15-30%**: Corta qualquer som baixo (use com cuidado)

### **Forma de Onda**

- **Linha vermelha**: Threshold atual
- **Área acima da linha**: Será cortada
- **Área abaixo da linha**: Será mantida
- **Drag & drop**: Ajuste visual direto

### **Limpeza de Arquivos**

- **Automática**: Após cada processamento
- **Manual**: Use os botões "Limpar Temporários"
- **Completa**: Use "Limpar Todos" (inclui resultados)

## 📁 Estrutura do Projeto

```
projeto-video-corte/
├── backend/                 # API FastAPI
│   ├── main.py             # Servidor principal
│   ├── requirements.txt    # Dependências Python
│   ├── Dockerfile         # Container do backend
│   └── temp_files/        # Arquivos temporários
├── video-cutter/          # Frontend React
│   └── video-cutter/
│       ├── src/
│       │   ├── App.tsx    # Componente principal
│       │   ├── components/
│       │   │   └── Waveform.tsx  # Visualização de áudio
│       │   └── index.css  # Estilos
│       ├── package.json   # Dependências Node.js
│       └── Dockerfile     # Container do frontend
├── docker-compose.yml     # Orquestração Docker
├── README.md             # Esta documentação
└── .gitignore           # Arquivos ignorados pelo Git
```

## 🔌 Endpoints da API

### **Vídeo**

- `POST /cortar` - Corta vídeo com threshold
- `GET /video/{filename}` - Download do vídeo processado
- `GET /status/{filename}` - Status do arquivo

### **Áudio**

- `POST /extrair-audio` - Extrai áudio para forma de onda
- `GET /silencio/{filename}` - Dados de análise de silêncio

### **Sistema**

- `GET /test` - Teste de conectividade
- `POST /limpar-temporarios` - Limpeza manual
- `POST /limpar-todos` - Limpeza completa

## 🐛 Solução de Problemas

### **FFmpeg não encontrado**

```bash
# Windows (Winget)
winget install ffmpeg

# Windows (Chocolatey)
choco install ffmpeg

# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg
```

### **auto-editor não encontrado**

```bash
pip install auto-editor
```

### **Porta em uso**

- Backend: Mude a porta no comando uvicorn
- Frontend: Vite tentará automaticamente outra porta

### **Arquivos não baixam**

- Verifique se o navegador permite downloads
- Use os botões "Baixar Novamente"
- Verifique o console do navegador para erros

## 🤝 Contribuição

1. **Fork** o projeto
2. **Crie** uma branch para sua feature
3. **Commit** suas mudanças
4. **Push** para a branch
5. **Abra** um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🙏 Agradecimentos

- **auto-editor** - Biblioteca de corte automático
- **FFmpeg** - Processamento de mídia
- **WaveSurfer.js** - Visualização de áudio
- **FastAPI** - Framework web
- **React** - Interface de usuário

---

**Desenvolvido com ❤️ para facilitar o processamento de vídeos**
