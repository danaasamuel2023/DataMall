const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const { DataOrder, User, Transaction } = require('../schema/schema');
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

// Setup logging
const logDirectory = path.join(__dirname, '../logs');
// Create logs directory if it doesn't exist
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

// Helper function to map network types to DataMart format
const mapNetworkToDatamart = (networkType) => {
  const network = networkType.toUpperCase();
  
  const networkMap = {
    'TELECEL': 'TELECEL',
    'MTN': 'YELLO',
    'YELLO': 'YELLO',
    'AIRTEL': 'at',
    'AT': 'at',
    'AIRTELTIGO': 'at'
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

// Process data order using DataMart API
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

    // Create a new data order
    const newOrder = new DataOrder({
      userId,
      phoneNumber,
      network,
      dataAmount,
      price,
      reference: orderReference,
      status: 'pending',
      createdAt: new Date()
    });

    // Save the order
    const savedOrder = await newOrder.save();
    logDatamartApiInteraction('ORDER_CREATED', orderReference, { 
      orderId: savedOrder._id,
      orderDetails: {
        userId,
        phoneNumber,
        network,
        dataAmount,
        price,
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
        capacity: dataAmount.toString(), // DataMart expects capacity as string
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

        logDatamartApiInteraction('ORDER_COMPLETED', orderReference, {
          orderId: savedOrder._id,
          purchaseId: response.data.data?.purchaseId
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
            purchaseId: response.data.data?.purchaseId
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

// Check order status using DataMart API
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

// Get all orders for a specific user
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

// Get available data packages from DataMart
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

// AFA Registration route (keeping the same logic as before)
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

    // Deduct price from user wallet
    user.walletBalance -= price;
    await user.save();

    // Create a new order
    const newOrder = new DataOrder({
      userId,
      phoneNumber,
      network: 'afa-registration',
      dataAmount: randomCapacity,
      price,
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
    logDatamartApiInteraction('AFA_REGISTRATION_CREATED', orderReference, { orderId: savedOrder._id });

    // Update order status to completed (AFA is processed internally)
    savedOrder.status = 'completed';
    savedOrder.completedAt = new Date();
    await savedOrder.save();
    
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
        fullName
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

// Check DataMart agent balance
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

module.exports = router;