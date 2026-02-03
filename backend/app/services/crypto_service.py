import httpx
import asyncio
from datetime import datetime, timedelta
import logging

# Configure logger
logger = logging.getLogger(__name__)

# CoinGecko ID mapping
SYMBOL_TO_ID = {
    'LINK': 'chainlink',
    'XRP': 'ripple',
    'PEPE': 'pepe',
    'SUI': 'sui',
    'ONDO': 'ondo-finance',
    'POPCAT': 'popcat', # Often just 'popcat' or 'popcat-sol', checking commonly used
    'UNI': 'uniswap',
    'AERO': 'aerodrome-finance',
    'ARB': 'arbitrum'
}

# In-memory cache
_price_cache = {
    "data": {},
    "last_updated": None
}

CACHE_DURATION = timedelta(seconds=60) # Cache for 60 seconds

async def get_crypto_prices():
    """
    Fetch crypto prices from CoinGecko with caching.
    Returns a dict mapping ID -> {usd, mxn, usd_24h_change}.
    """
    global _price_cache
    
    now = datetime.now()
    
    # Check cache
    if _price_cache["last_updated"] and (now - _price_cache["last_updated"] < CACHE_DURATION):
        logger.info("Returning cached crypto prices")
        return _price_cache["data"]
        
    # Prepare IDs
    ids = list(SYMBOL_TO_ID.values())
    ids_str = ",".join(ids)
    
    url = f"https://api.coingecko.com/api/v3/simple/price"
    params = {
        "ids": ids_str,
        "vs_currencies": "usd,mxn",
        "include_24hr_change": "true"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                _price_cache["data"] = data
                _price_cache["last_updated"] = now
                logger.info("Fetched new crypto prices from CoinGecko")
                return data
            else:
                logger.error(f"Error fetching prices: {response.status_code}")
                # Return cached data if available even if expired, otherwise empty
                return _price_cache["data"]
                
    except Exception as e:
        logger.error(f"Exception fetching prices: {e}")
        return _price_cache["data"]

def get_symbol_map():
    return SYMBOL_TO_ID
