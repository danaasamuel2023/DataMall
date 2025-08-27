// routes/adminWithdrawal.js - FIXED VERSION WITH DUPLICATE PROTECTION
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const { AdminWithdrawal, WeeklyProfit, ProfitAnalytics } = require('../schema/schema');
const { auth, authorize } = require('../middleware/page');

// Paystack Configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Create Paystack client
const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Helper function to generate unique reference
const generateReference = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `WD_${timestamp}_${random}`.toUpperCase();
};

// Helper function to check if a week is current
const isCurrentWeek = (weekStartDate, weekEndDate) => {
  const now = new Date();
  const start = new Date(weekStartDate);
  const end = new Date(weekEndDate);
  
  // Set time boundaries
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return now >= start && now <= end;
};

// Helper function to check if a week is complete
const isWeekComplete = (weekEndDate) => {
  const now = new Date();
  const end = new Date(weekEndDate);
  end.setHours(23, 59, 59, 999);
  
  return now > end;
};

// =====================================================
// Get list of Ghana banks
// =====================================================
router.get('/banks', auth, authorize('admin'), async (req, res) => {
  try {
    const response = await paystackClient.get('/bank', {
      params: { country: 'ghana' }
    });
    
    if (response.data.status) {
      const banks = response.data.data.map(bank => ({
        name: bank.name,
        code: bank.code,
        type: bank.type,
        longcode: bank.longcode
      }));
      
      // Remove duplicates based on bank code
      const uniqueBanks = banks.reduce((acc, bank) => {
        const exists = acc.find(b => b.code === bank.code);
        if (!exists) {
          acc.push(bank);
        }
        return acc;
      }, []);
      
      res.json({
        success: true,
        banks: uniqueBanks
      });
    } else {
      throw new Error('Failed to fetch banks');
    }
  } catch (error) {
    console.error('Error fetching banks:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banks list',
      error: error.message
    });
  }
});

// =====================================================
// Verify bank account
// =====================================================
router.post('/verify-account', auth, authorize('admin'), async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    
    if (!accountNumber || !bankCode) {
      return res.status(400).json({
        success: false,
        message: 'Account number and bank code are required'
      });
    }
    
    const response = await paystackClient.get('/bank/resolve', {
      params: {
        account_number: accountNumber,
        bank_code: bankCode
      }
    });
    
    if (response.data.status) {
      res.json({
        success: true,
        accountDetails: {
          accountNumber: response.data.data.account_number,
          accountName: response.data.data.account_name,
          bankId: response.data.data.bank_id
        }
      });
    } else {
      throw new Error('Account verification failed');
    }
  } catch (error) {
    console.error('Error verifying account:', error.response?.data || error.message);
    res.status(400).json({
      success: false,
      message: error.response?.data?.message || 'Failed to verify account',
      error: error.message
    });
  }
});

