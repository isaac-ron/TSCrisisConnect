# Crisis Classification ML Service

FastAPI service for crisis text classification using CrisisTransformers model.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Ensure your model is in the correct location:**
   ```
   ../nlp-service/CrisisTransformers/CT-M1-Complete/
   ├── config.json
   ├── model.safetensors (or pytorch_model.bin)
   ├── tokenizer_config.json
   ├── tokenizer.json
   └── vocab.json
   ```

3. **Start the service:**
   ```bash
   python app.py
   ```

   The service will start on `http://localhost:8001`

## API Endpoints

- **POST /classify** - Classify text as crisis/non-crisis
- **GET /health** - Check service and model status
- **GET /** - API information
- **GET /docs** - Interactive API documentation

## Example Usage

```bash
# Check if service is healthy
curl http://localhost:8001/health

# Classify text
curl -X POST http://localhost:8001/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "Building fire downtown, people trapped"}'
```

## Integration

The Node.js service (`server/src/nlp/local-model-loader.js`) automatically connects to this Python service when available, falling back to public models if not.

## Environment Variables

- `ML_SERVICE_URL` - URL of this service (default: http://localhost:8001)