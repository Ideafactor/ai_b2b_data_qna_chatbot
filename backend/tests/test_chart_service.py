from app.services.chart_service import validate_chart_config


def test_validate_chart_config_accepts_supported_chart_with_data():
    config = {
        "chart_type": "bar",
        "title": "Sales",
        "data": [{"label": "Q1", "value": 10}],
    }

    assert validate_chart_config(config) == config


def test_validate_chart_config_rejects_missing_empty_or_unknown_data():
    assert validate_chart_config(None) is None
    assert validate_chart_config({"chart_type": "scatter", "data": [{"x": 1}]}) is None
    assert validate_chart_config({"chart_type": "line", "data": []}) is None
    assert validate_chart_config({"chart_type": "table", "data": "not-a-list"}) is None