// =====================================================
// Get weekly profits summary with enhanced status
// =====================================================
router.get('/weekly-profits', auth, authorize('admin'), async (req, res) => {
  try {
    // Get last 12 weeks of profits
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks
    
    const weeklyProfits = await WeeklyProfit.find({
      weekStartDate: { $gte: twelveWeeksAgo }
    }).sort({ weekStartDate: -1 });
    
    // Add enhanced status information to each week
    const enhancedProfits = weeklyProfits.map(week => {
      const weekObj = week.toObject();
      weekObj.isCurrentWeek = isCurrentWeek(week.weekStartDate, week.weekEndDate);
      weekObj.isComplete = isWeekComplete(week.weekEndDate);
      weekObj.canWithdraw = !week.isWithdrawn && 
                           isWeekComplete(week.weekEndDate) && 
                           week.totalProfit >= 10;
      
      // Debug logging
      console.log(`Week ${week.weekNumber}:`, {
        profit: week.totalProfit,
        withdrawn: week.isWithdrawn,
        complete: weekObj.isComplete,
        current: weekObj.isCurrentWeek,
        canWithdraw: weekObj.canWithdraw,
        endDate: week.weekEndDate
      });
      
      return weekObj;
    });
    
    // Calculate totals
    const totals = weeklyProfits.reduce((acc, week) => ({
      totalProfit: acc.totalProfit + week.totalProfit,
      withdrawnProfit: acc.withdrawnProfit + (week.isWithdrawn ? week.totalProfit : 0),
      availableProfit: acc.availableProfit + (!week.isWithdrawn && isWeekComplete(week.weekEndDate) && week.totalProfit >= 10 ? week.totalProfit : 0),
      totalOrders: acc.totalOrders + week.totalOrders
    }), { totalProfit: 0, withdrawnProfit: 0, availableProfit: 0, totalOrders: 0 });
    
    console.log('Totals:', totals);
    
    res.json({
      success: true,
      weeklyProfits: enhancedProfits,
      totals,
      debugInfo: {
        currentDate: new Date().toISOString(),
        totalWeeks: enhancedProfits.length,
        withdrawableWeeks: enhancedProfits.filter(w => w.canWithdraw).length
      }
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

// =====================================================
// Get current week profit
// =====================================================
router.get('/current-week', auth, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(diff);
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

// =====================================================
// MAIN ROUTE: Process withdrawal with Paystack
// =====================================================
router.post('/withdraw-week', auth, authorize('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      weeklyProfitId, 
      accountNumber, 
      bankCode, 
      accountName,
      notes 
    } = req.body;
    
    // Validate inputs
    if (!weeklyProfitId || !accountNumber || !bankCode || !accountName) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // ATOMIC OPERATION: Find and update the weekly profit record
    // This prevents race conditions by atomically checking and updating
    const weeklyProfit = await WeeklyProfit.findOneAndUpdate(
      { 
        _id: weeklyProfitId,
        isWithdrawn: false  // Only proceed if not already withdrawn
      },
      { 
        $set: { 
          isWithdrawn: true,  // Immediately mark as withdrawn
          withdrawnAt: new Date()
        }
      },
      { 
        new: false,  // Return the document BEFORE the update
        session 
      }
    );
    
    if (!weeklyProfit) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'This week has already been withdrawn or does not exist'
      });
    }
    
    // Additional validation checks
    if (weeklyProfit.totalProfit < 10) {  // Minimum GHS 10
      // Rollback the withdrawal flag
      await WeeklyProfit.findByIdAndUpdate(
        weeklyProfitId,
        { 
          $set: { 
            isWithdrawn: false,
            withdrawnAt: null
          }
        },
        { session }
      );
      
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is GHS 10'
      });
    }
    
    // Check if the week is complete
    if (!isWeekComplete(weeklyProfit.weekEndDate)) {
      // Rollback the withdrawal flag
      await WeeklyProfit.findByIdAndUpdate(
        weeklyProfitId,
        { 
          $set: { 
            isWithdrawn: false,
            withdrawnAt: null
          }
        },
        { session }
      );
      
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw profit from an incomplete week'
      });
    }
    
    console.log('Creating Paystack transfer recipient...');
    
    // STEP 1: Create transfer recipient
    const recipientData = {
      type: 'ghipss',  // For Ghana bank accounts
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'GHS',
      description: `Admin withdrawal - Week ${weeklyProfit.weekNumber}`
    };
    
    let recipientCode;
    try {
      const recipientResponse = await paystackClient.post('/transferrecipient', recipientData);
      
      if (!recipientResponse.data.status) {
        throw new Error(recipientResponse.data.message || 'Failed to create recipient');
      }
      
      recipientCode = recipientResponse.data.data.recipient_code;
      console.log('Recipient created:', recipientCode);
      
    } catch (error) {
      console.error('Error creating recipient:', error.response?.data || error.message);
      
      // Rollback the withdrawal flag
      await WeeklyProfit.findByIdAndUpdate(
        weeklyProfitId,
        { 
          $set: { 
            isWithdrawn: false,
            withdrawnAt: null
          }
        },
        { session }
      );
      
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: 'Failed to create transfer recipient',
        error: error.response?.data?.message || error.message
      });
    }
    
    // STEP 2: Create withdrawal record
    const withdrawalReference = generateReference();
    
    const withdrawal = new AdminWithdrawal({
      amount: weeklyProfit.totalProfit,
      weeklyProfitId: weeklyProfit._id,
      weekStartDate: weeklyProfit.weekStartDate,
      weekEndDate: weeklyProfit.weekEndDate,
      bankDetails: JSON.stringify({
        accountNumber,
        bankCode,
        accountName,
        recipientCode
      }),
      notes: notes || `Week ${weeklyProfit.weekNumber}, ${weeklyProfit.year} profit withdrawal`,
      status: 'pending',
      paymentReference: withdrawalReference,
      paymentMethod: 'paystack'
    });
    
    await withdrawal.save({ session });
    
    // Update weekly profit with withdrawal ID
    await WeeklyProfit.findByIdAndUpdate(
      weeklyProfitId,
      { 
        $set: { 
          withdrawalId: withdrawal._id
        }
      },
      { session }
    );
    
    // STEP 3: Initiate transfer
    console.log('Initiating Paystack transfer...');
    
    const transferData = {
      source: 'balance',  // Transfer from Paystack balance
      amount: Math.round(weeklyProfit.totalProfit * 100), // Convert to pesewas
      recipient: recipientCode,
      reason: `Week ${weeklyProfit.weekNumber} profit withdrawal`,
      reference: withdrawalReference
    };
    
    try {
      const transferResponse = await paystackClient.post('/transfer', transferData);
      
      if (transferResponse.data.status) {
        const transferInfo = transferResponse.data.data;
        
        // Update withdrawal with transfer details
        withdrawal.paymentId = transferInfo.transfer_code;
        withdrawal.paymentStatus = transferInfo.status;
        withdrawal.paymentResponse = JSON.stringify(transferInfo);
        
        if (transferInfo.status === 'success') {
          withdrawal.status = 'completed';
          withdrawal.completedAt = new Date();
        } else if (transferInfo.status === 'pending' || transferInfo.status === 'otp') {
          withdrawal.status = 'processing';
        }
        
        await withdrawal.save({ session });
        
        // Commit transaction
        await session.commitTransaction();
        
        console.log('Transfer initiated successfully:', transferInfo.transfer_code);
        
        res.json({
          success: true,
          message: 'Withdrawal initiated successfully',
          withdrawal: {
            id: withdrawal._id,
            amount: withdrawal.amount,
            status: withdrawal.status,
            reference: withdrawalReference,
            transferCode: transferInfo.transfer_code,
            transferStatus: transferInfo.status
          }
        });
        
      } else {
        throw new Error(transferResponse.data.message || 'Transfer initiation failed');
      }
      
    } catch (error) {
      console.error('Error initiating transfer:', error.response?.data || error.message);
      
      // Update withdrawal as failed
      withdrawal.status = 'failed';
      withdrawal.failureReason = error.response?.data?.message || error.message;
      withdrawal.paymentResponse = JSON.stringify(error.response?.data || {});
      await withdrawal.save({ session });
      
      // Rollback the withdrawal flag
      await WeeklyProfit.findByIdAndUpdate(
        weeklyProfitId,
        { 
          $set: { 
            isWithdrawn: false,
            withdrawnAt: null,
            withdrawalId: null
          }
        },
        { session }
      );
      
      await session.abortTransaction();
      
      return res.status(500).json({
        success: false,
        message: 'Failed to initiate transfer',
        error: error.response?.data?.message || error.message
      });
    }
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

