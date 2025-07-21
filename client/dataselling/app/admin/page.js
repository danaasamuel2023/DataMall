// pages/orders/index.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function OrdersList() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateStates, setUpdateStates] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check if user prefers dark mode or has set it manually
    if (typeof window !== 'undefined') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Check localStorage (if user manually set preference)
      const storedTheme = localStorage.getItem('theme');
      setDarkMode(storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark));
    }
    
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://datamall.onrender.com/api/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      setOrders(data);
      
      // Initialize update states for each order
      const initialUpdateStates = {};
      data.forEach(order => {
        initialUpdateStates[order._id] = {
          status: order.status,
          loading: false,
          message: ''
        };
      });
      setUpdateStates(initialUpdateStates);
    } catch (err) {
      setError(err.message || 'Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

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
      // Set loading state
      setUpdateStates(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          loading: true,
          message: ''
        }
      }));
      
      const response = await fetch(`https://bignsah.onrender.com/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: updateStates[orderId].status })
      });
      
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
      // Set error message
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

  // Enhanced getStatusColor function with better contrast for status badges
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

  // Format network name to make it more readable
  const formatNetwork = (network) => {
    if (network === 'mtn') return 'MTN';
    if (network === 'at') return 'Airtel-Tigo';
    if (network === 'afa-registration') return 'AFA Registration';
    return network.charAt(0).toUpperCase() + network.slice(1);
  };

  const toggleOrderDetails = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  // Toggle dark mode function
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // Updated getTextColor function for better contrast in dark mode
  const getTextColor = (type) => {
    switch(type) {
      case 'heading': return darkMode ? 'text-white' : 'text-gray-900';
      case 'subheading': return darkMode ? 'text-gray-200' : 'text-gray-500'; // Lightened from 300 to 200
      case 'body': return darkMode ? 'text-gray-100' : 'text-gray-600'; // Lightened and increased contrast
      case 'link': return darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700';
      case 'error': return darkMode ? 'text-red-300' : 'text-red-600'; // Added for error messages
      case 'success': return darkMode ? 'text-green-300' : 'text-green-600'; // Added for success messages
      default: return darkMode ? 'text-white' : 'text-gray-900';
    }
  };

  // Get background colors based on dark mode
  const getBgColor = (type) => {
    switch(type) {
      case 'main': return darkMode ? 'bg-gray-900' : 'bg-white';
      case 'header': return darkMode ? 'bg-gray-800' : 'bg-gray-50';
      case 'card': return darkMode ? 'bg-gray-800' : 'bg-white';
      case 'expanded': return darkMode ? 'bg-gray-700' : 'bg-gray-50';
      default: return darkMode ? 'bg-gray-800' : 'bg-white';
    }
  };
  
  // Navigation functions
  const navigateToNetworkToggle = () => {
    router.push('/toogle');
  };
  
  const navigateToUsers = () => {
    router.push('/users');
  };

  if (loading) return (
    <div className={`flex justify-center items-center min-h-screen ${getBgColor('main')}`}>
      <div className="spinner border-t-4 border-blue-500 border-solid rounded-full w-12 h-12 animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className={`flex justify-center items-center min-h-screen ${getBgColor('main')}`}>
      <div className={`${darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-700'} p-4 rounded-lg`}>
        Error: {error}
      </div>
    </div>
  );

  return (
    <div className={`${getBgColor('main')} min-h-screen transition-colors duration-300`}>
      <Head>
        <title>Orders Management</title>
      </Head>
      
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className={`text-2xl font-bold ${getTextColor('heading')}`}>Orders Management</h1>
          
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
              onClick={toggleDarkMode}
              className={`px-4 py-2 ${darkMode ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-gray-700 hover:bg-gray-600'} text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${darkMode ? 'focus:ring-yellow-400' : 'focus:ring-gray-500'}`}
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button 
              onClick={fetchOrders}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh
            </button>
          </div>
        </div>
        
        <div className={`${getBgColor('card')} shadow-md rounded-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className={`px-6 py-4 text-center ${getTextColor('body')}`}>
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <>
                      <tr key={order._id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTextColor('heading')}`}>
                          {order._id.substring(0, 8)}...
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
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('body')}`}>
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
                              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
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
                              {order.status === 'completed' && (
                                <div className="space-y-1">
                                  <p className={`text-sm font-medium ${getTextColor('subheading')}`}>Completed At</p>
                                  <p className={`text-sm ${getTextColor('heading')}`}>{formatDate(order.completedAt)}</p>
                                </div>
                              )}
                              {order.status === 'failed' && (
                                <div className="space-y-1">
                                  <p className={`text-sm font-medium ${getTextColor('subheading')}`}>Failure Reason</p>
                                  <p className={`text-sm ${getTextColor('error')}`}>{order.failureReason || 'No reason provided'}</p>
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
        </div>
      </div>
    </div>
  );
}