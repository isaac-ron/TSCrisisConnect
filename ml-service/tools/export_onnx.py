"""Export the fine-tuned models to ONNX, quantize them to int8, and check parity.

    pip install -r tools/requirements.txt
    python tools/export_onnx.py            # writes onnx-export/<name>/model_quantized.onnx
    python tools/export_onnx.py priority   # just one model

Then upload each file to its model repo as onnx/model_quantized.onnx (see README).

Quantization settings matter: plain dynamic int8 flipped ~30% of binary predictions
(u8s8 overflow on CPUs without VNNI). per_channel + reduce_range brings agreement with
the full-precision model to ~98% (binary) / ~91% (severity) on CrisisBench tweets.

The priority model comes from train_crisis_models.ipynb in the crisisconnectmodels repo. The binary model is the
original one: a retrained version scored lower on every external test set.
"""
import os
import sys

import numpy as np
import onnx
import onnxruntime as ort
import pandas as pd
import torch
from huggingface_hub import snapshot_download
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODELS = {"binary": "ron4444444/crisis-binary-model", "priority": "ron4444444/crisis-priority-model"}
OUT = os.path.join(os.path.dirname(__file__), "..", "onnx-export")
# Public crisis tweets, used only to compare the full-precision and int8 models
PARITY_DATA = (
    "https://huggingface.co/datasets/QCRI/CrisisBench-english/resolve/refs%2Fconvert%2Fparquet/"
    "informativeness/test/0000.parquet"
)
MIN_AGREEMENT = {"binary": 0.97, "priority": 0.88}

if onnx.__version__.startswith("1.23"):
    # onnx 1.23's infer_shapes_path sometimes writes an empty file, which the quantizer
    # then reports as "Failed to find proper ai.onnx domain"
    sys.exit("onnx 1.23.x breaks quantization; install the version in tools/requirements.txt")


def predict(session_path, tokenizer, texts):
    session = ort.InferenceSession(session_path, providers=["CPUExecutionProvider"])
    preds = []
    for text in texts:
        enc = tokenizer(text, truncation=True, max_length=128, return_tensors="np")
        logits = session.run(["logits"], {k: enc[k].astype(np.int64) for k in ("input_ids", "attention_mask")})[0]
        preds.append(int(logits.argmax()))
    return np.array(preds)


texts = pd.read_parquet(PARITY_DATA).sample(n=500, random_state=0).text.tolist()
failed = False

selected = sys.argv[1:] or list(MODELS)
for name, repo in ((n, MODELS[n]) for n in selected):
    src = snapshot_download(repo)
    out_dir = os.path.join(OUT, name)
    os.makedirs(out_dir, exist_ok=True)
    fp32 = os.path.join(out_dir, "model.onnx")
    int8 = os.path.join(out_dir, "model_quantized.onnx")

    model = AutoModelForSequenceClassification.from_pretrained(src).eval()
    tokenizer = AutoTokenizer.from_pretrained(src)
    sample = tokenizer(["example text for tracing"], return_tensors="pt")
    torch.onnx.export(
        model,
        (sample["input_ids"], sample["attention_mask"]),
        fp32,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={"input_ids": {0: "batch", 1: "seq"}, "attention_mask": {0: "batch", 1: "seq"}, "logits": {0: "batch"}},
        opset_version=17,
        dynamo=False,
    )

    for attempt in range(5):
        # Shape inference can also fail transiently when the disk is nearly full
        try:
            quantize_dynamic(fp32, int8, weight_type=QuantType.QInt8, per_channel=True, reduce_range=True)
            onnx.checker.check_model(int8)
            break
        except Exception as error:
            print(f"{name}: quantization attempt {attempt + 1} failed: {error}")
    else:
        sys.exit(f"{name}: quantization failed")

    agreement = (predict(fp32, tokenizer, texts) == predict(int8, tokenizer, texts)).mean()
    print(f"{name}: {os.path.getsize(fp32) / 2**20:.0f} MB -> {os.path.getsize(int8) / 2**20:.0f} MB, "
          f"agreement with full precision {agreement:.1%}")
    failed |= agreement < MIN_AGREEMENT[name]
    os.remove(fp32)

sys.exit("int8 models drifted from full precision" if failed else 0)
