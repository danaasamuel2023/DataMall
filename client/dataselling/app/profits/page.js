// pages/admin/profit/index.js
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users,
  Calendar,
  Download,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ProfitDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [bestPackages, setBestPackages] = useState([]);
  const [profitTrends, setProfitTrends] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState('mtn');
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userrole');
    
    if (!token || role !== 'admin') {
      router.push('/Auth');
    } else {
      fetchAllData();
    }
  }, [selectedNetwork, selectedPeriod]);

  // Fetch all profit data
  const fetchAllData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch multiple endpoints in parallel
      const [dailyRes, monthlyRes, packagesRes, trendsRes] = await Promise.all([
        axios.get(`https://datamall.onrender.com/api/profit/daily-report?network=${selectedNetwork}`, { headers }),
        axios.get(`https://datamall.onrender.com/api/profit/monthly-summary?network=${selectedNetwork}`, { headers }),
        axios.get(`https://datamall.onrender.com/api/profit/best-packages?network=${selectedNetwork}&days=${selectedPeriod}`, { headers }),
        axios.get(`https://datamall.onrender.com/api/profit/trends?network=${selectedNetwork}&days=${selectedPeriod}`, { headers })
      ]);
      
      setDailyReport(dailyRes.data);
      setMonthlyData(monthlyRes.data);
      setBestPackages(packagesRes.data.packages || []);
      setProfitTrends(trendsRes.data.trends || []);
      
    } catch (error) {
      console.error('Error fetching profit data:', error);
      setError('Failed to load profit data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize pricing
  const initializePricing = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'https://datamall.onrender.com/api/profit/initialize-pricing',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Pricing initialized successfully');
      fetchAllData();
    } catch (error) {
      console.error('Error initializing pricing:', error);
      alert('Failed to initialize pricing');
    } finally {
      setRefreshing(false);
    }
  };

  // Export profit data
  const exportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://datamall.onrender.com/api/profit/export?network=${selectedNetwork}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `profit-report-${selectedNetwork}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    if (!dailyReport?.report?.[0]) return { revenue: 0, profit: 0, orders: 0, margin: 0 };
    
    const today = dailyReport.report[0];
    return {
      revenue: today.totalRevenue || 0,
      profit: today.totalProfit || 0,
      orders: today.totalOrders || 0,
      margin: today.averageProfitMargin || 0
    };
  };

  // Prepare chart data for trends
  const prepareTrendChartData = () => {
    if (!profitTrends || profitTrends.length === 0) return null;
    
    return {
      labels: profitTrends.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Daily Profit',
          data: profitTrends.map(d => d.profit),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1
        },
        {
          label: '7-Day Average',
          data: profitTrends.map(d => d.movingAvgProfit),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
          borderDash: [5, 5]
        }
      ]
    };
  };

  // Prepare chart data for packages
  const preparePackageChartData = () => {
    if (!bestPackages || bestPackages.length === 0) return null;
    
    const topPackages = bestPackages.slice(0, 5);
    
    return {
      labels: topPackages.map(p => `${p.capacity}GB`),
      datasets: [{
        label: 'Total Profit',
        data: topPackages.map(p => p.totalProfit),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ]
      }]
    };
  };

  const summary = calculateSummary();
  const trendChartData = prepareTrendChartData();
  const packageChartData = preparePackageChartData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading profit data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Profit Analytics | Admin Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="mr-3 h-8 w-8 text-green-600" />
                Profit Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Track your business performance and profitability</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="mtn">MTN</option>
                <option value="telecel">Telecel</option>
                <option value="at">AirtelTigo</option>
              </select>
              
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              
              <button
                onClick={initializePricing}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Initialize Pricing
              </button>
              
              <button
                onClick={exportData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-100 dark:bg-red-900 border-l-4 border-red-600 p-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Today's Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    GHS {summary.revenue.toFixed(2)}
                  </p>
                  {dailyReport?.growth?.revenue !== undefined && (
                    <p className={`text-sm mt-2 flex items-center ${dailyReport.growth.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dailyReport.growth.revenue >= 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                      {Math.abs(dailyReport.growth.revenue).toFixed(1)}% from yesterday
                    </p>
                  )}
                </div>
                <DollarSign className="h-10 w-10 text-blue-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Today's Profit</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    GHS {summary.profit.toFixed(2)}
                  </p>
                  {dailyReport?.growth?.profit !== undefined && (
                    <p className={`text-sm mt-2 flex items-center ${dailyReport.growth.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dailyReport.growth.profit >= 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                      {Math.abs(dailyReport.growth.profit).toFixed(1)}% from yesterday
                    </p>
                  )}
                </div>
                <TrendingUp className="h-10 w-10 text-green-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {summary.orders}
                  </p>
                  {dailyReport?.growth?.orders !== undefined && (
                    <p className={`text-sm mt-2 flex items-center ${dailyReport.growth.orders >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dailyReport.growth.orders >= 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                      {Math.abs(dailyReport.growth.orders).toFixed(1)}% from yesterday
                    </p>
                  )}
                </div>
                <Package className="h-10 w-10 text-purple-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Profit Margin</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {summary.margin.toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Average margin</p>
                </div>
                <BarChart3 className="h-10 w-10 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Profit Trends Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profit Trends</h2>
              {trendChartData ? (
                <Line 
                  data={trendChartData} 
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: 'rgb(156, 163, 175)'
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return 'GHS ' + value.toFixed(0);
                          },
                          color: 'rgb(156, 163, 175)'
                        },
                        grid: {
                          color: 'rgba(156, 163, 175, 0.1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: 'rgb(156, 163, 175)'
                        },
                        grid: {
                          color: 'rgba(156, 163, 175, 0.1)'
                        }
                      }
                    }
                  }}
                />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No trend data available</p>
              )}
            </div>

            {/* Best Packages Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Top Performing Packages</h2>
              {packageChartData ? (
                <Doughnut 
                  data={packageChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: 'rgb(156, 163, 175)'
                        }
                      }
                    }
                  }}
                />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No package data available</p>
              )}
            </div>
          </div>

          {/* Best Packages Table */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Detailed Package Performance</h2>
              <Link 
                href="/admin/profit/pricing" 
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Manage Pricing →
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Margin %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Profit/Unit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {bestPackages.map((pkg, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {pkg.capacity}GB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {pkg.totalOrders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        GHS {pkg.totalRevenue?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        GHS {pkg.totalProfit?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {pkg.avgProfitMargin?.toFixed(2) || '0.00'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        GHS {pkg.currentPricing?.profitPerUnit?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/admin/profit/pricing"
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Manage Pricing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Update provider costs and selling prices</p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            </Link>
            
            <Link 
              href="/admin/profit/monthly"
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Reports</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">View detailed monthly analytics</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </Link>
            
            <Link 
              href="/admin/profit/segments"
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">User Segments</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Analyze profit by user types</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}