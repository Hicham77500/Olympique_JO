"""Build demo JSON datasets from the canonical CSV sources.

This script materialises the same payloads that the Express API would
normally fetch depuis MySQL, afin que DEMO_MODE=true puisse exploiter des
fichiers locaux contenant l'ensemble des données réelles.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"
REPORTS_DIR = PROJECT_ROOT / "reports"
DEMO_DIR = DATA_DIR / "demo"
DEMO_DIR.mkdir(parents=True, exist_ok=True)

CURRENT_YEAR = 2024
DEFAULT_MODEL_NAME = "regression_baseline_v1"
DEFAULT_TARGET = "medals_total"
DEFAULT_CREATED_AT = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_hosts() -> Dict[str, Dict[str, Optional[str]]]:
    hosts_path = DATA_DIR / "olympic_hosts.csv"
    hosts_df = pd.read_csv(hosts_path)
    hosts_df = hosts_df.fillna("")

    hosts_map: Dict[str, Dict[str, Optional[str]]] = {}
    for row in hosts_df.to_dict(orient="records"):
        slug = row.get("game_slug")
        if not isinstance(slug, str):
            continue
        name = row.get("game_name", "")
        city = name.rsplit(" ", 1)[0] if isinstance(name, str) and " " in name else name
        hosts_map[slug] = {
            "slug": slug,
            "year": int(row.get("game_year")) if pd.notna(row.get("game_year")) else None,
            "season": row.get("game_season") or None,
            "city": city or None,
            "country": row.get("game_location") or None,
            "name": name or None,
            "start_date": row.get("game_start_date") or None,
            "end_date": row.get("game_end_date") or None,
        }
    return hosts_map


def normalise_year(raw: Optional[str]) -> Optional[int]:
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def extract_year_from_slug(slug: Optional[str]) -> Optional[int]:
    if not slug:
        return None
    parts = str(slug).rsplit("-", 1)
    if parts and parts[-1].isdigit():
        return int(parts[-1])
    return None


def compute_age(year_of_birth: Optional[float]) -> Optional[int]:
    if pd.isna(year_of_birth):
        return None
    try:
        year_value = int(year_of_birth)
    except (TypeError, ValueError):
        return None
    return CURRENT_YEAR - year_value if year_value > 0 else None


def build_demo_datasets() -> None:
    hosts_map = load_hosts()

    full_path = PROCESSED_DIR / "olympic_full.csv"
    usecols = [
        "discipline_title",
        "event_title",
        "slug_game",
        "participant_type",
        "medal_type",
        "medal_type_final",
        "country_name",
        "country_code",
        "athlete_url",
        "athlete_full_name",
        "games_participations",
        "first_game",
        "athlete_year_birth",
    ]
    full_df = pd.read_csv(full_path, usecols=usecols)
    full_df = full_df.fillna("")

    athlete_registry: Dict[str, Dict[str, Optional[str]]] = {}
    athlete_id_map: Dict[str, int] = {}
    results_payload: List[Dict[str, Optional[str]]] = []

    next_athlete_id = 1
    next_result_id = 1

    for row in full_df.to_dict(orient="records"):
        athlete_name = row.get("athlete_full_name") or None
        athlete_url = row.get("athlete_url") or None
        athlete_key = athlete_url or athlete_name
        if not athlete_key:
            continue

        if athlete_key not in athlete_id_map:
            athlete_id_map[athlete_key] = next_athlete_id
            athlete_registry[athlete_key] = {
                "id": next_athlete_id,
                "name": athlete_name,
                "gender": None,
                "age": compute_age(row.get("athlete_year_birth")),
                "nationality": row.get("country_name") or None,
                "country": row.get("country_name") or None,
                "games_participations": int(row["games_participations"]) if str(row.get("games_participations", "")).isdigit() else None,
                "first_game": row.get("first_game") or None,
                "profile_url": athlete_url,
            }
            next_athlete_id += 1
        else:
            # Mettre à jour la nationalité/âge si manquants
            athlete_record = athlete_registry[athlete_key]
            if not athlete_record.get("nationality") and row.get("country_name"):
                athlete_record["nationality"] = row.get("country_name")
                athlete_record["country"] = row.get("country_name")
            if athlete_record.get("age") is None:
                athlete_record["age"] = compute_age(row.get("athlete_year_birth"))

        host_info = hosts_map.get(row.get("slug_game"), {})
        year_value = host_info.get("year") or extract_year_from_slug(row.get("slug_game"))

        nationality_value = row.get("country_name") or None

        result_entry = {
            "id": next_result_id,
            "athlete_id": athlete_id_map[athlete_key],
            "name": athlete_name,
            "gender": None,
            "age": compute_age(row.get("athlete_year_birth")),
            "nationality": nationality_value,
            "country": nationality_value,
            "year": year_value,
            "season": host_info.get("season"),
            "city": host_info.get("city"),
            "sport": row.get("discipline_title") or None,
            "event": row.get("event_title") or None,
            "medal": (row.get("medal_type_final") or row.get("medal_type") or None) or None,
            "slug_game": row.get("slug_game") or None,
            "country_code": row.get("country_code") or None,
        }
        results_payload.append(result_entry)
        next_result_id += 1

    athletes_payload = sorted(athlete_registry.values(), key=lambda item: item["id"])

    hosts_payload = [
        {
            "slug_game": data.get("slug"),
            "year": data.get("year"),
            "season": data.get("season"),
            "city": data.get("city"),
            "country": data.get("country"),
            "name": data.get("name"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
        }
        for data in hosts_map.values()
    ]

    summary_path = PROCESSED_DIR / "country_year_summary.csv"
    summary_df = pd.read_csv(summary_path)
    summary_df = summary_df.fillna("")
    summary_payload = summary_df.to_dict(orient="records")

    predictions_path = REPORTS_DIR / "medal_predictions.csv"
    predictions_df = pd.read_csv(predictions_path)
    predictions_df = predictions_df.fillna(0)

    summary_lookup = {
        (row["country_name"], row["slug_game"]): row.get("medals_total")
        for row in summary_payload
    }

    predictions_payload: List[Dict[str, Optional[str]]] = []
    for row in predictions_df.to_dict(orient="records"):
        country = row.get("country_name")
        slug = row.get("slug_game")
        predicted_value = row.get("predicted_medals_total")
        year_from_slug = extract_year_from_slug(slug)
        predictions_payload.append(
            {
                "country": country,
                "slug_game": slug,
                "year": year_from_slug,
                "model_name": DEFAULT_MODEL_NAME,
                "target": DEFAULT_TARGET,
                "predicted_value": float(predicted_value) if predicted_value is not None else None,
                "created_at": DEFAULT_CREATED_AT,
                "actual_medals": summary_lookup.get((country, slug)),
            }
        )

    write_json(DEMO_DIR / "athletes.json", athletes_payload)
    write_json(DEMO_DIR / "results.json", results_payload)
    write_json(DEMO_DIR / "hosts.json", hosts_payload)
    write_json(DEMO_DIR / "country_year_summary_demo.json", summary_payload)
    write_json(DEMO_DIR / "medal_predictions_demo.json", predictions_payload)


def write_json(path: Path, payload: List[Dict[str, Optional[str]]]) -> None:
    temp_path = path.with_suffix(path.suffix + ".tmp")
    with temp_path.open("w", encoding="utf-8") as stream:
        json.dump(payload, stream, ensure_ascii=True)
    temp_path.replace(path)
    print(f"✅ Wrote {path} ({len(payload)} objects)")


if __name__ == "__main__":
    build_demo_datasets()
