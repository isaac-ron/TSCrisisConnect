from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Crisis Classification API - Simple Test")

class TextInput(BaseModel):
    text: str

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Simple ML service is running"}

@app.post("/classify")
async def classify_text(input_data: TextInput):
    # Simple mock response for testing
    return {
        "label": "CRISIS",
        "confidence": 0.85,
        "is_crisis": True
    }

if __name__ == "__main__":
    print("Starting simple ML service...")
    uvicorn.run(app, host="0.0.0.0", port=8001)