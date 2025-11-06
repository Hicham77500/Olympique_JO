"""Utility script to push processed aggregation and prediction data into MySQL."""

from __future__ import annotations

import argparse
from pathlib import Path

import mysql.connector
import pandas as pd

from ..data_prep.load_data import read_config

PREDICTION_INSERT_SQL = (
    "INSERT INTO medal_predictions "
    "(country_name, slug_game, model_name, target, predicted_value) "
    "VALUES (%s, %s, %s, %s, %s) "
    "ON DUPLICATE KEY UPDATE "
    "predicted_value = VALUES(predicted_value), "
    "model_name = VALUES(model_name), "
    "target = VALUES(target), "
    "created_at = CURRENT_TIMESTAMP"
)


def run_sql_script(connection, script_path: Path) -> None:
    """Execute an SQL script file (comments ignored)."""
    if not script_path.exists():
        print(f"⚠️  SQL init script missing: {script_path}")
        return

    raw_sql = script_path.read_text(encoding="utf-8")
    usable_lines = []
    for line in raw_sql.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            continue
        usable_lines.append(line)

    statements = [stmt.strip() for stmt in "\n".join(usable_lines).split(";") if stmt.strip()]
    cursor = connection.cursor()
    try:
        for statement in statements:
            cursor.execute(statement)
        connection.commit()
    finally:
        cursor.close()


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
    payload = []
    for row in df.itertuples(index=False):
        payload.append(
            (
                getattr(row, "country_name", None),
                getattr(row, "slug_game", None),
                model_name,
                target,
                float(getattr(row, "predicted_value", getattr(row, "predicted_medals", 0)) or 0.0),
            )
        )

    if not payload:
        return 0

    cursor.executemany(PREDICTION_INSERT_SQL, payload)
    return len(payload)


def load_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Missing file: {path}")
    return pd.read_csv(path)


def main(host: str, user: str, password: str, database: str = "olympics") -> None:
    project_root = Path(__file__).resolve().parents[2]
    data_cfg = read_config()

    processed_dir = project_root / data_cfg.get("processed_dir", "data/processed")
    reports_dir = project_root / "reports"
    init_script = project_root / "sql" / "init_db.sql"

    country_summary_path = processed_dir / "country_year_summary.csv"
    medal_predictions_path = reports_dir / "medal_predictions.csv"

    conn = connect_mysql(host, user, password, database)
    run_sql_script(conn, init_script)

    cursor = conn.cursor()
    try:
        country_df = load_csv(country_summary_path)
        inserted_summary = insert_country_summary(cursor, country_df)
        print(f"Inserted {inserted_summary} rows into country_year_summary")

        if medal_predictions_path.exists():
            predictions_df = load_csv(medal_predictions_path)
            model_name = (
                predictions_df["model_name"].iloc[0]
                if "model_name" in predictions_df.columns
                else predictions_df.columns[-1]
            )
            target_column = "target" if "target" in predictions_df.columns else "medals_total"

            if target_column in predictions_df.columns:
                total_inserted = 0
                for target_value, group in predictions_df.groupby(target_column):
                    group = group.assign(
                        predicted_value=group.get("predicted_value", group.get("predicted_medals"))
                    )
                    inserted = insert_medal_predictions(
                        cursor,
                        group,
                        str(model_name),
                        str(target_value),
                    )
                    total_inserted += inserted
                print(f"Inserted {total_inserted} rows into medal_predictions")
            else:
                predictions_df = predictions_df.rename(
                    columns={predictions_df.columns[-1]: "predicted_value"}
                )
                inserted = insert_medal_predictions(
                    cursor,
                    predictions_df,
                    str(model_name),
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

    arguments = parser.parse_args()
    main(arguments.host, arguments.user, arguments.password, arguments.database)
