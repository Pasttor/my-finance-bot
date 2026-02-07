import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard endpoints
export const getDashboardSummary = (period = 'month') =>
  api.get(`/dashboard/summary?period=${period}`);

export const getCashflow = () => api.get('/dashboard/cashflow');

export const getDistributionByTag = (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/dashboard/by-tag?${params.toString()}`);
};

export const getDistributionByCategory = (startDate, endDate, tag) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (tag) params.append('tag', tag);
  return api.get(`/dashboard/by-category?${params.toString()}`);
};

export const getCalendar = (month, year) =>
  api.get(`/dashboard/calendar?month=${month}&year=${year}`);

export const getSavingsProgress = () =>
  api.get('/dashboard/savings');

export const getRecentActivity = (limit = 10, startDate, endDate) => {
  const params = new URLSearchParams();
  params.append('limit', limit);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return api.get(`/dashboard/recent-activity?${params.toString()}`);
};

export const getCryptoPrices = () => api.get('/dashboard/crypto-prices');

// Transactions endpoints
export const getTransactions = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });
  return api.get(`/transactions?${searchParams.toString()}`);
};

export const getCategories = () =>
  api.get('/categories');

export const getDueDates = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });
  return api.get(`/due-dates?${searchParams.toString()}`);
};

export const updateDueDateStatus = (id, status) =>
  api.patch(`/due-dates/${id}`, { status });

export const getSavingsGoals = (includeCompleted = false) =>
  api.get(`/savings-goals?include_completed=${includeCompleted}`);

export const updateTransactionStatus = (id, updates) =>
  api.patch(`/transactions/${id}`, updates);

export default api;
