"""Training script for country clustering."""

from __future__ import annotations

from pathlib import Path
from typing import Dict

import joblib
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler
import yaml

from ..data_prep.load_data import read_config
from ..features.feature_engineering import build_model_features

sns.set_theme(style="whitegrid")

CONFIG_MODEL = Path(__file__).resolve().parents[2] / "config" / "model_params.yaml"


def read_params() -> Dict:
    with CONFIG_MODEL.open("r", encoding="utf-8") as stream:
        return yaml.safe_load(stream)


def run_clustering(save_figures: bool = True) -> Path:
    """Execute clustering pipeline and persist labels."""
    project_root = Path(__file__).resolve().parents[2]
    data_cfg = read_config()
    params = read_params().get("clustering", {})

    processed_dir = project_root / data_cfg.get("processed_dir", "data/processed")
    reports_fig_dir = project_root / "reports" / "figures"
    reports_fig_dir.mkdir(parents=True, exist_ok=True)

    summary_path = processed_dir / "country_year_summary.csv"
    feature_df = build_model_features(summary_path)

    feature_cols = ["medals_total", "athletes_unique", "avg_rank", "medal_share", "medals_total_lag_1"]
    available_cols = [c for c in feature_cols if c in feature_df.columns]
    if not available_cols:
        raise ValueError("No feature columns available for clustering.")

    data = feature_df.dropna(subset=available_cols).copy()
    scaler = StandardScaler()
    scaled = scaler.fit_transform(data[available_cols])

    k_values = params.get("k_range", list(range(2, 11)))
    inertias, silhouettes = [], []
    for k in k_values:
        model = KMeans(n_clusters=k, random_state=42, n_init="auto")
        labels = model.fit_predict(scaled)
        inertias.append(model.inertia_)
        silhouettes.append(silhouette_score(scaled, labels))

    if save_figures:
        fig, ax = plt.subplots(1, 2, figsize=(14, 5))
        ax[0].plot(k_values, inertias, marker="o")
        ax[0].set_title("Méthode du coude")
        ax[0].set_xlabel("k")
        ax[0].set_ylabel("Inertie")

        ax[1].plot(k_values, silhouettes, marker="o", color="orange")
        ax[1].set_title("Score de silhouette")
        ax[1].set_xlabel("k")
        ax[1].set_ylabel("Silhouette")
        plt.tight_layout()
        fig.savefig(reports_fig_dir / "clustering_elbow_silhouette.png", dpi=120)
        plt.close(fig)

    best_k = params.get("default_k", 4)
    final_model = KMeans(n_clusters=best_k, random_state=42, n_init="auto")
    labels = final_model.fit_predict(scaled)

    data["cluster"] = labels
    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(scaled)
    data["pca_1"] = coords[:, 0]
    data["pca_2"] = coords[:, 1]

    if save_figures:
        fig, ax = plt.subplots(figsize=(10, 7))
        sns.scatterplot(data=data, x="pca_1", y="pca_2", hue="cluster", palette="tab10", ax=ax, s=70)
        ax.set_title("Clusters de pays (PCA)")
        plt.tight_layout()
        fig.savefig(reports_fig_dir / "clustering_pca.png", dpi=120)
        plt.close(fig)

    output_path = processed_dir / "country_year_clusters.csv"
    data.to_csv(output_path, index=False)

    models_dir = project_root / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": final_model, "scaler": scaler, "features": available_cols}, models_dir / "kmeans_clusters.joblib")

    return output_path


if __name__ == "__main__":
    path = run_clustering()
    print(f"Clusters saved to {path}")
