import os
from huggingface_hub import InferenceClient
import huggingface_hub

# Load variables directly for testing
HF_TOKEN = "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"
HF_USERNAME = "ron4444444"
BINARY_MODEL_ID = f"{HF_USERNAME}/crisis-binary-model"

print(f"Testing with HF_TOKEN: {HF_TOKEN[:5]}...")
print(f"Model ID: {BINARY_MODEL_ID}")
print(f"HF Hub Version: {huggingface_hub.__version__}")

client = InferenceClient(token=HF_TOKEN)

try:
    print("Attempting text_classification...")
    result = client.text_classification("Intense hurricane sweeping over Baton Rouge!", model=BINARY_MODEL_ID)
    print(f"Success! Result type: {type(result)}")
    print(f"Result: {result}")
except Exception as e:
    print(f"❌ Error: {repr(e)}")
    import traceback
    traceback.print_exc()
