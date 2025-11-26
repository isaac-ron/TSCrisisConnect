print("1. Script started")
import sys
sys.stdout.flush()

print("2. About to import FastAPI")
sys.stdout.flush()
from fastapi import FastAPI

print("3. About to import transformers")
sys.stdout.flush()
from transformers import pipeline

print("4. About to load model")
sys.stdout.flush()

try:
    print("5. Loading distilbert...")
    sys.stdout.flush()
    classifier = pipeline("text-classification", model="distilbert-base-uncased-finetuned-sst-2-english")
    print("6. Model loaded!")
    sys.stdout.flush()
    
    print("7. Testing model...")
    sys.stdout.flush()
    result = classifier("This is a test")
    print(f"8. Result: {result}")
    sys.stdout.flush()
except Exception as e:
    print(f"ERROR: {e}")
    sys.stdout.flush()
    import traceback
    traceback.print_exc()
