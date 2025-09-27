// pages/orders/index.js
'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

// Debounce hook for search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function OrdersList() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateStates, setUpdateStates] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersPerPage, setOrdersPerPage] = useState(50);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Stats state
  const [orderStats, setOrderStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });

  useEffect(() => {
    // Check if user prefers dark mode or has set it manually
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const storedTheme = localStorage.getItem('theme');
      setDarkMode(storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark));
    }
  }, []);

  // Fetch orders with pagination and filters
  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ordersPerPage.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(networkFilter && { network: networkFilter }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      });

      const response = await fetch(
        `https://datamall.onrender.com/api/orders?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();

      // Handle paginated response
      if (data.pagination) {
        setOrders(data.orders);
        setTotalPages(data.pagination.pages);
        setCurrentPage(data.pagination.page);
        setTotalOrders(data.pagination.total);
        
        // Calculate stats if provided
        if (data.stats) {
          setOrderStats(data.stats);
        }
      } else {
        // Fallback for old API format
        setOrders(data);
        setTotalPages(1);
        setCurrentPage(1);
        setTotalOrders(data.length);
        
        // Calculate stats manually
        const stats = data.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {});
        setOrderStats(stats);
      }

      // Initialize update states for each order
      const initialUpdateStates = {};
      const ordersToProcess = data.pagination ? data.orders : data;
      ordersToProcess.forEach(order => {
        initialUpdateStates[order._id] = {
          status: order.status,
          loading: false,
          message: ''
        };
      });
      setUpdateStates(initialUpdateStates);
    } catch (err) {
      setError(err.message || 'Error fetching orders');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [ordersPerPage, statusFilter, networkFilter, debouncedSearchTerm, dateRange, router]);

  // Fetch orders when filters change
  useEffect(() => {
    fetchOrders(1);
  }, [debouncedSearchTerm, statusFilter, networkFilter, ordersPerPage, dateRange.start, dateRange.end]);

  // Initial fetch
  useEffect(() => {
    fetchOrders(currentPage);
  }, []);

  const handleStatusChange = (orderId, newStatus) => {
    setUpdateStates(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        status: newStatus
      }
    }));
  };

  const updateOrderStatus = async (orderId) => {
    try {
      setUpdateStates(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          loading: true,
          message: ''
        }
      }));

      const response = await fetch(
        `https://datamall.onrender.com/api/orders/${orderId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ status: updateStates[orderId].status })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order status');
      }

      const data = await response.json();

      // Update the order in the list
      setOrders(prev =>
        prev.map(order =>
          order._id === orderId ? data.order : order
        )
      );

      // Update stats
      fetchOrders(currentPage);

      // Set success message
      setUpdateStates(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          loading: false,
          message: 'Updated successfully'
        }
      }));

      // Clear message after 3 seconds
      setTimeout(() => {
        setUpdateStates(prev => ({
          ...prev,
          [orderId]: {
            ...prev[orderId],
            message: ''
          }
        }));
      }, 3000);
    } catch (err) {
      setUpdateStates(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          loading: false,
          message: `Error: ${err.message}`
        }
      }));
    }
  };

  // Utility functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return darkMode ? 'bg-yellow-700 text-yellow-50' : 'bg-yellow-100 text-yellow-800';
      case 'processing': return darkMode ? 'bg-blue-700 text-blue-50' : 'bg-blue-100 text-blue-800';
      case 'completed': return darkMode ? 'bg-green-700 text-green-50' : 'bg-green-100 text-green-800';
      case 'failed': return darkMode ? 'bg-red-700 text-red-50' : 'bg-red-100 text-red-800';
      default: return darkMode ? 'bg-gray-700 text-gray-50' : 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatNetwork = (network) => {
    if (network === 'mtn') return 'MTN';
    if (network === 'at') return 'Airtel-Tigo';
    if (network === 'afa-registration') return 'AFA Registration';
    return network.charAt(0).toUpperCase() + network.slice(1);
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const getTextColor = (type) => {
    switch(type) {
      case 'heading': return darkMode ? 'text-white' : 'text-gray-900';
      case 'subheading': return darkMode ? 'text-gray-200' : 'text-gray-500';
      case 'body': return darkMode ? 'text-gray-100' : 'text-gray-600';
      case 'link': return darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700';
      case 'error': return darkMode ? 'text-red-300' : 'text-red-600';
      case 'success': return darkMode ? 'text-green-300' : 'text-green-600';
      default: return darkMode ? 'text-white' : 'text-gray-900';
    }
  };

  const getBgColor = (type) => {
    switch(type) {
      case 'main': return darkMode ? 'bg-gray-900' : 'bg-gray-100';
      case 'header': return darkMode ? 'bg-gray-800' : 'bg-gray-50';
      case 'card': return darkMode ? 'bg-gray-800' : 'bg-white';
      case 'expanded': return darkMode ? 'bg-gray-700' : 'bg-gray-50';
      case 'input': return darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900';
      default: return darkMode ? 'bg-gray-800' : 'bg-white';
    }
  };

  // Navigation functions
  const navigateToNetworkToggle = () => router.push('/toogle');
  const navigateToUsers = () => router.push('/users');

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setNetworkFilter('');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  // Export functionality
  const exportOrders = () => {
    const csv = [
      ['Order ID', 'User', 'Network', 'Phone', 'Amount', 'Price', 'Status', 'Date'],
      ...orders.map(order => [
        order._id,
        order.userId?.email || 'Unknown',
        formatNetwork(order.network),
        order.phoneNumber,
        order.network === 'afa-registration' ? 'N/A' : `${order.dataAmount/1000} GB`,
        `GH₵ ${order.price.toFixed(2)}`,
        order.status,
        formatDate(order.createdAt)
      ])
    ];
    
    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Skeleton loader component
  const OrderSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-28"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-36"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
      </td>
    </tr>
  );

  // Stats cards component
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Object.entries(orderStats).map(([status, count]) => (
        <div key={status} className={`${getBgColor('card')} rounded-lg shadow p-4`}>
          <div className={`text-sm ${getTextColor('subheading')} uppercase`}>
            {status}
          </div>
          <div className={`text-2xl font-bold ${getTextColor('heading')} mt-1`}>
            {count}
          </div>
          <div className={`text-xs ${getTextColor('body')} mt-2`}>
            {((count / totalOrders) * 100).toFixed(1)}% of total
          </div>
        </div>
      ))}
    </div>
  );

  // Pagination controls component
  const PaginationControls = () => {
    const pageNumbers = [];
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    if (endPage - startPage < maxPageButtons - 1) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4">
        <div className={`text-sm ${getTextColor('body')}`}>
          Showing {Math.min((currentPage - 1) * ordersPerPage + 1, totalOrders)} to{' '}
          {Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders} orders
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCurrentPage(1);
              fetchOrders(1);
            }}
            disabled={currentPage === 1 || loading}
            className="p-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={() => {
              setCurrentPage(currentPage - 1);
              fetchOrders(currentPage - 1);
            }}
            disabled={currentPage === 1 || loading}
            className="p-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => {
                setCurrentPage(page);
                fetchOrders(page);
              }}
              disabled={loading}
              className={`px-3 py-1 rounded ${
                currentPage === page
                  ? 'bg-blue-500 text-white'
                  : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              } disabled:cursor-not-allowed`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => {
              setCurrentPage(currentPage + 1);
              fetchOrders(currentPage + 1);
            }}
            disabled={currentPage === totalPages || loading}
            className="p-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <button
            onClick={() => {
              setCurrentPage(totalPages);
              fetchOrders(totalPages);
            }}
            disabled={currentPage === totalPages || loading}
            className="p-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <select
          value={ordersPerPage}
          onChange={(e) => {
            setOrdersPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className={`px-3 py-1 rounded border ${getBgColor('input')} ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
        >
          <option value="20">20 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
          <option value="200">200 per page</option>
        </select>
      </div>
    );
  };

  if (error && !loading && orders.length === 0) {
    return (
      <div className={`flex justify-center items-center min-h-screen ${getBgColor('main')}`}>
        <div className={`${darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-700'} p-4 rounded-lg`}>
          <p className="font-semibold">Error: {error}</p>
          <button
            onClick={() => fetchOrders(1)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${getBgColor('main')} min-h-screen transition-colors duration-300`}>
      <Head>
        <title>Orders Management</title>
      </Head>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className={`text-2xl font-bold ${getTextColor('heading')}`}>
            Orders Management
          </h1>

          {/* Navigation and Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={navigateToNetworkToggle}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Network Toggle
            </button>
            <button
              onClick={navigateToUsers}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              User Management
            </button>
            <button
              onClick={exportOrders}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Export CSV
            </button>
            <button
              onClick={toggleDarkMode}
              className={`px-4 py-2 ${darkMode ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-gray-700 hover:bg-gray-600'} text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${darkMode ? 'focus:ring-yellow-400' : 'focus:ring-gray-500'}`}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={() => fetchOrders(currentPage)}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {totalOrders > 0 && <StatsCards />}

        {/* Filters Section */}
        <div className={`${getBgColor('card')} rounded-lg shadow-md p-4 mb-6`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div>
              <label className={`block text-sm font-medium ${getTextColor('subheading')} mb-1`}>
                Search
              </label>
              <input
                type="text"
                placeholder="Order ID, Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')} ${darkMode ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className={`block text-sm font-medium ${getTextColor('subheading')} mb-1`}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')} ${darkMode ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Network Filter */}
            <div>
              <label className={`block text-sm font-medium ${getTextColor('subheading')} mb-1`}>
                Network
              </label>
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')} ${darkMode ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">All Networks</option>
                <option value="mtn">MTN</option>
                <option value="at">Airtel-Tigo</option>
                <option value="telecel">Telecel</option>
                <option value="afa-registration">AFA Registration</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={`block text-sm font-medium ${getTextColor('subheading')} mb-1`}>
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')} ${darkMode ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${getTextColor('subheading')} mb-1`}>
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')} ${darkMode ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className={`${getBgColor('card')} shadow-md rounded-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${getBgColor('header')}`}>
                <tr>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('subheading')} uppercase tracking-wider`}>
                    Order ID
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('subheading')} uppercase tracking-wider`}>
                    User
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('subheading')} uppercase tracking-wider`}>
                    Network
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('subheading')} uppercase tracking-wider`}>
                    Phone Number
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('subheading')} uppercase tracking-wider`}>
                    Data Amount
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('subheading')} uppercase tracking-wider`}>
                    Price
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('subheading')} uppercase tracking-wider`}>
                    Date
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('subheading')} uppercase tracking-wider`}>
                    Status
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('subheading')} uppercase tracking-wider`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`${getBgColor('card')} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {loading && orders.length === 0 ? (
                  // Skeleton loaders
                  Array(5).fill(0).map((_, index) => (
                    <OrderSkeleton key={index} />
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className={`px-6 py-8 text-center ${getTextColor('body')}`}>
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium mb-2">No orders found</p>
                        <p className="text-sm">Try adjusting your filters or search terms</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <>
                      <tr key={order._id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTextColor('heading')}`}>
                          <span title={order._id} className="cursor-help">
                            {order._id.substring(0, 8)}...
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('body')}`}>
                          {order.userId ? (
                            <div>
                              <div className={getTextColor('heading')}>{order.userId.name}</div>
                              <div className={`text-xs ${getTextColor('subheading')}`}>{order.userId.email}</div>
                            </div>
                          ) : (
                            <span className={getTextColor('subheading')}>Unknown user</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('body')}`}>
                          {formatNetwork(order.network)}
                          {order.network === 'afa-registration' && (
                            <button
                              onClick={() => toggleOrderDetails(order._id)}
                              className={`ml-2 ${getTextColor('link')} underline text-xs focus:outline-none focus:ring-1 focus:ring-offset-1 ${darkMode ? 'focus:ring-blue-300' : 'focus:ring-blue-500'}`}
                            >
                              {expandedOrder === order._id ? 'Hide Details' : 'View Details'}
                            </button>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('body')}`}>
                          {order.phoneNumber}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('body')}`}>
                          {order.network === 'afa-registration' ? 'N/A' : `${order.dataAmount/1000} GB`}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTextColor('body')}`}>
                          GH₵ {order.price.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('body')}`}>
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('body')}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <select
                              value={updateStates[order._id]?.status || order.status}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                              className={`border rounded px-2 py-1 text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-blue-400' : 'focus:ring-blue-500'}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="completed">Completed</option>
                              <option value="failed">Failed</option>
                            </select>
                            <button
                              onClick={() => updateOrderStatus(order._id)}
                              disabled={updateStates[order._id]?.loading || updateStates[order._id]?.status === order.status}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                            >
                              {updateStates[order._id]?.loading ? 'Updating...' : 'Update'}
                            </button>
                            {updateStates[order._id]?.message && (
                              <span className={`text-xs font-medium ${updateStates[order._id]?.message.includes('Error')
                                ? getTextColor('error')
                                : getTextColor('success')}`}
                              >
                                {updateStates[order._id]?.message}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded AFA Registration Details */}
                      {order.network === 'afa-registration' && expandedOrder === order._id && (
                        <tr>
                          <td colSpan="9" className={`px-6 py-4 ${getBgColor('expanded')}`}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <p className={`text-sm font-medium ${getTextColor('subheading')}`}>Full Name</p>
                                <p className={`text-sm ${getTextColor('heading')}`}>{order.fullName || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className={`text-sm font-medium ${getTextColor('subheading')}`}>ID Type</p>
                                <p className={`text-sm ${getTextColor('heading')}`}>{order.idType || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className={`text-sm font-medium ${getTextColor('subheading')}`}>ID Number</p>
                                <p className={`text-sm ${getTextColor('heading')}`}>{order.idNumber || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className={`text-sm font-medium ${getTextColor('subheading')}`}>Date of Birth</p>
                                <p className={`text-sm ${getTextColor('heading')}`}>{formatDate(order.dateOfBirth)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className={`text-sm font-medium ${getTextColor('subheading')}`}>Occupation</p>
                                <p className={`text-sm ${getTextColor('heading')}`}>{order.occupation || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className={`text-sm font-medium ${getTextColor('subheading')}`}>Location</p>
                                <p className={`text-sm ${getTextColor('heading')}`}>{order.location || 'N/A'}</p>
                              </div>
                              {order.status === 'completed' && order.completedAt && (
                                <div className="space-y-1">
                                  <p className={`text-sm font-medium ${getTextColor('subheading')}`}>Completed At</p>
                                  <p className={`text-sm ${getTextColor('heading')}`}>{formatDate(order.completedAt)}</p>
                                </div>
                              )}
                              {order.status === 'failed' && order.failureReason && (
                                <div className="space-y-1">
                                  <p className={`text-sm font-medium ${getTextColor('subheading')}`}>Failure Reason</p>
                                  <p className={`text-sm ${getTextColor('error')}`}>{order.failureReason}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && orders.length > 0 && totalPages > 1 && (
            <PaginationControls />
          )}
        </div>
      </div>
    </div>
  );
}