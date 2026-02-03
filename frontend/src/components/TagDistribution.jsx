import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../hooks/useApi';

const TAG_COLORS = {
  '#Asces': '#3B82F6',
  '#LabCasa': '#10B981',
  '#Personal': '#8B5CF6',
  'Sin etiqueta': '#6B7280',
};

/**
 * TagDistribution component for visualizing expenses by project tag.
 */
export default function TagDistribution({ data, loading }) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="h-6 bg-white/10 rounded w-40 mb-4 animate-pulse"></div>
        <div className="h-[250px] bg-white/5 rounded animate-pulse"></div>
      </div>
    );
  }

  const chartData = data?.filter(item => item.total > 0) || [];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">{item.tag}</p>
          <p className="text-gray-400 text-sm">
            {formatCurrency(item.total)}
          </p>
          <p className="text-gray-500 text-xs">
            {item.percentage}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        🏷️ Distribución por Proyecto
      </h3>
      
      {chartData.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-gray-500">
          No hay datos para mostrar
        </div>
      ) : (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={90}
                innerRadius={50}
                dataKey="total"
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={TAG_COLORS[entry.tag] || '#6B7280'}
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: TAG_COLORS[item.tag] || '#6B7280' }}
            ></div>
            <span className="text-sm text-gray-400">{item.tag}</span>
            <span className="text-sm text-white font-medium">
              {formatCurrency(item.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
