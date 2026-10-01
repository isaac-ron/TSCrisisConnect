# CrisisConnect ML Service

FastAPI service that classifies text with two fine-tuned RoBERTa models ([`CT-M1-Complete`](https://huggingface.co/crisistransformers/CT-M1-Complete) base), served as int8-quantized ONNX models so the service fits a 512 MB instance.

| Model | Hugging Face | Labels | Question it answers |
|---|---|---|---|
| Binary crisis detector | [`ron4444444/crisis-binary-model`](https://huggingface.co/ron4444444/crisis-binary-model) | `Crisis`, `Non-Crisis` | Is this text about a crisis? |
| Priority classifier | [`ron4444444/crisis-priority-model`](https://huggingface.co/ron4444444/crisis-priority-model) | `Low`, `Medium`, `High`, `Critical` | How urgently does a responder need to see it? |

The priority model is trained on [TREC Incident Streams](https://www.dcs.gla.ac.uk/~richardm/TREC_IS/) and follows its definition of priority: how actionable the information is for an emergency manager, not how large the event is. It is served on the `/classify/severity` endpoint, which kept its name for API compatibility. Training code and full metrics: [crisisconnectmodels](https://github.com/isaac-ron/crisisconnectmodels).

Neither model verifies anything: they classify crisis *language*. Whether an event is real is decided by corroboration and human review elsewhere in CrisisConnect.

## Endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/classify/binary` | `{"text": "..."}` | `{"is_crisis": true, "confidence": 0.99}` |
| POST | `/classify/severity` | `{"text": "..."}` | `{"severity": "High", "confidence": 0.85}` |
| POST | `/classify/full` | `{"text": "..."}` | both of the above |
| GET | `/health` | | model status; `503` if a model failed to load |
| GET | `/docs` | | interactive API docs |

Input is truncated to 128 tokens (the models accept at most 130 positions).

## Model evaluation

All test sets below were never used for training or model selection, and tweets overlapping the training data were removed from them.

**Binary model**

| Test set | Tweets | Accuracy | Crisis precision | Crisis recall | Macro F1 |
|---|---|---|---|---|---|
| [NLP with Disaster Tweets](https://www.kaggle.com/competitions/nlp-getting-started) (2015) | 6,737 | 0.798 | 0.859 | 0.603 | 0.777 |
| TREC-IS, held-out events | 14,932 | 0.768 | 0.663 | 0.776 | 0.760 |

A retrained binary model that added TREC-IS's *Irrelevant* tweets as negatives scored lower on both (macro F1 0.703 and 0.747): TREC-IS calls ordinary disaster chatter irrelevant, while these test sets count it as crisis-related, so the extra negatives taught a stricter definition and cut recall from 60% to 44%. The original model was kept. Its original training data is unknown, though overlap checks found no sign it saw these test sets.

**Priority model**, on 10,210 tweets from TREC-IS disasters held out from training:

| | Previous severity model | Priority model |
|---|---|---|
| Macro F1 | 0.273 | **0.416** |
| Accuracy | 36.9% | **47.4%** |
| Off by 2+ levels | 27.3% | **10.2%** |
| High/Critical recall | 36% | **60%** |
| High/Critical precision | 21% | **40%** |

Four-level priority is subjective and the annotations are noisy, so outputs are triage hints for a reviewer. On the project's Kenya-focused tweets, which carry *event severity* labels, the two notions often disagree: news-style reports of distant disasters ("A major earthquake has struck Turkey…") are rated Low priority, which suits a local responder queue, but the model also over-escalates minor local incidents ("small leak", "no injuries"), since TREC-IS has few such reports.

## Quantization

The full-precision models are ~515 MB each and need torch, so the pair uses ~515 MB of RAM with torch loaded, over the 512 MB limit of free hosting tiers. The service instead runs them on ONNX Runtime with dynamic int8 quantization:

| | Full precision (PyTorch) | int8 ONNX |
|---|---|---|
| Model file | 515 MB | 130 MB |
| Service memory | ~515 MB | ~370 MB steady, ~410 MB peak under 40 concurrent requests |
| Docker image | 3.8 GB | 448 MB |
| Dependencies | torch, transformers | onnxruntime, tokenizers |

Agreement between int8 and full-precision predictions:

| Model | Project tweets | CrisisBench sample | Default int8 settings (CrisisBench) |
|---|---|---|---|
| Binary | **99.8%** | **98.0%** | 68.4% |
| Priority | **89.0%** (High/Critical flag: 95.6%; off by 2+: 1.3%) | **95.6%** | |

Default dynamic quantization overflowed on CPUs without VNNI instructions; `per_channel` + `reduce_range` avoids that on any x86 CPU.

Two runtime settings keep memory predictable (both measured on Linux under a 512 MB cap):

- `session.disable_prepacking`: pre-packed weights cost ~65 MB extra per model.
- `MALLOC_ARENA_MAX=2`: glibc per-thread arenas added ~100 MB under concurrent load.

Inference is serialized per model; on a fractional CPU, parallel runs only add memory.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `BINARY_MODEL` | `ron4444444/crisis-binary-model` | Hugging Face model ID or local directory |
| `SEVERITY_MODEL` | `ron4444444/crisis-priority-model` | Hugging Face model ID or local directory |
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
python tools/export_onnx.py                  # or: python tools/export_onnx.py priority
hf upload ron4444444/crisis-binary-model onnx-export/binary/model_quantized.onnx onnx/model_quantized.onnx
hf upload ron4444444/crisis-priority-model onnx-export/priority/model_quantized.onnx onnx/model_quantized.onnx
```

The script exports each model, quantizes it with the settings above, and exits with an error if agreement with the full-precision model drops below the thresholds in the script.
