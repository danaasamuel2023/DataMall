

// =====================================================
// PROFIT MIGRATION SCRIPT - Run this to fix profit showing as 0
// Save this as: migrate-profit-data.js
// Run with: node migrate-profit-data.js
// =====================================================

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { DataOrder, ProviderPricing, ProfitAnalytics } = require('./schema/schema');

dotenv.config();

// Your profit configuration (same as in your routes)
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
  }
};

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://datamartghana:0246783840sa@cluster0.s33wv2s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Helper function to calculate profit
function calculateProfit(network, dataAmount, price) {
  const networkLower = network.toLowerCase();
  const capacityStr = dataAmount.toString();
  
  // Handle network variations
  let configNetwork = networkLower;
  if (networkLower === 'tigo' || networkLower === 'airtel' || networkLower === 'airteltigo') {
    configNetwork = 'at';
  }
  
  // Get pricing config
  const networkConfig = PROFIT_CONFIG[configNetwork];
  if (!networkConfig || !networkConfig[capacityStr]) {
    // Default 15% margin if not configured
    return {
      providerCost: price * 0.85,
      profit: price * 0.15,
      profitMargin: 15
    };
  }
  
  const packageConfig = networkConfig[capacityStr];
  const providerCost = packageConfig.cost;
  const profit = price - providerCost;
  const profitMargin = (profit / price) * 100;
  
  return { providerCost, profit, profitMargin };
}

// Step 1: Initialize ProviderPricing collection
async function initializeProviderPricing() {
  console.log('\n📊 Step 1: Initializing ProviderPricing collection...');
  
  let created = 0;
  let updated = 0;
  
  for (const [network, packages] of Object.entries(PROFIT_CONFIG)) {
    for (const [capacity, pricing] of Object.entries(packages)) {
      const profit = pricing.sell - pricing.cost;
      const profitMargin = (profit / pricing.sell) * 100;
      
      const existing = await ProviderPricing.findOne({ network, capacity });
      
      if (existing) {
        existing.providerPrice = pricing.cost;
        existing.sellingPrice = pricing.sell;
        existing.profit = profit;
        existing.profitMargin = profitMargin;
        existing.isActive = true;
        existing.updatedAt = new Date();
        await existing.save();
        updated++;
      } else {
        await ProviderPricing.create({
          network,
          capacity,
          mb: (parseInt(capacity) * 1000).toString(),
          providerPrice: pricing.cost,
          sellingPrice: pricing.sell,
          profit,
          profitMargin,
          isActive: true
        });
        created++;
      }
    }
  }
  
  console.log(`✅ ProviderPricing: Created ${created}, Updated ${updated}`);
}

// Step 2: Update existing orders with profit data
async function updateExistingOrders() {
  console.log('\n📦 Step 2: Updating existing orders with profit data...');
  
  // Find all orders without profit data
  const ordersWithoutProfit = await DataOrder.find({
    $or: [
      { profit: { $exists: false } },
      { profit: null },
      { profit: 0 },
      { providerCost: { $exists: false } },
      { profitMargin: { $exists: false } }
    ]
  });
  
  console.log(`Found ${ordersWithoutProfit.length} orders without profit data`);
  
  let updated = 0;
  let failed = 0;
  
  for (const order of ordersWithoutProfit) {
    try {
      const profitData = calculateProfit(order.network, order.dataAmount, order.price);
      
      order.providerCost = profitData.providerCost;
      order.profit = profitData.profit;
      order.profitMargin = profitData.profitMargin;
      
      await order.save();
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`  Progress: ${updated}/${ordersWithoutProfit.length}`);
      }
    } catch (error) {
      console.error(`  Failed to update order ${order._id}:`, error.message);
      failed++;
    }
  }
  
  console.log(`✅ Orders updated: ${updated}, Failed: ${failed}`);
}

