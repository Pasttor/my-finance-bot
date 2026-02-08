import { useState, useEffect, useMemo } from 'react';
import { getCryptoPrices } from '../services/api';

// Map symbols to CoinGecko IDs
const SYMBOL_TO_ID = {
  'LINK': 'chainlink',
  'XRP': 'ripple',
  'PEPE': 'pepe',
  'SUI': 'sui',
  'ONDO': 'ondo-finance',
  'POPCAT': 'popcat',
  'UNI': 'uniswap',
  'AERO': 'aerodrome-finance',
  'ARB': 'arbitrum'
};

const CRYPTO_HOLDINGS = [
  { symbol: 'LINK', amount: 4.174, avgBuyPrice: 24.38 },
  { symbol: 'XRP', amount: 22.12, avgBuyPrice: 0.60, realizedProfit: 236 },
  { symbol: 'PEPE', amount: 6894366, avgBuyPrice: 0.00000939 },
  { symbol: 'SUI', amount: 21.90, avgBuyPrice: 3.50 },
  { symbol: 'ONDO', amount: 83.88, avgBuyPrice: 1.045 },
  { symbol: 'POPCAT', amount: 259.62, avgBuyPrice: 0.248 },
  { symbol: 'UNI', amount: 3.344, avgBuyPrice: 14.71 },
  { symbol: 'AERO', amount: 15.00, avgBuyPrice: 1.60 },
  { symbol: 'ARB', amount: 25.06, avgBuyPrice: 1.045 }
];

const LOGO_URLS = {
  'LINK': 'https://cryptologos.cc/logos/chainlink-link-logo.png?v=035',
  'XRP': 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png?1605778731',
  'PEPE': 'https://cryptologos.cc/logos/pepe-pepe-logo.png?v=035',
  'SUI': 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg?1696525455',
  'ONDO': 'https://s2.coinmarketcap.com/static/img/coins/64x64/21159.png',
  'POPCAT': 'https://s2.coinmarketcap.com/static/img/coins/64x64/28782.png',
  'UNI': 'https://cryptologos.cc/logos/uniswap-uni-logo.png?v=035',
  'AERO': 'https://s2.coinmarketcap.com/static/img/coins/64x64/27763.png',
  'ARB': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png?v=035'
};

export function useCryptoPortfolio() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      const response = await getCryptoPrices();
      if (response.data && response.data.data) {
        setPrices(response.data.data);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching crypto prices:", err);
      setError("Error updating prices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // 60s update
    return () => clearInterval(interval);
  }, []);

  const portfolioData = useMemo(() => {
    return CRYPTO_HOLDINGS.map(holding => {
      const id = SYMBOL_TO_ID[holding.symbol];
      const priceData = prices[id] || {};
      const currentPrice = priceData.usd || 0;
      const priceChange = priceData.usd_24h_change || 0;
      
      const value = holding.amount * currentPrice;
      const initialInvestment = holding.amount * holding.avgBuyPrice;
      const profit = (value - initialInvestment) + (holding.realizedProfit || 0);
      const profitPercent = initialInvestment > 0 ? (profit / initialInvestment) * 100 : 0;

      return {
        ...holding,
        price: currentPrice,
        priceChange,
        value,
        profit,
        profitPercent,
        logoUrl: LOGO_URLS[holding.symbol]
      };
    });
  }, [prices]);

  const totals = useMemo(() => {
    const totalValue = portfolioData.reduce((acc, curr) => acc + curr.value, 0);
    const totalInvestment = portfolioData.reduce((acc, curr) => acc + (curr.amount * curr.avgBuyPrice), 0);
    const totalProfit = portfolioData.reduce((acc, curr) => acc + curr.profit, 0);
    const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
    
    return {
      totalValue,
      totalProfit,
      totalProfitPercent
    };
  }, [portfolioData]);

  return {
    portfolioData,
    ...totals,
    loading,
    error,
    lastUpdated,
    refresh: fetchPrices
  };
}
