const express = require('express');
const router = express.Router();
const { DataOrder, User, Transaction, NetworkAvailability } = require('../schema/schema');
const { auth, authorize } = require('../middleware/page');

// Error logging helper
const errorLogger = (error, route) => {
  console.error(`[${new Date().toISOString()}] Error in ${route}:`, {
    message: error.message,
    stack: error.stack
  });
};

// ====== ORDER MANAGEMENT ROUTES ======

// Get all orders (admin and agent)
// Get all orders with pagination
router.get('/orders', auth, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { phoneNumber: { $regex: search, $options: 'i' } },
        { '_id': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get orders with pagination
    const orders = await DataOrder.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalOrders = await DataOrder.countDocuments(filter);
    
    res.json({
      orders,
      pagination: {
        total: totalOrders,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalOrders / parseInt(limit))
      }
    });
  } catch (error) {
    errorLogger(error, 'Get All Orders');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get order by ID
router.get('/orders/:id', auth, authorize('admin', 'agent'), async (req, res) => {
  try {
    const order = await DataOrder.findById(req.params.id)
      .populate('userId', 'name email phoneNumber');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    errorLogger(error, 'Get Order by ID');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status
router.put('/orders/:id', auth, authorize('admin', 'agent'), async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const order = await DataOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update order
    order.status = status;
    await order.save();
    
    // If order failed, refund the user
    if (status === 'failed' && order.status !== 'failed') {
      const user = await User.findById(order.userId);
      if (user) {
        // Update wallet balance
        user.walletBalance += order.price;
        await user.save();
        
        // Create refund transaction
        const transaction = new Transaction({
          userId: order.userId,
          type: 'refund',
          amount: order.price,
          description: `Refund for failed order #${order._id}`,
          reference: `refund-${order._id}`,
          balanceAfter: user.walletBalance,
          metadata: { orderId: order._id }
        });
        await transaction.save();
      }
    }
    
    res.json({ message: 'Order updated successfully', order });
  } catch (error) {
    errorLogger(error, 'Update Order');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====== USER MANAGEMENT ROUTES ======

// Get all users with pagination and search (admin only)
router.get('/users', auth, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    
    // Build search query if search parameter exists
    const searchQuery = search 
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } }
          ]
        } 
      : {};
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get users with pagination
    const users = await User.find(searchQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);
    
    res.json({
      users,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (error) {
    errorLogger(error, 'Get All Users');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/users/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's orders
    const orders = await DataOrder.find({ userId: user._id }).sort({ createdAt: -1 });
    
    // Get user's transactions
    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 });
    
    res.json({
      user,
      orders,
      transactions
    });
  } catch (error) {
    errorLogger(error, 'Get User by ID');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user role
router.put('/users/:id/role', auth, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    // Validate role
    if (!['user', 'agent', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role value' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user role
    user.role = role;
    await user.save();
    
    res.json({ message: 'User role updated successfully', user: { 
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }});
  } catch (error) {
    errorLogger(error, 'Update User Role');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====== WALLET MANAGEMENT ROUTES ======

// Add money to user wallet (admin deposit)
router.post('/users/:id/deposit', auth, authorize('admin'), async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update wallet balance
    const oldBalance = user.walletBalance;
    user.walletBalance += Number(amount);
    await user.save();
    
    // Create deposit transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: Number(amount),
      description: description || `Admin deposit by ${req.user.email}`,
      reference: `admin-deposit-${Date.now()}`,
      balanceAfter: user.walletBalance,
      metadata: { 
        adminId: req.user.id,
        previousBalance: oldBalance
      }
    });
    await transaction.save();
    
    res.json({ 
      message: 'Deposit successful', 
      deposit: {
        amount,
        newBalance: user.walletBalance,
        transaction: transaction._id
      }
    });
  } catch (error) {
    errorLogger(error, 'Admin Deposit');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Credit multiple users at once (bulk deposit)
router.post('/bulk-credit', auth, authorize('admin'), async (req, res) => {
  try {
    const { userIds, amount, description } = req.body;
    
    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'No users selected for bulk credit' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    // Process each user
    const results = {
      successful: [],
      failed: []
    };
    
    for (const userId of userIds) {
      try {
        // Find user
        const user = await User.findById(userId);
        if (!user) {
          results.failed.push({ userId, reason: 'User not found' });
          continue;
        }
        
        // Update wallet balance
        const oldBalance = user.walletBalance;
        user.walletBalance += Number(amount);
        await user.save();
        
        // Create deposit transaction
        const transaction = new Transaction({
          userId: user._id,
          type: 'deposit',
          amount: Number(amount),
          description: description || `Bulk credit by ${req.user.email}`,
          reference: `bulk-deposit-${Date.now()}-${user._id}`,
          balanceAfter: user.walletBalance,
          metadata: { 
            adminId: req.user.id,
            previousBalance: oldBalance,
            bulkOperation: true
          }
        });
        await transaction.save();
        
        results.successful.push({
          userId,
          userName: user.name,
          userEmail: user.email,
          oldBalance,
          newBalance: user.walletBalance,
          transactionId: transaction._id
        });
        
      } catch (error) {
        results.failed.push({ userId, reason: error.message });
      }
    }
    
    res.json({
      message: 'Bulk credit operation completed',
      summary: {
        total: userIds.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      results
    });
    
  } catch (error) {
    errorLogger(error, 'Bulk Credit');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add this route to your existing router.js file

// Deduct money from user wallet (admin only)
router.post('/users/:id/deduct', auth, authorize('admin'), async (req, res) => {
  try {
    const { amount, description, reason } = req.body;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    // Validate description
    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has sufficient balance
    if (user.walletBalance < amount) {
      return res.status(400).json({ 
        message: 'Insufficient balance', 
        userBalance: user.walletBalance,
        deductAmount: amount
      });
    }
    
    // Update wallet balance
    const oldBalance = user.walletBalance;
    user.walletBalance -= Number(amount);
    await user.save();
    
    // Create deduction transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'deduction',
      amount: -Number(amount), // Negative amount to indicate deduction
      description: description,
      reference: `admin-deduct-${Date.now()}`,
      balanceAfter: user.walletBalance,
      metadata: { 
        adminId: req.user.id,
        previousBalance: oldBalance,
        reason: reason || 'Administrative deduction'
      }
    });
    await transaction.save();
    
    res.json({ 
      message: 'Amount deducted successfully', 
      deduction: {
        amount,
        newBalance: user.walletBalance,
        oldBalance,
        transaction: transaction._id
      }
    });
  } catch (error) {
    errorLogger(error, 'Admin Deduction');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk deduct from multiple users at once
router.post('/bulk-deduct', auth, authorize('admin'), async (req, res) => {
  try {
    const { userIds, amount, description, reason } = req.body;
    
    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'No users selected for bulk deduction' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }
    
    // Process each user
    const results = {
      successful: [],
      failed: []
    };
    
    for (const userId of userIds) {
      try {
        // Find user
        const user = await User.findById(userId);
        if (!user) {
          results.failed.push({ userId, reason: 'User not found' });
          continue;
        }
        
        // Check if user has sufficient balance
        if (user.walletBalance < amount) {
          results.failed.push({ 
            userId, 
            userName: user.name,
            userEmail: user.email,
            reason: 'Insufficient balance', 
            balance: user.walletBalance 
          });
          continue;
        }
        
        // Update wallet balance
        const oldBalance = user.walletBalance;
        user.walletBalance -= Number(amount);
        await user.save();
        
        // Create deduction transaction
        const transaction = new Transaction({
          userId: user._id,
          type: 'deduction',
          amount: -Number(amount), // Negative amount to indicate deduction
          description: description,
          reference: `bulk-deduct-${Date.now()}-${user._id}`,
          balanceAfter: user.walletBalance,
          metadata: { 
            adminId: req.user.id,
            previousBalance: oldBalance,
            reason: reason || 'Administrative deduction',
            bulkOperation: true
          }
        });
        await transaction.save();
        
        results.successful.push({
          userId,
          userName: user.name,
          userEmail: user.email,
          oldBalance,
          newBalance: user.walletBalance,
          transactionId: transaction._id
        });
        
      } catch (error) {
        results.failed.push({ userId, reason: error.message });
      }
    }
    
    res.json({
      message: 'Bulk deduction operation completed',
      summary: {
        total: userIds.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      results
    });
    
  } catch (error) {
    errorLogger(error, 'Bulk Deduction');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user transactions by type
router.get('/users/:id/transactions', auth, authorize('admin'), async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    
    // Build filter
    const filter = { userId: req.params.id };
    if (type && ['deposit', 'purchase', 'refund'].includes(type)) {
      filter.type = type;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get transactions
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalTransactions = await Transaction.countDocuments(filter);
    
    res.json({
      transactions,
      pagination: {
        total: totalTransactions,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalTransactions / parseInt(limit))
      }
    });
  } catch (error) {
    errorLogger(error, 'Get User Transactions');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Add these routes to your existing router.js file

// Import the NetworkAvailability model

// Initialize network availability - run this when your server starts
const initializeNetworkAvailability = async () => {
  try {
    const networks = ['mtn', 'tigo', 'telecel','afa-registration', 'at'];
    
    for (const network of networks) {
      // Check if entry exists
      const exists = await NetworkAvailability.findOne({ network });
      
      // If not, create it with default value (available)
      if (!exists) {
        await NetworkAvailability.create({
          network,
          available: true,
          updatedAt: new Date()
        });
        console.log(`Initialized availability for ${network}`);
      }
    }
  } catch (error) {
    console.error('Error initializing network availability:', error);
  }
};

// Call this when your server starts
initializeNetworkAvailability();

// Admin endpoint to toggle network availability
router.post('/toggle-network', async (req, res) => {
  try {
    const { network, available } = req.body;
    
    if (!network || typeof available !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'Network name and availability status are required' 
      });
    }
    
    // Make sure network is one of the allowed values
    if (!['mtn', 'at', 'telecel','afa-registration'].includes(network.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network. Must be one of: mtn, tigo, telecel'
      });
    }
    
    // Find and update the network availability
    const networkEntry = await NetworkAvailability.findOneAndUpdate(
      { network: network.toLowerCase() },
      { 
        available, 
        updatedAt: new Date() 
      },
      { 
        new: true,
        upsert: true 
      }
    );
    
    return res.json({
      success: true,
      message: `${network} is now ${available ? 'in stock' : 'out of stock'}`,
      network: networkEntry
    });
  } catch (error) {
    console.error('Error toggling network availability:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update network availability'
    });
  }
});

// Public endpoint to check all networks' availability status
router.get('/networks-availability', async (req, res) => {
  try {
    const networks = await NetworkAvailability.find().select('-__v');
    
    // Transform to a more usable format for frontend
    const availability = {};
    networks.forEach(net => {
      availability[net.network] = net.available;
    });
    
    return res.json({
      success: true,
      networks: availability
    });
  } catch (error) {
    console.error('Error fetching network availability:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch network availability'
    });
  }
});

module.exports = router;