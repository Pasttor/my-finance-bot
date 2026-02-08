import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, CreditCard, Wifi, Dumbbell, Monitor, Sparkles, ShoppingBag, ChevronDown } from 'lucide-react';
import { updateTransactionStatus } from '../services/api';

/**
 * Recurring Payments Panel Component
 * Displays all recurring payments with status selection
 */
export default function RecurringPayments({ data, loading, onStatusChange }) {
  const [recurringPayments, setRecurringPayments] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    // Use mousedown to capture click before other events clear it? 
    // Actually click is better for buttons, but mousedown covers 'outside'.
    // Use click instead of mousedown to respect stopPropagation from buttons
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('resize', () => setOpenDropdown(null)); // Close on resize
    window.addEventListener('scroll', () => setOpenDropdown(null), true); // Close on scroll

    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('resize', () => setOpenDropdown(null));
      window.removeEventListener('scroll', () => setOpenDropdown(null), true);
    };
  }, []);

  // Status configuration
  const statusConfig = {
    pendiente: { label: 'Pendiente', color: '#FCD34D', bg: 'rgba(252, 211, 77, 0.2)' },
    vencido: { label: 'Vencido', color: '#FF0808', bg: 'rgba(255, 8, 8, 0.2)' },
    pagado: { label: 'Pagado', color: '#11FB1C', bg: 'rgba(17, 251, 28, 0.2)' }
  };

  // Icon mapping based on description keywords
  const getIcon = (description) => {
    const desc = description.toLowerCase();
    if (desc.includes('gym')) return Dumbbell;
    if (desc.includes('izzi') || desc.includes('internet') || desc.includes('bait')) return Wifi;
    if (desc.includes('tarjeta')) return CreditCard;
    if (desc.includes('meli') || desc.includes('mercado') || desc.includes('mandado')) return ShoppingBag;
    if (desc.includes('monitor') || desc.includes('wd')) return Monitor;
    if (desc.includes('google') || desc.includes('ai')) return Sparkles;
    if (desc.includes('gasto')) return Calendar;
    return CreditCard;
  };

  // Handle opening dropdown with position calculation
  const handleOpenDropdown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (openDropdown === id) {
      setOpenDropdown(null);
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 8, // 8px margin
      left: rect.right // Align right edge
    });
    setOpenDropdown(id);
  };

  // Update payment status (Optimistic UI + API)
  const updateStatus = async (paymentId, newStatus) => {
    // 1. Immediately close dropdown
    setOpenDropdown(null);

    // Store previous state for rollback
    const previousPayments = [...recurringPayments];

    // 2. Optimistic update
    setRecurringPayments(prev => 
      prev.map(p => p.id === paymentId ? { ...p, status: newStatus } : p)
    );

    try {
      // Use backend API to ensure date update log runs
      // Send local date to avoid server timezone issues (UTC vs Local)
      const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
      await updateTransactionStatus(paymentId, { 
        payment_status: newStatus,
        date: localDate
      });
      
      // Refresh data after small delay to ensure propagation
      if (onStatusChange) {
        setTimeout(onStatusChange, 500);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      // Rollback on error
      setRecurringPayments(previousPayments);
      // alert('Error al actualizar: Verifique su conexión');
    }
  };

  // Extract recurring payments from calendar data
  useEffect(() => {
    if (data?.days) {
      const paymentCounts = {};
      const paymentData = {};

      data.days.forEach(day => {
        if (day.transactions) {
          day.transactions.forEach(tx => {
            if (tx.is_recurring) {
              const name = tx.description;
              if (!paymentCounts[name]) {
                paymentCounts[name] = 0;
                paymentData[name] = {
                  id: tx.id,
                  name: name,
                  amount: tx.amount,
                  date: day.date,
                  category: tx.category,
                  status: tx.payment_status || 'pendiente'
                };
              }
              paymentCounts[name]++;
            }
          });
        }
      });

      // Build final array with correct frequency
      const allRecurring = Object.keys(paymentData).map(name => {
        const count = paymentCounts[name];
        const isWeekly = name.toLowerCase().includes('semanal') || count >= 4;
        return {
          ...paymentData[name],
          frequency: isWeekly ? `SEMANAL (${count}x)` : 'MENSUAL',
          count: count,
          monthlyTotal: isWeekly ? paymentData[name].amount * count : paymentData[name].amount
        };
      });

      // Sort by monthly total descending
      allRecurring.sort((a, b) => b.monthlyTotal - a.monthlyTotal);
      setRecurringPayments(allRecurring);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl animate-pulse">
        <div className="h-8 bg-white/10 rounded w-48 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const totalMonthly = recurringPayments.reduce((sum, p) => sum + (p.monthlyTotal || p.amount), 0);

  return (
    <div className="glass-card p-6 rounded-2xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-xl font-semibold text-white">Pagos Recurrentes</h3>
        <span className="bg-white/10 text-gray-400 text-sm px-3 py-1 rounded-lg">
          {recurringPayments.length}
        </span>
      </div>

      {/* Payments List - RESTORED SCROLL */}
      <div className="space-y-1 flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2">
        {recurringPayments.map((payment, index) => {
          const IconComponent = getIcon(payment.name);
          const currentStatus = statusConfig[payment.status] || statusConfig.pendiente;
          
          return (
            <div key={payment.id || index}>
              <div className="flex items-center justify-between py-4 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Icon Circle */}
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: currentStatus.bg }}
                  >
                    <IconComponent className="w-5 h-5" style={{ color: currentStatus.color }} />
                  </div>
                  
                  {/* Name and Frequency */}
                  <div>
                    <p className="text-white font-medium">{payment.name}</p>
                    <p className="text-gray-500 text-sm">{payment.frequency}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Button (Trigger) */}
                  <button
                    onClick={(e) => handleOpenDropdown(e, payment.id)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                    style={{ 
                      backgroundColor: currentStatus.bg, 
                      color: currentStatus.color,
                      border: `1px solid ${currentStatus.color}40`
                    }}
                  >
                    {currentStatus.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                    
                  {/* Amount */}
                  <p className="text-white font-semibold min-w-[80px] text-right">
                    ${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              {/* Divider */}
              {index < recurringPayments.length - 1 && (
                <div className="mx-4 border-b border-white/10"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Footer */}
      <div className="mt-6 pt-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total Mensual</span>
          <span className="text-xl font-bold text-gray-300">
            ${totalMonthly.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Fixed Position Dropdown (Portal) */}
      {openDropdown && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[100] bg-gray-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: dropdownPos.top, 
            left: dropdownPos.left,
            transform: 'translateX(-100%)' // Align right edge to button right edge
          }}
        >
          {Object.entries(statusConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => updateStatus(openDropdown, key)}
              className="w-full px-4 py-3 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
              style={{ color: config.color }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}></span>
              {config.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
