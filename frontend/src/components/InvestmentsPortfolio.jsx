import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Info, Loader, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getCryptoPrices } from '../services/api';

const PROJECT_COLORS = {
  green: '#11FB1C',
  red: '#FF0808',
};

// Map symbols to CoinGecko IDs from backend
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
  { symbol: 'XRP', amount: 22.12, avgBuyPrice: 0.60, realizedProfit: 236 }, // Adjusted to match ~$246 total
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

export default function InvestmentsPortfolio({ data: portfolioData = [], lastUpdated, loading, error }) {
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'desc' });

  // Compute portfolio data handled by parent hook now
  const sortedPortfolioData = [...portfolioData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    // Handle 0 values or potential undefined just in case
    const aValue = a[sortConfig.key] || 0;
    const bValue = b[sortConfig.key] || 0;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalValue = portfolioData.reduce((acc, curr) => acc + curr.value, 0);
  const totalProfit = portfolioData.reduce((acc, curr) => acc + curr.profit, 0);
  const totalInvestment = portfolioData.reduce((acc, curr) => acc + (curr.amount * curr.avgBuyPrice), 0);
  const totalProfitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;


  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-500" />; // More visible
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;
  };

  // Formatting utils
  const formatPrice = (price) => {
    if (!price) return 'Loading...';
    if (price < 1) return `$${price.toFixed(6)}`;
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatValue = (amount) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount >= 0 ? `+$${formatted}` : `-$${formatted}`;
  };

  const getProfitColor = (val) => val >= 0 ? PROJECT_COLORS.green : PROJECT_COLORS.red;

  const formatAmount = (amount) => {
     if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
     return amount.toString();
  };

  return (
    <div className="glass-card p-6 h-full flex flex-col relative overflow-hidden bg-[#0B0E14]">
       {/* Background glow specific to this card */}
       <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>

      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        {/* Left: Title and Update Time */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Inversiones
              {loading && !lastUpdated && <Loader className="w-4 h-4 animate-spin text-blue-400" />}
            </h3>
            {error && <Info className="w-4 h-4 text-red-500" title="Error updating prices" />}
          </div>
          {lastUpdated && (
              <div className="text-xs text-gray-400 mt-1">
                 Actualizado: {lastUpdated.toLocaleTimeString()}
              </div>
          )}
        </div>

        {/* Right: Stats */}
        <div className="text-right flex flex-col items-end">
          <h2 className="text-3xl font-bold text-white">
            {loading && !lastUpdated ? 'Loading...' : `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </h2>
          {lastUpdated && (
              <div className="flex items-center text-xs font-medium mt-1" style={{ color: getProfitColor(totalProfitPercent) }}>
                {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit).toFixed(2)} <span className="mx-1">{totalProfit >= 0 ? '▲' : '▼'}</span> {Math.abs(totalProfitPercent).toFixed(2)}%
              </div>
          )}
        </div>
      </div>

      {/* Assets List Header */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-2 px-2">
          <span>Activo</span>
          <div className="flex gap-4">
              <button 
                onClick={() => handleSort('price')}
                className="w-16 flex items-center justify-end hover:text-white transition-colors"
                title="Ordenar por Precio"
              >
                Precio <SortIcon columnKey="price" />
              </button>
              <button 
                onClick={() => handleSort('value')}
                className="w-20 flex items-center justify-end hover:text-white transition-colors"
                title="Ordenar por Valor"
              >
                Inversiones <SortIcon columnKey="value" />
              </button>
              <button 
                onClick={() => handleSort('profit')}
                className="w-20 flex items-center justify-end hover:text-white transition-colors"
                title="Ordenar por Beneficio"
              >
                Beneficio <SortIcon columnKey="profit" />
              </button>
          </div>
      </div>

      {/* Assets List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 -mx-1">
        <div className="space-y-1">
          {sortedPortfolioData.map((asset, index) => (
            <div key={asset.symbol}>
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                     <img 
                        src={asset.logoUrl} 
                        alt={asset.symbol} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = 'https://cryptologos.cc/logos/bitcoin-btc-logo.png'; // Fallback
                        }}
                     />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{asset.symbol}</div>
                  </div>
                </div>
                
                <div className="flex gap-4 items-center">
                    <div className="text-right w-16">
                        <div className="text-sm font-medium text-white">{formatPrice(asset.price)}</div>
                        <div className="text-xs flex items-center justify-end" style={{ color: getProfitColor(asset.priceChange) }}>
                            {asset.priceChange >= 0 ? '▲' : '▼'} {Math.abs(asset.priceChange).toFixed(2)}%
                        </div>
                    </div>
                    
                    <div className="text-right w-20">
                        <div className="text-sm font-medium text-white">
                            {formatValue(asset.value)}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                             {formatAmount(asset.amount)} {asset.symbol}
                        </div>
                    </div>

                    <div className="text-right w-20">
                        <div className="text-sm font-medium" style={{ color: getProfitColor(asset.profit) }}>
                            {formatCurrency(asset.profit)}
                        </div>
                        <div className="text-xs flex items-center justify-end" style={{ color: getProfitColor(asset.profitPercent) }}>
                             {asset.profitPercent >= 0 ? '▲' : '▼'} {Math.abs(asset.profitPercent).toFixed(2)}%
                        </div>
                    </div>
                </div>
              </div>
              {/* Divider */}
              <div className="mx-4 border-b border-white/10"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