// =====================================================
// Check transfer status
// =====================================================
router.get('/transfer-status/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const withdrawal = await AdminWithdrawal.findById(req.params.id)
      .populate('weeklyProfitId');
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }
    
    // If already completed or failed, return current status
    if (withdrawal.status === 'completed' || withdrawal.status === 'failed') {
      return res.json({
        success: true,
        withdrawal
      });
    }
    
    // Check status with Paystack
    if (withdrawal.paymentId) {
      try {
        const response = await paystackClient.get(`/transfer/${withdrawal.paymentId}`);
        
        if (response.data.status) {
          const transferData = response.data.data;
          
          // Update withdrawal status based on transfer status
          if (transferData.status === 'success') {
            withdrawal.status = 'completed';
            withdrawal.completedAt = new Date();
            withdrawal.paymentStatus = 'success';
          } else if (transferData.status === 'failed' || transferData.status === 'reversed') {
            withdrawal.status = 'failed';
            withdrawal.failureReason = transferData.complete_message || 'Transfer failed';
            withdrawal.paymentStatus = transferData.status;
            
            // Reverse the weekly profit withdrawal
            const weeklyProfit = await WeeklyProfit.findById(withdrawal.weeklyProfitId);
            if (weeklyProfit) {
              weeklyProfit.isWithdrawn = false;
              weeklyProfit.withdrawalId = null;
              weeklyProfit.withdrawnAt = null;
              await weeklyProfit.save();
            }
          } else {
            withdrawal.paymentStatus = transferData.status;
          }
          
          withdrawal.paymentResponse = JSON.stringify(transferData);
          await withdrawal.save();
        }
      } catch (error) {
        console.error('Error checking transfer status:', error.response?.data || error.message);
      }
    }
    
    res.json({
      success: true,
      withdrawal
    });
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check transfer status',
      error: error.message
    });
  }
});

