"""Utility functions to log and persist evaluation metrics."""

from __future__ import annotations

from pathlib import Path
from typing import Dict

import pandas as pd


def save_classification_report(report: Dict, output_path: Path) -> Path:
    """Persist a classification report dictionary as CSV."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(report).to_csv(output_path)
    return output_path


def save_regression_scores(scores: Dict[str, Dict[str, float]], output_path: Path) -> Path:
    """Persist regression metrics for multiple models."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame.from_dict(scores, orient="index")
    df.to_csv(output_path)
    return output_path


def append_summary(summary_path: Path, section: str, content: str) -> None:
    """Append a short summary block to the project report file."""
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    with summary_path.open("a", encoding="utf-8") as handle:
        handle.write(f"\n## {section}\n{content}\n")
