// pages/admin/WalletManagement.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const WalletManagement = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // User search and selection
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Transaction states
  const [transactionType, setTransactionType] = useState('deposit'); // 'deposit' or 'deduct'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  
  // Bulk operation states
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkDescription, setBulkDescription] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  
  // Results and messages
  const [message, setMessage] = useState({ text: '', type: '' });
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  
  useEffect(() => {
    // Check if user is admin
    const userRole = localStorage.getItem('userrole');
    if (userRole !== 'admin') {
      router.push('/dashboard');
      return;
    }
    
    // Check dark mode preference
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const storedTheme = localStorage.getItem('theme');
      setDarkMode(storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark));
    }
  }, [router]);
  
  // Search users
  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }
    
    try {
      setSearchLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `https://datamall.onrender.com/api/users?search=${searchTerm}&limit=10`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setMessage({ text: 'Failed to search users', type: 'error' });
    } finally {
      setSearchLoading(false);
    }
  };
  
  // Handle user search input change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        searchUsers();
      } else {
        setUsers([]);
      }
    }, 500);
    
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);
  
  // Select user for transaction
  const selectUser = (user) => {
    setSelectedUser(user);
    setUsers([]);
    setSearchTerm('');
    fetchUserTransactions(user._id);
  };
  
  // Toggle user selection for bulk operations
  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };
  
  // Fetch user transaction history
  const fetchUserTransactions = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `https://datamall.onrender.com/api/users/${userId}/transactions?limit=10`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
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
      if (!bulkMode && selectedUser && selectedUser.walletBalance < amountNum) {
        setMessage({ text: `Insufficient balance. User has GH₵ ${selectedUser.walletBalance}`, type: 'error' });
        return false;
      }
      
      const checkReason = bulkMode ? bulkReason : reason;
      if (!checkReason.trim()) {
        setMessage({ text: 'Please provide a reason for deduction', type: 'error' });
        return false;
      }
    }
    
    return true;
  };
  
  // Prepare transaction for confirmation
  const initiateTransaction = () => {
    if (!validateTransaction()) return;
    
    const transaction = {
      type: transactionType,
      amount: parseFloat(bulkMode ? bulkAmount : amount),
      description: bulkMode ? bulkDescription : description,
      reason: bulkMode ? bulkReason : reason,
      isBulk: bulkMode,
      users: bulkMode ? selectedUsers : [selectedUser]
    };
    
    setPendingTransaction(transaction);
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
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data) {
        setMessage({
          text: `Successfully ${transactionType === 'deposit' ? 'added' : 'deducted'} GH₵ ${amount} ${transactionType === 'deposit' ? 'to' : 'from'} ${selectedUser.name}'s wallet`,
          type: 'success'
        });
        
        // Update selected user balance
        setSelectedUser(prev => ({
          ...prev,
          walletBalance: response.data[transactionType === 'deposit' ? 'deposit' : 'deduction'].newBalance
        }));
        
        // Refresh transaction history
        fetchUserTransactions(selectedUser._id);
        
        // Clear form
        setAmount('');
        setDescription('');
        setReason('');
      }
    } catch (error) {
      console.error('Transaction error:', error);
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
      
      const endpoint = transactionType === 'deposit' 
        ? '/bulk-credit'
        : '/bulk-deduct';
      
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
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data) {
        const summary = response.data.summary;
        setMessage({
          text: `Bulk ${transactionType} completed: ${summary.successful} successful, ${summary.failed} failed`,
          type: summary.failed > 0 ? 'warning' : 'success'
        });
        
        // Clear selections
        setSelectedUsers([]);
        setBulkAmount('');
        setBulkDescription('');
        setBulkReason('');
      }
    } catch (error) {
      console.error('Bulk transaction error:', error);
      setMessage({
        text: error.response?.data?.error || 'Bulk transaction failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };
  
  // Execute confirmed transaction
  const executeTransaction = () => {
    if (bulkMode) {
      processBulkTransaction();
    } else {
      processSingleTransaction();
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Theme classes
  const getBgColor = (type) => {
    switch(type) {
      case 'main': return darkMode ? 'bg-gray-900' : 'bg-gray-50';
      case 'card': return darkMode ? 'bg-gray-800' : 'bg-white';
      case 'input': return darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900';
      default: return darkMode ? 'bg-gray-800' : 'bg-white';
    }
  };
  
  const getTextColor = (type) => {
    switch(type) {
      case 'primary': return darkMode ? 'text-white' : 'text-gray-900';
      case 'secondary': return darkMode ? 'text-gray-300' : 'text-gray-600';
      case 'muted': return darkMode ? 'text-gray-400' : 'text-gray-500';
      default: return darkMode ? 'text-white' : 'text-gray-900';
    }
  };
  
  // Confirmation Dialog
  const ConfirmationDialog = () => {
    if (!showConfirmDialog || !pendingTransaction) return null;
    
    const totalAmount = pendingTransaction.amount * pendingTransaction.users.length;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`${getBgColor('card')} rounded-lg shadow-xl max-w-md w-full p-6`}>
          <h3 className={`text-xl font-bold ${getTextColor('primary')} mb-4`}>
            Confirm {pendingTransaction.type === 'deposit' ? 'Deposit' : 'Deduction'}
          </h3>
          
          <div className="space-y-3 mb-6">
            <div className={`p-3 bg-gray-100 dark:bg-gray-700 rounded`}>
              <p className={`text-sm ${getTextColor('muted')}`}>Type</p>
              <p className={`font-medium ${getTextColor('primary')} capitalize`}>
                {pendingTransaction.type}
              </p>
            </div>
            
            <div className={`p-3 bg-gray-100 dark:bg-gray-700 rounded`}>
              <p className={`text-sm ${getTextColor('muted')}`}>
                {pendingTransaction.isBulk ? 'Recipients' : 'Recipient'}
              </p>
              <p className={`font-medium ${getTextColor('primary')}`}>
                {pendingTransaction.isBulk 
                  ? `${pendingTransaction.users.length} users selected`
                  : pendingTransaction.users[0]?.name
                }
              </p>
            </div>
            
            <div className={`p-3 bg-gray-100 dark:bg-gray-700 rounded`}>
              <p className={`text-sm ${getTextColor('muted')}`}>
                {pendingTransaction.isBulk ? 'Amount per user' : 'Amount'}
              </p>
              <p className={`font-medium ${getTextColor('primary')}`}>
                {formatCurrency(pendingTransaction.amount)}
              </p>
            </div>
            
            {pendingTransaction.isBulk && (
              <div className={`p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded`}>
                <p className={`text-sm ${getTextColor('muted')}`}>Total Amount</p>
                <p className={`font-bold text-lg ${getTextColor('primary')}`}>
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            )}
            
            <div className={`p-3 bg-gray-100 dark:bg-gray-700 rounded`}>
              <p className={`text-sm ${getTextColor('muted')}`}>Description</p>
              <p className={`${getTextColor('primary')}`}>
                {pendingTransaction.description}
              </p>
            </div>
            
            {pendingTransaction.type === 'deduct' && pendingTransaction.reason && (
              <div className={`p-3 bg-red-100 dark:bg-red-900/30 rounded`}>
                <p className={`text-sm ${getTextColor('muted')}`}>Reason</p>
                <p className={`${getTextColor('primary')}`}>
                  {pendingTransaction.reason}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={executeTransaction}
              disabled={loading}
              className={`flex-1 px-4 py-2 ${
                pendingTransaction.type === 'deposit' 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white rounded transition-colors disabled:opacity-50`}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`min-h-screen ${getBgColor('main')} transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${getTextColor('primary')}`}>
            Wallet Management
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-4 py-2 ${
                bulkMode ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'
              } text-white rounded transition-colors`}
            >
              {bulkMode ? 'Single Mode' : 'Bulk Mode'}
            </button>
          </div>
        </div>
        
        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : message.type === 'warning'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
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
            
            {/* Transaction Type Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTransactionType('deposit')}
                className={`flex-1 px-4 py-2 rounded ${
                  transactionType === 'deposit'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                } transition-colors`}
              >
                ➕ Deposit
              </button>
              <button
                onClick={() => setTransactionType('deduct')}
                className={`flex-1 px-4 py-2 rounded ${
                  transactionType === 'deduct'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                } transition-colors`}
              >
                ➖ Deduct
              </button>
            </div>
            
            {!bulkMode ? (
              // Single User Selection
              <div className="mb-4">
                <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                  Select User
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, email, or phone..."
                    className={`w-full px-4 py-2 rounded border ${getBgColor('input')} ${
                      darkMode ? 'border-gray-600' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  
                  {/* Search Results Dropdown */}
                  {users.length > 0 && (
                    <div className={`absolute z-10 w-full mt-1 ${getBgColor('card')} rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
                      {users.map(user => (
                        <div
                          key={user._id}
                          onClick={() => selectUser(user)}
                          className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700`}
                        >
                          <div className={getTextColor('primary')}>{user.name}</div>
                          <div className={`text-sm ${getTextColor('muted')}`}>{user.email}</div>
                          <div className={`text-sm ${getTextColor('secondary')}`}>
                            Balance: {formatCurrency(user.walletBalance)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Selected User Display */}
                {selectedUser && (
                  <div className={`mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${getTextColor('primary')}`}>{selectedUser.name}</p>
                        <p className={`text-sm ${getTextColor('secondary')}`}>{selectedUser.email}</p>
                        <p className={`text-sm font-bold ${getTextColor('primary')} mt-1`}>
                          Current Balance: {formatCurrency(selectedUser.walletBalance)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-red-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Bulk User Selection
              <div className="mb-4">
                <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                  Select Users ({selectedUsers.length} selected)
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users to add..."
                  className={`w-full px-4 py-2 rounded border ${getBgColor('input')} ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                
                {/* Search Results for Bulk */}
                {users.length > 0 && (
                  <div className={`mt-2 ${getBgColor('card')} rounded-lg shadow-lg max-h-40 overflow-y-auto`}>
                    {users.map(user => (
                      <div
                        key={user._id}
                        onClick={() => toggleUserSelection(user)}
                        className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                          selectedUsers.some(u => u._id === user._id) 
                            ? 'bg-blue-100 dark:bg-blue-900/30' 
                            : ''
                        }`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <span className={getTextColor('primary')}>{user.name}</span>
                            <span className={`ml-2 text-sm ${getTextColor('muted')}`}>
                              {formatCurrency(user.walletBalance)}
                            </span>
                          </div>
                          {selectedUsers.some(u => u._id === user._id) && (
                            <span className="text-green-500">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Selected Users List */}
                {selectedUsers.length > 0 && (
                  <div className={`mt-3 p-3 bg-purple-100 dark:bg-purple-900/30 rounded max-h-32 overflow-y-auto`}>
                    {selectedUsers.map(user => (
                      <div key={user._id} className="flex justify-between items-center py-1">
                        <span className={`text-sm ${getTextColor('primary')}`}>{user.name}</span>
                        <button
                          onClick={() => toggleUserSelection(user)}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Amount Input */}
            <div className="mb-4">
              <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                Amount (GH₵)
              </label>
              <input
                type="number"
                value={bulkMode ? bulkAmount : amount}
                onChange={(e) => bulkMode ? setBulkAmount(e.target.value) : setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className={`w-full px-4 py-2 rounded border ${getBgColor('input')} ${
                  darkMode ? 'border-gray-600' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            {/* Description Input */}
            <div className="mb-4">
              <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                Description
              </label>
              <textarea
                value={bulkMode ? bulkDescription : description}
                onChange={(e) => bulkMode ? setBulkDescription(e.target.value) : setDescription(e.target.value)}
                placeholder="Enter transaction description..."
                rows="2"
                className={`w-full px-4 py-2 rounded border ${getBgColor('input')} ${
                  darkMode ? 'border-gray-600' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            {/* Reason (for deductions) */}
            {transactionType === 'deduct' && (
              <div className="mb-4">
                <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                  Reason for Deduction
                </label>
                <textarea
                  value={bulkMode ? bulkReason : reason}
                  onChange={(e) => bulkMode ? setBulkReason(e.target.value) : setReason(e.target.value)}
                  placeholder="Explain why funds are being deducted..."
                  rows="2"
                  className={`w-full px-4 py-2 rounded border ${getBgColor('input')} ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            )}
            
            {/* Submit Button */}
            <button
              onClick={initiateTransaction}
              disabled={loading}
              className={`w-full px-4 py-3 ${
                transactionType === 'deposit' 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white rounded font-medium transition-colors disabled:opacity-50`}
            >
              {loading 
                ? 'Processing...' 
                : `${transactionType === 'deposit' ? 'Add' : 'Deduct'} Funds`
              }
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
                  {transactionHistory.map((transaction, index) => (
                    <div 
                      key={transaction._id || index}
                      className={`p-3 rounded border ${
                        darkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-medium ${
                          transaction.type === 'deposit' 
                            ? 'text-green-600 dark:text-green-400' 
                            : transaction.type === 'purchase'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.type === 'deposit' ? '➕' : transaction.type === 'purchase' ? '🛒' : '➖'}
                          {' '}{transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                        <span className={`font-bold ${getTextColor('primary')}`}>
                          {transaction.type === 'deduction' ? '-' : ''}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </div>
                      <p className={`text-sm ${getTextColor('secondary')}`}>
                        {transaction.description}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-xs ${getTextColor('muted')}`}>
                          {formatDate(transaction.createdAt)}
                        </span>
                        <span className={`text-xs ${getTextColor('muted')}`}>
                          Balance: {formatCurrency(transaction.balanceAfter)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center ${getTextColor('muted')}`}>
                  No recent transactions
                </p>
              )}
            </div>
          )}
          
          {/* Bulk Mode Info */}
          {bulkMode && (
            <div className={`${getBgColor('card')} rounded-lg shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold ${getTextColor('primary')} mb-4`}>
                Bulk Operation Summary
              </h2>
              
              <div className="space-y-4">
                <div className={`p-4 bg-blue-100 dark:bg-blue-900/30 rounded`}>
                  <p className={`text-sm ${getTextColor('muted')}`}>Selected Users</p>
                  <p className={`text-2xl font-bold ${getTextColor('primary')}`}>
                    {selectedUsers.length}
                  </p>
                </div>
                
                {bulkAmount && selectedUsers.length > 0 && (
                  <div className={`p-4 bg-green-100 dark:bg-green-900/30 rounded`}>
                    <p className={`text-sm ${getTextColor('muted')}`}>Total Transaction</p>
                    <p className={`text-2xl font-bold ${getTextColor('primary')}`}>
                      {formatCurrency(parseFloat(bulkAmount || 0) * selectedUsers.length)}
                    </p>
                    <p className={`text-sm ${getTextColor('muted')} mt-1`}>
                      {formatCurrency(bulkAmount)} × {selectedUsers.length} users
                    </p>
                  </div>
                )}
                
                <div className={`p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded`}>
                  <p className={`font-medium ${getTextColor('primary')} mb-2`}>⚠️ Important Notes:</p>
                  <ul className={`text-sm ${getTextColor('secondary')} space-y-1`}>
                    <li>• Bulk operations cannot be undone</li>
                    <li>• Users with insufficient balance will be skipped for deductions</li>
                    <li>• All transactions will be logged individually</li>
                    <li>• You'll receive a summary after completion</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
};

export default WalletManagement;