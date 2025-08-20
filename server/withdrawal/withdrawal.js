// routes/adminWithdrawal.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { AdminWithdrawal, WeeklyProfit, ProfitAnalytics } = require('../schema/schema');
const { auth, authorize } = require('../middleware/page');

// Get weekly profits summary
router.get('/weekly-profits', auth, authorize('admin'), async (req, res) => {
  try {
    // Get last 12 weeks of profits
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks
    
    const weeklyProfits = await WeeklyProfit.find({
      weekStartDate: { $gte: twelveWeeksAgo }
    }).sort({ weekStartDate: -1 });
    
    // Calculate totals
    const totals = weeklyProfits.reduce((acc, week) => ({
      totalProfit: acc.totalProfit + week.totalProfit,
      withdrawnProfit: acc.withdrawnProfit + (week.isWithdrawn ? week.totalProfit : 0),
      availableProfit: acc.availableProfit + (!week.isWithdrawn ? week.totalProfit : 0),
      totalOrders: acc.totalOrders + week.totalOrders
    }), { totalProfit: 0, withdrawnProfit: 0, availableProfit: 0, totalOrders: 0 });
    
    res.json({
      success: true,
      weeklyProfits,
      totals
    });
  } catch (error) {
    console.error('Error getting weekly profits:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get weekly profits',
      error: error.message 
    });
  }
});

// Get current week profit
router.get('/current-week', auth, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    
    const weekStart = new Date(today.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const currentWeek = await WeeklyProfit.findOne({
      weekStartDate: weekStart,
      weekEndDate: weekEnd
    });
    
    res.json({
      success: true,
      currentWeek: currentWeek || {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        totalProfit: 0,
        totalOrders: 0,
        totalRevenue: 0,
        isWithdrawn: false
      }
    });
  } catch (error) {
    console.error('Error getting current week:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get current week profit'
    });
  }
});

// Withdraw specific week's profit
router.post('/withdraw-week', auth, authorize('admin'), async (req, res) => {
  try {
    const { weeklyProfitId, bankDetails, notes } = req.body;
    
    // Find the weekly profit record
    const weeklyProfit = await WeeklyProfit.findById(weeklyProfitId);
    
    if (!weeklyProfit) {
      return res.status(404).json({
        success: false,
        message: 'Weekly profit record not found'
      });
    }
    
    if (weeklyProfit.isWithdrawn) {
      return res.status(400).json({
        success: false,
        message: 'This week\'s profit has already been withdrawn'
      });
    }
    
    if (weeklyProfit.totalProfit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No profit available for this week'
      });
    }
    
    // Create withdrawal
    const withdrawal = await AdminWithdrawal.create({
      amount: weeklyProfit.totalProfit,
      weeklyProfitId: weeklyProfit._id,
      weekStartDate: weeklyProfit.weekStartDate,
      weekEndDate: weeklyProfit.weekEndDate,
      bankDetails,
      notes: notes || `Week ${weeklyProfit.weekNumber}, ${weeklyProfit.year} profit withdrawal`,
      status: 'pending'
    });
    
    // Mark week as withdrawn
    weeklyProfit.isWithdrawn = true;
    weeklyProfit.withdrawalId = withdrawal._id;
    weeklyProfit.withdrawnAt = new Date();
    await weeklyProfit.save();
    
    res.json({
      success: true,
      message: 'Weekly profit withdrawal created successfully',
      withdrawal
    });
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create withdrawal',
      error: error.message 
    });
  }
});

// Complete withdrawal
router.put('/complete/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const withdrawal = await AdminWithdrawal.findById(req.params.id);
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }
    
    if (withdrawal.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal already completed'
      });
    }
    
    withdrawal.status = 'completed';
    withdrawal.completedAt = new Date();
    await withdrawal.save();
    
    res.json({
      success: true,
      message: 'Withdrawal marked as completed',
      withdrawal
    });
  } catch (error) {
    console.error('Error completing withdrawal:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to complete withdrawal'
    });
  }
});

// Get withdrawal history
router.get('/history', auth, authorize('admin'), async (req, res) => {
  try {
    const withdrawals = await AdminWithdrawal.find()
      .populate('weeklyProfitId')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      withdrawals
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get withdrawal history'
    });
  }
});

// Get statistics
router.get('/statistics', auth, authorize('admin'), async (req, res) => {
  try {
    const [pending, completed] = await Promise.all([
      AdminWithdrawal.countDocuments({ status: 'pending' }),
      AdminWithdrawal.countDocuments({ status: 'completed' })
    ]);
    
    // Get this year's total
    const thisYear = new Date().getFullYear();
    const yearlyWithdrawals = await AdminWithdrawal.aggregate([
      {
        $match: {
          createdAt: { 
            $gte: new Date(thisYear, 0, 1),
            $lte: new Date(thisYear, 11, 31)
          },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      statistics: {
        pending,
        completed,
        yearlyTotal: yearlyWithdrawals[0]?.totalAmount || 0
      }
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get statistics'
    });
  }
});

module.exports = router;