// pages/admin/withdraw/index.js - FIXED VERSION
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { 
  DollarSign, 
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Clock,
  TrendingUp,
  Download,
  Building,
  CreditCard,
  Info,
  XCircle,
  Eye,
  Bug
} from 'lucide-react';
import axios from 'axios';

export default function WeeklyWithdraw() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyProfits, setWeeklyProfits] = useState([]);
  const [totals, setTotals] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // Bank form states
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userrole');
    
    if (!token || role !== 'admin') {
      router.push('/Auth');
    } else {
      fetchData();
      fetchBanks();
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [weeklyRes, currentRes, historyRes, statsRes] = await Promise.all([
        axios.get('https://datamall.onrender.com/api/admin-withdrawal/weekly-profits', { headers }),
        axios.get('https://datamall.onrender.com/api/admin-withdrawal/current-week', { headers }),
        axios.get('https://datamall.onrender.com/api/admin-withdrawal/history', { headers }),
        axios.get('https://datamall.onrender.com/api/admin-withdrawal/statistics', { headers })
      ]);
      
      console.log('Weekly Profits Response:', weeklyRes.data);
      
      setWeeklyProfits(weeklyRes.data.weeklyProfits);
      setTotals(weeklyRes.data.totals);
      setDebugInfo(weeklyRes.data.debugInfo);
      setCurrentWeek(currentRes.data.currentWeek);
      setWithdrawals(historyRes.data.withdrawals);
      setStatistics(statsRes.data.statistics);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'https://datamall.onrender.com/api/admin-withdrawal/banks',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Remove duplicates based on bank code
        const uniqueBanks = response.data.banks.reduce((acc, bank) => {
          if (!acc.find(b => b.code === bank.code)) {
            acc.push(bank);
          }
          return acc;
        }, []);
        
        setBanks(uniqueBanks);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const fetchDebugData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'https://datamall.onrender.com/api/admin-withdrawal/debug-weeks',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        console.log('Debug Data:', response.data);
        alert(JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.error('Error fetching debug data:', error);
    }
  };

  const verifyAccount = async () => {
    if (!accountNumber || !selectedBank) {
      setError('Please enter account number and select a bank');
      return;
    }

    setVerifying(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://datamall.onrender.com/api/admin-withdrawal/verify-account',
        {
          accountNumber,
          bankCode: selectedBank
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setAccountName(response.data.accountDetails.accountName);
        setVerified(true);
        setSuccess('Account verified successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to verify account');
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleWithdrawWeek = async () => {
    if (!selectedWeek || !accountNumber || !selectedBank || !accountName) {
      setError('Please complete account verification first');
      return;
    }

    if (!verified) {
      setError('Please verify the account first');
      return;
    }

    // Prevent double-clicking
    if (processing) {
      return;
    }

    setProcessing(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://datamall.onrender.com/api/admin-withdrawal/withdraw-week',
        {
          weeklyProfitId: selectedWeek._id,
          accountNumber,
          bankCode: selectedBank,
          accountName,
          notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setSuccess('Withdrawal initiated successfully! Transfer is being processed.');
        
        // Reset form
        setSelectedWeek(null);
        setAccountNumber('');
        setSelectedBank('');
        setAccountName('');
        setVerified(false);
        setNotes('');
        
        // Refresh data
        await fetchData();
        
        setTimeout(() => setSuccess(''), 7000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const checkTransferStatus = async (withdrawalId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://datamall.onrender.com/api/admin-withdrawal/transfer-status/${withdrawalId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setSuccess(`Transfer status: ${response.data.withdrawal.status}`);
        await fetchData();
      }
    } catch (error) {
      setError('Failed to check transfer status');
    }
  };

  const retryTransfer = async (withdrawalId) => {
    if (!confirm('Retry this transfer?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `https://datamall.onrender.com/api/admin-withdrawal/retry/${withdrawalId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setSuccess('Transfer retry initiated');
        await fetchData();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to retry transfer');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatWeek = (startDate, endDate) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWeekStatus = (week) => {
    if (week.isWithdrawn) return { text: 'Withdrawn', color: 'bg-gray-100 text-gray-800' };
    if (week.isCurrentWeek) return { text: 'In Progress', color: 'bg-blue-100 text-blue-800' };
    if (!week.isComplete) return { text: 'Incomplete', color: 'bg-yellow-100 text-yellow-800' };
    if (week.totalProfit < 10) return { text: 'Below Minimum', color: 'bg-orange-100 text-orange-800' };
    return { text: 'Available', color: 'bg-green-100 text-green-800' };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Weekly Profit Withdrawal - Paystack</title>
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Calendar className="mr-3 h-8 w-8 text-green-600" />
                Weekly Profit Withdrawal
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Automated bank transfers via Paystack
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-yellow-200 dark:bg-yellow-700 rounded-lg hover:bg-yellow-300 dark:hover:bg-yellow-600 flex items-center gap-2"
              >
                <Bug className="h-4 w-4" />
                Debug
              </button>
              
              <Link
                href="/admin/profit"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Debug Section */}
          {showDebug && debugInfo && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900 border-2 border-yellow-400 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                  <Bug className="h-5 w-5 mr-2" />
                  Debug Information
                </h3>
                <button
                  onClick={fetchDebugData}
                  className="text-sm px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Get Full Debug Data
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Current Date:</strong> {debugInfo.currentDate}</p>
                <p><strong>Total Weeks:</strong> {debugInfo.totalWeeks}</p>
                <p><strong>Withdrawable Weeks:</strong> {debugInfo.withdrawableWeeks}</p>
                <p><strong>Total Available:</strong> GHS {totals?.availableProfit?.toFixed(2)}</p>
                <div className="mt-3 border-t pt-3">
                  <p className="font-semibold mb-2">First 3 Weeks Status:</p>
                  {weeklyProfits.slice(0, 3).map(week => (
                    <div key={week._id} className="ml-4 mb-2 p-2 bg-white dark:bg-gray-800 rounded">
                      <p className="font-medium">Week {week.weekNumber}:</p>
                      <ul className="ml-4 text-xs">
                        <li>Profit: GHS {week.totalProfit}</li>
                        <li>Withdrawn: {week.isWithdrawn ? 'Yes' : 'No'}</li>
                        <li>Current: {week.isCurrentWeek ? 'Yes' : 'No'}</li>
                        <li>Complete: {week.isComplete ? 'Yes' : 'No'}</li>
                        <li>Can Withdraw: {week.canWithdraw ? 'Yes' : 'No'}</li>
                        <li>End Date: {new Date(week.weekEndDate).toLocaleDateString()}</li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="mb-6 bg-red-100 dark:bg-red-900 border-l-4 border-red-600 p-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-6 bg-green-100 dark:bg-green-900 border-l-4 border-green-600 p-4 rounded">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <p className="text-green-800 dark:text-green-300">{success}</p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Profit (12 weeks)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                GHS {totals?.totalProfit?.toFixed(2) || '0.00'}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Available to Withdraw</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                GHS {totals?.availableProfit?.toFixed(2) || '0.00'}
              </p>
              {debugInfo && (
                <span className="text-xs text-gray-500">{debugInfo.withdrawableWeeks} weeks</span>
              )}
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Already Withdrawn</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                GHS {totals?.withdrawnProfit?.toFixed(2) || '0.00'}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Processing</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {statistics?.processing || 0}
              </p>
              <span className="text-xs text-gray-500">Active transfers</span>
            </div>
          </div>

          {/* Weekly Profits Table */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Weekly Profits Overview
              </h2>
              <div className="text-sm text-gray-500">
                Showing {weeklyProfits.length} weeks
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {weeklyProfits.map((week) => {
                    const status = getWeekStatus(week);
                    return (
                      <tr key={week._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          Week {week.weekNumber}
                          {week.isCurrentWeek && (
                            <span className="ml-2 text-xs text-blue-600">(Current)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatWeek(week.weekStartDate, week.weekEndDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {week.totalOrders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          GHS {week.totalRevenue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          GHS {week.totalProfit.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {week.canWithdraw ? (
                            <button
                              onClick={() => setSelectedWeek(week)}
                              disabled={processing}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              <DollarSign className="h-4 w-4" />
                              Withdraw
                            </button>
                          ) : (
                            <div className="text-gray-400 text-xs">
                              {week.isWithdrawn && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Done
                                </span>
                              )}
                              {week.isCurrentWeek && "In Progress"}
                              {!week.isComplete && !week.isCurrentWeek && "Not Complete"}
                              {week.isComplete && !week.isWithdrawn && week.totalProfit < 10 && "Min: GHS 10"}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Withdrawal Form Modal with Paystack */}
          {selectedWeek && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Withdraw Weekly Profit via Paystack
                </h3>
                
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Week {selectedWeek.weekNumber} ({formatWeek(selectedWeek.weekStartDate, selectedWeek.weekEndDate)})
                  </p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    GHS {selectedWeek.totalProfit.toFixed(2)}
                  </p>
                </div>
                
                {/* Bank Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Building className="inline h-4 w-4 mr-1" />
                    Select Bank
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => {
                      setSelectedBank(e.target.value);
                      setVerified(false);
                      setAccountName('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">-- Select Bank --</option>
                    {banks.map((bank, index) => (
                      <option key={`${bank.code}_${index}`} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Account Number */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <CreditCard className="inline h-4 w-4 mr-1" />
                    Account Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value);
                        setVerified(false);
                        setAccountName('');
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0123456789"
                    />
                    <button
                      onClick={verifyAccount}
                      disabled={!accountNumber || !selectedBank || verifying}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {verifying ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </div>
                
                {/* Account Name (After Verification) */}
                {accountName && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Account Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{accountName}</p>
                    {verified && (
                      <p className="text-xs text-green-600 mt-1 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Account verified successfully
                      </p>
                    )}
                  </div>
                )}
                
                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Info className="inline h-4 w-4 mr-1" />
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Any additional notes..."
                  />
                </div>
                
                {/* Info Box */}
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <Info className="inline h-3 w-3 mr-1" />
                    Transfer will be processed immediately via Paystack. Funds typically arrive within minutes.
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedWeek(null);
                      setAccountNumber('');
                      setSelectedBank('');
                      setAccountName('');
                      setVerified(false);
                      setNotes('');
                    }}
                    disabled={processing}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdrawWeek}
                    disabled={processing || !verified || !accountName}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Confirm Transfer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Withdrawals with Enhanced Status */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent Withdrawals
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {withdrawals.slice(0, 10).map((withdrawal) => (
                    <tr key={withdrawal._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(withdrawal.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {withdrawal.weekStartDate && withdrawal.weekEndDate 
                          ? formatWeek(withdrawal.weekStartDate, withdrawal.weekEndDate)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        GHS {withdrawal.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div>
                          <p className="font-medium">{withdrawal.bankInfo?.accountName || '-'}</p>
                          <p className="text-xs">{withdrawal.bankInfo?.accountNumber || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(withdrawal.status)}`}>
                          {withdrawal.status}
                        </span>
                        {withdrawal.paymentStatus && (
                          <p className="text-xs text-gray-500 mt-1">
                            {withdrawal.paymentStatus}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {withdrawal.status === 'processing' && (
                          <button
                            onClick={() => checkTransferStatus(withdrawal._id)}
                            className="text-blue-600 hover:text-blue-900 mr-2"
                          >
                            Check Status
                          </button>
                        )}
                        {withdrawal.status === 'failed' && (
                          <button
                            onClick={() => retryTransfer(withdrawal._id)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Retry
                          </button>
                        )}
                        {withdrawal.status === 'completed' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}