from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import torch
import uvicorn
import os

from labels import binary_result, severity_result

# Either a local directory or a Hugging Face Hub model ID (e.g. "user/crisis-binary-model").
# Private Hub models are read with the HF_TOKEN environment variable.
BINARY_MODEL = os.getenv("BINARY_MODEL", "./my_final_binary_model")
SEVERITY_MODEL = os.getenv("SEVERITY_MODEL", "./my_final_severity_model_4_class")

binary_classifier = None
severity_classifier = None


def load_classifier(name, source, device, device_name):
    print(f"🚀 Loading {name} model from {source}...")
    try:
        classifier = pipeline("text-classification", model=source, device=device, token=os.getenv("HF_TOKEN"))
        print(f"✅ {name.capitalize()} model loaded on {device_name}!")
        return classifier
    except Exception as e:
        print(f"❌ Failed to load {name} model: {e}")
        return None


@asynccontextmanager
async def lifespan(app):
    global binary_classifier, severity_classifier
    device = 0 if torch.cuda.is_available() else -1
    device_name = "CUDA" if torch.cuda.is_available() else "CPU"
    binary_classifier = load_classifier("binary", BINARY_MODEL, device, device_name)
    severity_classifier = load_classifier("severity", SEVERITY_MODEL, device, device_name)
    yield


app = FastAPI(
    title="Crisis Classification API",
    description="ML service for dual-model crisis classification",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    binary_model: str
    severity_model: str
    device: str


@app.post("/classify/binary", response_model=BinaryResult)
async def classify_binary(input_data: TextInput):
    if not binary_classifier:
        raise HTTPException(status_code=503, detail="Binary model not loaded")
    try:
        # A list input always yields one list of per-class scores per text
        scores = binary_classifier([input_data.text], top_k=None)[0]
        is_crisis, confidence = binary_result(scores)
        return BinaryResult(is_crisis=is_crisis, confidence=confidence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify/severity", response_model=SeverityResult)
async def classify_severity(input_data: TextInput):
    if not severity_classifier:
        raise HTTPException(status_code=503, detail="Severity model not loaded")
    try:
        scores = severity_classifier([input_data.text], top_k=None)[0]
        severity, confidence = severity_result(scores)
        return SeverityResult(severity=severity, confidence=confidence)
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
        binary_model=BINARY_MODEL,
        severity_model=SEVERITY_MODEL,
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
    host = os.getenv("ML_SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("ML_SERVICE_PORT", "8000"))
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
