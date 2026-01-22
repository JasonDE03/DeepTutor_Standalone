# DeepTutor Co-Writer - Standalone Edition

A stripped-down, production-ready version of the DeepTutor Co-Writer module, designed to run independently with minimal dependencies.

## ✨ Features

- **AI-Powered Text Editing**: Rewrite, expand, shorten, or improve text using state-of-the-art LLMs
- **Flexible LLM Support**: Works with Gemini, OpenAI, Claude, DeepSeek, and 100+ models via LiteLLM
- **Clean UI**: Modern, responsive Next.js frontend
- **Docker-Ready**: One-command deployment with Docker Compose
- **Minimal Dependencies**: Stripped of heavy RAG/research features for maximum performance

## 🏗️ Architecture

```text
DeepTutor_Standalone/
├── backend/              # FastAPI backend
│   ├── src/
│   │   ├── agents/      # Co-Writer agent logic
│   │   ├── api/         # REST API routes
│   │   └── services/    # LLM & support services
│   ├── .env.example     # Environment template
│   └── requirements.txt
├── frontend/            # Next.js frontend
│   ├── app/            # Next.js 13+ app router
│   ├── components/     # React components
│   └── package.json
└── docker-compose.yml  # Orchestration config
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- LLM API Key (Gemini, OpenAI, or Claude)

### 1. Clone & Configure

```bash
cd DeepTutor_Standalone/backend
cp .env.example .env
# Edit .env and add your API key
```

### 2. Launch

```bash
docker compose up --build
```

### 3. Access

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8001>
- **Health Check**: <http://localhost:8001/health>

## ⚙️ Configuration

### LLM Setup

Edit `backend/.env`:

```bash
# For Gemini (Recommended for free tier)
LLM_MODEL=gemini-2.0-flash-exp
LLM_API_KEY=your-gemini-api-key

# For OpenAI
LLM_MODEL=gpt-4o
LLM_API_KEY=your-openai-api-key

# For Claude
LLM_MODEL=claude-3-5-sonnet-20240620
LLM_API_KEY=your-anthropic-api-key
```

### Supported Models

The system uses [LiteLLM](https://docs.litellm.ai/docs/) for maximum flexibility:

- **Gemini**: `gemini-2.0-flash-exp`, `gemini-1.5-pro`, `gemini-1.0-pro`
- **OpenAI**: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-5-sonnet-20240620`, `claude-3-opus-20240229`
- **DeepSeek**: `deepseek-chat`, `deepseek-coder`
- **And 100+ more models** - see [LiteLLM docs](https://docs.litellm.ai/docs/providers)

## 📝 Usage

1. Open <http://localhost:3000>
2. Type or paste your text in the editor
3. Select text you want to edit
4. Choose an action:
   - **Rewrite**: Improve clarity and style
   - **Expand**: Add more detail
   - **Shorten**: Make more concise
   - **Custom**: Provide specific instructions

## 🔧 Development

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📦 What's Stripped Down

This standalone version removes:

- ❌ RAG pipelines (LightRAG, LlamaIndex, etc.)
- ❌ Research & paper tools (arXiv integration)
- ❌ Chat agent & session management
- ❌ Knowledge base dependencies
- ✅ **Kept**: Core Co-Writer editing functionality
- ✅ **Kept**: Multi-LLM support via LiteLLM
- ✅ **Kept**: Clean, modern UI

## 🛡️ Production Considerations

### Security

- Never commit `.env` files with real API keys
- Use environment variables in production
- Consider adding authentication layer
- Set up CORS properly for production domains

### Performance

- Backend auto-reloads in dev mode (disable in prod)
- Frontend runs Next.js dev server (use `npm run build && npm start` for prod)
- Consider adding Redis for caching
- Monitor LLM API rate limits

### Deployment

For production deployment:

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Run in production mode
docker compose -f docker-compose.prod.yml up -d
```

## 🐛 Troubleshooting

### Backend not starting

```bash
docker compose logs backend
```

Common issues:

- Missing API key in `.env`
- Port 8001 already in use
- Invalid model name

### Frontend not loading

```bash
docker compose logs frontend
```

Common issues:

- npm install timeout (slow network)
- Port 3000 already in use

### API returning errors

Check backend logs for:

- LLM rate limits (429 errors)
- Invalid API keys (401 errors)
- Model not found (404 errors)