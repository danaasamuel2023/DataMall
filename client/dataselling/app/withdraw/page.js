// pages/admin/withdraw/index.js
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
  Download
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
  const [bankDetails, setBankDetails] = useState('');
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
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [weeklyRes, currentRes, historyRes, statsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin-withdrawal/weekly-profits', { headers }),
        axios.get('http://localhost:5000/api/admin-withdrawal/current-week', { headers }),
        axios.get('http://localhost:5000/api/admin-withdrawal/history', { headers }),
        axios.get('http://localhost:5000/api/admin-withdrawal/statistics', { headers })
      ]);
      
      setWeeklyProfits(weeklyRes.data.weeklyProfits);
      setTotals(weeklyRes.data.totals);
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

  const handleWithdrawWeek = async () => {
    if (!selectedWeek || !bankDetails) {
      setError('Please select a week and enter bank details');
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
          bankDetails,
          notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Weekly withdrawal created successfully!');
      setSelectedWeek(null);
      setBankDetails('');
      setNotes('');
      await fetchData();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const markCompleted = async (id) => {
    if (!confirm('Mark this withdrawal as completed?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://datamall.onrender.com/api/admin-withdrawal/complete/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Withdrawal marked as completed');
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to complete withdrawal');
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
        <title>Weekly Profit Withdrawal</title>
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
                Withdraw your profits week by week
              </p>
            </div>
            
            <div className="flex gap-3">
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
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Already Withdrawn</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                GHS {totals?.withdrawnProfit?.toFixed(2) || '0.00'}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <p className="text-gray-600 dark:text-gray-400 text-sm">This Week's Profit</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                GHS {currentWeek?.totalProfit?.toFixed(2) || '0.00'}
              </p>
              {currentWeek?.isWithdrawn && (
                <span className="text-xs text-gray-500">Already withdrawn</span>
              )}
            </div>
          </div>

          {/* Weekly Profits Table */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Weekly Profits Available
            </h2>
            
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
                  {weeklyProfits.map((week) => (
                    <tr key={week._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        Week {week.weekNumber}
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          week.isWithdrawn 
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {week.isWithdrawn ? 'Withdrawn' : 'Available'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!week.isWithdrawn && week.totalProfit > 0 && (
                          <button
                            onClick={() => setSelectedWeek(week)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Withdraw
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Withdrawal Form Modal */}
          {selectedWeek && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Withdraw Weekly Profit
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Week {selectedWeek.weekNumber} ({formatWeek(selectedWeek.weekStartDate, selectedWeek.weekEndDate)})
                  </p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    GHS {selectedWeek.totalProfit.toFixed(2)}
                  </p>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bank Details
                  </label>
                  <input
                    type="text"
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., GTBank - 0123456789"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedWeek(null);
                      setBankDetails('');
                      setNotes('');
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdrawWeek}
                    disabled={processing || !bankDetails}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {processing ? 'Processing...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Withdrawals */}
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
                      Bank
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
                        {withdrawal.bankDetails}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          withdrawal.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {withdrawal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {withdrawal.status === 'pending' && (
                          <button
                            onClick={() => markCompleted(withdrawal._id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Complete
                          </button>
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