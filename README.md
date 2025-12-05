# Medical Copilot MVP

Este é um MVP de um **Copiloto Médico** inteligente, projetado para auxiliar profissionais de saúde durante consultas. O sistema oferece transcrição em tempo real, análise clínica automatizada (alertas de segurança, perguntas faltantes) e um chat interativo com contexto do prontuário.

## 🚀 Funcionalidades Principais

- **Transcrição em Tempo Real**: Captura e transcreve o áudio da consulta (Médico/Paciente) com diarização.
- **Análise Clínica Viva**: Monitora a transcrição e o prontuário para gerar alertas de segurança (diagnósticos diferenciais graves), sugerir perguntas esquecidas e recomendar condutas.
- **Chat com Contexto**: Permite ao médico fazer perguntas ao copiloto sobre o caso, considerando todo o histórico do prontuário.
- **Gestão de Prontuário**: Visualização e edição de prontuários em Markdown, com suporte a "staging" (rascunho) antes de salvar.
- **Interface Moderna**: Frontend em Next.js com design limpo e responsivo.

## 🛠️ Tecnologias

- **Frontend**: Next.js 14 (React), Tailwind CSS, Lucide Icons, Axios.
- **Backend**: FastAPI (Python), Uvicorn, WebSockets.
- **IA**: OpenAI API (GPT-4o, GPT-4o-realtime-preview).

## 📋 Pré-requisitos

- **Node.js** (v18 ou superior)
- **Python** (v3.10 ou superior)
- **Chave de API da OpenAI** configurada.

## ⚙️ Instalação e Execução

### 1. Configuração do Backend

1. Navegue até a pasta `backend`:
   ```bash
   cd backend
   ```
2. Crie e ative um ambiente virtual (opcional, mas recomendado):
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure a chave da OpenAI. Crie um arquivo `.env` na pasta `backend` ou exporte a variável:
   ```bash
   # .env
   OPENAI_API_KEY=sk-sua-chave-aqui
   OPENAI_CLINICAL_MODEL=gpt-4o
   ```
5. Inicie o servidor:
   ```bash
   python main.py
   ```
   O backend rodará em `http://127.0.0.1:8000`.

### 2. Configuração do Frontend

1. Navegue até a pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   O frontend rodará em `http://localhost:3000`.

## 🖥️ Como Usar

1. Abra o navegador em `http://localhost:3000`.
2. Selecione um paciente na barra lateral esquerda.
3. **Para Transcrever**: Clique no ícone de microfone na barra inferior para iniciar a gravação/transcrição em tempo real.
4. **Para Analisar**: O sistema fará verificações periódicas automáticas ou você pode clicar em "Analisar Prontuário" no painel direito.
5. **Chat**: Use a caixa de texto na parte inferior para conversar com o copiloto sobre o paciente selecionado.
6. **Editar Prontuário**: Use a área de "Rascunho" para fazer anotações e clique em "Salvar no Prontuário" para persistir.

## 📂 Estrutura do Projeto

- `/backend`: API FastAPI, serviços de IA, gerenciamento de arquivos.
- `/frontend`: Aplicação Next.js, componentes de UI (MainPanel, Sidebar, RightPanel).
