import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency } from '../hooks/useApi';

/**
 * CashFlowChart component for visualizing income and expenses over time.
 */
export default function CashFlowChart({ data, loading }) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="h-6 bg-white/10 rounded w-32 mb-4 animate-pulse"></div>
        <div className="h-[300px] bg-white/5 rounded animate-pulse"></div>
      </div>
    );
  }

  // Use the month name directly from the data
  const formatXAxis = (value) => value;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-gray-400 text-sm mb-2">
            {new Date(label).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6 h-[396px] flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-4">
        Cashflow
      </h3>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#11FB1C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#11FB1C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF0808" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF0808" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            
            <XAxis
              dataKey="day"
              tickFormatter={formatXAxis}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            
            <YAxis
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => (
                <span className="text-gray-400 text-sm">{value}</span>
              )}
            />
            
            <Area
              type="monotone"
              dataKey="income"
              name="Ingresos"
              stroke="#11FB1C"
              strokeWidth={2}
              fill="url(#colorIncome)"
            />
            
            <Area
              type="monotone"
              dataKey="expenses"
              name="Gastos"
              stroke="#FF0808"
              strokeWidth={2}
              fill="url(#colorExpenses)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
