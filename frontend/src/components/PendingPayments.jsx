import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Calendar, ChevronDown, CheckCircle2 } from 'lucide-react';
import { getDueDates, updateDueDateStatus } from '../services/api';

/**
 * Pending Payments Panel Component
 * Displays pending payments similar to Recurring Payments
 */
export default function PendingPayments({ loading: parentLoading }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);

  // Status configuration
  const statusConfig = {
    pendiente: { label: 'Pendiente', color: '#FCD34D', bg: 'rgba(252, 211, 77, 0.2)' },
    pagado: { label: 'Pagado', color: '#11FB1C', bg: 'rgba(17, 251, 28, 0.2)' },
    vencido: { label: 'Vencido', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.2)' }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await getDueDates({ status: 'pendiente' }); // Fetch pending by default? Or all?
      // Check if response has data property (standard axios response)
      const data = response.data.data || [];
      
      const formatted = data.map(item => ({
        id: item.id,
        name: item.description || 'Sin nombre',
        amount: parseFloat(item.amount),
        dueDate: item.due_date,
        category: item.category || 'Otros',
        status: item.status || 'pendiente'
      }));
      
      setPayments(formatted);
    } catch (err) {
      console.error('Error fetching pending payments:', err);
      setError('Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', () => setOpenDropdown(null), true);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', () => setOpenDropdown(null), true);
    };
  }, []);

  const handleOpenDropdown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (openDropdown === id) {
      setOpenDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 8,
      left: rect.right
    });
    setOpenDropdown(id);
  };

  const updateStatus = async (id, newStatus) => {
    setOpenDropdown(null);
    try {
      // Optimistic update
      setPayments(prev => prev.map(p => 
        p.id === id ? { ...p, status: newStatus } : p
      ));

      await updateDueDateStatus(id, newStatus);
      
      // Refresh to ensure sync (optional)
      // fetchPayments(); 
    } catch (err) {
      console.error('Error updating status:', err);
      // Revert on error
      fetchPayments();
      // Show error notification?
    }
  };

  if (loading || parentLoading) {
    return (
      <div className="glass-card p-6 rounded-2xl animate-pulse h-full">
        <div className="h-8 bg-white/10 rounded w-48 mb-6"></div>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-xl font-semibold text-white">Pagos Pendientes</h3>
        <span className="bg-white/10 text-gray-400 text-sm px-3 py-1 rounded-lg">
          {payments.length}
        </span>
      </div>

      {/* Payments List */}
      <div className="space-y-1 flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2">
        {payments.map((payment, index) => {
          const currentStatus = statusConfig[payment.status] || statusConfig.pendiente;
          
          return (
            <div key={payment.id || index}>
              <div className="flex items-center justify-between py-4 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Icon Circle */}
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  
                  {/* Name and Date */}
                  <div>
                    <p className="text-white font-medium">{payment.name}</p>
                    <p className="text-gray-500 text-sm">Vence: {payment.dueDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Button */}
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
              {/* Divider */}
              <div className="mx-4 border-b border-white/10"></div>
            </div>
          );
        })}
      </div>

      {/* Total Footer */}
      <div className="mt-6 pt-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total Mensual</span>
          <span className="text-xl font-bold text-gray-300">
            ${payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
            transform: 'translateX(-100%)'
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
