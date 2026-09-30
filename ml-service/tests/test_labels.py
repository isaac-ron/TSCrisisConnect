import pytest

from labels import binary_result, severity_result


def scores(**by_label):
    return [{"label": label.replace("_", "-"), "score": score} for label, score in by_label.items()]


def test_non_crisis_label_is_not_treated_as_crisis():
    # Regression: "crisis" is a substring of "non-crisis"
    is_crisis, confidence = binary_result(scores(Non_Crisis=0.9, Crisis=0.1))
    assert is_crisis is False
    assert confidence == pytest.approx(0.9)


def test_crisis_label():
    is_crisis, confidence = binary_result(scores(Non_Crisis=0.2, Crisis=0.8))
    assert is_crisis is True
    assert confidence == pytest.approx(0.8)


def test_generic_label_names():
    is_crisis, _ = binary_result([{"label": "LABEL_0", "score": 0.3}, {"label": "LABEL_1", "score": 0.7}])
    assert is_crisis is True


def test_severity_uses_top_label():
    severity, confidence = severity_result(
        [
            {"label": "Critical", "score": 0.1},
            {"label": "High", "score": 0.6},
            {"label": "Low", "score": 0.2},
            {"label": "Medium", "score": 0.1},
        ]
    )
    assert severity == "High"
    assert confidence == pytest.approx(0.6)


def test_severity_rejects_unknown_labels():
    with pytest.raises(ValueError):
        severity_result([{"label": "LABEL_2", "score": 1.0}])
