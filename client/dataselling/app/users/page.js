// app/users/page.js or components/WalletManagement.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function WalletManagement() {
  const router = useRouter();
  
  // Core states
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // User search states
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Transaction states
  const [transactionType, setTransactionType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  
  // Bulk operation states
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkDescription, setBulkDescription] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  
  // Additional states
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  
  // Statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    agents: 0,
    regularUsers: 0,
    totalBalance: 0,
    suspendedUsers: 0,
    usersWithWarnings: 0
  });

  // Initialize on mount
  useEffect(() => {
    // Check if user is admin
    const userRole = localStorage.getItem('userrole');
    if (userRole !== 'admin') {
      router.push('/dashboard');
      return;
    }
    
    // Check dark mode
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const storedTheme = localStorage.getItem('theme');
      setDarkMode(storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark));
    }
    
    // Fetch stats
    fetchSystemStats();
  }, []);

  // Search users with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchUsers();
      } else {
        setUsers([]);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch system statistics
  const fetchSystemStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'https://datamall.onrender.com/api/users?limit=1000',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.users) {
        const usersList = response.data.users;
        setStats({
          totalUsers: usersList.length,
          admins: usersList.filter(u => u.role === 'admin').length,
          agents: usersList.filter(u => u.role === 'agent').length,
          regularUsers: usersList.filter(u => !u.role || u.role === 'user').length,
          totalBalance: usersList.reduce((sum, u) => sum + (u.walletBalance || 0), 0),
          suspendedUsers: usersList.filter(u => u.isSuspended).length,
          usersWithWarnings: usersList.filter(u => u.fraudWarnings > 0).length
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Search users function
  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setSearchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://datamall.onrender.com/api/users?search=${searchTerm}&limit=10`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Search error:', error);
      setMessage({ text: 'Failed to search users', type: 'error' });
    } finally {
      setSearchLoading(false);
    }
  };

  // Select user for transaction
  const selectUser = (user) => {
    setSelectedUser(user);
    setUsers([]);
    setSearchTerm('');
    fetchUserTransactions(user._id);
  };

  // Toggle user selection for bulk
  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const exists = prev.some(u => u._id === user._id);
      if (exists) {
        return prev.filter(u => u._id !== user._id);
      }
      return [...prev, user];
    });
  };

  // Fetch transaction history
  const fetchUserTransactions = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://datamall.onrender.com/api/users/${userId}/transactions?limit=10`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.transactions) {
        setTransactionHistory(response.data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Validate transaction
  const validateTransaction = () => {
    if (!bulkMode && !selectedUser) {
      setMessage({ text: 'Please select a user', type: 'error' });
      return false;
    }
    
    if (bulkMode && selectedUsers.length === 0) {
      setMessage({ text: 'Please select at least one user', type: 'error' });
      return false;
    }
    
    const checkAmount = bulkMode ? bulkAmount : amount;
    const amountNum = parseFloat(checkAmount);
    
    if (!checkAmount || amountNum <= 0) {
      setMessage({ text: 'Please enter a valid amount', type: 'error' });
      return false;
    }
    
    if (amountNum > 10000) {
      setMessage({ text: 'Amount cannot exceed GH₵ 10,000', type: 'error' });
      return false;
    }
    
    const checkDescription = bulkMode ? bulkDescription : description;
    if (!checkDescription.trim()) {
      setMessage({ text: 'Please enter a description', type: 'error' });
      return false;
    }
    
    if (transactionType === 'deduct') {
      const checkReason = bulkMode ? bulkReason : reason;
      if (!checkReason.trim()) {
        setMessage({ text: 'Please provide a reason for deduction', type: 'error' });
        return false;
      }
    }
    
    return true;
  };

  // Initiate transaction
  const initiateTransaction = () => {
    if (!validateTransaction()) return;
    
    setPendingTransaction({
      type: transactionType,
      amount: parseFloat(bulkMode ? bulkAmount : amount),
      description: bulkMode ? bulkDescription : description,
      reason: bulkMode ? bulkReason : reason,
      isBulk: bulkMode,
      users: bulkMode ? selectedUsers : [selectedUser]
    });
    setShowConfirmDialog(true);
  };

  // Process single transaction
  const processSingleTransaction = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = transactionType === 'deposit' 
        ? `/users/${selectedUser._id}/deposit`
        : `/users/${selectedUser._id}/deduct`;
      
      const payload = {
        amount: parseFloat(amount),
        description: description
      };
      
      if (transactionType === 'deduct') {
        payload.reason = reason;
      }
      
      const response = await axios.post(
        `https://datamall.onrender.com/api${endpoint}`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data) {
        setMessage({
          text: `Successfully ${transactionType === 'deposit' ? 'added' : 'deducted'} GH₵ ${amount}`,
          type: 'success'
        });
        
        setSelectedUser(prev => ({
          ...prev,
          walletBalance: response.data[transactionType === 'deposit' ? 'deposit' : 'deduction'].newBalance
        }));
        
        fetchUserTransactions(selectedUser._id);
        setAmount('');
        setDescription('');
        setReason('');
      }
    } catch (error) {
      setMessage({
        text: error.response?.data?.error || 'Transaction failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // Process bulk transaction
  const processBulkTransaction = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = transactionType === 'deposit' ? '/bulk-credit' : '/bulk-deduct';
      
      const payload = {
        userIds: selectedUsers.map(u => u._id),
        amount: parseFloat(bulkAmount),
        description: bulkDescription
      };
      
      if (transactionType === 'deduct') {
        payload.reason = bulkReason;
      }
      
      const response = await axios.post(
        `https://datamall.onrender.com/api${endpoint}`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data) {
        const summary = response.data.summary;
        setMessage({
          text: `Bulk ${transactionType} completed: ${summary.successful} successful, ${summary.failed} failed`,
          type: summary.failed > 0 ? 'warning' : 'success'
        });
        
        setSelectedUsers([]);
        setBulkAmount('');
        setBulkDescription('');
        setBulkReason('');
      }
    } catch (error) {
      setMessage({
        text: error.response?.data?.error || 'Bulk transaction failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // Execute transaction
  const executeTransaction = () => {
    if (bulkMode) {
      processBulkTransaction();
    } else {
      processSingleTransaction();
    }
  };

  // Utility functions
  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amt || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Theme functions
  const getBgColor = (type) => {
    const colors = {
      main: darkMode ? 'bg-gray-900' : 'bg-gray-50',
      card: darkMode ? 'bg-gray-800' : 'bg-white',
      input: darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
    };
    return colors[type] || colors.card;
  };

  const getTextColor = (type) => {
    const colors = {
      primary: darkMode ? 'text-white' : 'text-gray-900',
      secondary: darkMode ? 'text-gray-300' : 'text-gray-600',
      muted: darkMode ? 'text-gray-400' : 'text-gray-500'
    };
    return colors[type] || colors.primary;
  };

  // Main render
  return (
    <div className={`min-h-screen ${getBgColor('main')} transition-colors`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${getTextColor('primary')}`}>
            Wallet Management
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              Back
            </button>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-4 py-2 ${bulkMode ? 'bg-purple-500' : 'bg-blue-500'} text-white rounded`}
            >
              {bulkMode ? 'Single Mode' : 'Bulk Mode'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className={`${getBgColor('card')} rounded p-3 text-center shadow`}>
            <p className={`text-2xl font-bold ${getTextColor('primary')}`}>{stats.totalUsers}</p>
            <p className={`text-xs ${getTextColor('muted')}`}>Total Users</p>
          </div>
          <div className={`${getBgColor('card')} rounded p-3 text-center shadow`}>
            <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
            <p className={`text-xs ${getTextColor('muted')}`}>Admins</p>
          </div>
          <div className={`${getBgColor('card')} rounded p-3 text-center shadow`}>
            <p className="text-2xl font-bold text-blue-600">{stats.agents}</p>
            <p className={`text-xs ${getTextColor('muted')}`}>Agents</p>
          </div>
          <div className={`${getBgColor('card')} rounded p-3 text-center shadow`}>
            <p className="text-2xl font-bold text-gray-600">{stats.regularUsers}</p>
            <p className={`text-xs ${getTextColor('muted')}`}>Users</p>
          </div>
          <div className={`${getBgColor('card')} rounded p-3 text-center shadow`}>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalBalance)}
            </p>
            <p className={`text-xs ${getTextColor('muted')}`}>Total Balance</p>
          </div>
          <div className={`${getBgColor('card')} rounded p-3 text-center shadow`}>
            <p className="text-2xl font-bold text-red-600">{stats.suspendedUsers}</p>
            <p className={`text-xs ${getTextColor('muted')}`}>Suspended</p>
          </div>
          <div className={`${getBgColor('card')} rounded p-3 text-center shadow`}>
            <p className="text-2xl font-bold text-orange-600">{stats.usersWithWarnings}</p>
            <p className={`text-xs ${getTextColor('muted')}`}>Warnings</p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-700' :
            message.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction Form */}
          <div className={`${getBgColor('card')} rounded-lg shadow-lg p-6`}>
            <h2 className={`text-xl font-semibold ${getTextColor('primary')} mb-4`}>
              {bulkMode ? 'Bulk Transaction' : 'Single Transaction'}
            </h2>

            {/* Transaction Type */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTransactionType('deposit')}
                className={`flex-1 px-4 py-2 rounded ${
                  transactionType === 'deposit' ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => setTransactionType('deduct')}
                className={`flex-1 px-4 py-2 rounded ${
                  transactionType === 'deduct' ? 'bg-red-500 text-white' : 'bg-gray-200'
                }`}
              >
                Deduct
              </button>
            </div>

            {/* User Selection */}
            <div className="mb-4">
              <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                {bulkMode ? 'Select Users' : 'Select User'}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className={`w-full px-4 py-2 rounded border ${getBgColor('input')}`}
              />

              {/* Search Results */}
              {users.length > 0 && (
                <div className={`mt-2 ${getBgColor('card')} rounded shadow-lg max-h-60 overflow-y-auto border`}>
                  {users.map(user => (
                    <div
                      key={user._id}
                      onClick={() => bulkMode ? toggleUserSelection(user) : selectUser(user)}
                      className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b"
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={getTextColor('primary')}>{user.name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded text-white ${
                              user.role === 'admin' ? 'bg-purple-500' :
                              user.role === 'agent' ? 'bg-blue-500' : 'bg-gray-500'
                            }`}>
                              {user.role?.toUpperCase() || 'USER'}
                            </span>
                          </div>
                          <div className={`text-sm ${getTextColor('muted')}`}>{user.email}</div>
                          <div className={`text-sm ${getTextColor('secondary')}`}>
                            {user.phoneNumber || 'No phone'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            {formatCurrency(user.walletBalance)}
                          </div>
                          {bulkMode && selectedUsers.some(u => u._id === user._id) && (
                            <span className="text-green-500">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected User Display */}
              {!bulkMode && selectedUser && (
                <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <div className="flex justify-between">
                    <div>
                      <p className={getTextColor('primary')}>{selectedUser.name}</p>
                      <p className={`text-sm ${getTextColor('secondary')}`}>{selectedUser.email}</p>
                      <p className="text-sm font-bold">
                        Balance: {formatCurrency(selectedUser.walletBalance)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Selected Users for Bulk */}
              {bulkMode && selectedUsers.length > 0 && (
                <div className="mt-3 p-3 bg-purple-100 dark:bg-purple-900/30 rounded">
                  <p className="font-medium mb-2">Selected: {selectedUsers.length} users</p>
                  {selectedUsers.map(user => (
                    <div key={user._id} className="flex justify-between py-1">
                      <span className="text-sm">{user.name}</span>
                      <button
                        onClick={() => toggleUserSelection(user)}
                        className="text-red-500 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                Amount (GH₵)
              </label>
              <input
                type="number"
                value={bulkMode ? bulkAmount : amount}
                onChange={(e) => bulkMode ? setBulkAmount(e.target.value) : setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-2 rounded border ${getBgColor('input')}`}
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                Description
              </label>
              <textarea
                value={bulkMode ? bulkDescription : description}
                onChange={(e) => bulkMode ? setBulkDescription(e.target.value) : setDescription(e.target.value)}
                placeholder="Enter description..."
                rows="2"
                className={`w-full px-4 py-2 rounded border ${getBgColor('input')}`}
              />
            </div>

            {/* Reason for Deduction */}
            {transactionType === 'deduct' && (
              <div className="mb-4">
                <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                  Reason
                </label>
                <textarea
                  value={bulkMode ? bulkReason : reason}
                  onChange={(e) => bulkMode ? setBulkReason(e.target.value) : setReason(e.target.value)}
                  placeholder="Reason for deduction..."
                  rows="2"
                  className={`w-full px-4 py-2 rounded border ${getBgColor('input')}`}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={initiateTransaction}
              disabled={loading}
              className={`w-full px-4 py-3 ${
                transactionType === 'deposit' ? 'bg-green-500' : 'bg-red-500'
              } text-white rounded font-medium disabled:opacity-50`}
            >
              {loading ? 'Processing...' : `${transactionType === 'deposit' ? 'Add' : 'Deduct'} Funds`}
            </button>
          </div>

          {/* Transaction History */}
          {selectedUser && !bulkMode && (
            <div className={`${getBgColor('card')} rounded-lg shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold ${getTextColor('primary')} mb-4`}>
                Recent Transactions
              </h2>
              {transactionHistory.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transactionHistory.map((txn, idx) => (
                    <div key={txn._id || idx} className="p-3 rounded border">
                      <div className="flex justify-between mb-2">
                        <span className={`font-medium ${
                          txn.type === 'deposit' ? 'text-green-600' :
                          txn.type === 'purchase' ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {txn.type}
                        </span>
                        <span className="font-bold">
                          {formatCurrency(Math.abs(txn.amount))}
                        </span>
                      </div>
                      <p className={`text-sm ${getTextColor('secondary')}`}>
                        {txn.description}
                      </p>
                      <p className={`text-xs ${getTextColor('muted')} mt-1`}>
                        {formatDate(txn.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={getTextColor('muted')}>No transactions found</p>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && pendingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${getBgColor('card')} rounded-lg shadow-xl max-w-md w-full p-6`}>
              <h3 className={`text-xl font-bold ${getTextColor('primary')} mb-4`}>
                Confirm Transaction
              </h3>
              <div className="space-y-3 mb-6">
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
                  <p className={getTextColor('muted')}>Type</p>
                  <p className={getTextColor('primary')}>{pendingTransaction.type}</p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
                  <p className={getTextColor('muted')}>Amount</p>
                  <p className={getTextColor('primary')}>
                    {formatCurrency(pendingTransaction.amount)}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
                  <p className={getTextColor('muted')}>Recipients</p>
                  <p className={getTextColor('primary')}>
                    {pendingTransaction.users.length} user(s)
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={executeTransaction}
                  className={`flex-1 px-4 py-2 ${
                    pendingTransaction.type === 'deposit' ? 'bg-green-500' : 'bg-red-500'
                  } text-white rounded`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}