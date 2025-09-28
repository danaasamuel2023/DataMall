// app/transactions/page.js or components/TransactionsManagement.js
'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function TransactionsManagement() {
  const router = useRouter();
  
  // Core states
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // User selection
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  
  // Transaction data
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  
  // Filters
  const [transactionType, setTransactionType] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [sortBy, setSortBy] = useState('date-desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Statistics
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalPurchases: 0,
    totalRefunds: 0,
    totalDeductions: 0,
    netFlow: 0,
    transactionCount: 0
  });
  
  // Message state
  const [message, setMessage] = useState({ text: '', type: '' });

  // Initialize on mount
  useEffect(() => {
    const userRole = localStorage.getItem('userrole');
    if (userRole !== 'admin') {
      router.push('/dashboard');
      return;
    }
    
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const storedTheme = localStorage.getItem('theme');
      setDarkMode(storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark));
    }
    
    fetchUsers();
  }, []);

  // Fetch all users for dropdown
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'https://datamall.onrender.com/api/users?limit=1000',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Search users
  const searchUsers = async (search) => {
    if (!search.trim()) {
      fetchUsers();
      return;
    }
    
    try {
      setSearchingUsers(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://datamall.onrender.com/api/users?search=${search}&limit=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchTerm);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  // Fetch transactions for selected user
  const fetchTransactions = async (userId, page = 1) => {
    if (!userId) {
      setTransactions([]);
      setFilteredTransactions([]);
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      });
      
      if (transactionType !== 'all') {
        params.append('type', transactionType);
      }
      
      const response = await axios.get(
        `https://datamall.onrender.com/api/users/${userId}/transactions?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data) {
        setTransactions(response.data.transactions || []);
        setFilteredTransactions(response.data.transactions || []);
        
        // Set pagination
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages);
          setCurrentPage(response.data.pagination.page);
          setTotalTransactions(response.data.pagination.total);
        }
        
        // Calculate statistics
        calculateStats(response.data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setMessage({ text: 'Failed to fetch transactions', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate transaction statistics
  const calculateStats = (txns) => {
    const statistics = {
      totalDeposits: 0,
      totalPurchases: 0,
      totalRefunds: 0,
      totalDeductions: 0,
      netFlow: 0,
      transactionCount: txns.length
    };
    
    txns.forEach(txn => {
      const amount = Math.abs(txn.amount);
      switch(txn.type) {
        case 'deposit':
          statistics.totalDeposits += amount;
          statistics.netFlow += amount;
          break;
        case 'purchase':
          statistics.totalPurchases += amount;
          statistics.netFlow -= amount;
          break;
        case 'refund':
          statistics.totalRefunds += amount;
          statistics.netFlow += amount;
          break;
        case 'deduction':
          statistics.totalDeductions += amount;
          statistics.netFlow -= amount;
          break;
      }
    });
    
    setStats(statistics);
  };

  // Handle user selection
  const handleUserSelect = (userId) => {
    const user = users.find(u => u._id === userId);
    setSelectedUserId(userId);
    setSelectedUser(user);
    setCurrentPage(1);
    fetchTransactions(userId, 1);
  };

  // Apply filters to transactions
  useEffect(() => {
    let filtered = [...transactions];
    
    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(txn => 
        new Date(txn.createdAt) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(txn => 
        new Date(txn.createdAt) <= new Date(dateRange.end + 'T23:59:59')
      );
    }
    
    // Sort transactions
    switch(sortBy) {
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'amount-desc':
        filtered.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
        break;
      case 'amount-asc':
        filtered.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
        break;
    }
    
    setFilteredTransactions(filtered);
  }, [transactions, dateRange, sortBy]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (selectedUserId) {
      fetchTransactions(selectedUserId, newPage);
    }
  };

  // Export transactions to CSV
  const exportToCSV = () => {
    const csvData = [
      ['Date', 'Type', 'Amount', 'Description', 'Reference', 'Balance After'],
      ...filteredTransactions.map(txn => [
        new Date(txn.createdAt).toLocaleString(),
        txn.type,
        txn.amount,
        txn.description,
        txn.reference || '',
        txn.balanceAfter || ''
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${selectedUser?.name || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Reset filters
  const resetFilters = () => {
    setTransactionType('all');
    setDateRange({ start: '', end: '' });
    setSortBy('date-desc');
    if (selectedUserId) {
      fetchTransactions(selectedUserId, 1);
    }
  };

  // Utility functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Get transaction icon and color
  const getTransactionStyle = (type) => {
    switch(type) {
      case 'deposit':
        return { icon: '➕', color: 'text-green-600 dark:text-green-400' };
      case 'purchase':
        return { icon: '🛒', color: 'text-blue-600 dark:text-blue-400' };
      case 'refund':
        return { icon: '↩️', color: 'text-yellow-600 dark:text-yellow-400' };
      case 'deduction':
        return { icon: '➖', color: 'text-red-600 dark:text-red-400' };
      default:
        return { icon: '📝', color: 'text-gray-600 dark:text-gray-400' };
    }
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

  return (
    <div className={`min-h-screen ${getBgColor('main')} transition-colors`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${getTextColor('primary')}`}>
            Transaction History
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
          >
            Back to Dashboard
          </button>
        </div>

        {/* User Selection and Filters */}
        <div className={`${getBgColor('card')} rounded-lg shadow-lg p-6 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User Selection */}
            <div>
              <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                Select User
              </label>
              <input
                type="text"
                placeholder="Search users..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')} mb-2`}
              />
              <select
                value={selectedUserId}
                onChange={(e) => handleUserSelect(e.target.value)}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')}`}
              >
                <option value="">Select a user...</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} - {user.email} ({user.role || 'user'})
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type Filter */}
            <div>
              <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                Transaction Type
              </label>
              <select
                value={transactionType}
                onChange={(e) => {
                  setTransactionType(e.target.value);
                  if (selectedUserId) {
                    fetchTransactions(selectedUserId, 1);
                  }
                }}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')}`}
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="purchase">Purchases</option>
                <option value="refund">Refunds</option>
                <option value="deduction">Deductions</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${getTextColor('secondary')} mb-2`}>
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className={`w-full px-3 py-2 rounded border ${getBgColor('input')}`}
              />
            </div>
          </div>

          {/* Sort and Actions */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-3 py-2 rounded border ${getBgColor('input')}`}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                Reset Filters
              </button>
            </div>
            <button
              onClick={exportToCSV}
              disabled={filteredTransactions.length === 0}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* User Info and Stats */}
        {selectedUser && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            {/* User Info Card */}
            <div className={`${getBgColor('card')} rounded-lg shadow p-4 col-span-2`}>
              <h3 className={`font-semibold ${getTextColor('primary')} mb-2`}>User Details</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={getTextColor('primary')}>{selectedUser.name}</span>
                  <span className={`px-2 py-0.5 text-xs rounded text-white ${
                    selectedUser.role === 'admin' ? 'bg-purple-500' :
                    selectedUser.role === 'agent' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {selectedUser.role?.toUpperCase() || 'USER'}
                  </span>
                </div>
                <p className={`text-sm ${getTextColor('muted')}`}>{selectedUser.email}</p>
                <p className={`text-sm ${getTextColor('secondary')}`}>
                  Current Balance: {formatCurrency(selectedUser.walletBalance || 0)}
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className={`${getBgColor('card')} rounded-lg shadow p-4 text-center`}>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalDeposits)}</p>
              <p className={`text-xs ${getTextColor('muted')}`}>Total Deposits</p>
            </div>
            
            <div className={`${getBgColor('card')} rounded-lg shadow p-4 text-center`}>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalPurchases)}</p>
              <p className={`text-xs ${getTextColor('muted')}`}>Total Purchases</p>
            </div>
            
            <div className={`${getBgColor('card')} rounded-lg shadow p-4 text-center`}>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalDeductions)}</p>
              <p className={`text-xs ${getTextColor('muted')}`}>Total Deductions</p>
            </div>
            
            <div className={`${getBgColor('card')} rounded-lg shadow p-4 text-center`}>
              <p className={`text-2xl font-bold ${stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.netFlow)}
              </p>
              <p className={`text-xs ${getTextColor('muted')}`}>Net Flow</p>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className={`${getBgColor('card')} rounded-lg shadow-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className={getBgColor('main')}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('muted')} uppercase`}>
                    Date
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('muted')} uppercase`}>
                    Type
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('muted')} uppercase`}>
                    Amount
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('muted')} uppercase`}>
                    Description
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('muted')} uppercase`}>
                    Reference
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getTextColor('muted')} uppercase`}>
                    Balance After
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={`px-6 py-8 text-center ${getTextColor('muted')}`}>
                      {selectedUserId ? 'No transactions found' : 'Select a user to view transactions'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn) => {
                    const style = getTransactionStyle(txn.type);
                    return (
                      <tr key={txn._id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('secondary')}`}>
                          {formatDate(txn.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-sm font-medium ${style.color}`}>
                            <span>{style.icon}</span>
                            <span className="capitalize">{txn.type}</span>
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          txn.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {txn.amount >= 0 ? '+' : ''}{formatCurrency(txn.amount)}
                        </td>
                        <td className={`px-6 py-4 text-sm ${getTextColor('primary')}`}>
                          <div className="max-w-xs truncate" title={txn.description}>
                            {txn.description}
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('muted')}`}>
                          <code className="text-xs">{txn.reference || '-'}</code>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTextColor('secondary')}`}>
                          {txn.balanceAfter !== undefined ? formatCurrency(txn.balanceAfter) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t">
              <div className={`text-sm ${getTextColor('muted')}`}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalTransactions)} of {totalTransactions} transactions
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className={`px-3 py-1 ${getTextColor('primary')}`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mt-4 p-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}