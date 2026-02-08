import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../hooks/useApi';
import { 
  Home, 
  ShoppingCart, 
  Car, 
  Zap, 
  HeartPulse, 
  GraduationCap, 
  Film, 
  MoreHorizontal, 
  Tv,
  Coffee,
  Smartphone,
  CreditCard,
  Gift,
  Briefcase,
  Plane,
  Dumbbell,
  Book,
  Scissors,
  PawPrint,
  Wifi,
  ShoppingBag,
  Ticket,
  Music,
  Utensils,
  PiggyBank,
  Wrench,
  ShieldAlert,
  Box,
  Repeat,
  ArrowRightLeft,
  CalendarClock,
  Activity
} from 'lucide-react';

// Icon mapping
const CATEGORY_ICONS = {
  // Food & Drink
  'Alimentación': Coffee,
  'Comida': Utensils,
  'Restaurantes': Utensils,
  'Supermercado': ShoppingCart,
  
  // Transport
  'Transporte': Car,
  'Gasolina': Car,
  'Uber': Car,
  'Publico': Ticket,
  
  // Leisure
  'Entretenimiento': Film,
  'Cine': Film,
  'Hobbies': Music,
  'Viajes': Plane,
  'Vacaciones': Plane,
  
  // Home & Utilities
  'Hogar': Home,
  'Renta': Home,
  'Mantenimiento': Wrench,
  'Servicios': Zap,
  'Luz': Zap,
  'Agua': Zap,
  'Internet': Wifi,
  'Suscripciones': Tv,
  
  // Shopping
  'Compras': ShoppingBag,
  'Ropa': ShoppingBag,
  'Tecnología': Smartphone,
  'Regalos': Gift,
  
  // Health & Personal Care
  'Salud': HeartPulse,
  'Farmacia': HeartPulse,
  'Doctor': HeartPulse,
  'Cuidado Personal': Scissors,
  'Deportes': Dumbbell,
  'Gimnasio': Dumbbell,
  
  // Education & Work
  'Educación': GraduationCap,
  'Cursos': Book,
  'Libros': Book,
  'Trabajo': Briefcase,
  'Negocios': Briefcase,
  
  // Finance
  'Deudas': CreditCard,
  'Tarjetas': CreditCard,
  'Préstamos': CreditCard,
  'Pagos a Plazos': CalendarClock,
  'Transferencia': ArrowRightLeft,
  'Ahorro': PiggyBank,
  'Inversiones': PiggyBank,
  'Seguros': ShieldAlert,
  'Gastos Recurrentes': Repeat,
  
  // Health specific
  'Salud y Deporte': Activity,

  // Others
  'Mascotas': PawPrint,
  'Veterinaria': PawPrint,
  'Otros': Box
};

// Explicit category colors
const CATEGORY_COLORS = {
  'Alimentación': '#F59E0B', // Amber
  'Transporte': '#3B82F6', // Blue
  'Entretenimiento': '#8B5CF6', // Purple
  'Servicios': '#EF4444', // Red
  'Compras': '#EC4899', // Pink
  'Salud': '#10B981', // Emerald
  'Educación': '#6366F1', // Indigo
  'Hogar': '#14B8A6', // Teal
  'Suscripciones': '#F97316', // Orange
  'Tecnología': '#06B6D4', // Cyan
  'Deudas': '#9CA3AF', // Gray
  'Tarjetas': '#9CA3AF', // Gray
  'Pagos a Plazos': '#F472B6', // Pink-400
  'Transferencia': '#60A5FA', // Blue-400
  'Gastos Recurrentes': '#A78BFA', // Purple-400
  'Salud y Deporte': '#10B981', // Emerald
  'Regalos': '#DB2777', // Pink-700
  'Inversiones': '#11FB1C', // Project Green
  'Ahorro': '#11FB1C', // Project Green
  'Otros': '#94A3B8' // Slate-400 (Box)
};

