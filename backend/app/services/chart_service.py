from __future__ import annotations

VALID_CHART_TYPES = {"bar", "line", "pie", "table", "histogram"}


def validate_chart_config(config: dict | None) -> dict | None:
    if config is None:
        return None
    if config.get("chart_type") not in VALID_CHART_TYPES:
        return None
    if not isinstance(config.get("data"), list) or len(config["data"]) == 0:
        return None
    return config
