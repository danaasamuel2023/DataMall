const mongoose = require('mongoose');

// ============ USER SCHEMA ============
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: {
    type: String,
    sparse: true,
    default: undefined
  },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'agent'], 
    default: 'user' 
  },
  walletBalance: { type: Number, default: 0 },
  userCapacity: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// ============ DATA ORDER SCHEMA ============
const DataOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserNASH', required: true },
  network: { type: String, required: true, enum: ['mtn', 'Tigo', 'Airtel','at','TELECEL','afa-registration'] },
  dataAmount: { type: Number, required: true },
  price: { type: Number, required: true },
  providerCost: { type: Number },
  profit: { type: Number },
  profitMargin: { type: Number },
  phoneNumber: { type: String, required: true },
  reference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending','processing','completed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  // AFA Registration specific fields
  fullName: { type: String },
  idType: { type: String },
  idNumber: { type: String },
  dateOfBirth: { type: Date },
  occupation: { type: String },
  location: { type: String },
  completedAt: { type: Date },
  failureReason: { type: String }
});

// ============ TRANSACTION SCHEMA ============
const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserNASH",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "purchase", "refund", "commission"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "GHS",
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
    balanceAfter: {
      type: Number,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// ============ NETWORK AVAILABILITY SCHEMA ============
const NetworkAvailabilitySchema = new mongoose.Schema({
  network: { 
    type: String, 
    required: true, 
    unique: true,
    enum: ['mtn', 'tigo', 'telecel','at','afa-registration']
  },
  available: { 
    type: Boolean, 
    default: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// ============ PROVIDER PRICING SCHEMA ============
const ProviderPricingSchema = new mongoose.Schema({
  network: {
    type: String,
    required: true,
    enum: ['mtn', 'tigo', 'telecel', 'at', 'afa-registration']
  },
  capacity: {
    type: String,
    required: true
  },
  mb: {
    type: String,
    required: true
  },
  providerPrice: {
    type: Number,
    required: true
  },
  sellingPrice: {
    type: Number,
    required: true
  },
  profit: {
    type: Number,
    default: 0
  },
  profitMargin: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ============ PROFIT ANALYTICS SCHEMA ============
const ProfitAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  network: {
    type: String,
    enum: ['mtn', 'tigo', 'telecel', 'at', 'all'],
    required: true
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  averageProfitMargin: {
    type: Number,
    default: 0
  },
  ordersByCapacity: [{
    capacity: String,
    count: Number,
    revenue: Number,
    cost: Number,
    profit: Number
  }]
});

// ============ WEEKLY PROFIT SCHEMA ============
const WeeklyProfitSchema = new mongoose.Schema({
  weekStartDate: { 
    type: Date, 
    required: true 
  },
  weekEndDate: { 
    type: Date, 
    required: true 
  },
  weekNumber: { 
    type: Number, 
    required: true 
  },
  year: { 
    type: Number, 
    required: true 
  },
  totalOrders: { 
    type: Number, 
    default: 0 
  },
  totalRevenue: { 
    type: Number, 
    default: 0 
  },
  totalCost: { 
    type: Number, 
    default: 0 
  },
  totalProfit: { 
    type: Number, 
    default: 0 
  },
  isWithdrawn: { 
    type: Boolean, 
    default: false 
  },
  withdrawalId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdminWithdrawal' 
  },
  withdrawnAt: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// ============ ADMIN WITHDRAWAL SCHEMA ============
const AdminWithdrawalSchema = new mongoose.Schema({
  amount: { 
    type: Number, 
    required: true,
    min: 1
  },
  weeklyProfitId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'WeeklyProfit',
    required: true
  },
  weekStartDate: { 
    type: Date,
    required: true
  },
  weekEndDate: { 
    type: Date,
    required: true
  },
  bankDetails: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  notes: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: { 
    type: Date 
  },
  cancelledAt: {
    type: Date
  },
  cancelReason: {
    type: String
  }
});

// ============ USER DAILY EARNINGS SCHEMA (NEW) ============
const UserDailyEarningsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserNASH',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'agent']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ============ CREATE INDEXES ============
ProviderPricingSchema.index({ network: 1, capacity: 1 });
ProfitAnalyticsSchema.index({ date: 1, network: 1 }, { unique: true });
WeeklyProfitSchema.index({ weekStartDate: 1, weekEndDate: 1 }, { unique: true });
WeeklyProfitSchema.index({ year: 1, weekNumber: 1 });
UserDailyEarningsSchema.index({ userId: 1, date: 1 }, { unique: true });

// ============ CREATE MODELS ============
const User = mongoose.model('UserNASH', UserSchema);
const DataOrder = mongoose.model('DataOrder', DataOrderSchema);
const Transaction = mongoose.model("TransactionNASH", TransactionSchema);
const NetworkAvailability = mongoose.model('NetworkAvailability', NetworkAvailabilitySchema);
const ProviderPricing = mongoose.model('ProviderPricing', ProviderPricingSchema);
const ProfitAnalytics = mongoose.model('ProfitAnalytics', ProfitAnalyticsSchema);
const WeeklyProfit = mongoose.model('WeeklyProfit', WeeklyProfitSchema);
const AdminWithdrawal = mongoose.model('AdminWithdrawal', AdminWithdrawalSchema);
const UserDailyEarnings = mongoose.model('UserDailyEarnings', UserDailyEarningsSchema);

// ============ HELPER FUNCTIONS ============

// Initialize MTN pricing data
async function initializeMTNPricing() {
  const providerPrices = [
    { capacity: '1', mb: '1000', price: 4.50, network: 'mtn' },
    { capacity: '2', mb: '2000', price: 8.90, network: 'mtn' },
    { capacity: '3', mb: '3000', price: 12.99, network: 'mtn' },
    { capacity: '4', mb: '4000', price: 18.00, network: 'mtn' },
    { capacity: '5', mb: '5000', price: 22.75, network: 'mtn' },
    { capacity: '6', mb: '6000', price: 26.00, network: 'mtn' },
    { capacity: '8', mb: '8000', price: 34.50, network: 'mtn' },
    { capacity: '10', mb: '10000', price: 41.50, network: 'mtn' },
    { capacity: '15', mb: '15000', price: 62.00, network: 'mtn' },
    { capacity: '20', mb: '20000', price: 80.00, network: 'mtn' },
    { capacity: '25', mb: '25000', price: 105.00, network: 'mtn' },
    { capacity: '30', mb: '30000', price: 120.00, network: 'mtn' },
    { capacity: '40', mb: '40000', price: 165.00, network: 'mtn' },
    { capacity: '50', mb: '50000', price: 198.00, network: 'mtn' },
    { capacity: '100', mb: '100000', price: 406.00, network: 'mtn' }
  ];

  const sellingPrices = [
    { capacity: '1', mb: '1000', price: 4.70, network: 'mtn' },
    { capacity: '2', mb: '2000', price: 9.40, network: 'mtn' },
    { capacity: '3', mb: '3000', price: 13.70, network: 'mtn' },
    { capacity: '4', mb: '4000', price: 18.70, network: 'mtn' },
    { capacity: '5', mb: '5000', price: 23.70, network: 'mtn' },
    { capacity: '6', mb: '6000', price: 27.20, network: 'mtn' },
    { capacity: '8', mb: '8000', price: 35.70, network: 'mtn' },
    { capacity: '10', mb: '10000', price: 43.70, network: 'mtn' },
    { capacity: '15', mb: '15000', price: 62.70, network: 'mtn' },
    { capacity: '20', mb: '20000', price: 83.20, network: 'mtn' },
    { capacity: '25', mb: '25000', price: 105.20, network: 'mtn' },
    { capacity: '30', mb: '30000', price: 129.20, network: 'mtn' },
    { capacity: '40', mb: '40000', price: 166.20, network: 'mtn' },
    { capacity: '50', mb: '50000', price: 207.20, network: 'mtn' },
    { capacity: '100', mb: '100000', price: 407.20, network: 'mtn' }
  ];

  for (const providerItem of providerPrices) {
    const sellingItem = sellingPrices.find(s => s.capacity === providerItem.capacity);
    
    if (sellingItem) {
      const profit = sellingItem.price - providerItem.price;
      const profitMargin = (profit / sellingItem.price) * 100;

      await ProviderPricing.findOneAndUpdate(
        { 
          network: 'mtn', 
          capacity: providerItem.capacity 
        },
        {
          network: 'mtn',
          capacity: providerItem.capacity,
          mb: providerItem.mb,
          providerPrice: providerItem.price,
          sellingPrice: sellingItem.price,
          profit: profit,
          profitMargin: profitMargin,
          isActive: true,
          updatedAt: new Date()
        },
        { upsert: true }
      );
    }
  }

  console.log('MTN pricing data initialized successfully');
}

// Get pricing info for a network and capacity
async function getPricingInfo(network, capacity) {
  const pricing = await ProviderPricing.findOne({ 
    network: network.toLowerCase(), 
    capacity: capacity.toString(),
    isActive: true 
  });
  
  if (!pricing) {
    throw new Error(`Pricing not found for ${network} ${capacity}GB`);
  }
  
  return {
    providerCost: pricing.providerPrice,
    sellingPrice: pricing.sellingPrice,
    profit: pricing.profit,
    profitMargin: pricing.profitMargin
  };
}

// Create data order with profit tracking
async function createDataOrderWithProfit(orderData) {
  try {
    const pricingInfo = await getPricingInfo(orderData.network, orderData.capacity);
    
    const order = new DataOrder({
      ...orderData,
      price: pricingInfo.sellingPrice,
      providerCost: pricingInfo.providerCost,
      profit: pricingInfo.profit,
      profitMargin: pricingInfo.profitMargin
    });
    
    await order.save();
    
    if (order.status === 'completed') {
      await updateDailyAnalytics(order);
      await updateWeeklyProfit(order);
      await trackUserEarnings(order);
    }
    
    return order;
  } catch (error) {
    console.error('Error creating order with profit:', error);
    throw error;
  }
}

// Update daily analytics
async function updateDailyAnalytics(order) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const analytics = await ProfitAnalytics.findOne({
    date: today,
    network: order.network
  });
  
  if (analytics) {
    analytics.totalOrders += 1;
    analytics.totalRevenue += order.price;
    analytics.totalCost += order.providerCost || 0;
    analytics.totalProfit += order.profit || 0;
    analytics.averageProfitMargin = (analytics.totalProfit / analytics.totalRevenue) * 100;
    
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
    await ProfitAnalytics.create({
      date: today,
      network: order.network,
      totalOrders: 1,
      totalRevenue: order.price,
      totalCost: order.providerCost || 0,
      totalProfit: order.profit || 0,
      averageProfitMargin: ((order.profit || 0) / order.price) * 100,
      ordersByCapacity: [{
        capacity: order.dataAmount.toString(),
        count: 1,
        revenue: order.price,
        cost: order.providerCost || 0,
        profit: order.profit || 0
      }]
    });
  }
}

// Update weekly profit tracking
async function updateWeeklyProfit(order) {
  const orderDate = new Date(order.createdAt);
  
  // Calculate week start (Monday) and end (Sunday)
  const dayOfWeek = orderDate.getDay();
  const diff = orderDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  
  const weekStart = new Date(orderDate.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  // Calculate week number
  const startOfYear = new Date(weekStart.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((weekStart - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  
  // Update or create weekly profit record
  const weeklyProfit = await WeeklyProfit.findOne({
    weekStartDate: weekStart,
    weekEndDate: weekEnd
  });
  
  if (weeklyProfit) {
    weeklyProfit.totalOrders += 1;
    weeklyProfit.totalRevenue += order.price;
    weeklyProfit.totalCost += order.providerCost || 0;
    weeklyProfit.totalProfit += order.profit || 0;
    await weeklyProfit.save();
  } else {
    await WeeklyProfit.create({
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      weekNumber: weekNumber,
      year: weekStart.getFullYear(),
      totalOrders: 1,
      totalRevenue: order.price,
      totalCost: order.providerCost || 0,
      totalProfit: order.profit || 0,
      isWithdrawn: false
    });
  }
}

// Track user earnings
async function trackUserEarnings(order) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const user = await User.findById(order.userId);
  
  // Calculate commission for agents (5%)
  const commission = user.role === 'agent' ? order.price * 0.05 : 0;
  
  const earnings = await UserDailyEarnings.findOne({
    userId: order.userId,
    date: today
  });
  
  if (earnings) {
    earnings.totalOrders += 1;
    earnings.totalRevenue += order.price;
    earnings.totalProfit += order.profit || 0;
    earnings.commission += commission;
    await earnings.save();
  } else {
    await UserDailyEarnings.create({
      userId: order.userId,
      date: today,
      totalOrders: 1,
      totalRevenue: order.price,
      totalProfit: order.profit || 0,
      commission: commission,
      role: user.role
    });
  }
  
  // Credit commission to agent's wallet
  if (commission > 0) {
    user.walletBalance += commission;
    await user.save();
    
    await Transaction.create({
      userId: order.userId,
      type: 'commission',
      amount: commission,
      description: `Commission for order ${order.reference}`,
      reference: order.reference,
      status: 'completed',
      balanceAfter: user.walletBalance
    });
  }
}

// Get user earnings summary
async function getUserEarningsSummary(userId, startDate, endDate) {
  const earnings = await UserDailyEarnings.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: '$totalOrders' },
        totalRevenue: { $sum: '$totalRevenue' },
        totalProfit: { $sum: '$totalProfit' },
        totalCommission: { $sum: '$commission' },
        daysActive: { $sum: 1 }
      }
    }
  ]);
  
  return earnings[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalCommission: 0,
    daysActive: 0
  };
}

// Get daily profit report
async function getDailyProfitReport(date, network = null) {
  const query = { date };
  if (network) query.network = network;
  
  return await ProfitAnalytics.find(query);
}

// Get monthly profit summary
async function getMonthlyProfitSummary(year, month, network = null) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const matchQuery = {
    createdAt: { $gte: startDate, $lte: endDate },
    status: 'completed'
  };
  
  if (network) matchQuery.network = network;
  
  const summary = await DataOrder.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$network',
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$price' },
        totalCost: { $sum: '$providerCost' },
        totalProfit: { $sum: '$profit' },
        avgProfitMargin: { $avg: '$profitMargin' }
      }
    }
  ]);
  
  return summary;
}

// Get best performing packages
async function getBestPerformingPackages(network = 'mtn', limit = 5) {
  const result = await DataOrder.aggregate([
    { 
      $match: { 
        network: network,
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      } 
    },
    {
      $group: {
        _id: '$dataAmount',
        totalOrders: { $sum: 1 },
        totalProfit: { $sum: '$profit' },
        avgProfitMargin: { $avg: '$profitMargin' }
      }
    },
    { $sort: { totalProfit: -1 } },
    { $limit: limit }
  ]);
  
  return result;
}

// ============ EXPORTS ============
module.exports = { 
  // Models
  User, 
  DataOrder, 
  Transaction, 
  NetworkAvailability,
  ProviderPricing,
  ProfitAnalytics,
  WeeklyProfit,
  AdminWithdrawal,
  UserDailyEarnings,
  
  // Helper functions
  initializeMTNPricing,
  getPricingInfo,
  createDataOrderWithProfit,
  updateDailyAnalytics,
  updateWeeklyProfit,
  trackUserEarnings,
  getUserEarningsSummary,
  getDailyProfitReport,
  getMonthlyProfitSummary,
  getBestPerformingPackages
};``