'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserOrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const storedTheme = localStorage.getItem('theme');
      setDarkMode(storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark));
    }

    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      fetchOrders(storedUserId);
    } else {
      setError('Please login to view your orders');
      setIsLoading(false);
    }
  }, []);

  const fetchOrders = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`https://datamall.onrender.com/api/data/user-orders/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        setError('Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return darkMode ? 'bg-green-700 text-green-50' : 'bg-green-100 text-green-800';
      case 'failed':
        return darkMode ? 'bg-red-700 text-red-50' : 'bg-red-100 text-red-800';
      case 'pending':
        return darkMode ? 'bg-yellow-700 text-yellow-50' : 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return darkMode ? 'bg-blue-700 text-blue-50' : 'bg-blue-100 text-blue-800';
      default:
        return darkMode ? 'bg-gray-700 text-gray-50' : 'bg-gray-100 text-gray-800';
    }
  };

  const NetworkLogo = ({ network }) => {
    const networkUpper = network?.toUpperCase() || '';
    
    if (networkUpper === 'YELLO' || networkUpper === 'MTN') {
      return (
        <div className="bg-yellow-400 rounded-full p-1 w-8 h-8 flex items-center justify-center">
          <span className="font-bold text-xs text-black">MTN</span>
        </div>
      );
    } else if (networkUpper === 'AT' || networkUpper === 'AIRTELTIGO') {
      return (
        <div className="bg-red-600 rounded-full p-1 w-8 h-8 flex items-center justify-center">
          <span className="font-bold text-white text-xs">AT</span>
        </div>
      );
    } else if (networkUpper === 'TELECEL') {
      return (
        <div className="bg-blue-600 rounded-full p-1 w-8 h-8 flex items-center justify-center">
          <span className="font-bold text-white text-xs">TC</span>
        </div>
      );
    } else {
      return (
        <div className="bg-gray-400 rounded-full p-1 w-8 h-8 flex items-center justify-center">
          <span className="font-bold text-white text-xs">{network?.slice(0, 2).toUpperCase() || '?'}</span>
        </div>
      );
    }
  };

  const getTextColor = (type) => {
    switch(type) {
      case 'heading': return darkMode ? 'text-white' : 'text-gray-900';
      case 'subheading': return darkMode ? 'text-gray-200' : 'text-gray-500';
      case 'body': return darkMode ? 'text-gray-100' : 'text-gray-600';
      case 'subtle': return darkMode ? 'text-gray-400' : 'text-gray-500';
      default: return darkMode ? 'text-white' : 'text-gray-900';
    }
  };

  const getBgColor = (type) => {
    switch(type) {
      case 'main': return darkMode ? 'bg-gray-900' : 'bg-gray-50';
      case 'card': return darkMode ? 'bg-gray-800' : 'bg-white';
      case 'header': return darkMode ? 'bg-gray-800' : 'bg-gray-100';
      case 'hover': return darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
      case 'empty': return darkMode ? 'bg-gray-800' : 'bg-gray-100';
      case 'error': return darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800';
      default: return darkMode ? 'bg-gray-800' : 'bg-white';
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const refreshOrders = () => {
    if (userId) {
      setIsLoading(true);
      fetchOrders(userId);
    }
  };
  
  return (
    <div className={`${getBgColor('main')} min-h-screen transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${getTextColor('heading')}`}>My Data Bundle Orders</h1>
          <div className="flex gap-2">
            <button 
              onClick={refreshOrders}
              disabled={isLoading}
              className={`px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50`}
            >
              {isLoading ? 'Loading...' : '🔄 Refresh'}
            </button>
            <button 
              onClick={toggleDarkMode}
              className={`px-4 py-2 ${darkMode ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-gray-700 hover:bg-gray-600'} text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${darkMode ? 'focus:ring-yellow-400' : 'focus:ring-gray-500'}`}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className={`mb-4 p-4 rounded-lg ${getBgColor('error')}`}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {orders.length === 0 ? (
              <div className={`text-center p-8 ${getBgColor('empty')} rounded-lg`}>
                <p className={getTextColor('body')}>You haven't placed any orders yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`min-w-full ${getBgColor('card')} rounded-lg overflow-hidden shadow-lg`}>
                  <thead className={getBgColor('header')}>
                    <tr>
                      <th className={`py-3 px-4 text-left ${getTextColor('subheading')} font-semibold`}>Network</th>
                      <th className={`py-3 px-4 text-left ${getTextColor('subheading')} font-semibold`}>Phone Number</th>
                      <th className={`py-3 px-4 text-left ${getTextColor('subheading')} font-semibold`}>Data</th>
                      <th className={`py-3 px-4 text-left ${getTextColor('subheading')} font-semibold`}>Price</th>
                      <th className={`py-3 px-4 text-left ${getTextColor('subheading')} font-semibold`}>Status</th>
                      <th className={`py-3 px-4 text-left ${getTextColor('subheading')} font-semibold`}>Date</th>
                      <th className={`py-3 px-4 text-left ${getTextColor('subheading')} font-semibold`}>Reference</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {orders.map((order) => (
                      <tr key={order.id || order._id} className={`${getBgColor('hover')} transition-colors duration-150`}>
                        <td className="py-3 px-4">
                          <NetworkLogo network={order.network} />
                        </td>
                        <td className={`py-3 px-4 ${getTextColor('body')}`}>{order.phoneNumber}</td>
                        <td className={`py-3 px-4 ${getTextColor('body')}`}>{order.dataAmount || order.capacity} GB</td>
                        <td className={`py-3 px-4 ${getTextColor('body')}`}>GH₵ {Number(order.price).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status || order.orderStatus)}`}>
                            {(order.status || order.orderStatus || 'Unknown').charAt(0).toUpperCase() + (order.status || order.orderStatus || 'Unknown').slice(1)}
                          </span>
                        </td>
                        <td className={`py-3 px-4 ${getTextColor('body')}`}>{formatDate(order.createdAt)}</td>
                        <td className={`py-3 px-4 text-xs ${getTextColor('subtle')} font-mono`}>{order.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserOrdersHistory;