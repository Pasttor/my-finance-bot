import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for API data fetching with loading and error states.
 */
export function useApi(fetchFn, dependencies = [], options = {}) {
  const { autoFetch = true, initialData = null } = options;
  
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchFn(...args);
      setData(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [...dependencies, autoFetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Format number as currency.
 */
export function formatCurrency(amount, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display.
 */
export function formatDate(dateString, options = {}) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: options.includeYear ? 'numeric' : undefined,
    ...options,
  }).format(date);
}

/**
 * Get tag color class.
 */
export function getTagColor(tag) {
  const colors = {
    '#Asces': 'tag-asces',
    '#LabCasa': 'tag-labcasa',
    '#Personal': 'tag-personal',
  };
  return colors[tag] || 'bg-gray-600';
}

/**
 * Get category icon.
 */
export function getCategoryIcon(category) {
  const icons = {
    'Alimentación': '🍔',
    'Transporte': '🚗',
    'Entretenimiento': '🎬',
    'Servicios': '💡',
    'Compras': '🛒',
    'Salud': '🏥',
    'Educación': '📚',
    'Hogar': '🏠',
    'Suscripciones': '📺',
    'Otros': '📦',
  };
  return icons[category] || '📦';
}

export default useApi;
