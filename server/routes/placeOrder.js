// routes/datamart-routes.js
// COMPLETE DataMart routes with integrated profit tracking and WEEKLY PROFIT TRACKING

const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const { 
  DataOrder, 
  User, 
  Transaction, 
  ProviderPricing, 
  ProfitAnalytics,
  WeeklyProfit  // ADDED THIS IMPORT
} = require('../schema/schema');
const fs = require('fs');
const path = require('path');

dotenv.config();

const router = express.Router();

// DataMart API Configuration
const DATAMART_BASE_URL = 'https://datamartbackened.onrender.com';
const DATAMART_API_KEY = process.env.DATAMART_API_KEY || 'f9329bb51dd27c41fe3b85c7eb916a8e88821e07fd0565e1ff2558e7be3be7b4';

// Create DataMart client
const datamartClient = axios.create({
  baseURL: DATAMART_BASE_URL,
  headers: {
    'x-api-key': DATAMART_API_KEY,
    'Content-Type': 'application/json'
  }
});

// PROFIT CONFIGURATION - Adjust these based on your actual costs
const PROFIT_CONFIG = {
  mtn: {
    '1': { cost: 4.50, sell: 4.70 },
    '2': { cost: 8.90, sell: 9.40 },
    '3': { cost: 12.99, sell: 13.70 },
    '4': { cost: 18.00, sell: 18.70 },
    '5': { cost: 22.75, sell: 23.70 },
    '6': { cost: 26.00, sell: 27.20 },
    '8': { cost: 34.50, sell: 35.70 },
    '10': { cost: 41.50, sell: 43.70 },
    '15': { cost: 62.00, sell: 62.70 },
    '20': { cost: 80.00, sell: 83.20 },
    '25': { cost: 105.00, sell: 105.20 },
    '30': { cost: 120.00, sell: 129.20 },
    '40': { cost: 165.00, sell: 166.20 },
    '50': { cost: 198.00, sell: 207.20 },
    '100': { cost: 406.00, sell: 407.20 }
  },
  telecel: {
    '1': { cost: 4.50, sell: 5.00 },
    '2': { cost: 9.00, sell: 10.00 },
    '3': { cost: 13.50, sell: 15.00 },
    '5': { cost: 22.50, sell: 25.00 },
    '10': { cost: 45.00, sell: 50.00 },
    '15': { cost: 67.50, sell: 75.00 },
    '20': { cost: 90.00, sell: 100.00 },
    '30': { cost: 135.00, sell: 150.00 },
    '50': { cost: 225.00, sell: 250.00 }
  },
  at: {
    '1': { cost: 4.50, sell: 5.00 },
    '2': { cost: 9.00, sell: 10.00 },
    '3': { cost: 13.50, sell: 15.00 },
    '5': { cost: 22.50, sell: 25.00 },
    '10': { cost: 45.00, sell: 50.00 },
    '15': { cost: 67.50, sell: 75.00 },
    '20': { cost: 90.00, sell: 100.00 },
    '30': { cost: 135.00, sell: 150.00 }
  },
  tigo: {
    '1': { cost: 4.50, sell: 5.00 },
    '2': { cost: 9.00, sell: 10.00 },
    '3': { cost: 13.50, sell: 15.00 },
    '5': { cost: 22.50, sell: 25.00 },
    '10': { cost: 45.00, sell: 50.00 }
  },
  airtel: {
    '1': { cost: 4.50, sell: 5.00 },
    '2': { cost: 9.00, sell: 10.00 },
    '3': { cost: 13.50, sell: 15.00 },
    '5': { cost: 22.50, sell: 25.00 },
    '10': { cost: 45.00, sell: 50.00 }
  }
};

// Setup logging
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Logger function for DataMart API interactions
const logDatamartApiInteraction = (type, reference, data) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    reference,
    data
  };
  
  const logFilePath = path.join(logDirectory, `datamart-api-${new Date().toISOString().split('T')[0]}.log`);
  
  fs.appendFile(
    logFilePath,
    JSON.stringify(logEntry) + '\n',
    (err) => {
      if (err) console.error('Error writing to log file:', err);
    }
  );
  
  // Also log to console for immediate visibility
  console.log(`[DATAMART API ${type}] [${timestamp}] [Ref: ${reference}]`, JSON.stringify(data));
};

