from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import httpx

# Get Hugging Face username from environment or use default
HF_USERNAME = os.getenv("HF_USERNAME", "ron4444444")
HF_TOKEN = os.getenv("HF_TOKEN")

app = FastAPI(title="CrisisConnect ML Service")

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://crisisconnect-frontend.onrender.com",
    "https://crisisconnect-backend.onrender.com",
]

if frontend_url := os.getenv("FRONTEND_URL"):
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hugging Face Inference API endpoints - no local model loading!
BINARY_MODEL_URL = f"https://api-inference.huggingface.co/models/{HF_USERNAME}/crisis-binary-model"
SEVERITY_MODEL_URL = f"https://api-inference.huggingface.co/models/{HF_USERNAME}/crisis-severity-model"

# HTTP client for making requests to HF
client = httpx.AsyncClient(timeout=30.0)

class TextInput(BaseModel):
    text: str

class ClassificationResponse(BaseModel):
    label: str
    score: float

async def query_hf_model(text: str, model_url: str) -> dict:
    """Query Hugging Face Inference API without loading models locally"""
    headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
    
    try:
        response = await client.post(
            model_url,
            headers=headers,
            json={"inputs": text}
        )
        response.raise_for_status()
        result = response.json()
        
        # Handle HF API response format
        if isinstance(result, list) and len(result) > 0:
            if isinstance(result[0], list):
                # Format: [[{"label": "...", "score": ...}]]
                return result[0][0]
            else:
                # Format: [{"label": "...", "score": ...}]
                return result[0]
        elif isinstance(result, dict) and "error" in result:
            raise HTTPException(status_code=503, detail=f"Model loading: {result['error']}")
        else:
            raise HTTPException(status_code=500, detail="Unexpected response format")
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 503:
            raise HTTPException(
                status_code=503, 
                detail="Model is loading on HF servers, please retry in a few seconds"
            )
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "binary_model_loaded": True,
        "severity_model_loaded": True,
        "model_loaded": True,
        "binary_model_source": f"https://huggingface.co/{HF_USERNAME}/crisis-binary-model",
        "severity_model_source": f"https://huggingface.co/{HF_USERNAME}/crisis-severity-model",
        "device": "HuggingFace Inference API (Remote)",
        "hf_username": HF_USERNAME,
        "hf_token_set": bool(HF_TOKEN)
    }

@app.post("/classify/binary", response_model=ClassificationResponse)
async def classify_binary(input_data: TextInput):
    result = await query_hf_model(input_data.text, BINARY_MODEL_URL)
    return ClassificationResponse(label=result["label"], score=result["score"])

@app.post("/classify/severity", response_model=ClassificationResponse)
async def classify_severity(input_data: TextInput):
    result = await query_hf_model(input_data.text, SEVERITY_MODEL_URL)
    return ClassificationResponse(label=result["label"], score=result["score"])

@app.on_event("shutdown")
async def shutdown_event():
    await client.aclose()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
