"""Text classification with an int8-quantized ONNX model and a Hugging Face tokenizer.

Replaces the transformers/torch pipeline: same predictions (measured), ~4x smaller
model files, and small enough to run on a 512 MB instance.
"""
import json
import os
import threading

import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer

# The models' max_position_embeddings is 130 (RoBERTa reserves 2 positions)
MAX_TOKENS = 128
MODEL_FILE = "onnx/model_quantized.onnx"


def _resolve(source, filename):
    """source is either a local directory or a Hugging Face Hub model ID."""
    if os.path.isdir(source):
        return os.path.join(source, filename)
    return hf_hub_download(source, filename, token=os.getenv("HF_TOKEN"))


class OnnxTextClassifier:
    def __init__(self, source):
        with open(_resolve(source, "config.json"), encoding="utf-8") as f:
            self.id2label = {int(k): v for k, v in json.load(f)["id2label"].items()}

        self.tokenizer = Tokenizer.from_file(_resolve(source, "tokenizer.json"))
        self.tokenizer.enable_truncation(MAX_TOKENS)
        self.tokenizer.no_padding()

        options = ort.SessionOptions()
        # The memory arena pre-allocates and keeps buffers; off keeps RSS low on small instances
        options.enable_cpu_mem_arena = False
        # Pre-packing keeps a second, packed copy of every int8 weight matrix: ~65 MB more per
        # model on Linux for ~30% faster inference. Memory is the constraint on a 512 MB instance.
        options.add_session_config_entry("session.disable_prepacking", "1")
        options.intra_op_num_threads = int(os.getenv("ORT_THREADS", "1"))
        self.session = ort.InferenceSession(_resolve(source, MODEL_FILE), options, providers=["CPUExecutionProvider"])
        # One inference at a time: concurrent runs each allocate working buffers, and 20 parallel
        # requests exceeded 512 MB in testing. On a fractional CPU, parallelism gains nothing anyway.
        self._lock = threading.Lock()

    def __call__(self, text):
        """Returns [{"label": str, "score": float}, ...] for every class."""
        encoding = self.tokenizer.encode(text)
        inputs = {
            "input_ids": np.array([encoding.ids], dtype=np.int64),
            "attention_mask": np.array([encoding.attention_mask], dtype=np.int64),
        }
        with self._lock:
            logits = self.session.run(["logits"], inputs)[0][0]
        exp = np.exp(logits - logits.max())
        probs = exp / exp.sum()
        return [{"label": self.id2label[i], "score": float(p)} for i, p in enumerate(probs)]
