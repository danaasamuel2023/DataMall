const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: {
    type: String,
    // unique: true,  // Only if you need uniqueness
    sparse: true,  // This will only apply the index to documents that have the field
    default: undefined  // This ensures the field isn't set if not provided
  },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'agent'], 
    default: 'user' 
  },
  walletBalance: { type: Number, default: 0 }, // Wallet balance field
  userCapacity: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const DataOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserNASH', required: true },
  network: { type: String, required: true, enum: ['mtn', 'Tigo', 'Airtel','at','TELECEL','afa-registration'] },
  dataAmount: { type: Number, required: true },
  price: { type: Number, required: true }, // Selling price
  providerCost: { type: Number }, // Cost from provider
  profit: { type: Number }, // Profit made on this order
  profitMargin: { type: Number }, // Profit percentage
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

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "purchase", "refund"],
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

// Add this to your schema.js file
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

// NEW: Provider Pricing Schema - to store provider costs
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
    type: Number, // Percentage
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

// Create compound index for efficient lookups
ProviderPricingSchema.index({ network: 1, capacity: 1 });

// NEW: Profit Analytics Schema - for aggregated profit data
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

// Create compound index for date and network
ProfitAnalyticsSchema.index({ date: 1, network: 1 }, { unique: true });

// Create the models
const User = mongoose.model('UserNASH', UserSchema);
const DataOrder = mongoose.model('DataOrder', DataOrderSchema);
const Transaction = mongoose.model("TransactionNASH", TransactionSchema);
const NetworkAvailability = mongoose.model('NetworkAvailability', NetworkAvailabilitySchema);
const ProviderPricing = mongoose.model('ProviderPricing', ProviderPricingSchema);
const ProfitAnalytics = mongoose.model('ProfitAnalytics', ProfitAnalyticsSchema);

// Helper function to initialize MTN pricing data
async function initializeMTNPricing() {
  // Provider prices (from DATA_PACKAGES)
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

  // Your selling prices
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

  // Combine and calculate profits
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

// Function to get pricing info for an order
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

// Update function for creating data orders with profit tracking
async function createDataOrderWithProfit(orderData) {
  try {
    // Get pricing information
    const pricingInfo = await getPricingInfo(orderData.network, orderData.capacity);
    
    // Create order with profit information
    const order = new DataOrder({
      ...orderData,
      price: pricingInfo.sellingPrice,
      providerCost: pricingInfo.providerCost,
      profit: pricingInfo.profit,
      profitMargin: pricingInfo.profitMargin
    });
    
    await order.save();
    
    // Update daily analytics if order is completed
    if (order.status === 'completed') {
      await updateDailyAnalytics(order);
    }
    
    return order;
  } catch (error) {
    console.error('Error creating order with profit:', error);
    throw error;
  }
}

// Function to update daily analytics
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
    analytics.totalCost += order.providerCost;
    analytics.totalProfit += order.profit;
    analytics.averageProfitMargin = (analytics.totalProfit / analytics.totalRevenue) * 100;
    
    // Update capacity breakdown
    const capacityIndex = analytics.ordersByCapacity.findIndex(
      item => item.capacity === order.dataAmount.toString()
    );
    
    if (capacityIndex > -1) {
      analytics.ordersByCapacity[capacityIndex].count += 1;
      analytics.ordersByCapacity[capacityIndex].revenue += order.price;
      analytics.ordersByCapacity[capacityIndex].cost += order.providerCost;
      analytics.ordersByCapacity[capacityIndex].profit += order.profit;
    } else {
      analytics.ordersByCapacity.push({
        capacity: order.dataAmount.toString(),
        count: 1,
        revenue: order.price,
        cost: order.providerCost,
        profit: order.profit
      });
    }
    
    await analytics.save();
  } else {
    // Create new analytics entry
    await ProfitAnalytics.create({
      date: today,
      network: order.network,
      totalOrders: 1,
      totalRevenue: order.price,
      totalCost: order.providerCost,
      totalProfit: order.profit,
      averageProfitMargin: (order.profit / order.price) * 100,
      ordersByCapacity: [{
        capacity: order.dataAmount.toString(),
        count: 1,
        revenue: order.price,
        cost: order.providerCost,
        profit: order.profit
      }]
    });
  }
}

// Analytics query functions
async function getDailyProfitReport(date, network = null) {
  const query = { date };
  if (network) query.network = network;
  
  return await ProfitAnalytics.find(query);
}

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

// Get best performing packages by profit
async function getBestPerformingPackages(network = 'mtn', limit = 5) {
  const result = await DataOrder.aggregate([
    { 
      $match: { 
        network: network,
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
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

// Export everything
module.exports = { 
  User, 
  DataOrder, 
  Transaction, 
  NetworkAvailability,
  ProviderPricing,
  ProfitAnalytics,
  // Helper functions
  initializeMTNPricing,
  getPricingInfo,
  createDataOrderWithProfit,
  updateDailyAnalytics,
  getDailyProfitReport,
  getMonthlyProfitSummary,
  getBestPerformingPackages
};