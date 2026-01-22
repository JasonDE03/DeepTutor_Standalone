import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

# Add current directory to path so 'src' can be imported
sys.path.append(str(Path(__file__).parent))

# Set environment variables if needed
# os.environ["PROJECT_ROOT"] = str(Path(__file__).parent)

from src.api.routers import co_writer, minio_files

app = FastAPI(title="DeepTutor Co-Writer Standalone")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# MOCK MODE FOR NON-AI USAGE
# ============================================
# If no LLM_API_KEY is found, we patch the EditAgent to return dummy text.
# This allows the user to test the UI/Workflow without paying for tokens.
if not os.getenv("LLM_API_KEY") and not os.getenv("OPENAI_API_KEY"):
    print("⚠️  WARNING: No LLM_API_KEY found. Running in MOCK MODE.")
    print("⚠️  AI features will return dummy text.")
    
    from src.agents.co_writer.edit_agent import EditAgent
    import uuid
    from datetime import datetime
    
    # Original process method signature: 
    # async def process(self, text, instruction, action="rewrite", source=None, kb_name=None)
    async def mock_process(self, text: str, instruction: str, action: str = "rewrite", source=None, kb_name=None):
        operation_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:6]
        
        mock_response = f"[MOCK AI] I have received your request to '{action}' the text.\n" \
                        f"Original text: {text[:50]}...\n" \
                        f"Instruction: {instruction}\n" \
                        f"(To use real AI, please set LLM_API_KEY in backend/.env)"
        
        return {"edited_text": mock_response, "operation_id": operation_id}

    async def mock_auto_mark(self, text: str):
        operation_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:6]
        # Just wrap some words in tags to demonstrate UI
        words = text.split()
        marked_words = []
        for i, word in enumerate(words):
            if i % 3 == 0:
                # Add a sample annotation tag
                marked_words.append(f'<span data-rough-notation="highlight">{word}</span>')
            else:
                marked_words.append(word)
        
        return {"marked_text": " ".join(marked_words), "operation_id": operation_id}

    # Monkeypatch the class methods
    EditAgent.process = mock_process
    EditAgent.auto_mark = mock_auto_mark

app.include_router(co_writer.router, prefix="/api/v1/co_writer", tags=["Co-Writer"])
app.include_router(minio_files.router)  # Files API

@app.get("/health")
def health_check():
    return {"status": "ok", "mock_mode": not os.getenv("LLM_API_KEY")}

# Mock endpoints for other services if CoWriterEditor calls them
@app.get("/api/v1/knowledge/list")
def list_knowledge_bases():
    return [{"name": "Default KB"}]

@app.get("/api/v1/co_writer/tts/status")
def tts_status():
    return {"available": False}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
