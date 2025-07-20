'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserOrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [statusModal, setStatusModal] = useState({ isOpen: false, data: null, loading: false, error: null });

  // API Key for status checks
  const API_KEY = 'f9329bb51dd27c41fe3b85c7eb916a8e88821e07fd0565e1ff2558e7be3be7b4';

  useEffect(() => {
    // Check if user prefers dark mode or has set it manually
    if (typeof window !== 'undefined') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Check localStorage (if user manually set preference)
      const storedTheme = localStorage.getItem('theme');
      setDarkMode(storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark));
    }

    // Get user ID from localStorage
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

  // Check order status
  const checkOrderStatus = async (reference) => {
    setStatusModal({ isOpen: true, data: null, loading: true, error: null });

    try {
      const response = await axios.get(`https://datamartbackened.onrender.com/api/developer/order-status/${reference}`, {
        headers: {
          'x-api-key': API_KEY
        }
      });

      if (response.data.status === 'success') {
        setStatusModal({ isOpen: true, data: response.data.data, loading: false, error: null });
      } else {
        setStatusModal({ isOpen: true, data: null, loading: false, error: 'Failed to fetch order status' });
      }
    } catch (error) {
      console.error('Error checking order status:', error);
      setStatusModal({ 
        isOpen: true, 
        data: null, 
        loading: false, 
        error: error.response?.data?.message || 'Failed to check order status' 
      });
    }
  };

  // Format date to be more readable
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get appropriate badge color based on status
  const getStatusBadgeColor = (status) => {
    switch (status.toLowerCase()) {
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

  // Get network logo component based on network type
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
          <span className="font-bold text-white text-xs">{network.slice(0, 2).toUpperCase()}</span>
        </div>
      );
    }
  };

  // Get text color based on type and dark mode
  const getTextColor = (type) => {
    switch(type) {
      case 'heading': return darkMode ? 'text-white' : 'text-gray-900';
      case 'subheading': return darkMode ? 'text-gray-200' : 'text-gray-500';
      case 'body': return darkMode ? 'text-gray-100' : 'text-gray-600';
      case 'subtle': return darkMode ? 'text-gray-400' : 'text-gray-500';
      default: return darkMode ? 'text-white' : 'text-gray-900';
    }
  };

  // Get background color based on type and dark mode
  const getBgColor = (type) => {
    switch(type) {
      case 'main': return darkMode ? 'bg-gray-900' : 'bg-gray-50';
      case 'card': return darkMode ? 'bg-gray-800' : 'bg-white';
      case 'header': return darkMode ? 'bg-gray-800' : 'bg-gray-100';
      case 'hover': return darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
      case 'empty': return darkMode ? 'bg-gray-800' : 'bg-gray-100';
      case 'error': return darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800';
      case 'modal': return darkMode ? 'bg-gray-800' : 'bg-white';
      case 'modalOverlay': return 'bg-black bg-opacity-50';
      default: return darkMode ? 'bg-gray-800' : 'bg-white';
    }
  };

  // Toggle dark mode function
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // Close modal
  const closeModal = () => {
    setStatusModal({ isOpen: false, data: null, loading: false, error: null });
  };
  
  return (
    <div className={`${getBgColor('main')} min-h-screen transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${getTextColor('heading')}`}>My Data Bundle Orders</h1>
          <button 
            onClick={toggleDarkMode}
            className={`px-4 py-2 ${darkMode ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-gray-700 hover:bg-gray-600'} text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${darkMode ? 'focus:ring-yellow-400' : 'focus:ring-gray-500'}`}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
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
                      <th className={`py-3 px-4 text-left ${getTextColor('subheading')} font-semibold`}>Date</th>
                      <th className={`py-3 px-4 text-left ${getTextColor('subheading')} font-semibold`}>Reference</th>
                      <th className={`py-3 px-4 text-center ${getTextColor('subheading')} font-semibold`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {orders.map((order) => (
                      <tr key={order.id} className={`${getBgColor('hover')} transition-colors duration-150`}>
                        <td className="py-3 px-4">
                          <NetworkLogo network={order.network} />
                        </td>
                        <td className={`py-3 px-4 ${getTextColor('body')}`}>{order.phoneNumber}</td>
                        <td className={`py-3 px-4 ${getTextColor('body')}`}>{order.dataAmount} GB</td>
                        <td className={`py-3 px-4 ${getTextColor('body')}`}>GH₵ {order.price.toFixed(2)}</td>
                        <td className={`py-3 px-4 ${getTextColor('body')}`}>{formatDate(order.createdAt)}</td>
                        <td className={`py-3 px-4 text-xs ${getTextColor('subtle')} font-mono`}>{order.reference}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => checkOrderStatus(order.reference)}
                            className={`px-3 py-1 text-sm rounded-md ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`}
                          >
                            Check Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status Modal */}
      {statusModal.isOpen && (
        <div className={`fixed inset-0 ${getBgColor('modalOverlay')} flex items-center justify-center z-50`}>
          <div className={`${getBgColor('modal')} rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${getTextColor('heading')}`}>Order Status Details</h2>
              <button
                onClick={closeModal}
                className={`${getTextColor('subtle')} hover:${getTextColor('body')} transition-colors`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {statusModal.loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}

            {statusModal.error && (
              <div className={`p-4 rounded-lg ${getBgColor('error')}`}>
                {statusModal.error}
              </div>
            )}

            {statusModal.data && (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${getTextColor('subtle')}`}>Reference</p>
                  <p className={`font-mono text-sm ${getTextColor('body')}`}>{statusModal.data.reference}</p>
                </div>

                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${getTextColor('subtle')}`}>Status</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(statusModal.data.orderStatus)}`}>
                    {statusModal.data.orderStatus.charAt(0).toUpperCase() + statusModal.data.orderStatus.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${getTextColor('subtle')}`}>Network</p>
                    <p className={`font-medium ${getTextColor('body')}`}>{statusModal.data.network}</p>
                  </div>

                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${getTextColor('subtle')}`}>Phone</p>
                    <p className={`font-medium ${getTextColor('body')}`}>{statusModal.data.phoneNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${getTextColor('subtle')}`}>Data Amount</p>
                    <p className={`font-medium ${getTextColor('body')}`}>{statusModal.data.capacity} GB ({statusModal.data.mb} MB)</p>
                  </div>

                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${getTextColor('subtle')}`}>Price</p>
                    <p className={`font-medium ${getTextColor('body')}`}>GH₵ {statusModal.data.price}</p>
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${getTextColor('subtle')}`}>Created</p>
                  <p className={`text-sm ${getTextColor('body')}`}>{formatDate(statusModal.data.createdAt)}</p>
                </div>

                {statusModal.data.updatedAt && statusModal.data.updatedAt !== statusModal.data.createdAt && (
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${getTextColor('subtle')}`}>Last Updated</p>
                    <p className={`text-sm ${getTextColor('body')}`}>{formatDate(statusModal.data.updatedAt)}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={closeModal}
                className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${getTextColor('body')} rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${darkMode ? 'focus:ring-gray-500' : 'focus:ring-gray-400'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserOrdersHistory;