import { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../hooks/useApi';

/**
 * DueCalendar component for interactive calendar with due dates.
 */
export default function DueCalendar({ data, loading, onMonthChange }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    onMonthChange?.(currentMonth === 1 ? 12 : currentMonth - 1, currentMonth === 1 ? currentYear - 1 : currentYear);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    onMonthChange?.(currentMonth === 12 ? 1 : currentMonth + 1, currentMonth === 12 ? currentYear + 1 : currentYear);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Generate calendar days
  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const lastDay = new Date(currentYear, currentMonth, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarDays = [];
  
  // Empty cells for days before the first of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = data?.days?.find(d => d.date === dateStr);
    calendarDays.push({
      day,
      date: dateStr,
      isToday: day === today.getDate() && currentMonth === today.getMonth() + 1 && currentYear === today.getFullYear(),
      dueDates: dayData?.due_dates || [],
      transactions: dayData?.transactions || [],
      totalExpenses: dayData?.total_expenses || 0,
      totalIncome: dayData?.total_income || 0,
    });
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="h-6 bg-white/10 rounded w-40 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">
          Calendario de Vencimientos
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <span className="text-white font-medium min-w-[140px] text-center">
            {monthNames[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs text-gray-500 font-medium py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayData, index) => (
          <CalendarDay key={index} dayData={dayData} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-xs text-gray-400">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF0808' }}></div>
          <span className="text-xs text-gray-400">Vencido</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#11FB1C' }}></div>
          <span className="text-xs text-gray-400">Pagado</span>
        </div>
      </div>
    </div>
  );
}

function CalendarDay({ dayData }) {
  if (!dayData) {
    return <div className="h-16"></div>;
  }

  const { day, isToday, dueDates, transactions, totalExpenses } = dayData;
  
  // Convert recurring transactions to display items
  const recurringTransactions = (transactions || [])
    .filter(tx => tx.is_recurring)
    .map(tx => ({
      concept: tx.description,
      amount: tx.amount,
      status: tx.payment_status || 'pendiente',
      is_overdue: tx.payment_status === 'vencido',
      is_recurring: true,
      type: tx.type
    }));
  
  // Combine due dates and recurring transactions
  const allItems = [...dueDates, ...recurringTransactions];
  const hasItems = allItems.length > 0;
  const hasOverdue = allItems.some(item => item.is_overdue || item.status === 'vencido');
  const hasPending = allItems.some(item => item.status === 'pendiente');
  const hasPaid = allItems.some(item => item.status === 'pagado');

  return (
    <div
      className={`
        h-16 p-1 rounded-lg border transition-all cursor-pointer
        ${isToday ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:border-white/20 hover:bg-white/5'}
        ${hasOverdue ? 'pulse-warning' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <span className={`text-sm ${isToday ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
          {day}
        </span>
        {hasItems && (
          <div className="flex gap-0.5">
            {hasOverdue && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF0808' }}></div>}
            {hasPending && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
            {hasPaid && !hasOverdue && !hasPending && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#11FB1C' }}></div>}
          </div>
        )}
      </div>
      
      {/* Display items (due dates + recurring transactions) */}
      {allItems.slice(0, 2).map((item, i) => {
        const isVencido = item.is_overdue || item.status === 'vencido';
        const isPagado = item.status === 'pagado';
        const bgColor = isVencido ? 'rgba(127, 29, 29, 0.4)' : 
          isPagado ? 'rgba(19, 72, 22, 0.4)' :
          'rgba(245, 158, 11, 0.2)';
        const textColor = isVencido ? '#FF0808' : 
          isPagado ? '#11FB1C' :
          '#fcd34d';
        return (
          <div
            key={i}
            className="text-[10px] truncate rounded px-1 mt-0.5"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            {item.concept || item.description}
          </div>
        );
      })}
      {allItems.length > 2 && (
        <div className="text-[10px] text-gray-500 mt-0.5">
          +{allItems.length - 2} más
        </div>
      )}
    </div>
  );
}
