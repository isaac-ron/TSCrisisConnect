"""Turns raw text-classification pipeline scores into API results.

Kept free of torch/transformers imports so it can be unit-tested cheaply.
"""

# Exact label names (lowercased) that mean "crisis". Matching must be exact:
# a substring check would also match "Non-Crisis".
CRISIS_LABELS = {"crisis", "label_1"}

SEVERITY_LEVELS = ("Low", "Medium", "High", "Critical")


def binary_result(scores):
    """scores: list of {"label": str, "score": float} for every class."""
    crisis_score = sum(s["score"] for s in scores if s["label"].strip().lower() in CRISIS_LABELS)
    is_crisis = crisis_score >= 0.5
    confidence = crisis_score if is_crisis else 1 - crisis_score
    return is_crisis, confidence


def severity_result(scores):
    """Returns the top label, normalised to one of SEVERITY_LEVELS."""
    top = max(scores, key=lambda s: s["score"])
    label = top["label"].strip().lower()
    severity = next((level for level in SEVERITY_LEVELS if level.lower() == label), None)
    if severity is None:
        raise ValueError(f"Unexpected severity label from model: {top['label']!r}")
    return severity, top["score"]
