from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from transformers import pipeline

# Get Hugging Face username from environment or use default
HF_USERNAME = os.getenv("HF_USERNAME", "ron4444444")

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

# Load models directly from HuggingFace Hub
# The transformers library will handle downloading and caching automatically
binary_classifier = None
severity_classifier = None

try:
    token = os.getenv("HF_TOKEN")
    print(f"🚀 Loading binary crisis model from {HF_USERNAME}/crisis-binary-model...")
    binary_classifier = pipeline(
        "text-classification",
        model=f"{HF_USERNAME}/crisis-binary-model",
        token=token,
        device=-1
    )
    print("✅ Binary model loaded successfully")
except Exception as e:
    print(f"❌ Failed to load binary model: {e}")
    binary_classifier = None

try:
    token = os.getenv("HF_TOKEN")
    print(f"🚀 Loading severity model from {HF_USERNAME}/crisis-severity-model...")
    severity_classifier = pipeline(
        "text-classification",
        model=f"{HF_USERNAME}/crisis-severity-model",
        token=token,
        device=-1
    )
    print("✅ Severity model loaded successfully")
except Exception as e:
    print(f"❌ Failed to load severity model: {e}")
    severity_classifier = None

class TextInput(BaseModel):
    text: str

class ClassificationResponse(BaseModel):
    label: str
    score: float

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "binary_model_loaded": binary_classifier is not None,
        "severity_model_loaded": severity_classifier is not None,
        "model_loaded": binary_classifier is not None and severity_classifier is not None,
        "binary_model_source": f"https://huggingface.co/{HF_USERNAME}/crisis-binary-model",
        "severity_model_source": f"https://huggingface.co/{HF_USERNAME}/crisis-severity-model",
        "device": "CPU",
        "hf_username": HF_USERNAME,
        "hf_token_set": bool(os.getenv("HF_TOKEN"))
    }

@app.post("/classify/binary", response_model=ClassificationResponse)
async def classify_binary(input_data: TextInput):
    if not binary_classifier:
        raise HTTPException(status_code=503, detail="Binary classifier not available")
    
    try:
        result = binary_classifier(input_data.text)[0]
        return ClassificationResponse(label=result["label"], score=result["score"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/classify/severity", response_model=ClassificationResponse)
async def classify_severity(input_data: TextInput):
    if not severity_classifier:
        raise HTTPException(status_code=503, detail="Severity classifier not available")
    
    try:
        result = severity_classifier(input_data.text)[0]
        return ClassificationResponse(label=result["label"], score=result["score"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