// =====================================================
// Get withdrawal history
// =====================================================
router.get('/history', auth, authorize('admin'), async (req, res) => {
  try {
    const withdrawals = await AdminWithdrawal.find()
      .populate('weeklyProfitId')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Parse bank details for display
    const formattedWithdrawals = withdrawals.map(w => {
      let bankInfo = {};
      try {
        bankInfo = JSON.parse(w.bankDetails);
      } catch (e) {
        bankInfo = { accountName: w.bankDetails };
      }
      
      return {
        ...w.toObject(),
        bankInfo
      };
    });
    
    res.json({
      success: true,
      withdrawals: formattedWithdrawals
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get withdrawal history'
    });
  }
});

// =====================================================
// Get statistics
// =====================================================
router.get('/statistics', auth, authorize('admin'), async (req, res) => {
  try {
    const [pending, processing, completed, failed] = await Promise.all([
      AdminWithdrawal.countDocuments({ status: 'pending' }),
      AdminWithdrawal.countDocuments({ status: 'processing' }),
      AdminWithdrawal.countDocuments({ status: 'completed' }),
      AdminWithdrawal.countDocuments({ status: 'failed' })
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
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      statistics: {
        pending,
        processing,
        completed,
        failed,
        yearlyTotal: yearlyWithdrawals[0]?.totalAmount || 0,
        yearlyCount: yearlyWithdrawals[0]?.count || 0
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

// =====================================================
// Paystack webhook handler
// =====================================================
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      console.log('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.body;
    console.log('Webhook received:', event.event);
    
    // Handle transfer events
    if (event.event === 'transfer.success') {
      const transferData = event.data;
      
      // Find withdrawal by reference or transfer code
      const withdrawal = await AdminWithdrawal.findOne({
        $or: [
          { paymentReference: transferData.reference },
          { paymentId: transferData.transfer_code }
        ]
      });
      
      if (withdrawal && withdrawal.status !== 'completed') {
        withdrawal.status = 'completed';
        withdrawal.completedAt = new Date();
        withdrawal.paymentStatus = 'success';
        withdrawal.paymentResponse = JSON.stringify(transferData);
        await withdrawal.save();
        
        console.log('Withdrawal marked as completed via webhook:', withdrawal._id);
      }
      
    } else if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      const transferData = event.data;
      
      // Find withdrawal
      const withdrawal = await AdminWithdrawal.findOne({
        $or: [
          { paymentReference: transferData.reference },
          { paymentId: transferData.transfer_code }
        ]
      });
      
      if (withdrawal) {
        withdrawal.status = 'failed';
        withdrawal.failureReason = transferData.complete_message || 'Transfer failed';
        withdrawal.paymentStatus = event.event === 'transfer.failed' ? 'failed' : 'reversed';
        withdrawal.paymentResponse = JSON.stringify(transferData);
        await withdrawal.save();
        
        // Reverse the weekly profit withdrawal
        const weeklyProfit = await WeeklyProfit.findById(withdrawal.weeklyProfitId);
        if (weeklyProfit && weeklyProfit.isWithdrawn) {
          weeklyProfit.isWithdrawn = false;
          weeklyProfit.withdrawalId = null;
          weeklyProfit.withdrawnAt = null;
          await weeklyProfit.save();
          
          console.log('Weekly profit withdrawal reversed:', weeklyProfit._id);
        }
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// =====================================================
// Retry failed withdrawal
// =====================================================
router.post('/retry/:id', auth, authorize('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const withdrawal = await AdminWithdrawal.findById(req.params.id).session(session);
    
    if (!withdrawal) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }
    
    if (withdrawal.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Withdrawal already completed'
      });
    }
    
    // Parse bank details
    let bankInfo = {};
    try {
      bankInfo = JSON.parse(withdrawal.bankDetails);
    } catch (e) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid bank details format'
      });
    }
    
    // Check and update weekly profit status
    const weeklyProfit = await WeeklyProfit.findOneAndUpdate(
      {
        _id: withdrawal.weeklyProfitId,
        isWithdrawn: false
      },
      {
        $set: {
          isWithdrawn: true,
          withdrawnAt: new Date(),
          withdrawalId: withdrawal._id
        }
      },
      { session, new: true }
    );
    
    if (!weeklyProfit) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Weekly profit is already withdrawn or not found'
      });
    }
    
    // Generate new reference for retry
    const newReference = generateReference();
    
    // Retry the transfer
    const transferData = {
      source: 'balance',
      amount: Math.round(withdrawal.amount * 100),
      recipient: bankInfo.recipientCode,
      reason: withdrawal.notes,
      reference: newReference
    };
    
    try {
      const transferResponse = await paystackClient.post('/transfer', transferData);
      
      if (transferResponse.data.status) {
        const transferInfo = transferResponse.data.data;
        
        withdrawal.paymentReference = newReference;
        withdrawal.paymentId = transferInfo.transfer_code;
        withdrawal.paymentStatus = transferInfo.status;
        withdrawal.paymentResponse = JSON.stringify(transferInfo);
        withdrawal.status = transferInfo.status === 'success' ? 'completed' : 'processing';
        
        if (transferInfo.status === 'success') {
          withdrawal.completedAt = new Date();
        }
        
        await withdrawal.save({ session });
        await session.commitTransaction();
        
        res.json({
          success: true,
          message: 'Transfer retry initiated',
          withdrawal
        });
      } else {
        throw new Error('Transfer retry failed');
      }
    } catch (error) {
      withdrawal.status = 'failed';
      withdrawal.failureReason = error.response?.data?.message || error.message;
      await withdrawal.save({ session });
      
      // Rollback weekly profit status
      await WeeklyProfit.findByIdAndUpdate(
        withdrawal.weeklyProfitId,
        {
          $set: {
            isWithdrawn: false,
            withdrawnAt: null,
            withdrawalId: null
          }
        },
        { session }
      );
      
      await session.abortTransaction();
      
      res.status(500).json({
        success: false,
        message: 'Failed to retry transfer',
        error: error.response?.data?.message || error.message
      });
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('Error retrying withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry withdrawal',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

// =====================================================
// Debug route - Get all weeks with detailed info
// =====================================================
router.get('/debug-weeks', auth, authorize('admin'), async (req, res) => {
  try {
    const allWeeks = await WeeklyProfit.find()
      .sort({ weekStartDate: -1 })
      .limit(20);
    
    const debugData = allWeeks.map(week => ({
      weekNumber: week.weekNumber,
      year: week.year,
      startDate: week.weekStartDate,
      endDate: week.weekEndDate,
      totalProfit: week.totalProfit,
      isWithdrawn: week.isWithdrawn,
      isComplete: isWeekComplete(week.weekEndDate),
      isCurrent: isCurrentWeek(week.weekStartDate, week.weekEndDate),
      canWithdraw: !week.isWithdrawn && isWeekComplete(week.weekEndDate) && week.totalProfit >= 10
    }));
    
    res.json({
      success: true,
      currentDate: new Date(),
      weeks: debugData
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get debug data',
      error: error.message 
    });
  }
});

module.exports = router;