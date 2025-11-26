import huggingface_hub
print(f" Hugging Face Hub Version: {huggingface_hub.__version__}")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from huggingface_hub import InferenceClient

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

# HuggingFace model IDs
BINARY_MODEL_ID = f"{HF_USERNAME}/crisis-binary-model"
SEVERITY_MODEL_ID = f"{HF_USERNAME}/crisis-severity-model"

# Initialize HuggingFace Inference Client
client = InferenceClient(token=HF_TOKEN)

class TextInput(BaseModel):
    text: str

class ClassificationResponse(BaseModel):
    label: str
    score: float

def query_hf_model(text: str, model_id: str) -> dict:
    """Query Hugging Face Inference API using InferenceClient"""
    try:
        # Use text_classification task
        result = client.text_classification(text, model=model_id)
        
        # Result format: [{"label": "...", "score": ...}]
        # The InferenceClient returns a list of dicts directly for text_classification
        if isinstance(result, list) and len(result) > 0:
            # It usually returns a list of labels with scores, sorted by score.
            # We want the top one.
            top_result = result[0]
            # Check if it's an object or dict
            if hasattr(top_result, 'label'):
                 return {"label": top_result.label, "score": top_result.score}
            elif isinstance(top_result, dict):
                 return {"label": top_result["label"], "score": top_result["score"]}

        raise HTTPException(status_code=500, detail=f"Unexpected response format: {type(result)}")
            
    except Exception as e:
        error_msg = str(e).lower()
        if "503" in error_msg or "loading" in error_msg:
            raise HTTPException(
                status_code=503, 
                detail="Model is loading on HF servers, please retry in a few seconds"
            )
        elif "404" in error_msg or "not found" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Model {model_id} not found or not accessible"
            )
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
        "hf_token_set": bool(HF_TOKEN),
        "huggingface_hub_version": huggingface_hub.__version__
    }

@app.post("/classify/binary", response_model=ClassificationResponse)
async def classify_binary(input_data: TextInput):
    result = query_hf_model(input_data.text, BINARY_MODEL_ID)
    return ClassificationResponse(label=result["label"], score=result["score"])

@app.post("/classify/severity", response_model=ClassificationResponse)
async def classify_severity(input_data: TextInput):
    result = query_hf_model(input_data.text, SEVERITY_MODEL_ID)
    return ClassificationResponse(label=result["label"], score=result["score"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
