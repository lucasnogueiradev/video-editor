# Projeto Video Corte

Este projeto permite cortar partes silenciosas de vídeos e visualizar a forma de onda do áudio para escolher o melhor threshold de corte.

## Funcionalidades

- Upload de vídeos (MP4, MKV, etc.)
- Visualização da forma de onda do áudio (WaveSurfer.js)
- Ajuste interativo do threshold de silêncio
- Preview do que será cortado
- Corte automático das partes silenciosas

## Tecnologias

- **Backend:** Python (FastAPI), FFmpeg
- **Frontend:** React (Vite), WaveSurfer.js
- **Containerização:** Docker, Docker Compose

## Requisitos

- [Docker](https://www.docker.com/) instalado

## Como rodar (tudo com Docker)

1. Clone o repositório:

   ```sh
   git clone <url-do-repo>
   cd projeto-video-corte
   ```

2. Rode tudo com Docker Compose:

   ```sh
   docker-compose up --build
   ```

3. Acesse no navegador:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend (API): [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Estrutura dos containers

- **backend:** FastAPI + FFmpeg (porta 8000)
- **frontend:** React/Vite (porta 5173)

## Variáveis de ambiente

- Não é necessário configurar nada para rodar localmente com Docker.

## Desenvolvimento

- Para desenvolvimento, edite os arquivos normalmente e reinicie os containers.

## Contribuição

- Pull requests são bem-vindos!

---

## Dúvidas?

Abra uma issue ou entre em contato!
