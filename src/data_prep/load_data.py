"""Utility helpers to load Olympic datasets based on YAML configuration."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional

import pandas as pd
import yaml

CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "data_paths.yaml"


def read_config(config_path: Optional[Path] = None) -> dict:
    """Read the YAML configuration file that stores dataset locations."""
    path = config_path or CONFIG_PATH
    with path.open("r", encoding="utf-8") as stream:
        return yaml.safe_load(stream)


def _resolve_path(base: Path, fallback: Path, filename: str) -> Path:
    """Return the first existing path for the given filename."""
    primary = base / filename
    if primary.exists():
        return primary
    alternative = fallback / filename
    if alternative.exists():
        return alternative
    raise FileNotFoundError(f"Cannot locate {filename} in {base} or {fallback}.")


def load_datasets(config: Optional[dict] = None) -> Dict[str, pd.DataFrame]:
    """Load raw Olympic CSV datasets and return them in a dictionary."""
    cfg = config or read_config()
    project_root = Path(__file__).resolve().parents[2]

    data_root = project_root / cfg.get("data_root", "data")
    raw_dir = project_root / cfg.get("raw_dir", "data/raw")
    processed_dir = project_root / cfg.get("processed_dir", "data/processed")

    # Create folders when running the pipeline locally for the first time.
    raw_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)

    files = cfg.get("files", {})
    results_path = _resolve_path(raw_dir, data_root, files.get("results", "olympic_results.csv"))
    medals_path = _resolve_path(raw_dir, data_root, files.get("medals", "olympic_medals.csv"))
    athletes_path = _resolve_path(raw_dir, data_root, files.get("athletes", "olympic_athletes.csv"))

    return {
        "results": pd.read_csv(results_path),
        "medals": pd.read_csv(medals_path),
        "athletes": pd.read_csv(athletes_path),
        "processed_dir": processed_dir,
    }
