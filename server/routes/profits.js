const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { 
  DataOrder, 
  User, 
  Transaction, 
  NetworkAvailability,
  ProviderPricing,
  ProfitAnalytics,
  UserDailyEarnings,
  initializeMTNPricing,
  getDailyProfitReport,
  getMonthlyProfitSummary,
  getBestPerformingPackages,
  trackUserEarnings,
  getUserEarningsSummary
} = require('../schema/schema');
const { auth, authorize } = require('../middleware/page');

// Error logging helper
const errorLogger = (error, route) => {
  console.error(`[${new Date().toISOString()}] Error in ${route}:`, {
    message: error.message,
    stack: error.stack
  });
};

// ====== ADMIN PROFIT TRACKING ROUTES ======

// Initialize MTN pricing (run once or when updating prices)
router.post('/profit/initialize-pricing', auth, authorize('admin'), async (req, res) => {
  try {
    await initializeMTNPricing();
    res.json({ 
      success: true, 
      message: 'MTN pricing initialized successfully' 
    });
  } catch (error) {
    errorLogger(error, 'Initialize Pricing');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize pricing', 
      error: error.message 
    });
  }
});

// Get all provider pricing
router.get('/profit/pricing', auth, authorize('admin'), async (req, res) => {
  try {
    const { network } = req.query;
    
    const query = { isActive: true };
    if (network) query.network = network.toLowerCase();
    
    const pricing = await ProviderPricing.find(query)
      .sort({ network: 1, capacity: 1 });
    
    // Calculate total profit margins
    const summary = pricing.reduce((acc, item) => {
      if (!acc[item.network]) {
        acc[item.network] = {
          totalPackages: 0,
          avgProfit: 0,
          avgMargin: 0,
          minProfit: Infinity,
          maxProfit: -Infinity
        };
      }
      
      acc[item.network].totalPackages++;
      acc[item.network].avgProfit += item.profit;
      acc[item.network].avgMargin += item.profitMargin;
      acc[item.network].minProfit = Math.min(acc[item.network].minProfit, item.profit);
      acc[item.network].maxProfit = Math.max(acc[item.network].maxProfit, item.profit);
      
      return acc;
    }, {});
    
    // Calculate averages
    Object.keys(summary).forEach(network => {
      summary[network].avgProfit /= summary[network].totalPackages;
      summary[network].avgMargin /= summary[network].totalPackages;
    });
    
    res.json({
      success: true,
      pricing,
      summary
    });
  } catch (error) {
    errorLogger(error, 'Get Pricing');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get pricing', 
      error: error.message 
    });
  }
});

// Update provider pricing
router.put('/profit/pricing/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { providerPrice, sellingPrice } = req.body;
    
    if (!providerPrice || !sellingPrice) {
      return res.status(400).json({
        success: false,
        message: 'Provider price and selling price are required'
      });
    }
    
    const pricing = await ProviderPricing.findById(req.params.id);
    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: 'Pricing not found'
      });
    }
    
    // Update prices and recalculate profit
    pricing.providerPrice = providerPrice;
    pricing.sellingPrice = sellingPrice;
    pricing.profit = sellingPrice - providerPrice;
    pricing.profitMargin = (pricing.profit / sellingPrice) * 100;
    pricing.updatedAt = new Date();
    
    await pricing.save();
    
    res.json({
      success: true,
      message: 'Pricing updated successfully',
      pricing
    });
  } catch (error) {
    errorLogger(error, 'Update Pricing');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update pricing', 
      error: error.message 
    });
  }
});

// Get daily profit report (Admin)
router.get('/profit/daily-report', auth, authorize('admin'), async (req, res) => {
  try {
    const { date, network } = req.query;
    
    // Use provided date or today
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    
    const report = await getDailyProfitReport(reportDate, network);
    
    // Get comparison with previous day
    const previousDate = new Date(reportDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousReport = await getDailyProfitReport(previousDate, network);
    
    // Calculate growth
    const growth = {
      orders: 0,
      revenue: 0,
      profit: 0
    };
    
    if (previousReport.length > 0 && report.length > 0) {
      const prevTotals = previousReport.reduce((acc, item) => ({
        orders: acc.orders + item.totalOrders,
        revenue: acc.revenue + item.totalRevenue,
        profit: acc.profit + item.totalProfit
      }), { orders: 0, revenue: 0, profit: 0 });
      
      const currentTotals = report.reduce((acc, item) => ({
        orders: acc.orders + item.totalOrders,
        revenue: acc.revenue + item.totalRevenue,
        profit: acc.profit + item.totalProfit
      }), { orders: 0, revenue: 0, profit: 0 });
      
      if (prevTotals.orders > 0) {
        growth.orders = ((currentTotals.orders - prevTotals.orders) / prevTotals.orders) * 100;
      }
      if (prevTotals.revenue > 0) {
        growth.revenue = ((currentTotals.revenue - prevTotals.revenue) / prevTotals.revenue) * 100;
      }
      if (prevTotals.profit > 0) {
        growth.profit = ((currentTotals.profit - prevTotals.profit) / prevTotals.profit) * 100;
      }
    }
    
    res.json({
      success: true,
      date: reportDate,
      report,
      growth,
      previousDayReport: previousReport
    });
  } catch (error) {
    errorLogger(error, 'Daily Profit Report');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get daily report', 
      error: error.message 
    });
  }
});

