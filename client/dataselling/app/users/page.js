// pages/admin/users/credit.js
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { 
  Users, 
  CreditCard, 
  Search, 
  ArrowLeft, 
  PlusCircle,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

export default function CreditUserPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreditLoading, setIsCreditLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userrole');
    
    if (!token || role !== 'admin') {
      router.push('/Auth');
    } else {
      fetchUsers(1, searchQuery);
    }
  }, []);

  // Fetch users
  const fetchUsers = async (page, search = '') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://datamall.onrender.com/api/users?page=${page}&limit=10&search=${search}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.pages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMessage('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user selection
  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, searchQuery);
  };

  // Handle pagination
  const changePage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    fetchUsers(page, searchQuery);
  };

  // Single user credit function
  const creditSingleUser = async (userId) => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    setIsCreditLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `https://datamall.onrender.com/api/users/${userId}/deposit`,
        {
          amount: parseFloat(amount),
          description: description || `Credit by admin`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setSuccessMessage('User credited successfully');
      // Reset form
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Error crediting user:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to credit user. Please try again.');
    } finally {
      setIsCreditLoading(false);
    }
  };

  // Bulk credit function
  const creditMultipleUsers = async () => {
    if (selectedUsers.length === 0) {
      setErrorMessage('Please select at least one user');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    setIsCreditLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/admin/bulk-credit`,
        {
          userIds: selectedUsers,
          amount: parseFloat(amount),
          description: description || `Bulk credit by admin`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setSuccessMessage(`Successfully credited ${response.data.summary.successful} users`);
      
      // Reset form and selection
      setSelectedUsers([]);
      setAmount('');
      setDescription('');
      
      // Refresh user list
      fetchUsers(currentPage, searchQuery);
    } catch (error) {
      console.error('Error bulk crediting users:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to credit users. Please try again.');
    } finally {
      setIsCreditLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Credit User Wallets | Admin Dashboard</title>
      </Head>

      <div className="container mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen">
        {/* Improved Header with larger text */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => router.back()} 
              className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-900 dark:text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center text-gray-900 dark:text-white">
              <CreditCard className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8" />
              <span className="flex-shrink-0">Credit User Wallets</span>
            </h1>
          </div>
        </div>

        {/* Improved Success Message with dark mode support */}
        {successMessage && (
          <div className="bg-green-100 dark:bg-green-900 border-l-4 border-green-600 p-4 md:p-5 mb-6 rounded">
            <div className="flex items-center">
              <UserCheck className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400 mr-3 flex-shrink-0" />
              <p className="text-green-800 dark:text-green-300 font-medium text-base md:text-lg">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Improved Error Message with dark mode support */}
        {errorMessage && (
          <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-600 p-4 md:p-5 mb-6 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" />
              <p className="text-red-800 dark:text-red-300 font-medium text-base md:text-lg">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Credit Form with dark mode support */}
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md lg:col-span-1 border border-gray-300 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 md:mb-5 text-gray-900 dark:text-white">Credit Information</h2>
            
            <div className="mb-4 md:mb-5">
              <label className="block text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                Amount (GHS)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                className="w-full p-3 border border-gray-400 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="mb-5 md:mb-6">
              <label className="block text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows="3"
                className="w-full p-3 border border-gray-400 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <button
                onClick={creditMultipleUsers}
                disabled={isCreditLoading || selectedUsers.length === 0}
                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 ${
                  (isCreditLoading || selectedUsers.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isCreditLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Credit Selected Users ({selectedUsers.length})
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* User Selection with dark mode support */}
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md lg:col-span-2 border border-gray-300 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 md:mb-5 space-y-3 md:space-y-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Users</h2>
              
              <form onSubmit={handleSearch} className="flex w-full md:w-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full md:w-auto p-2 border border-gray-400 dark:border-gray-600 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="bg-gray-200 dark:bg-gray-600 p-2 border border-l-0 border-gray-400 dark:border-gray-600 rounded-r-md hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  <Search className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                </button>
              </form>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto shadow-md border border-gray-300 dark:border-gray-700 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(users.map(user => user._id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                            checked={users.length > 0 && selectedUsers.length === users.length}
                            className="h-4 w-4 md:h-5 md:w-5 text-blue-600 border-gray-400 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-300 dark:divide-gray-700">
                      {users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                onChange={() => toggleUserSelection(user._id)}
                                checked={selectedUsers.includes(user._id)}
                                className="h-4 w-4 md:h-5 md:w-5 text-blue-600 border-gray-400 dark:border-gray-600 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                              <div className="text-sm md:text-base font-medium text-gray-900 dark:text-white">{user.name}</div>
                            </td>
                            <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                              <div className="text-sm md:text-base text-gray-700 dark:text-gray-300">{user.email}</div>
                            </td>
                            <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                              <div className="text-sm md:text-base font-medium text-gray-900 dark:text-white">GHS {user.walletBalance.toFixed(2)}</div>
                            </td>
                            <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-sm md:text-base">
                              <button
                                onClick={() => creditSingleUser(user._id)}
                                disabled={isCreditLoading || !amount}
                                className={`inline-flex items-center px-2 md:px-4 py-1 md:py-2 border border-transparent rounded-md shadow-sm text-sm md:text-base font-medium text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                                  (isCreditLoading || !amount) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <PlusCircle className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
                                Credit
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-4 md:px-6 py-4 text-center text-sm md:text-base text-gray-700 dark:text-gray-300 font-medium">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Improved Pagination with dark mode support */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-4 md:mt-6 overflow-x-auto">
                    <nav className="inline-flex rounded-md shadow-md">
                      <button
                        onClick={() => changePage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 md:px-4 py-1 md:py-2 rounded-l-md border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm md:text-base font-medium ${
                          currentPage === 1 
                            ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {[...Array(totalPages)].map((_, index) => {
                        // Show limited page numbers on mobile
                        const pageNum = index + 1;
                        const showPage = 
                          pageNum === 1 || 
                          pageNum === totalPages || 
                          Math.abs(pageNum - currentPage) <= 1;
                        
                        if (!showPage && (
                          (pageNum === 2 && currentPage > 3) || 
                          (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                        )) {
                          return (
                            <span 
                              key={`ellipsis-${index}`}
                              className="relative inline-flex items-center px-3 md:px-4 py-1 md:py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm md:text-base"
                            >
                              ...
                            </span>
                          );
                        }
                        
                        return showPage ? (
                          <button
                            key={pageNum}
                            onClick={() => changePage(pageNum)}
                            className={`relative inline-flex items-center px-3 md:px-5 py-1 md:py-2 border border-gray-400 dark:border-gray-600 text-sm md:text-base font-medium ${
                              currentPage === pageNum
                                ? 'text-white bg-blue-600 dark:bg-blue-700'
                                : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ) : null;
                      })}
                      
                      <button
                        onClick={() => changePage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 md:px-4 py-1 md:py-2 rounded-r-md border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm md:text-base font-medium ${
                          currentPage === totalPages 
                            ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}