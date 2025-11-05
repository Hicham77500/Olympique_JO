"""Supervised training for medal prediction."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple

import joblib
import pandas as pd
import yaml
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
import matplotlib.pyplot as plt
from sklearn.metrics import ConfusionMatrixDisplay, classification_report, confusion_matrix
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ..data_prep.load_data import read_config

CONFIG_MODEL = Path(__file__).resolve().parents[2] / "config" / "model_params.yaml"


def read_params() -> Dict:
    with CONFIG_MODEL.open("r", encoding="utf-8") as stream:
        return yaml.safe_load(stream)


def load_training_data(processed_dir: Path) -> pd.DataFrame:
    data_path = processed_dir / "olympic_full.csv"
    if not data_path.exists():
        raise FileNotFoundError("Processed dataset missing. Run preprocessing first.")
    return pd.read_csv(data_path)


def build_pipeline(numeric_cols, categorical_cols) -> ColumnTransformer:
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ]
    )


def run_training() -> Tuple[Path, Dict]:
    project_root = Path(__file__).resolve().parents[2]
    data_cfg = read_config()
    params = read_params().get("classification", {})
    random_state = read_params().get("global", {}).get("random_state", 42)

    processed_dir = project_root / data_cfg.get("processed_dir", "data/processed")
    reports_dir = project_root / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    figures_dir = reports_dir / "figures"
    figures_dir.mkdir(parents=True, exist_ok=True)

    df = load_training_data(processed_dir)
    target_col = "medal_flag"
    drop_cols = {
        target_col,
        "athlete_url",
        "athlete_full_name",
        "medal_type_result",
        "medal_type_medals",
        "medal_type_final",
    }
    feature_cols = [col for col in df.columns if col not in drop_cols]

    X = df[feature_cols]
    y = df[target_col].astype(int)

    numeric_cols = X.select_dtypes(include=["number"]).columns.tolist()
    categorical_cols = X.select_dtypes(include=["object"]).columns.tolist()

    preprocessor = build_pipeline(numeric_cols, categorical_cols)

    base_estimator = RandomForestClassifier(random_state=random_state)
    pipeline = Pipeline([
        ("preprocess", preprocessor),
        ("clf", base_estimator),
    ])

    test_size = params.get("test_size", 0.2)
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )

    grid_cfg = params.get("gridsearch", {})
    grid = GridSearchCV(
        pipeline,
        param_grid=grid_cfg.get("params", {}),
        cv=grid_cfg.get("cv", 5),
        scoring=params.get("scoring", "accuracy"),
        n_jobs=grid_cfg.get("n_jobs", -1),
        verbose=grid_cfg.get("verbose", 1),
    )
    grid.fit(X_train, y_train)

    y_pred = grid.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)

    cm = confusion_matrix(y_test, y_pred, labels=grid.best_estimator_.named_steps["clf"].classes_)
    disp = ConfusionMatrixDisplay(cm, display_labels=grid.best_estimator_.named_steps["clf"].classes_)
    fig, ax = plt.subplots(figsize=(6, 5))
    disp.plot(ax=ax, colorbar=False)
    ax.set_title("Confusion Matrix - Medal Prediction")
    ax.set_xlabel("Predicted label")
    ax.set_ylabel("True label")
    plt.tight_layout()
    confusion_path = figures_dir / "classification_confusion_matrix.png"
    fig.savefig(confusion_path, dpi=150)
    plt.close(fig)

    models_dir = project_root / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    model_path = models_dir / "rf_classifier_medal.joblib"
    joblib.dump(grid.best_estimator_, model_path)

    metrics_path = reports_dir / "classification_metrics.csv"
    pd.DataFrame(report).to_csv(metrics_path)

    return model_path, {
        "best_params": grid.best_params_,
        "metrics_path": metrics_path,
        "confusion_matrix_path": confusion_path,
        "report": report,
    }


if __name__ == "__main__":
    path, info = run_training()
    print(f"Model saved to {path}")
    print(f"Best params: {info['best_params']}")