// Helper function to calculate profit for an order
function calculateProfit(network, dataAmount, price) {
  const networkLower = network.toLowerCase();
  const capacityStr = dataAmount.toString();
  
  // Handle network variations
  let configNetwork = networkLower;
  if (networkLower === 'tigo' || networkLower === 'airtel' || networkLower === 'airteltigo') {
    configNetwork = 'at';
  }
  
  // Get pricing config for this network and capacity
  const networkConfig = PROFIT_CONFIG[configNetwork];
  if (!networkConfig) {
    // Default 15% margin if network not configured
    return {
      providerCost: price * 0.85,
      profit: price * 0.15,
      profitMargin: 15
    };
  }
  
  const packageConfig = networkConfig[capacityStr];
  if (!packageConfig) {
    // Default 15% margin if package not configured
    return {
      providerCost: price * 0.85,
      profit: price * 0.15,
      profitMargin: 15
    };
  }
  
  // Use actual configured costs
  const providerCost = packageConfig.cost;
  const profit = price - providerCost;
  const profitMargin = (profit / price) * 100;
  
  return {
    providerCost,
    profit,
    profitMargin
  };
}

// NEW HELPER FUNCTION: Update weekly profit
async function updateWeeklyProfit(order) {
  try {
    const orderDate = new Date(order.createdAt || new Date());
    
    // Calculate week start (Monday) and end (Sunday)
    const dayOfWeek = orderDate.getDay();
    const diff = orderDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    
    const weekStart = new Date(orderDate);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Calculate week number
    const startOfYear = new Date(weekStart.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((weekStart - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
    
    console.log(`Updating weekly profit for week ${weekNumber} of ${weekStart.getFullYear()}`);
    console.log(`Week range: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
    console.log(`Order profit: GHS ${order.profit}`);
    
    // Find or create weekly profit record
    let weeklyProfit = await WeeklyProfit.findOne({
      weekStartDate: weekStart,
      weekEndDate: weekEnd
    });
    
    if (weeklyProfit) {
      // Update existing record
      weeklyProfit.totalOrders += 1;
      weeklyProfit.totalRevenue += order.price || 0;
      weeklyProfit.totalCost += order.providerCost || 0;
      weeklyProfit.totalProfit += order.profit || 0;
      await weeklyProfit.save();
      
      console.log(`Updated weekly profit - New totals: Orders: ${weeklyProfit.totalOrders}, Profit: GHS ${weeklyProfit.totalProfit}`);
    } else {
      // Create new record
      weeklyProfit = await WeeklyProfit.create({
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber: weekNumber,
        year: weekStart.getFullYear(),
        totalOrders: 1,
        totalRevenue: order.price || 0,
        totalCost: order.providerCost || 0,
        totalProfit: order.profit || 0,
        isWithdrawn: false
      });
      
      console.log(`Created new weekly profit record - Week ${weekNumber}, Profit: GHS ${order.profit}`);
    }
    
    return weeklyProfit;
  } catch (error) {
    console.error('Error updating weekly profit:', error);
    // Don't throw - weekly profit failure shouldn't stop the order
  }
}

// UPDATED HELPER FUNCTION: Update daily analytics (now includes weekly profit update)
async function updateDailyAnalytics(order) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const networkLower = order.network.toLowerCase();
    
    // Find or create today's analytics entry
    let analytics = await ProfitAnalytics.findOne({
      date: today,
      network: networkLower
    });
    
    if (analytics) {
      // Update existing entry
      analytics.totalOrders += 1;
      analytics.totalRevenue += order.price;
      analytics.totalCost += order.providerCost || 0;
      analytics.totalProfit += order.profit || 0;
      analytics.averageProfitMargin = analytics.totalRevenue > 0 
        ? (analytics.totalProfit / analytics.totalRevenue) * 100 
        : 0;
      
      // Update capacity breakdown
      const capacityIndex = analytics.ordersByCapacity.findIndex(
        item => item.capacity === order.dataAmount.toString()
      );
      
      if (capacityIndex > -1) {
        analytics.ordersByCapacity[capacityIndex].count += 1;
        analytics.ordersByCapacity[capacityIndex].revenue += order.price;
        analytics.ordersByCapacity[capacityIndex].cost += order.providerCost || 0;
        analytics.ordersByCapacity[capacityIndex].profit += order.profit || 0;
      } else {
        analytics.ordersByCapacity.push({
          capacity: order.dataAmount.toString(),
          count: 1,
          revenue: order.price,
          cost: order.providerCost || 0,
          profit: order.profit || 0
        });
      }
      
      await analytics.save();
    } else {
      // Create new analytics entry
      await ProfitAnalytics.create({
        date: today,
        network: networkLower,
        totalOrders: 1,
        totalRevenue: order.price,
        totalCost: order.providerCost || 0,
        totalProfit: order.profit || 0,
        averageProfitMargin: order.profit ? (order.profit / order.price) * 100 : 0,
        ordersByCapacity: [{
          capacity: order.dataAmount.toString(),
          count: 1,
          revenue: order.price,
          cost: order.providerCost || 0,
          profit: order.profit || 0
        }]
      });
    }
    
    console.log(`Analytics updated for ${networkLower} - ${order.dataAmount}GB - Profit: GHS ${order.profit}`);
    
    // ALSO UPDATE WEEKLY PROFIT
    await updateWeeklyProfit(order);
    
  } catch (error) {
    console.error('Error updating analytics:', error);
    // Don't throw - analytics failure shouldn't stop the order
  }
}

// Helper function to map network types to DataMart format
const mapNetworkToDatamart = (networkType) => {
  const network = networkType.toUpperCase();
  
  const networkMap = {
    'TELECEL': 'TELECEL',
    'MTN': 'YELLO',
    'YELLO': 'YELLO',
    'AIRTEL': 'at',
    'AT': 'at',
    'AIRTELTIGO': 'at',
    'TIGO': 'at'
  };
  
  return networkMap[network] || network.toLowerCase();
};

// Generate unique reference starting with DN
const generateDNReference = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomChars = '';
  for (let i = 0; i < 4; i++) {
    randomChars += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `DN${randomChars}`;
};

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// =====================================================
// MAIN ROUTE: Process data order with profit tracking
// =====================================================
router.post('/process-data-order', authenticateUser, async (req, res) => {
  try {
    const { userId, phoneNumber, network, dataAmount, price, reference } = req.body;
    
    // Generate reference if not provided
    const orderReference = reference || generateDNReference();
    
    // Log the incoming request
    logDatamartApiInteraction('REQUEST_RECEIVED', orderReference, {
      ...req.body,
      dataAmountType: typeof dataAmount,
      priceType: typeof price
    });
    
    // Validate required fields
    if (!userId || !phoneNumber || !network || !dataAmount || !price) {
      logDatamartApiInteraction('VALIDATION_ERROR', orderReference, {
        missingFields: {
          userId: !userId,
          phoneNumber: !phoneNumber,
          network: !network,
          dataAmount: !dataAmount,
          price: !price
        }
      });
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Fetch user from database
    const user = await User.findById(userId);
    if (!user) {
      logDatamartApiInteraction('USER_NOT_FOUND', orderReference, { userId });
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user has enough balance
    if (user.walletBalance < price) {
      logDatamartApiInteraction('INSUFFICIENT_BALANCE', orderReference, { 
        walletBalance: user.walletBalance, 
        requiredAmount: price 
      });
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    // ========== CALCULATE PROFIT FOR THIS ORDER ==========
    const profitData = calculateProfit(network, dataAmount, price);
    
    logDatamartApiInteraction('PROFIT_CALCULATED', orderReference, {
      network,
      dataAmount,
      price,
      ...profitData
    });

    // Log wallet balance before deduction
    logDatamartApiInteraction('WALLET_BEFORE_DEDUCTION', orderReference, { 
      userId, 
      walletBalanceBefore: user.walletBalance 
    });

    // Deduct price from user wallet
    user.walletBalance -= price;
    await user.save();

    // Log wallet balance after deduction
    logDatamartApiInteraction('WALLET_AFTER_DEDUCTION', orderReference, { 
      userId, 
      walletBalanceAfter: user.walletBalance 
    });

    // ========== CREATE ORDER WITH PROFIT FIELDS ==========
    const newOrder = new DataOrder({
      userId,
      phoneNumber,
      network,
      dataAmount,
      price,
      providerCost: profitData.providerCost,
      profit: profitData.profit,
      profitMargin: profitData.profitMargin,
      reference: orderReference,
      status: 'pending',
      createdAt: new Date()
    });

    // Save the order
    const savedOrder = await newOrder.save();
    
    logDatamartApiInteraction('ORDER_CREATED_WITH_PROFIT', orderReference, { 
      orderId: savedOrder._id,
      orderDetails: {
        userId,
        phoneNumber,
        network,
        dataAmount,
        price,
        profit: savedOrder.profit,
        profitMargin: savedOrder.profitMargin,
        status: 'pending'
      }
    });

    // Map network to DataMart format
    const datamartNetwork = mapNetworkToDatamart(network);
    
    try {
      // Update order to processing
      savedOrder.status = 'processing';
      await savedOrder.save();
      
      logDatamartApiInteraction('ORDER_STATUS_UPDATED', orderReference, {
        orderId: savedOrder._id,
        newStatus: 'processing'
      });

      // Prepare DataMart API payload
      const payload = {
        phoneNumber: phoneNumber,
        network: datamartNetwork,
        capacity: dataAmount.toString(),
        gateway: 'wallet',
        ref: orderReference
      };

      // Log the API request details
      logDatamartApiInteraction('DATAMART_API_REQUEST', orderReference, {
        url: '/api/developer/purchase',
        payload
      });

      // Call DataMart API
      const response = await datamartClient.post('/api/developer/purchase', payload);

      // Log the API response
      logDatamartApiInteraction('DATAMART_API_RESPONSE', orderReference, {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      // If API returns success
      if (response.data && response.data.status === 'success') {
        savedOrder.status = 'completed';
        savedOrder.transactionId = response.data.data?.purchaseId || null;
        savedOrder.completedAt = new Date();
        savedOrder.apiResponse = response.data;
        await savedOrder.save();

        // ========== UPDATE DAILY ANALYTICS AND WEEKLY PROFIT ==========
        await updateDailyAnalytics(savedOrder);

        logDatamartApiInteraction('ORDER_COMPLETED_WITH_PROFIT', orderReference, {
          orderId: savedOrder._id,
          purchaseId: response.data.data?.purchaseId,
          profit: savedOrder.profit,
          analyticsUpdated: true,
          weeklyProfitUpdated: true
        });

        // Create a transaction record
        const transaction = new Transaction({
          userId,
          type: 'purchase',
          amount: price,
          description: `${dataAmount}GB ${network} Data Bundle`,
          reference: orderReference,
          status: 'completed',
          balanceAfter: user.walletBalance,
          metadata: {
            orderType: 'data-bundle',
            phoneNumber,
            dataAmount,
            network,
            purchaseId: response.data.data?.purchaseId,
            profit: savedOrder.profit,
            profitMargin: savedOrder.profitMargin
          }
        });
        
        await transaction.save();

        return res.json({
          success: true,
          message: 'Data bundle purchased successfully',
          orderId: savedOrder._id,
          reference: savedOrder.reference,
          purchaseId: response.data.data?.purchaseId
        });
      } else {
        // Handle non-success response
        throw new Error(response.data?.message || 'Transaction failed with DataMart');
      }

    } catch (error) {
      // Log the error
      logDatamartApiInteraction('DATAMART_API_ERROR', orderReference, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Refund user
      user.walletBalance += price;
      await user.save();

      logDatamartApiInteraction('WALLET_REFUNDED', orderReference, {
        userId,
        refundAmount: price,
        newBalance: user.walletBalance
      });

      savedOrder.status = 'failed';
      savedOrder.failureReason = error.response?.data?.message || error.message || 'API request failed';
      await savedOrder.save();

      logDatamartApiInteraction('ORDER_FAILED', orderReference, {
        orderId: savedOrder._id,
        failureReason: savedOrder.failureReason
      });

      return res.status(500).json({ 
        success: false, 
        error: 'Transaction failed', 
        details: error.response?.data?.message || error.message 
      });
    }
    
  } catch (error) {
    // Log unhandled errors
    logDatamartApiInteraction('UNHANDLED_ERROR', req.body?.reference || 'unknown', {
      message: error.message,
      stack: error.stack
    });
    
    console.error('Error processing data order:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process data order',
      details: error.message 
    });
  }
});

// =====================================================
// AFA Registration route with profit tracking
// =====================================================
router.post('/process-afa-registration', authenticateUser, async (req, res) => {
  try {
    const { 
      userId, 
      phoneNumber, 
      price, 
      reference,
      fullName,
      idType,
      idNumber,
      dateOfBirth,
      occupation,
      location
    } = req.body;
    
    // Generate reference if not provided
    const orderReference = reference || generateDNReference();
    
    // Log the incoming request
    logDatamartApiInteraction('AFA_REGISTRATION_REQUEST', orderReference, req.body);
    
    // Validate required fields
    if (!userId || !phoneNumber || !price || !fullName || !idType || !idNumber || !dateOfBirth || !occupation || !location) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Fetch user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user has enough balance
    if (user.walletBalance < price) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    // Generate random capacity value between 10 and 50
    const randomCapacity = Math.floor(Math.random() * 41) + 10;

    // Calculate profit for AFA registration (use higher margin for AFA)
    const profitData = {
      providerCost: price * 0.7,  // 30% margin for AFA
      profit: price * 0.3,
      profitMargin: 30
    };

    // Deduct price from user wallet
    user.walletBalance -= price;
    await user.save();

    // Create a new order with profit
    const newOrder = new DataOrder({
      userId,
      phoneNumber,
      network: 'afa-registration',
      dataAmount: randomCapacity,
      price,
      providerCost: profitData.providerCost,
      profit: profitData.profit,
      profitMargin: profitData.profitMargin,
      reference: orderReference,
      status: 'pending',
      createdAt: new Date(),
      // Add AFA specific fields
      fullName,
      idType,
      idNumber,
      dateOfBirth: new Date(dateOfBirth),
      occupation,
      location
    });

    // Save the order
    const savedOrder = await newOrder.save();
    logDatamartApiInteraction('AFA_REGISTRATION_CREATED', orderReference, { 
      orderId: savedOrder._id,
      profit: savedOrder.profit 
    });

    // Update order status to completed (AFA is processed internally)
    savedOrder.status = 'completed';
    savedOrder.completedAt = new Date();
    await savedOrder.save();
    
    // UPDATE ANALYTICS AND WEEKLY PROFIT FOR AFA
    await updateDailyAnalytics(savedOrder);
    
    // Create a transaction record
    const transaction = new Transaction({
      userId,
      type: 'purchase',
      amount: price,
      description: 'AFA Registration',
      reference: orderReference,
      status: 'completed',
      balanceAfter: user.walletBalance,
      metadata: {
        orderType: 'afa-registration',
        capacity: randomCapacity,
        fullName,
        profit: savedOrder.profit,
        profitMargin: savedOrder.profitMargin
      }
    });
    
    await transaction.save();
    logDatamartApiInteraction('AFA_REGISTRATION_TRANSACTION', orderReference, { 
      transactionId: transaction._id 
    });

    return res.json({
      success: true,
      message: 'AFA Registration completed successfully',
      orderId: savedOrder._id,
      reference: savedOrder.reference,
      capacity: randomCapacity
    });
    
  } catch (error) {
    console.error('Error processing AFA registration:', error);
    
    logDatamartApiInteraction('AFA_REGISTRATION_ERROR', req.body?.reference || 'unknown', {
      error: error.message
    });
    
    // Try to refund if error occurred after deduction
    if (req.body?.userId && req.body?.price) {
      try {
        const user = await User.findById(req.body.userId);
        if (user) {
          user.walletBalance += req.body.price;
          await user.save();
          logDatamartApiInteraction('AFA_REGISTRATION_REFUND', req.body.reference || 'unknown', {
            userId: req.body.userId,
            amount: req.body.price
          });
        }
      } catch (refundError) {
        console.error('Failed to refund user after AFA registration error:', refundError);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to process AFA registration'
    });
  }
});

// =====================================================
// Check order status using DataMart API
// =====================================================
router.get('/order-status/:reference', authenticateUser, async (req, res) => {
  try {
    const { reference } = req.params;
    
    logDatamartApiInteraction('STATUS_CHECK_REQUEST', reference, { requestParams: req.params });
    
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Missing reference' });
    }
    
    const order = await DataOrder.findOne({ reference });
    
    if (!order) {
      logDatamartApiInteraction('STATUS_CHECK_FAILED', reference, { error: 'Order not found' });
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // If order has a DataMart purchase ID, check status with DataMart
    if (order.transactionId && order.status === 'processing') {
      try {
        const response = await datamartClient.get(`/api/purchase-status/${order.transactionId}`);
        
        if (response.data.status === 'completed' && order.status !== 'completed') {
          order.status = 'completed';
          order.completedAt = new Date();
          await order.save();
          
          // Update analytics and weekly profit when order completes
          await updateDailyAnalytics(order);
          
          logDatamartApiInteraction('ORDER_STATUS_UPDATED_FROM_DATAMART', reference, {
            orderId: order._id,
            newStatus: 'completed'
          });
        }
      } catch (datamartError) {
        logDatamartApiInteraction('DATAMART_STATUS_CHECK_ERROR', reference, {
          error: datamartError.message
        });
      }
    }
    
    logDatamartApiInteraction('STATUS_CHECK_RESPONSE', reference, { 
      orderId: order._id,
      status: order.status 
    });
    
    return res.json({
      success: true,
      order: {
        id: order._id,
        reference: order.reference,
        status: order.status,
        phoneNumber: order.phoneNumber,
        network: order.network,
        dataAmount: order.dataAmount,
        price: order.price,
        profit: order.profit,
        profitMargin: order.profitMargin,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        failureReason: order.failureReason || null
      }
    });
  } catch (error) {
    console.error('Error checking order status:', error);
    
    logDatamartApiInteraction('STATUS_CHECK_ERROR', req.params.reference || 'unknown', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to check order status'
    });
  }
});

// =====================================================
// Get all orders for a specific user
// =====================================================
router.get('/user-orders/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;
    
    logDatamartApiInteraction('USER_ORDERS_REQUEST', 'N/A', { userId });
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    const orders = await DataOrder.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v -apiResponse');
    
    logDatamartApiInteraction('USER_ORDERS_RESPONSE', 'N/A', { 
      userId,
      orderCount: orders.length 
    });
    
    return res.json({
      success: true,
      orders: orders.map(order => {
        const orderData = {
          id: order._id,
          reference: order.reference,
          status: order.status,
          phoneNumber: order.phoneNumber,
          network: order.network,
          dataAmount: order.dataAmount,
          price: order.price,
          profit: order.profit,
          profitMargin: order.profitMargin,
          createdAt: order.createdAt,
          completedAt: order.completedAt || null,
          failureReason: order.failureReason || null
        };
        
        // Add AFA-specific fields if this is an AFA registration
        if (order.network === 'afa-registration') {
          orderData.fullName = order.fullName;
          orderData.idType = order.idType;
          orderData.idNumber = order.idNumber;
          orderData.dateOfBirth = order.dateOfBirth;
          orderData.occupation = order.occupation;
          orderData.location = order.location;
        }
        
        return orderData;
      })
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    
    logDatamartApiInteraction('USER_ORDERS_ERROR', 'N/A', {
      userId: req.params.userId,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user orders'
    });
  }
});

// =====================================================
// Get available data packages from DataMart
// =====================================================
router.get('/data-packages', async (req, res) => {
  try {
    const { network } = req.query;
    
    // Map to DataMart network code if provided
    const datamartNetwork = network ? mapNetworkToDatamart(network) : null;
    
    logDatamartApiInteraction('DATAMART_PACKAGES_REQUEST', 'N/A', {
      network: network,
      datamartNetwork: datamartNetwork
    });
    
    // Get packages from DataMart
    const response = await datamartClient.get('/api/data-packages', {
      params: datamartNetwork ? { network: datamartNetwork } : {}
    });
    
    logDatamartApiInteraction('DATAMART_PACKAGES_RESPONSE', 'N/A', {
      packagesCount: response.data.data ? response.data.data.length : 0
    });
    
    res.json({
      status: 'success',
      data: response.data.data
    });
  } catch (error) {
    logDatamartApiInteraction('DATAMART_PACKAGES_ERROR', 'N/A', {
      error: error.message,
      response: error.response?.data
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch data packages'
    });
  }
});

// =====================================================
// Check DataMart agent balance
// =====================================================
router.get('/agent-balance', authenticateUser, async (req, res) => {
  try {
    const response = await datamartClient.get('/api/agent-balance');
    
    logDatamartApiInteraction('AGENT_BALANCE_CHECK', 'N/A', {
      balance: response.data.data?.balance
    });
    
    res.json({
      status: 'success',
      data: {
        balance: response.data.data?.balance || 0
      }
    });
  } catch (error) {
    logDatamartApiInteraction('AGENT_BALANCE_ERROR', 'N/A', {
      error: error.message
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch agent balance'
    });
  }
});

// =====================================================
// NEW PROFIT ROUTES
// =====================================================

// Initialize profit configuration in database
router.post('/initialize-profit-config', authenticateUser, async (req, res) => {
  try {
    let initialized = 0;
    
    // Loop through all networks in PROFIT_CONFIG
    for (const [network, packages] of Object.entries(PROFIT_CONFIG)) {
      for (const [capacity, pricing] of Object.entries(packages)) {
        const profit = pricing.sell - pricing.cost;
        const profitMargin = (profit / pricing.sell) * 100;
        
        await ProviderPricing.findOneAndUpdate(
          { network, capacity },
          {
            network,
            capacity,
            mb: (parseInt(capacity) * 1000).toString(),
            providerPrice: pricing.cost,
            sellingPrice: pricing.sell,
            profit,
            profitMargin,
            isActive: true,
            updatedAt: new Date()
          },
          { upsert: true }
        );
        initialized++;
      }
    }
    
    // Also update existing orders with profit if they don't have it
    const ordersWithoutProfit = await DataOrder.find({
      status: 'completed',
      $or: [
        { profit: { $exists: false } },
        { profit: null },
        { profit: 0 }
      ]
    }).limit(500);
    
    let ordersUpdated = 0;
    for (const order of ordersWithoutProfit) {
      const profitData = calculateProfit(order.network, order.dataAmount, order.price);
      order.providerCost = profitData.providerCost;
      order.profit = profitData.profit;
      order.profitMargin = profitData.profitMargin;
      await order.save();
      
      // Update analytics and weekly profit for this order
      await updateDailyAnalytics(order);
      
      ordersUpdated++;
    }
    
    res.json({
      success: true,
      message: 'Profit configuration initialized',
      pricingEntriesCreated: initialized,
      existingOrdersUpdated: ordersUpdated
    });
  } catch (error) {
    console.error('Error initializing profit config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize profit configuration'
    });
  }
});

// NEW ROUTE: Recalculate weekly profits from historical data
router.post('/recalculate-weekly-profits', authenticateUser, async (req, res) => {
  try {
    const { weeks = 12 } = req.body;
    
    // Calculate start date (X weeks ago)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));
    startDate.setHours(0, 0, 0, 0);
    
    // Get all completed orders from start date
    const orders = await DataOrder.find({
      status: 'completed',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });
    
    console.log(`Found ${orders.length} completed orders to process`);
    
    // Clear existing weekly profits for this period
    await WeeklyProfit.deleteMany({
      weekStartDate: { $gte: startDate }
    });
    
    // Process each order
    let processedCount = 0;
    const weeklyTotals = {};
    
    for (const order of orders) {
      // Calculate profit if missing
      if (!order.profit && order.price) {
        const profitData = calculateProfit(order.network, order.dataAmount, order.price);
        order.providerCost = profitData.providerCost;
        order.profit = profitData.profit;
        order.profitMargin = profitData.profitMargin;
        await order.save();
      }
      
      // Update weekly profit
      await updateWeeklyProfit(order);
      processedCount++;
      
      // Track totals for response
      const orderDate = new Date(order.createdAt);
      const weekKey = `${orderDate.getFullYear()}-W${Math.ceil((orderDate.getDate() + orderDate.getDay()) / 7)}`;
      if (!weeklyTotals[weekKey]) {
        weeklyTotals[weekKey] = { orders: 0, profit: 0 };
      }
      weeklyTotals[weekKey].orders++;
      weeklyTotals[weekKey].profit += order.profit || 0;
    }
    
    // Get all weekly profits
    const weeklyProfits = await WeeklyProfit.find({
      weekStartDate: { $gte: startDate }
    }).sort({ weekStartDate: -1 });
    
    res.json({
      success: true,
      message: 'Weekly profits recalculated successfully',
      ordersProcessed: processedCount,
      weeksCreated: weeklyProfits.length,
      weeklyTotals,
      weeklyProfits: weeklyProfits.map(wp => ({
        week: `Week ${wp.weekNumber} ${wp.year}`,
        startDate: wp.weekStartDate,
        endDate: wp.weekEndDate,
        totalOrders: wp.totalOrders,
        totalRevenue: wp.totalRevenue,
        totalProfit: wp.totalProfit,
        isWithdrawn: wp.isWithdrawn
      }))
    });
  } catch (error) {
    console.error('Error recalculating weekly profits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate weekly profits',
      details: error.message
    });
  }
});

// NEW ROUTE: Get current week profit
router.get('/current-week-profit', authenticateUser, async (req, res) => {
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
    
    // Also get today's profit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayOrders = await DataOrder.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: '$price' },
          profit: { $sum: { $ifNull: ['$profit', 0] } }
        }
      }
    ]);
    
    res.json({
      success: true,
      currentWeek: currentWeek || {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        totalProfit: 0,
        totalOrders: 0,
        totalRevenue: 0,
        isWithdrawn: false
      },
      todayStats: todayOrders[0] || {
        orders: 0,
        revenue: 0,
        profit: 0
      }
    });
  } catch (error) {
    console.error('Error getting current week profit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current week profit'
    });
  }
});

// Get profit summary
router.get('/profit-summary', authenticateUser, async (req, res) => {
  try {
    const { days = 7, network } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    
    const matchQuery = {
      createdAt: { $gte: startDate },
      status: 'completed'
    };
    
    if (network) {
      matchQuery.network = { $regex: new RegExp(network, 'i') };
    }
    
    // Get summary from orders
    const summary = await DataOrder.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$price' },
          totalCost: { 
            $sum: { 
              $ifNull: ['$providerCost', { $multiply: ['$price', 0.85] }] 
            } 
          },
          totalProfit: { 
            $sum: { 
              $ifNull: ['$profit', { $multiply: ['$price', 0.15] }] 
            } 
          },
          avgProfitMargin: { 
            $avg: { 
              $ifNull: ['$profitMargin', 15] 
            } 
          }
        }
      }
    ]);
    
    // Get breakdown by network
    const networkBreakdown = await DataOrder.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $toLower: '$network' },
          orders: { $sum: 1 },
          revenue: { $sum: '$price' },
          profit: { 
            $sum: { 
              $ifNull: ['$profit', { $multiply: ['$price', 0.15] }] 
            } 
          }
        }
      },
      { $sort: { profit: -1 } }
    ]);
    
    // Get top packages
    const topPackages = await DataOrder.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            network: { $toLower: '$network' },
            capacity: '$dataAmount'
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$price' },
          profit: { 
            $sum: { 
              $ifNull: ['$profit', { $multiply: ['$price', 0.15] }] 
            } 
          }
        }
      },
      { $sort: { profit: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      period: `Last ${days} days`,
      summary: summary[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        avgProfitMargin: 0
      },
      networkBreakdown,
      topPackages
    });
  } catch (error) {
    console.error('Error getting profit summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profit summary'
    });
  }
});

// Get daily profit data for charts
router.get('/daily-profits', authenticateUser, async (req, res) => {
  try {
    const { days = 30, network } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    
    const matchQuery = {
      date: { $gte: startDate }
    };
    
    if (network) {
      matchQuery.network = network.toLowerCase();
    }
    
    // Get data from ProfitAnalytics
    const dailyData = await ProfitAnalytics.find(matchQuery)
      .sort({ date: 1 });
    
    // If no analytics data, aggregate from orders
    if (dailyData.length === 0) {
      const orderMatchQuery = {
        createdAt: { $gte: startDate },
        status: 'completed'
      };
      
      if (network) {
        orderMatchQuery.network = { $regex: new RegExp(network, 'i') };
      }
      
      const aggregatedData = await DataOrder.aggregate([
        { $match: orderMatchQuery },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$price' },
            profit: { 
              $sum: { 
                $ifNull: ['$profit', { $multiply: ['$price', 0.15] }] 
              } 
            }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);
      
      return res.json({
        success: true,
        data: aggregatedData.map(item => ({
          date: item._id.date,
          totalOrders: item.orders,
          totalRevenue: item.revenue,
          totalProfit: item.profit
        }))
      });
    }
    
    // Group by date if multiple networks
    const groupedData = {};
    dailyData.forEach(item => {
      const dateKey = item.date.toISOString().split('T')[0];
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          date: dateKey,
          totalOrders: 0,
          totalRevenue: 0,
          totalProfit: 0
        };
      }
      groupedData[dateKey].totalOrders += item.totalOrders || 0;
      groupedData[dateKey].totalRevenue += item.totalRevenue || 0;
      groupedData[dateKey].totalProfit += item.totalProfit || 0;
    });
    
    res.json({
      success: true,
      data: Object.values(groupedData)
    });
  } catch (error) {
    console.error('Error getting daily profits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily profit data'
    });
  }
});

module.exports = router;