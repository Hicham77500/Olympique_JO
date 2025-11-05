"""Feature engineering helpers for the Olympic project."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import pandas as pd


def load_country_summary(path: Path) -> pd.DataFrame:
    """Load the aggregated country summary file."""
    if not path.exists():
        raise FileNotFoundError(f"Missing summary file at {path}. Run preprocessing first.")
    return pd.read_csv(path)


def add_medal_shares(summary_df: pd.DataFrame) -> pd.DataFrame:
    """Compute medal share features per edition."""
    df = summary_df.copy()
    totals = df.groupby("slug_game")["medals_total"].transform("sum")
    df["medal_share"] = df["medals_total"] / totals.replace(0, 1)
    return df


def add_trend_features(summary_df: pd.DataFrame, lag: int = 1) -> pd.DataFrame:
    """Create rolling features per country to capture momentum."""
    df = summary_df.copy()
    df = df.sort_values(["country_name", "slug_game"])
    df[f"medals_total_lag_{lag}"] = (
        df.groupby("country_name")["medals_total"].shift(lag).fillna(0)
    )
    df[f"athletes_unique_lag_{lag}"] = (
        df.groupby("country_name")["athletes_unique"].shift(lag).fillna(0)
    )
    return df


def build_model_features(summary_path: Path, add_trends: bool = True) -> pd.DataFrame:
    """Load, enrich, and return the feature table ready for modeling."""
    summary_df = load_country_summary(summary_path)
    enriched = add_medal_shares(summary_df)
    if add_trends:
        enriched = add_trend_features(enriched)
    return enriched
