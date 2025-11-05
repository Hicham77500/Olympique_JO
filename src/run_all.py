"""End-to-end pipeline runner for the Olympic ML project."""

from __future__ import annotations

from pathlib import Path

from .data_prep.preprocess import run_preprocessing
from .models.train_clustering import run_clustering
from .models.train_medal_predictor import run_training


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    print("[1/3] Running preprocessing...")
    full_path, summary_path = run_preprocessing()
    print(f"    Saved detailed dataset at {full_path}")
    print(f"    Saved summary dataset at {summary_path}")

    print("[2/3] Training clustering model...")
    clusters_path = run_clustering()
    print(f"    Saved clusters at {clusters_path}")

    print("[3/3] Training classification model...")
    model_path, info = run_training()
    print(f"    Saved classifier at {model_path}")
    print(f"    Best params: {info['best_params']}")


if __name__ == "__main__":
    main()
