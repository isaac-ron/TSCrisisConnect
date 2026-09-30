from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os

from classifier import OnnxTextClassifier
from labels import binary_result, severity_result

# Either a local directory or a Hugging Face Hub model ID. Each must contain config.json,
# tokenizer.json and onnx/model_quantized.onnx. Private Hub models are read with HF_TOKEN.
BINARY_MODEL = os.getenv("BINARY_MODEL", "ron4444444/crisis-binary-model")
SEVERITY_MODEL = os.getenv("SEVERITY_MODEL", "ron4444444/crisis-severity-model")

binary_classifier = None
severity_classifier = None


def load_classifier(name, source):
    print(f"🚀 Loading {name} model from {source}...")
    try:
        classifier = OnnxTextClassifier(source)
        print(f"✅ {name.capitalize()} model loaded (ONNX Runtime, int8)!")
        return classifier
    except Exception as e:
        print(f"❌ Failed to load {name} model: {e}")
        return None


@asynccontextmanager
async def lifespan(app):
    global binary_classifier, severity_classifier
    binary_classifier = load_classifier("binary", BINARY_MODEL)
    severity_classifier = load_classifier("severity", SEVERITY_MODEL)
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
def classify_binary(input_data: TextInput):
    if not binary_classifier:
        raise HTTPException(status_code=503, detail="Binary model not loaded")
    try:
        is_crisis, confidence = binary_result(binary_classifier(input_data.text))
        return BinaryResult(is_crisis=is_crisis, confidence=confidence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify/severity", response_model=SeverityResult)
def classify_severity(input_data: TextInput):
    if not severity_classifier:
        raise HTTPException(status_code=503, detail="Severity model not loaded")
    try:
        severity, confidence = severity_result(severity_classifier(input_data.text))
        return SeverityResult(severity=severity, confidence=confidence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify/full", response_model=DualResult)
def classify_full(input_data: TextInput):
    return DualResult(binary=classify_binary(input_data), severity=classify_severity(input_data))


@app.get("/health", response_model=HealthResponse)
async def health_check(response: Response):
    healthy = binary_classifier is not None and severity_classifier is not None
    if not healthy:
        # Fail the platform health check instead of serving 503s from every endpoint
        response.status_code = 503
    return HealthResponse(
        status="healthy" if healthy else "models not loaded",
        binary_model_loaded=binary_classifier is not None,
        severity_model_loaded=severity_classifier is not None,
        binary_model=BINARY_MODEL,
        severity_model=SEVERITY_MODEL,
        device="CPU (ONNX Runtime, int8)"
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
