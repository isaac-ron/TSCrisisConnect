# CrisisConnect ML Service

FastAPI service that classifies text with two fine-tuned RoBERTa models, served as int8-quantized ONNX models so the service fits a 512 MB instance.

| Model | Hugging Face | Labels |
|---|---|---|
| Binary crisis detector | [`ron4444444/crisis-binary-model`](https://huggingface.co/ron4444444/crisis-binary-model) | `Crisis`, `Non-Crisis` |
| Severity classifier | [`ron4444444/crisis-severity-model`](https://huggingface.co/ron4444444/crisis-severity-model) | `Low`, `Medium`, `High`, `Critical` |

## Endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/classify/binary` | `{"text": "..."}` | `{"is_crisis": true, "confidence": 0.99}` |
| POST | `/classify/severity` | `{"text": "..."}` | `{"severity": "High", "confidence": 0.85}` |
| POST | `/classify/full` | `{"text": "..."}` | both of the above |
| GET | `/health` | | model status; `503` if a model failed to load |
| GET | `/docs` | | interactive API docs |

Input is truncated to 128 tokens (the models accept at most 130 positions).

## Quantization

The full-precision models are ~515 MB each and need torch, so the pair uses ~515 MB of RAM with torch loaded, over the 512 MB limit of free hosting tiers. The service instead runs them on ONNX Runtime with dynamic int8 quantization:

| | Full precision (PyTorch) | int8 ONNX |
|---|---|---|
| Model file | 515 MB | 130 MB |
| Service memory | ~515 MB | ~370 MB steady, ~410 MB peak under 40 concurrent requests |
| Docker image | 3.8 GB | 448 MB |
| Dependencies | torch, transformers | onnxruntime, tokenizers |

Agreement between the int8 and full-precision predictions, measured on 3,000 tweets from the [CrisisBench](https://huggingface.co/datasets/QCRI/CrisisBench-english) informativeness test split:

| Model | Default int8 | `per_channel` + `reduce_range` (used) |
|---|---|---|
| Binary | 68.4% | **98.0%** |
| Severity | 59.8% | **90.7%** (88.7% on texts the binary model calls a crisis; 3.2% move 2+ levels) |

Default dynamic quantization overflowed on CPUs without VNNI instructions; `reduce_range` avoids that on any x86 CPU.

Two runtime settings keep memory predictable (both measured on Linux under a 512 MB cap):

- `session.disable_prepacking`: pre-packed weights cost ~65 MB extra per model.
- `MALLOC_ARENA_MAX=2`: glibc per-thread arenas added ~100 MB under concurrent load.

Inference is serialized per model; on a fractional CPU, parallel runs only add memory.

### Binary model on CrisisBench

As a rough external check, the binary model scores 69.5% accuracy (macro F1 0.695) against CrisisBench's `informative` / `not_informative` labels (int8: 69.0%). This is a proxy, not the task the model was trained for: most disagreements are live emergencies labelled `not_informative` ("#NepalEarthquake death toll reaches 2000", "Tornado Warning for Bee, Goliad and Refugio Counties") or non-emergencies labelled `informative` ("glad i moved from tornado alley").

## Configuration

| Variable | Default | Description |
|---|---|---|
| `BINARY_MODEL` | `ron4444444/crisis-binary-model` | Hugging Face model ID or local directory |
| `SEVERITY_MODEL` | `ron4444444/crisis-severity-model` | Hugging Face model ID or local directory |
| `HF_TOKEN` | | Only needed if the model repos are private |
| `ORT_THREADS` | `1` | ONNX Runtime threads per inference |
| `MALLOC_ARENA_MAX` | | Set to `2` on Linux (see above) |

Each model location must contain `config.json`, `tokenizer.json` and `onnx/model_quantized.onnx`.

## Run locally

```bash
pip install -r requirements.txt
python app.py            # http://localhost:8000/docs
pytest                   # label-mapping tests, no model download
```

Or with Docker:

```bash
docker build -t crisisconnect-ml .
docker run -p 8000:8000 crisisconnect-ml
```

## Deploy

`render.yaml` at the repo root deploys this service to a free Render instance. The first request after an idle spin-down waits for the models to download and load; the API server uses its keyword-based fallback until then.

## Regenerating the ONNX models

```bash
pip install -r tools/requirements.txt
python tools/export_onnx.py
hf upload ron4444444/crisis-binary-model onnx-export/binary/model_quantized.onnx onnx/model_quantized.onnx
hf upload ron4444444/crisis-severity-model onnx-export/severity/model_quantized.onnx onnx/model_quantized.onnx
```

The script exports each model, quantizes it with the settings above, and exits with an error if agreement with the full-precision model drops below the thresholds in the script.