// Get monthly profit summary (Admin)
router.get('/profit/monthly-summary', auth, authorize('admin'), async (req, res) => {
  try {
    const { year, month, network } = req.query;
    
    // Use current year and month if not provided
    const currentDate = new Date();
    const reportYear = year ? parseInt(year) : currentDate.getFullYear();
    const reportMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    
    const summary = await getMonthlyProfitSummary(reportYear, reportMonth, network);
    
    // Get daily breakdown for the month
    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0);
    
    const dailyBreakdown = await ProfitAnalytics.find({
      date: { $gte: startDate, $lte: endDate },
      ...(network && { network })
    }).sort({ date: 1 });
    
    // Calculate week-over-week growth
    const weeklyData = {};
    dailyBreakdown.forEach(day => {
      const weekNumber = Math.ceil(day.date.getDate() / 7);
      if (!weeklyData[weekNumber]) {
        weeklyData[weekNumber] = {
          orders: 0,
          revenue: 0,
          profit: 0
        };
      }
      weeklyData[weekNumber].orders += day.totalOrders;
      weeklyData[weekNumber].revenue += day.totalRevenue;
      weeklyData[weekNumber].profit += day.totalProfit;
    });
    
    res.json({
      success: true,
      year: reportYear,
      month: reportMonth,
      summary,
      dailyBreakdown,
      weeklyData
    });
  } catch (error) {
    errorLogger(error, 'Monthly Profit Summary');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get monthly summary', 
      error: error.message 
    });
  }
});

// Get best performing packages (Admin)
router.get('/profit/best-packages', auth, authorize('admin'), async (req, res) => {
  try {
    const { network = 'mtn', limit = 10, days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const result = await DataOrder.aggregate([
      { 
        $match: { 
          network: network,
          status: 'completed',
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: '$dataAmount',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$price' },
          totalCost: { $sum: '$providerCost' },
          totalProfit: { $sum: '$profit' },
          avgProfitMargin: { $avg: '$profitMargin' }
        }
      },
      { $sort: { totalProfit: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    // Get pricing info for each package
    const packagesWithPricing = await Promise.all(
      result.map(async (pkg) => {
        const pricing = await ProviderPricing.findOne({
          network: network,
          capacity: pkg._id.toString()
        });
        
        return {
          ...pkg,
          capacity: pkg._id,
          currentPricing: pricing ? {
            providerPrice: pricing.providerPrice,
            sellingPrice: pricing.sellingPrice,
            profitPerUnit: pricing.profit
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      network,
      period: `Last ${days} days`,
      packages: packagesWithPricing
    });
  } catch (error) {
    errorLogger(error, 'Best Performing Packages');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get best packages', 
      error: error.message 
    });
  }
});

// Get profit trends (Admin)
router.get('/profit/trends', auth, authorize('admin'), async (req, res) => {
  try {
    const { days = 30, network } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    
    const query = {
      date: { $gte: startDate },
      ...(network && { network })
    };
    
    const trends = await ProfitAnalytics.find(query)
      .sort({ date: 1 });
    
    // Calculate moving averages (7-day)
    const movingAverages = trends.map((day, index) => {
      const start = Math.max(0, index - 6);
      const subset = trends.slice(start, index + 1);
      
      const avgProfit = subset.reduce((sum, d) => sum + d.totalProfit, 0) / subset.length;
      const avgOrders = subset.reduce((sum, d) => sum + d.totalOrders, 0) / subset.length;
      
      return {
        date: day.date,
        profit: day.totalProfit,
        orders: day.totalOrders,
        revenue: day.totalRevenue,
        movingAvgProfit: avgProfit,
        movingAvgOrders: avgOrders
      };
    });
    
    res.json({
      success: true,
      period: `Last ${days} days`,
      trends: movingAverages
    });
  } catch (error) {
    errorLogger(error, 'Profit Trends');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get trends', 
      error: error.message 
    });
  }
});

// Get profit by user segment (Admin)
router.get('/profit/user-segments', auth, authorize('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Analyze profit by user type
    const userSegments = await DataOrder.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'usernashes',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$user.role',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$price' },
          totalProfit: { $sum: '$profit' },
          avgOrderValue: { $avg: '$price' },
          avgProfitPerOrder: { $avg: '$profit' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          role: '$_id',
          totalOrders: 1,
          totalRevenue: 1,
          totalProfit: 1,
          avgOrderValue: 1,
          avgProfitPerOrder: 1,
          totalUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);
    
    res.json({
      success: true,
      period: `Last ${days} days`,
      segments: userSegments
    });
  } catch (error) {
    errorLogger(error, 'User Segments Profit');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get user segments', 
      error: error.message 
    });
  }
});

