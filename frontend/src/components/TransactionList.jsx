import { formatCurrency, formatDate, getTagColor, getCategoryIcon } from '../hooks/useApi';
import { ArrowUp, ArrowDown, MoreHorizontal } from 'lucide-react';

/**
 * TransactionList component for displaying recent transactions.
 * Updated to match the "Últimos Movimientos" design.
 */
export default function TransactionList({ transactions, loading, limit = 10 }) {
  const items = transactions?.data?.slice(0, limit) || [];
  const count = items.length;

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="h-6 bg-white/10 rounded w-48 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-white/10 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-32 mb-1"></div>
                <div className="h-3 bg-white/10 rounded w-20"></div>
              </div>
              <div className="h-4 bg-white/10 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-[396px] flex flex-col">
      {/* Header with title and count badge */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">
          Últimos Movimientos
        </h3>
        <span className="bg-white/10 text-gray-400 text-sm px-3 py-1 rounded-lg">
          {count}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No hay transacciones recientes</p>
          <p className="text-sm mt-1">Envía un mensaje a WhatsApp para comenzar</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
          {items.map((tx, index) => (
            <div key={tx.id || index} className="group border-b border-white/5 pb-3 last:border-0 last:pb-0">
               <TransactionItem transaction={tx} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionItem({ transaction }) {
  const isIncome = transaction.type === 'ingreso';

  // Format date as "2 DE ENERO"
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    let date;
    
    // Check if it matches YYYY-MM-DD format strictly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateStr);
    }

    const day = date.getDate();
    const month = date.toLocaleDateString('es-MX', { month: 'long' }).toUpperCase();
    return `${day} DE ${month}`;
  };

  return (
    <div className="flex items-center gap-4">
      {/* Circle icon with arrow */}
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ 
          backgroundColor: isIncome ? 'rgba(19, 72, 22, 0.8)' : 'rgba(127, 29, 29, 0.5)'
        }}
      >
        {isIncome ? (
          <ArrowUp className="w-5 h-5" style={{ color: '#11FB1C' }} />
        ) : (
          <ArrowDown className="w-5 h-5" style={{ color: '#FF0808' }} />
        )}
      </div>

      {/* Transaction Details */}
      <div className="flex-1 min-w-0">
        <p 
          className="font-medium truncate"
          style={{ color: isIncome ? '#11FB1C' : '#FF0808' }}
        >
          {transaction.description}
        </p>
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          {formatDateLabel(transaction.date || transaction.created_at)} • {transaction.category?.toUpperCase()}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right">
        <span 
          className="font-semibold"
          style={{ color: isIncome ? '#11FB1C' : '#FF0808' }}
        >
          {isIncome ? '' : '-'}{formatCurrency(transaction.amount)}
        </span>
      </div>

      {/* Actions menu (optional) */}
      <button className="p-1.5 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
        <MoreHorizontal className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
