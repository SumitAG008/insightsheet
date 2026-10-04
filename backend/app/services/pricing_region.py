"""Pricing region from the visitor's country.

The region (and so the currency and price list) is decided on the server from the IP lookup.
The browser cannot choose it, so a visitor in the UK cannot see or buy the India price list.
If the country cannot be determined, the visitor gets US dollar pricing.
"""

# EU member states (ISO 3166-1 alpha-2).
EU_COUNTRIES = frozenset({
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT",
    "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
})

REGION_CURRENCY = {"IN": "INR", "GB": "GBP", "EU": "EUR", "INTL": "USD"}
DEFAULT_REGION = "INTL"


def region_for_country(code) -> str:
    """IN, GB or EU for those countries; INTL (US dollars) for everyone else and for unknown locations."""
    c = str(code or "").strip().upper()
    if c == "IN":
        return "IN"
    if c in ("GB", "UK"):
        return "GB"
    if c in EU_COUNTRIES:
        return "EU"
    return DEFAULT_REGION