// ====== USER EARNINGS ROUTES (NEW) ======

// Get user's own earnings summary
router.get('/earnings/my-summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'week' } = req.query;
    
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    
    switch(period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
    }
    
    const summary = await getUserEarningsSummary(userId, startDate, endDate);
    
    // Get user's current balance
    const user = await User.findById(userId);
    
    res.json({
      success: true,
      period,
      currentBalance: user.walletBalance,
      earnings: summary,
      role: user.role
    });
  } catch (error) {
    errorLogger(error, 'User Earnings Summary');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get earnings summary', 
      error: error.message 
    });
  }
});

// Get user's daily earnings
router.get('/earnings/my-daily', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    
    const dailyEarnings = await UserDailyEarnings.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: -1 });
    
    // Calculate totals
    const totals = dailyEarnings.reduce((acc, day) => ({
      orders: acc.orders + day.totalOrders,
      revenue: acc.revenue + day.totalRevenue,
      profit: acc.profit + day.totalProfit,
      commission: acc.commission + day.commission
    }), { orders: 0, revenue: 0, profit: 0, commission: 0 });
    
    res.json({
      success: true,
      period: `Last ${days} days`,
      dailyEarnings,
      totals
    });
  } catch (error) {
    errorLogger(error, 'User Daily Earnings');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get daily earnings', 
      error: error.message 
    });
  }
});

// Get agent commission report (Agents only)
router.get('/earnings/commission', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    // Check if user is an agent
    if (user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        message: 'Commission data is only available for agents'
      });
    }
    
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    const commissionData = await UserDailyEarnings.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commission' },
          totalOrders: { $sum: '$totalOrders' },
          totalRevenue: { $sum: '$totalRevenue' },
          avgCommissionPerDay: { $avg: '$commission' },
          daysWorked: { $sum: 1 }
        }
      }
    ]);
    
    // Get commission transactions
    const commissionTransactions = await Transaction.find({
      userId,
      type: 'commission',
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 }).limit(50);
    
    res.json({
      success: true,
      period: { start, end },
      summary: commissionData[0] || {
        totalCommission: 0,
        totalOrders: 0,
        totalRevenue: 0,
        avgCommissionPerDay: 0,
        daysWorked: 0
      },
      commissionRate: 5, // 5% commission rate
      recentTransactions: commissionTransactions
    });
  } catch (error) {
    errorLogger(error, 'Agent Commission Report');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get commission report', 
      error: error.message 
    });
  }
});

// Export profit data as CSV (Admin)
router.get('/profit/export', auth, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, network } = req.query;
    
    const query = {
      createdAt: {
        $gte: new Date(startDate || '2024-01-01'),
        $lte: new Date(endDate || new Date())
      },
      status: 'completed',
      ...(network && { network })
    };
    
    const orders = await DataOrder.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    // Convert to CSV format
    const csvHeader = 'Date,Order ID,User,Network,Package,Revenue,Cost,Profit,Margin %\n';
    const csvData = orders.map(order => {
      return `${order.createdAt.toISOString()},${order._id},${order.userId.name},${order.network},${order.dataAmount}GB,${order.price},${order.providerCost || 0},${order.profit || 0},${order.profitMargin || 0}`;
    }).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=profit-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvHeader + csvData);
    
  } catch (error) {
    errorLogger(error, 'Export Profit Data');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export data', 
      error: error.message 
    });
  }
});

// Export user earnings as CSV
router.get('/earnings/export', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const earnings = await UserDailyEarnings.find({
      userId,
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });
    
    // Convert to CSV format
    const user = await User.findById(userId);
    const isAgent = user.role === 'agent';
    
    let csvHeader = 'Date,Orders,Revenue,Profit';
    if (isAgent) csvHeader += ',Commission';
    csvHeader += '\n';
    
    const csvData = earnings.map(day => {
      let row = `${day.date.toISOString().split('T')[0]},${day.totalOrders},${day.totalRevenue},${day.totalProfit}`;
      if (isAgent) row += `,${day.commission}`;
      return row;
    }).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=earnings-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvHeader + csvData);
    
  } catch (error) {
    errorLogger(error, 'Export User Earnings');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export earnings', 
      error: error.message 
    });
  }
});

module.exports = router;