"""Data preparation pipeline for the Olympic project."""

from __future__ import annotations

import ast
from pathlib import Path
from typing import Dict, Tuple

import pandas as pd

from .load_data import load_datasets, read_config


def parse_athlete_list(cell: str) -> list:
    """Parse the athlete list column into python objects."""
    if isinstance(cell, str) and cell.startswith("["):
        try:
            parsed = ast.literal_eval(cell)
            return [
                {
                    "athlete_full_name": entry[0],
                    "athlete_url": entry[1],
                }
                for entry in parsed
                if len(entry) == 2
            ]
        except (ValueError, SyntaxError):
            return []
    return []


def build_full_dataframe(datasets: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Explode athlete lists, merge medals and athlete profiles."""
    results_df = datasets["results"].copy()
    medals_df = datasets["medals"].copy()
    athletes_df = datasets["athletes"].copy()

    results_df["athlete_records"] = results_df["athletes"].apply(parse_athlete_list)
    results_exploded = results_df.explode("athlete_records", ignore_index=True)

    athlete_details = results_exploded["athlete_records"].apply(pd.Series)
    athlete_details = athlete_details.rename(
        columns={
            "athlete_full_name": "athlete_full_name_extracted",
            "athlete_url": "athlete_url_extracted",
        }
    )
    tidy_results = pd.concat([results_exploded.drop(columns=["athlete_records"]), athlete_details], axis=1)

    if "athlete_url_extracted" in tidy_results.columns:
        tidy_results["athlete_url"] = tidy_results.get("athlete_url", pd.Series(index=tidy_results.index)).fillna(
            tidy_results["athlete_url_extracted"]
        )
        tidy_results = tidy_results.drop(columns=["athlete_url_extracted"], errors="ignore")

    if "athlete_full_name_extracted" in tidy_results.columns:
        tidy_results["athlete_full_name"] = tidy_results.get(
            "athlete_full_name", pd.Series(index=tidy_results.index)
        ).fillna(tidy_results["athlete_full_name_extracted"])
        tidy_results = tidy_results.drop(columns=["athlete_full_name_extracted"], errors="ignore")

    medals_trimmed = medals_df.rename(columns={"medal_type": "medal_type_medals"})
    merged = tidy_results.merge(
        medals_trimmed[["athlete_url", "slug_game", "event_title", "medal_type_medals"]],
        on=["athlete_url", "slug_game", "event_title"],
        how="left",
    )
    merged = merged.merge(athletes_df, on="athlete_url", how="left", suffixes=("", "_profile"))

    merged["medal_type_final"] = merged.get("medal_type").fillna(merged.get("medal_type_medals"))
    merged["medal_flag"] = merged["medal_type_final"].notna().astype(int)
    merged["rank_position"] = pd.to_numeric(merged.get("rank_position"), errors="coerce")
    return merged


def build_country_year_summary(full_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate results by country and edition to create modeling features."""
    aggregation_map = {
        "medal_flag": "sum",
        "athlete_full_name": "nunique",
        "rank_position": "mean",
    }
    summary = (
        full_df.groupby(["country_name", "slug_game"], dropna=False)
        .agg(aggregation_map)
        .rename(
            columns={
                "medal_flag": "medals_total",
                "athlete_full_name": "athletes_unique",
                "rank_position": "avg_rank",
            }
        )
        .reset_index()
    )
    return summary


def save_outputs(full_df: pd.DataFrame, summary_df: pd.DataFrame, processed_dir: Path) -> Tuple[Path, Path]:
    """Persist the processed datasets to disk."""
    processed_dir.mkdir(parents=True, exist_ok=True)
    full_path = processed_dir / "olympic_full.csv"
    summary_path = processed_dir / "country_year_summary.csv"
    full_df.to_csv(full_path, index=False)
    summary_df.to_csv(summary_path, index=False)
    return full_path, summary_path


def run_preprocessing(config_path: Path | None = None) -> Tuple[Path, Path]:
    """Execute the full preprocessing pipeline."""
    config = read_config(config_path)
    datasets = load_datasets(config)
    processed_dir: Path = datasets.pop("processed_dir")

    full_df = build_full_dataframe(datasets)
    summary_df = build_country_year_summary(full_df)
    return save_outputs(full_df, summary_df, processed_dir)


if __name__ == "__main__":
    full_path, summary_path = run_preprocessing()
    print(f"Saved detailed dataset to: {full_path}")
    print(f"Saved country summary to: {summary_path}")
