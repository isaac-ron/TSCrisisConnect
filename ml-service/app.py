from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import torch
import uvicorn
import os
from pathlib import Path

app = FastAPI(
    title="Crisis Classification API",
    description="ML service for dual-model crisis classification",
    version="2.0.0"
)

# Enable CORS for Node.js service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths to the two models
BINARY_MODEL_PATH = Path("./my_final_binary_model")
SEVERITY_MODEL_PATH = Path("./my_final_severity_model_4_class")

# Global variables for models
binary_classifier = None
severity_classifier = None

class TextInput(BaseModel):
    text: str

class BinaryResult(BaseModel):
    is_crisis: bool
    confidence: float
    
class SeverityResult(BaseModel):
    severity: str
    confidence: float
    
class DualResult(BaseModel):
    binary: BinaryResult
    severity: SeverityResult

class HealthResponse(BaseModel):
    status: str
    binary_model_loaded: bool
    severity_model_loaded: bool
    binary_model_path: str
    severity_model_path: str
    device: str

@app.on_event("startup")
async def load_models():
    global binary_classifier, severity_classifier
    device = 0 if torch.cuda.is_available() else -1
    device_name = "CUDA" if torch.cuda.is_available() else "CPU"
    
    # Load binary crisis classifier
    try:
        print(f"🚀 Loading binary crisis model from {BINARY_MODEL_PATH}...")
        if BINARY_MODEL_PATH.exists():
            binary_classifier = pipeline(
                "text-classification",
                model=str(BINARY_MODEL_PATH),
                device=device,
                return_all_scores=True
            )
            print(f"✅ Binary model loaded on {device_name}!")
        else:
            print(f"⚠️ Binary model not found at {BINARY_MODEL_PATH}")
    except Exception as e:
        print(f"❌ Failed to load binary model: {e}")
    
    # Load severity classifier
    try:
        print(f"🚀 Loading severity model from {SEVERITY_MODEL_PATH}...")
        if SEVERITY_MODEL_PATH.exists():
            severity_classifier = pipeline(
                "text-classification",
                model=str(SEVERITY_MODEL_PATH),
                device=device,
                return_all_scores=True
            )
            print(f"✅ Severity model loaded on {device_name}!")
        else:
            print(f"⚠️ Severity model not found at {SEVERITY_MODEL_PATH}")
    except Exception as e:
        print(f"❌ Failed to load severity model: {e}")

@app.post("/classify/binary", response_model=BinaryResult)
async def classify_binary(input_data: TextInput):
    if not binary_classifier:
        raise HTTPException(status_code=503, detail="Binary model not loaded")
    
    try:
        results = binary_classifier(input_data.text)[0]
        # Find the label indicating "crisis" (could be "LABEL_1", "true", "crisis", etc.)
        crisis_result = max(results, key=lambda x: x['score'] if 'crisis' in x['label'].lower() or '1' in x['label'] or 'true' in x['label'].lower() else 0)
        
        is_crisis = 'crisis' in crisis_result['label'].lower() or '1' in crisis_result['label'] or 'true' in crisis_result['label'].lower()
        confidence = crisis_result['score'] if is_crisis else (1 - crisis_result['score'])
        
        return BinaryResult(is_crisis=is_crisis, confidence=confidence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/classify/severity", response_model=SeverityResult)
async def classify_severity(input_data: TextInput):
    if not severity_classifier:
        raise HTTPException(status_code=503, detail="Severity model not loaded")
    
    try:
        results = severity_classifier(input_data.text)[0]
        top_result = max(results, key=lambda x: x['score'])
        
        return SeverityResult(severity=top_result['label'], confidence=top_result['score'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/classify/full", response_model=DualResult)
async def classify_full(input_data: TextInput):
    binary_result = await classify_binary(input_data)
    severity_result = await classify_severity(input_data)
    
    return DualResult(binary=binary_result, severity=severity_result)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    device_name = "CUDA" if torch.cuda.is_available() else "CPU"
    return HealthResponse(
        status="healthy",
        binary_model_loaded=binary_classifier is not None,
        severity_model_loaded=severity_classifier is not None,
        binary_model_path=str(BINARY_MODEL_PATH.absolute()),
        severity_model_path=str(SEVERITY_MODEL_PATH.absolute()),
        device=device_name
    )

@app.get("/")
async def root():
    return {
        "message": "Dual-Model Crisis Classification API",
        "endpoints": {
            "classify_binary": "/classify/binary",
            "classify_severity": "/classify/severity",
            "classify_full": "/classify/full",
            "health": "/health",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    print("🚀 Starting Crisis Classification API...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8001,
        log_level="info"
    )