// Step 3: Rebuild ProfitAnalytics from all orders
async function rebuildProfitAnalytics() {
  console.log('\n📈 Step 3: Rebuilding ProfitAnalytics collection...');
  
  // Clear existing analytics (optional - comment out if you want to keep existing)
  await ProfitAnalytics.deleteMany({});
  console.log('  Cleared existing analytics');
  
  // Get all completed orders grouped by date and network
  const orders = await DataOrder.aggregate([
    {
      $match: {
        status: { $in: ['completed', 'successful'] }
      }
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          network: { $toLower: '$network' }
        },
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
        capacityBreakdown: {
          $push: {
            capacity: { $toString: '$dataAmount' },
            price: '$price',
            profit: {
              $ifNull: ['$profit', { $multiply: ['$price', 0.15] }]
            },
            cost: {
              $ifNull: ['$providerCost', { $multiply: ['$price', 0.85] }]
            }
          }
        }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
  
  console.log(`  Found ${orders.length} date/network combinations to process`);
  
  let created = 0;
  
  for (const orderGroup of orders) {
    // Process capacity breakdown
    const capacityMap = {};
    
    for (const item of orderGroup.capacityBreakdown) {
      if (!capacityMap[item.capacity]) {
        capacityMap[item.capacity] = {
          capacity: item.capacity,
          count: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };
      }
      
      capacityMap[item.capacity].count += 1;
      capacityMap[item.capacity].revenue += item.price || 0;
      capacityMap[item.capacity].cost += item.cost || 0;
      capacityMap[item.capacity].profit += item.profit || 0;
    }
    
    const ordersByCapacity = Object.values(capacityMap);
    
    // Calculate average profit margin
    const avgProfitMargin = orderGroup.totalRevenue > 0
      ? (orderGroup.totalProfit / orderGroup.totalRevenue) * 100
      : 0;
    
    // Create analytics entry
    await ProfitAnalytics.create({
      date: new Date(orderGroup._id.date),
      network: orderGroup._id.network,
      totalOrders: orderGroup.totalOrders,
      totalRevenue: orderGroup.totalRevenue,
      totalCost: orderGroup.totalCost,
      totalProfit: orderGroup.totalProfit,
      averageProfitMargin: avgProfitMargin,
      ordersByCapacity: ordersByCapacity
    });
    
    created++;
  }
  
  console.log(`✅ Created ${created} ProfitAnalytics entries`);
}

// Step 4: Verify the migration
async function verifyMigration() {
  console.log('\n✔️ Step 4: Verifying migration...');
  
  // Check ProviderPricing
  const pricingCount = await ProviderPricing.countDocuments();
  console.log(`  ProviderPricing entries: ${pricingCount}`);
  
  // Check orders with profit
  const ordersWithProfit = await DataOrder.countDocuments({
    profit: { $exists: true, $ne: null, $gt: 0 }
  });
  const totalOrders = await DataOrder.countDocuments();
  console.log(`  Orders with profit: ${ordersWithProfit}/${totalOrders}`);
  
  // Check ProfitAnalytics
  const analyticsCount = await ProfitAnalytics.countDocuments();
  console.log(`  ProfitAnalytics entries: ${analyticsCount}`);
  
  // Get sample profit data
  const sampleAnalytics = await ProfitAnalytics.findOne().sort({ date: -1 });
  if (sampleAnalytics) {
    console.log('\n  Sample Analytics Entry:');
    console.log(`    Date: ${sampleAnalytics.date}`);
    console.log(`    Network: ${sampleAnalytics.network}`);
    console.log(`    Orders: ${sampleAnalytics.totalOrders}`);
    console.log(`    Revenue: GHS ${sampleAnalytics.totalRevenue?.toFixed(2)}`);
    console.log(`    Profit: GHS ${sampleAnalytics.totalProfit?.toFixed(2)}`);
    console.log(`    Margin: ${sampleAnalytics.averageProfitMargin?.toFixed(2)}%`);
  }
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting Profit Data Migration...');
  console.log('=====================================');
  
  try {
    await connectDB();
    
    await initializeProviderPricing();
    await updateExistingOrders();
    await rebuildProfitAnalytics();
    await verifyMigration();
    
    console.log('\n=====================================');
    console.log('✅ Migration completed successfully!');
    console.log('=====================================');
    console.log('\n📌 Next steps:');
    console.log('1. Restart your server');
    console.log('2. Click "Initialize Pricing" button in the admin dashboard');
    console.log('3. Refresh the profit analytics page');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the migration
runMigration();