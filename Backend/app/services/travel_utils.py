INTERNATIONAL_KEYWORDS = [
    "usa", "united states", "uk", "united kingdom", "germany", "france",
    "japan", "china", "singapore", "dubai", "uae", "australia", "canada",
    "italy", "spain", "netherlands", "thailand", "malaysia", "indonesia",
    "hong kong", "south korea", "new zealand", "switzerland", "sweden",
    "norway", "denmark", "finland", "brazil", "mexico", "russia",
    "south africa", "egypt", "kenya", "turkey", "israel", "saudi arabia",
]

# TODO: replace with live forex API call
EXCHANGE_RATES_TO_INR = {
    "USD": 83.5,
    "EUR": 90.2,
    "GBP": 105.8,
    "SGD": 62.1,
    "AED": 22.7,
    "JPY": 0.56,
    "AUD": 54.3,
    "CAD": 61.4,
    "CHF": 93.0,
    "CNY": 11.5,
    "INR": 1.0,
}


def to_inr(amount: float, currency: str) -> float:
    """Converts given amount in currency to INR using hardcoded rates."""
    rate = EXCHANGE_RATES_TO_INR.get(currency.upper(), 1.0)
    return round(amount * rate, 2)