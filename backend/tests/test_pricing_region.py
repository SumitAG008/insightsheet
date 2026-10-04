from app.services.pricing_region import DEFAULT_REGION, REGION_CURRENCY, region_for_country


def test_supported_countries_get_their_own_price_list():
    assert region_for_country("IN") == "IN"
    assert region_for_country("gb") == "GB"
    assert region_for_country("UK") == "GB"
    assert region_for_country("DE") == "EU"
    assert region_for_country("IE") == "EU"


def test_everyone_else_gets_us_dollars():
    for code in ("US", "CH", "NO", "AE", "SG"):  # CH and NO are in Europe but not in the EU
        assert region_for_country(code) == "INTL"
    assert REGION_CURRENCY["INTL"] == "USD"


def test_unknown_location_defaults_to_us_dollars():
    for code in (None, "", "XX", "  "):
        assert region_for_country(code) == DEFAULT_REGION == "INTL"


def test_each_region_has_one_currency():
    assert REGION_CURRENCY == {"IN": "INR", "GB": "GBP", "EU": "EUR", "INTL": "USD"}
