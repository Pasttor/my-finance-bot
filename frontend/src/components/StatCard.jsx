import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '../hooks/useApi';

// Custom colors
const CUSTOM_GREEN = '#11FB1C';
const CUSTOM_GREEN_BG = 'rgba(19, 72, 22, 0.8)';
const CUSTOM_RED = '#FF0808';
const CUSTOM_RED_BG = 'rgba(127, 29, 29, 0.5)';

/**
 * StatCard component for displaying key financial metrics.
 */
export default function StatCard({ title, value, type, change, icon: Icon, loading, subtitle }) {
  const getCardStyles = () => {
    switch (type) {
      case 'income':
        return {
          cardClass: 'stat-card-income',
          iconBg: CUSTOM_GREEN_BG,
          iconColor: CUSTOM_GREEN,
          valueColor: CUSTOM_GREEN,
        };
      case 'expense':
        return {
          cardClass: 'stat-card-expense',
          iconBg: CUSTOM_RED_BG,
          iconColor: CUSTOM_RED,
          valueColor: CUSTOM_RED,
        };
      case 'balance':
        return {
          cardClass: 'stat-card-balance',
          iconBg: 'rgba(255, 255, 255, 0.1)',
          iconColor: '#ffffff',
          valueColor: '#ffffff',
          textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
        };
      case 'investments':
        return {
          cardClass: 'stat-card-investments',
          iconBg: 'rgba(255, 255, 255, 0.1)',
          iconColor: '#ffffff',
          valueColor: '#ffffff',
          textShadow: '0 0 25px rgba(255, 8, 8, 0.8)',
          subtitleColor: CUSTOM_RED,
        };
      case 'savings':
        return {
          cardClass: 'stat-card-savings',
          iconBg: 'rgba(245, 158, 11, 0.3)',
          iconColor: '#FBBF24',
          valueColor: '#FBBF24',
        };
      default:
        return {
          cardClass: '',
          iconBg: 'rgba(156, 163, 175, 0.2)',
          iconColor: '#9ca3af',
          valueColor: '#ffffff',
        };
    }
  };

  const styles = getCardStyles();
  const IconComponent = Icon || Wallet;

  if (loading) {
    return (
      <div className={`glass-card p-6 ${styles.cardClass}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-20 mb-4"></div>
          <div className="h-8 bg-white/10 rounded w-32 mb-2"></div>
          <div className="h-3 bg-white/10 rounded w-16"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card glass-card-hover p-6 ${styles.cardClass}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400 font-medium">{title}</span>
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: styles.iconBg }}
        >
          <IconComponent 
            className="w-5 h-5" 
            style={{ color: styles.iconColor }}
          />
        </div>
      </div>
      
      <div 
        className="text-3xl font-bold mb-2"
        style={{ 
          color: styles.valueColor,
          textShadow: styles.textShadow || 'none'
        }}
      >
        {type === 'investments' ? formatCurrency(value, 'USD') : formatCurrency(value)}
      </div>
      
      {subtitle && (
        <div 
          className="text-xs mb-2"
          style={{ color: styles.subtitleColor || '#f87171' }}
        >
          {subtitle}
        </div>
      )}
      
      {change !== undefined && (
        <div className="flex items-center gap-1 text-sm">
          {change >= 0 ? (
            <TrendingUp className="w-4 h-4" style={{ color: CUSTOM_GREEN }} />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <span style={{ color: change >= 0 ? CUSTOM_GREEN : '#f87171' }}>
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-gray-500">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}
