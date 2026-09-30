---
title: CrisisConnect ML
emoji: 🚨
colorFrom: red
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# CrisisConnect ML Service

FastAPI service that classifies text with two fine-tuned RoBERTa models:

| Model | Hugging Face | Labels |
|---|---|---|
| Binary crisis detector | [`ron4444444/crisis-binary-model`](https://huggingface.co/ron4444444/crisis-binary-model) | `Crisis`, `Non-Crisis` |
| Severity classifier | [`ron4444444/crisis-severity-model`](https://huggingface.co/ron4444444/crisis-severity-model) | `Low`, `Medium`, `High`, `Critical` |

## Endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/classify/binary` | `{"text": "..."}` | `{"is_crisis": true, "confidence": 0.99}` |
| POST | `/classify/severity` | `{"text": "..."}` | `{"severity": "High", "confidence": 0.84}` |
| POST | `/classify/full` | `{"text": "..."}` | both of the above |
| GET | `/health` | | model load status |
| GET | `/docs` | | interactive API docs |

## Configuration

| Variable | Default | Description |
|---|---|---|
| `BINARY_MODEL` | `./my_final_binary_model` | Local directory or Hugging Face Hub model ID |
| `SEVERITY_MODEL` | `./my_final_severity_model_4_class` | Local directory or Hugging Face Hub model ID |
| `HF_TOKEN` | | Only needed if the models are private |
| `ML_SERVICE_PORT` | `8000` | Port when started with `python app.py` |

The Docker image sets both model variables to the Hub models above and bakes the weights in at build time.

## Run locally

```bash
pip install -r requirements.txt
BINARY_MODEL=ron4444444/crisis-binary-model SEVERITY_MODEL=ron4444444/crisis-severity-model python app.py
# → http://localhost:8000/docs
```

Tests (no model download needed):

```bash
pytest
```

## Deploy to a Hugging Face Space

The service uses about 515 MB of RAM with both models loaded: just over the 512 MB limit of free Render instances, but well within the free CPU Space tier (16 GB).

```bash
hf auth login
hf repo create ron4444444/crisisconnect-ml --repo-type space --space_sdk docker
hf upload ron4444444/crisisconnect-ml . . --repo-type space \
  --include Dockerfile README.md requirements.txt app.py labels.py
```

The Space builds automatically and serves at `https://ron4444444-crisisconnect-ml.hf.space`. Point the API server's `ML_SERVICE_URL` there. Free Spaces sleep after 48 hours without traffic; the first request after that wakes it up, and the API server falls back to its heuristic classifier while it does.
