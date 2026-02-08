import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, MessageCircle, PiggyBank } from 'lucide-react';

import StatCard from '../components/StatCard';
import CashFlowChart from '../components/CashFlowChart';
import TagDistribution from '../components/TagDistribution';
import RecurringPayments from '../components/RecurringPayments';
import DueCalendar from '../components/DueCalendar';

import TransactionList from '../components/TransactionList';
import CategoryDistribution from '../components/CategoryDistribution';
import InvestmentsPortfolio from '../components/InvestmentsPortfolio';
import PendingPayments from '../components/PendingPayments';

import {
  getDashboardSummary,
  getCashflow,
  getDistributionByTag,
  getCalendar,
  getSavingsProgress,

  getRecentActivity,
  getDistributionByCategory,
} from '../services/api';

/**
 * Main Dashboard page component.
 */
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [cashflow, setCashflow] = useState([]);
  const [tagDistribution, setTagDistribution] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [savings, setSavings] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [totalSavings, setTotalSavings] = useState(52711.57);
  
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Savings calculator - Two accounts with different rates
  const SAVINGS_ACCOUNTS = [
    { name: 'Cajita Turbo 🚀', principal: 25000.00, annualRate: 0.13 },
    { name: 'cajita x', principal: 27711.57, annualRate: 0.07 }
  ];

  const calculateSavings = () => {
    const lastUpdate = localStorage.getItem('savingsLastUpdate');
    const now = new Date().getTime();
    
    let principal1 = SAVINGS_ACCOUNTS[0].principal;
    let principal2 = SAVINGS_ACCOUNTS[1].principal;
    
    if (lastUpdate) {
      const daysPassed = (now - parseInt(lastUpdate)) / (1000 * 60 * 60 * 24);
      
      // Daily compound interest: A = P * (1 + r/365)^days
      principal1 = SAVINGS_ACCOUNTS[0].principal * Math.pow(1 + SAVINGS_ACCOUNTS[0].annualRate / 365, daysPassed);
      principal2 = SAVINGS_ACCOUNTS[1].principal * Math.pow(1 + SAVINGS_ACCOUNTS[1].annualRate / 365, daysPassed);
    }
    
    const total = principal1 + principal2;
    setTotalSavings(total);
    localStorage.setItem('savingsLastUpdate', now.toString());
    
    return total;
  };

  // Update savings every 12 hours
  useEffect(() => {
    calculateSavings();
    
    const interval = setInterval(() => {
      calculateSavings();
    }, 12 * 60 * 60 * 1000); // 12 hours in milliseconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const today = new Date();
      // Calculate start of current month
      // Calculate start of current month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const results = await Promise.allSettled([
        getDashboardSummary(selectedPeriod),
        getCashflow(),
        getDistributionByTag(),
        getCalendar(today.getMonth() + 1, today.getFullYear()),
        getSavingsProgress(),
        getRecentActivity(20, formatDate(startOfMonth)),
        getDistributionByCategory(null, null, null),
      ]);

      // Extract data from settled promises
      const [summaryRes, cashflowRes, tagRes, calendarRes, savingsRes, transactionsRes, categoryRes] = results;

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (cashflowRes.status === 'fulfilled') setCashflow(cashflowRes.value.data?.data || []);
      if (tagRes.status === 'fulfilled') setTagDistribution(tagRes.value.data?.data || []);
      if (calendarRes.status === 'fulfilled') setCalendar(calendarRes.value.data);
      if (savingsRes.status === 'fulfilled') setSavings(savingsRes.value.data);
      if (transactionsRes.status === 'fulfilled') setTransactions(transactionsRes.value.data);
      
      if (categoryRes && categoryRes.status === 'fulfilled') {
        setCategoryDistribution(categoryRes.value.data?.data || []);
      }
      
      // Only show error if ALL requests failed
      const allFailed = results.every(r => r.status === 'rejected');
      if (allFailed) {
        setError('Error al cargar los datos. Por favor intenta de nuevo.');
      }
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Error al cargar los datos. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedPeriod]);

  const handleRefresh = () => {
    setRefreshing(true);
    calculateSavings(); // Update savings on manual refresh
    fetchAllData(false);
  };

  const handleMonthChange = async (month, year) => {
    try {
      const calendarRes = await getCalendar(month, year);
      setCalendar(calendarRes.data);
    } catch (err) {
      console.error('Error fetching calendar:', err);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Resumen Financiero
            </h1>
            <p className="text-gray-400 mt-1">
              Panel de control financiero personal
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex bg-white/5 rounded-lg p-1">
              {['week', 'month', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === period
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año'}
                </button>
              ))}
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            {/* WhatsApp Link */}
            <a
              href="http://wa.me/+14155238886?text=join%20shinning-cream"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: '#11FB1C', color: '#1a1a1a' }}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="hidden md:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
          <button
            onClick={handleRefresh}
            className="ml-4 underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Ingresos"
          value={summary?.total_income || 0}
          type="income"
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="Gastos"
          value={summary?.total_expenses || 0}
          type="expense"
          icon={TrendingDown}
          loading={loading}
        />
        <StatCard
          title="Balance"
          value={summary?.net_balance || 0}
          type="balance"
          icon={Wallet}
          loading={loading}
        />
        <StatCard
          title="Inversiones"
          value={233.78}
          type="investments"
          icon={TrendingUp}
          loading={loading}
          subtitle="24h: -$12.81 ▼ 5.19%"
        />
        <StatCard
          title="Ahorros"
          value={totalSavings}
          type="savings"
          icon={PiggyBank}
          loading={loading}
        />
      </div>

      {/* Main Charts Row */}
      {/* Cashflow and Transactions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <CashFlowChart data={cashflow} loading={loading} />
        </div>
        <div>
           <TransactionList transactions={transactions} loading={loading} />
        </div>
      </div>

      {/* Calendar and Recurring Payments Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <DueCalendar
          data={calendar}
          loading={loading}
          onMonthChange={handleMonthChange}
        />
        <div className="relative w-full">
          <div className="w-full h-full lg:absolute lg:inset-0">
            <RecurringPayments data={calendar} loading={loading} onStatusChange={handleRefresh} />
          </div>
        </div>
      </div>

      {/* Category Distribution and Investments Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="h-[600px]">
          <CategoryDistribution data={categoryDistribution} loading={loading} />
        </div>
        <div className="h-[600px]">
           <InvestmentsPortfolio />
        </div>
      </div>

      {/* Pending Payments Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="h-[400px]">
          <PendingPayments loading={loading} />
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-600 text-sm py-4">
        <p>
          💬 Envía tus gastos a WhatsApp: "Gasté 150 en Uber #Personal"
        </p>
        <p className="mt-1">
          📸 También puedes enviar fotos de tus tickets
        </p>
      </footer>
    </div>
  );
}