// Project colors explicitly defined
const PROJECT_COLORS = {
  green: '#11FB1C',
  red: '#FF0808',
  blue: '#3B82F6',
  accent: '#8B5CF6',
  gray: '#6B7280'
};

const getCategoryIconComponent = (categoryName) => {
  const IconComponent = CATEGORY_ICONS[categoryName] || MoreHorizontal;
  return <IconComponent className="w-5 h-5" />;
};

const getCategoryColor = (categoryName, backendColor) => {
  // Use backend color if provided and valid (not default gray if possible),
  // otherwise fallback to our map, then to random constant
  if (backendColor && backendColor !== '#6B7280') return backendColor;
  return CATEGORY_COLORS[categoryName] || PROJECT_COLORS.gray;
};

/**
 * CategoryDistribution component for visualizing expenses by category.
 */
export default function CategoryDistribution({ data, loading }) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="h-6 bg-white/10 rounded w-40 mb-4 animate-pulse"></div>
        <div className="h-[300px] bg-white/5 rounded animate-pulse"></div>
      </div>
    );
  }

  // Debug logging
  console.log('CategoryDistribution render:', { loading, data });

  // Ensure data exists and filter out zero values
  const chartData = Array.isArray(data) 
    ? data
        .filter(item => item && item.total > 0)
        .map(item => ({
          ...item,
          resolvedColor: getCategoryColor(item.category, item.color)
        }))
    : [];


  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-xl z-50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white">
              {getCategoryIconComponent(item.category)}
            </span>
            <span className="text-white font-medium">{item.category}</span>
          </div>
          <p className="text-gray-400 text-sm font-mono">
            {formatCurrency(item.total)}
          </p>
          <p className="text-gray-500 text-xs">
            {item.percentage}% del total
          </p>
          {item.budget_limit && (
            <p className="text-xs mt-1" style={{ color: item.budget_used_percent > 100 ? PROJECT_COLORS.red : PROJECT_COLORS.green }}>
              {item.budget_used_percent}% del presupuesto
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
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
        className="text-xs font-bold drop-shadow-md"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="glass-card p-6 relative overflow-hidden h-full">
        {/* Background glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
        
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <span className="text-blue-400"><PieChart className="w-5 h-5" /></span> Gastos por Categoría
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center h-full">
        {/* Chart Section */}
        <div className="h-[260px] relative">
            {chartData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 flex-col gap-2">
                    <span className="text-4xl opacity-20"><PieChart className="w-10 h-10"/></span>
                    <p>No hay datos para mostrar</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={105}
                        innerRadius={70}
                        dataKey="total"
                        paddingAngle={2}
                        cornerRadius={4}
                    >
                        {chartData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.resolvedColor}
                            stroke="rgba(0,0,0,0.1)"
                            strokeWidth={1}
                        />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            )}
            
            {/* Total Center Text */}
            {chartData.length > 0 && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <p className="text-gray-400 text-xs">Total</p>
                        <p className="text-white font-bold text-sm">
                            {formatCurrency(chartData.reduce((acc, curr) => acc + curr.total, 0))}
                        </p>
                    </div>
                 </div>
            )}
        </div>

        {/* Legend/List Section */}
        <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center justify-between group p-1.5 hover:bg-white/5 rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shadow-sm relative overflow-hidden flex-shrink-0">
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundColor: item.resolvedColor }}
                  ></div>
                  <span style={{ color: item.resolvedColor, position: 'relative' }}>
                    {getCategoryIconComponent(item.category)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white group-hover:text-blue-200 transition-colors truncate">
                    {item.category}
                  </p>
                  <div className="flex items-center gap-2">
                     <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full rounded-full" 
                            style={{ width: `${item.percentage}%`, backgroundColor: item.resolvedColor }}
                        ></div>
                     </div>
                     <span className="text-[10px] text-gray-400">{item.percentage}%</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-xs font-semibold text-white">
                  {formatCurrency(item.total)}
                </p>
                {item.budget_limit && (
                   <p className={`text-[10px] ${item.budget_used_percent > 100 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {item.budget_used_percent}% pres
                   </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
