"""Utility script to push processed aggregation and prediction data into MySQL."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional

import mysql.connector
import pandas as pd

from ..data_prep.load_data import read_config


def connect_mysql(host: str, user: str, password: str, database: str = "olympics"):
    return mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        autocommit=True,
    )


def insert_country_summary(cursor, df: pd.DataFrame) -> int:
    count = 0
    for row in df.itertuples(index=False):
        cursor.callproc(
            "InsertCountrySummary",
            [
                getattr(row, "country_name", None),
                getattr(row, "slug_game", None),
                int(getattr(row, "medals_total", 0)),
                int(getattr(row, "athletes_unique", 0)),
                float(getattr(row, "avg_rank", 0) or 0.0),
                float(getattr(row, "medal_share", 0) or 0.0),
                int(getattr(row, "medals_total_lag_1", 0)),
                int(getattr(row, "athletes_unique_lag_1", 0)),
            ],
        )
        count += 1
    return count


def insert_medal_predictions(cursor, df: pd.DataFrame, model_name: str, target: str) -> int:
    count = 0
    for row in df.itertuples(index=False):
        cursor.callproc(
            "InsertMedalPrediction",
            [
                getattr(row, "country_name", None),
                getattr(row, "slug_game", None),
                model_name,
                target,
                float(getattr(row, "predicted_value", getattr(row, "predicted_medals", 0)) or 0.0),
            ],
        )
        count += 1
    return count


def load_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Missing file: {path}")
    return pd.read_csv(path)


def main(host: str, user: str, password: str, database: str = "olympics") -> None:
    project_root = Path(__file__).resolve().parents[2]
    data_cfg = read_config()

    processed_dir = project_root / data_cfg.get("processed_dir", "data/processed")
    reports_dir = project_root / "reports"

    country_summary_path = processed_dir / "country_year_summary.csv"
    medal_predictions_path = reports_dir / "medal_predictions.csv"

    conn = connect_mysql(host, user, password, database)
    cursor = conn.cursor()

    try:
        country_df = load_csv(country_summary_path)
        inserted_summary = insert_country_summary(cursor, country_df)
        print(f"Inserted {inserted_summary} rows into country_year_summary")

        if medal_predictions_path.exists():
            predictions_df = load_csv(medal_predictions_path)
            model_name = predictions_df.columns[-1] if "model_name" not in predictions_df.columns else predictions_df["model_name"].iloc[0]
            target_column = "target" if "target" in predictions_df.columns else "medals_total"
            if target_column in predictions_df.columns:
                grouped = predictions_df.groupby(target_column)
                total_inserted = 0
                for target, group in grouped:
                    group = group.assign(predicted_value=group.get("predicted_value", group.get("predicted_medals")))
                    inserted = insert_medal_predictions(cursor, group, model_name if isinstance(model_name, str) else "unknown_model", target)
                    total_inserted += inserted
                print(f"Inserted {total_inserted} rows into medal_predictions")
            else:
                predictions_df = predictions_df.rename(columns={predictions_df.columns[-1]: "predicted_value"})
                inserted = insert_medal_predictions(
                    cursor,
                    predictions_df,
                    model_name if isinstance(model_name, str) else "unknown_model",
                    "medals_total",
                )
                print(f"Inserted {inserted} rows into medal_predictions")
        else:
            print("No medal_predictions.csv found, skipping prediction inserts.")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load processed prediction data into MySQL")
    parser.add_argument("--host", required=True, help="MySQL host")
    parser.add_argument("--user", required=True, help="MySQL user")
    parser.add_argument("--password", required=True, help="MySQL password")
    parser.add_argument("--database", default="olympics", help="MySQL database name")
    args = parser.parse_args()
    main(args.host, args.user, args.password, args.database)
