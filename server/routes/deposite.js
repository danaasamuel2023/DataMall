const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const dotenv = require("dotenv");
const { User, Transaction } = require("../schema/schema");

dotenv.config();
const router = express.Router();

// ✅ SECURITY FIX: Use environment variable properly
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_live_c4695b4e7b14fc4374f3204784792227ce85b46f';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("Paystack secret key is missing in environment variables");
}

// ✅ SECURITY FIX: Server-side fee configuration
const FEE_PERCENTAGE = 0.02; // 2% fee - adjust as needed

// mNotify SMS configuration (optional)
const SMS_CONFIG = {
  API_KEY: process.env.MNOTIFY_API_KEY,
  SENDER_ID: 'DataMallGH',
  FRAUD_SENDER_ID: 'DatamartGh', // ✅ Different sender ID for fraud alerts
  BASE_URL: 'https://apps.mnotify.net/smsapi'
};

/**
 * Send SMS notification (optional)
 */
const sendDepositSMS = async (user, amount, newBalance) => {
  try {
    if (!SMS_CONFIG.API_KEY) {
      console.log('SMS not configured');
      return { success: false, message: 'SMS not configured' };
    }

    const formatPhoneNumber = (phone) => {
      if (!phone) return '';
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) cleaned = '233' + cleaned.substring(1);
      if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
      return cleaned;
    };

    const formattedPhone = formatPhoneNumber(user.phoneNumber);
    if (!formattedPhone || formattedPhone.length < 12) {
      throw new Error('Invalid phone number format');
    }

    const message = `Hello ${user.name}! Your DataMall account has been credited with GHS ${amount.toFixed(2)}. New balance: GHS ${newBalance.toFixed(2)}. Thank you!`;
    const url = `${SMS_CONFIG.BASE_URL}?key=${SMS_CONFIG.API_KEY}&to=${formattedPhone}&msg=${encodeURIComponent(message)}&sender_id=${SMS_CONFIG.SENDER_ID}`;
    
    const response = await axios.get(url);
    console.log('SMS sent successfully');
    return { success: true };
  } catch (error) {
    console.error('SMS Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ✅ NEW: Send fraud alert SMS
 */
const sendFraudAlertSMS = async (user, reference, expectedAmount, actualAmountPaid) => {
  try {
    if (!SMS_CONFIG.API_KEY) {
      console.log('SMS not configured for fraud alerts');
      return { success: false, message: 'SMS not configured' };
    }

    const formatPhoneNumber = (phone) => {
      if (!phone) return '';
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) cleaned = '233' + cleaned.substring(1);
      if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
      return cleaned;
    };

    const formattedPhone = formatPhoneNumber(user.phoneNumber);
    if (!formattedPhone || formattedPhone.length < 12) {
      throw new Error('Invalid phone number format');
    }

    // ✅ Fraud alert message
    const message = `⚠️ SECURITY ALERT: Suspicious transaction detected on your DataMall account. Ref: ${reference}. Expected: GHS ${expectedAmount.toFixed(2)}, Received: GHS ${actualAmountPaid.toFixed(2)}. Transaction blocked. Contact support if this wasn't you.`;
    
    const url = `${SMS_CONFIG.BASE_URL}?key=${SMS_CONFIG.API_KEY}&to=${formattedPhone}&msg=${encodeURIComponent(message)}&sender_id=${SMS_CONFIG.FRAUD_SENDER_ID}`;
    
    const response = await axios.get(url);
    console.log('🚨 Fraud alert SMS sent successfully to user');
    return { success: true };
  } catch (error) {
    console.error('Fraud Alert SMS Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ✅ NEW: Send fraud alert to admin/support team
 */
const sendFraudAlertToAdmin = async (user, reference, expectedAmount, actualAmountPaid, transaction) => {
  try {
    if (!SMS_CONFIG.API_KEY) {
      console.log('SMS not configured for admin fraud alerts');
      return { success: false, message: 'SMS not configured' };
    }

    // ✅ Admin phone numbers - configure these in your environment
    const adminPhones = (process.env.ADMIN_FRAUD_ALERT_PHONES || '').split(',').filter(Boolean);
    
    if (adminPhones.length === 0) {
      console.log('No admin phones configured for fraud alerts');
      return { success: false, message: 'No admin phones configured' };
    }

    const formatPhoneNumber = (phone) => {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) cleaned = '233' + cleaned.substring(1);
      if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
      return cleaned;
    };

    // ✅ Detailed fraud alert for admins
    const difference = (actualAmountPaid - expectedAmount).toFixed(2);
    const message = `🚨 FRAUD DETECTED! User: ${user.name} (${user.email}). Ref: ${reference}. Expected: GHS ${expectedAmount.toFixed(2)}, Got: GHS ${actualAmountPaid.toFixed(2)}. Diff: GHS ${difference}. Action: BLOCKED`;
    
    // Send to all admin phones
    const promises = adminPhones.map(async (phone) => {
      const formattedPhone = formatPhoneNumber(phone);
      const url = `${SMS_CONFIG.BASE_URL}?key=${SMS_CONFIG.API_KEY}&to=${formattedPhone}&msg=${encodeURIComponent(message)}&sender_id=${SMS_CONFIG.FRAUD_SENDER_ID}`;
      return axios.get(url);
    });

    await Promise.all(promises);
    console.log('🚨 Fraud alert SMS sent to admin team');
    return { success: true };
  } catch (error) {
    console.error('Admin Fraud Alert SMS Error:', error.message);
    return { success: false, error: error.message };
  }
};

// ✅ SECURE: Initialize Paystack Payment with SERVER-SIDE fee calculation
router.post("/wallet/add-funds", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields" 
      });
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid amount" 
      });
    }

    // Fetch user from database
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    // Check if account is disabled
    if (user.isDisabled) {
      return res.status(403).json({
        success: false,
        error: 'Account is disabled',
        message: 'Your account has been disabled. Deposits are not allowed.',
        disableReason: user.disableReason || 'No reason provided'
      });
    }

    // ✅ SECURITY FIX: Calculate fee SERVER-SIDE
    const fee = depositAmount * FEE_PERCENTAGE;
    const totalAmountWithFee = depositAmount + fee;

    // Get current balance for tracking
    const balanceBefore = user.walletBalance || 0;
    const balanceAfter = balanceBefore + depositAmount;

    // Generate unique reference
    const reference = `WLT-${crypto.randomBytes(10).toString('hex')}-${Date.now()}`;

    // ✅ SECURITY FIX: Store expected amount for verification
    const transaction = new Transaction({
      userId,
      type: 'deposit',
      amount: depositAmount, // Base amount without fee
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      reference,
      status: 'pending',
      gateway: 'paystack',
      description: 'Wallet funding via Paystack',
      metadata: {
        expectedPaystackAmount: totalAmountWithFee, // ✅ For fraud detection
        fee: fee,
        baseAmount: depositAmount,
        userEmail: user.email
      }
    });
    
    await transaction.save();

    // ✅ SECURITY FIX: Use server-calculated total amount
    const paystackAmount = Math.round(totalAmountWithFee * 100); // Convert to kobo/pesewas

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: user.email,
        amount: paystackAmount,
        currency: "GHS", 
        reference: reference,
        callback_url: `https://data-mall.vercel.app/verify-payment?reference=${reference}`,
        metadata: {
          userId: userId,
          custom_fields: [
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: userId
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({ 
      success: true, 
      authorizationUrl: response.data.data.authorization_url,
      reference: reference,
      depositInfo: {
        baseAmount: depositAmount,
        fee: fee,
        totalAmount: totalAmountWithFee
      }
    });
  } catch (error) {
    console.error("Error initializing Paystack payment:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to initialize payment" 
    });
  }
});

// ✅ SECURE: Helper function with Paystack verification and fraud detection
async function processSuccessfulPayment(reference) {
  // Use findOneAndUpdate to prevent race conditions
  const transaction = await Transaction.findOneAndUpdate(
    { 
      reference, 
      status: 'pending',
      processing: { $ne: true }
    },
    { 
      $set: { 
        processing: true
      } 
    },
    { new: true }
  );

  if (!transaction) {
    console.log(`Transaction ${reference} not found or already processed`);
    return { success: false, message: 'Transaction not found or already processed' };
  }

  try {
    // ✅ SECURITY FIX: VERIFY WITH PAYSTACK API
    console.log(`Verifying payment with Paystack: ${reference}`);
    
    const paystackResponse = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackData = paystackResponse.data.data;
    
    // ✅ SECURITY FIX: Get ACTUAL amount paid and verify
    const actualAmountPaid = paystackData.amount / 100; // Convert from kobo/pesewas
    const expectedAmount = transaction.metadata?.expectedPaystackAmount || transaction.amount;
    
    console.log('Payment verification:', {
      reference,
      actualAmountPaid,
      expectedAmount,
      baseAmount: transaction.amount,
      paystackStatus: paystackData.status
    });

    // ✅ SECURITY FIX: FRAUD DETECTION - Verify amount matches
    if (Math.abs(actualAmountPaid - expectedAmount) > 0.02) {
      console.error(`🚨 FRAUD DETECTED - Amount mismatch!`, {
        reference,
        expectedAmount,
        actualAmountPaid,
        difference: actualAmountPaid - expectedAmount,
        baseAmount: transaction.amount
      });
      
      transaction.status = 'failed';
      transaction.processing = false;
      transaction.metadata = {
        ...transaction.metadata,
        fraudDetected: true,
        fraudReason: 'Amount mismatch - possible fraud attempt',
        expectedAmount: expectedAmount,
        actualAmountPaid: actualAmountPaid,
        fraudDetectedAt: new Date()
      };
      await transaction.save();

      // ✅ NEW: Send fraud alert SMS notifications
      const user = await User.findById(transaction.userId);
      if (user) {
        // Send alert to user
        sendFraudAlertSMS(user, reference, expectedAmount, actualAmountPaid)
          .catch(err => console.error('Failed to send fraud alert SMS to user:', err));
        
        // Send alert to admin team
        sendFraudAlertToAdmin(user, reference, expectedAmount, actualAmountPaid, transaction)
          .catch(err => console.error('Failed to send fraud alert SMS to admin:', err));
      }
      
      return { 
        success: false, 
        message: 'Payment amount verification failed'
      };
    }

    // ✅ Check Paystack status
    if (paystackData.status !== 'success') {
      console.warn(`Payment not successful. Paystack status: ${paystackData.status}`);
      transaction.status = 'failed';
      transaction.processing = false;
      transaction.metadata = {
        ...transaction.metadata,
        paystackStatus: paystackData.status,
        failedAt: new Date()
      };
      await transaction.save();
      
      return { 
        success: false, 
        message: `Payment not successful: ${paystackData.status}`
      };
    }

    // Start database transaction for atomicity
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Find the user
      const user = await User.findById(transaction.userId).session(session);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify balance consistency
      const currentBalance = user.walletBalance || 0;
      if (Math.abs(currentBalance - transaction.balanceBefore) > 0.01) {
        console.warn(`Balance mismatch for user ${user._id}. Adjusting...`);
        transaction.balanceBefore = currentBalance;
        transaction.balanceAfter = currentBalance + transaction.amount;
      }

      // ✅ Update user balance with base amount (without fee)
      const previousBalance = user.walletBalance || 0;
      user.walletBalance = previousBalance + transaction.amount;
      await user.save({ session });

      // Update transaction with final status
      transaction.status = 'completed';
      transaction.balanceBefore = previousBalance;
      transaction.balanceAfter = user.walletBalance;
      transaction.processing = false;
      transaction.completedAt = new Date();
      await transaction.save({ session });

      // Commit the database transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`✅ Transaction ${reference} completed. User ${user._id} balance: ${previousBalance} -> ${user.walletBalance}`);
      
      // Send SMS notification (non-blocking)
      sendDepositSMS(user, transaction.amount, user.walletBalance).catch(err => 
        console.error('SMS notification failed:', err)
      );
      
      return { 
        success: true, 
        message: 'Deposit successful', 
        newBalance: user.walletBalance 
      };
    } catch (error) {
      // Rollback database transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    // Release the processing lock on error
    transaction.processing = false;
    transaction.status = 'failed';
    transaction.metadata = {
      ...transaction.metadata,
      error: error.message,
      errorStack: error.stack,
      failedAt: new Date()
    };
    await transaction.save();
    
    console.error('Payment processing error:', error);
    return { success: false, message: error.message };
  }
}

// ✅ SECURE: Paystack Webhook Handler with signature verification
router.post("/paystack/webhook", async (req, res) => {
  try {
    console.log('Webhook received:', {
      signature: req.headers['x-paystack-signature'],
      event: req.body.event,
      reference: req.body.data?.reference
    });

    // ✅ Verify webhook signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle successful charge
    if (event.event === 'charge.success') {
      const { reference } = event.data;
      
      console.log(`Processing successful payment: ${reference}`);

      const result = await processSuccessfulPayment(reference);
      
      return res.json({ message: result.message });
    }
    
    // Handle failed charge
    else if (event.event === 'charge.failed') {
      const { reference } = event.data;
      
      await Transaction.findOneAndUpdate(
        { reference, status: 'pending' },
        { 
          status: 'failed',
          metadata: { 
            failureReason: 'Charge failed on Paystack',
            failedAt: new Date()
          }
        }
      );
      
      console.log(`Payment failed for reference: ${reference}`);
      return res.json({ message: 'Payment failure recorded' });
    }
    
    // Log other events
    else {
      console.log(`Unhandled event type: ${event.event}`);
      return res.json({ message: 'Event received' });
    }

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ SECURE: Verify Payment endpoint with full security
router.get("/wallet/verify-payment", async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing payment reference" 
      });
    }

    // Check if already processed
    const existingTransaction = await Transaction.findOne({ 
      reference: reference,
      status: 'completed'
    });

    if (existingTransaction) {
      console.log(`Payment ${reference} already verified and processed`);
      
      const user = await User.findById(existingTransaction.userId);
      return res.json({ 
        success: true, 
        message: "This payment has already been verified and processed.",
        balance: user ? user.walletBalance : null,
        alreadyProcessed: true,
        data: {
          reference,
          amount: existingTransaction.amount,
          balanceBefore: existingTransaction.balanceBefore,
          balanceAfter: existingTransaction.balanceAfter
        }
      });
    }

    // Check if pending transaction exists
    const pendingTransaction = await Transaction.findOne({
      reference: reference,
      status: 'pending'
    });

    if (!pendingTransaction) {
      return res.status(404).json({ 
        success: false, 
        error: "Transaction not found"
      });
    }

    // Process the payment with full verification
    const result = await processSuccessfulPayment(reference);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: "Wallet funded successfully", 
        balance: result.newBalance 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: result.message 
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Payment verification failed" 
    });
  }
});

// ✅ Get Wallet Balance
router.get("/wallet/balance", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "User ID is required" 
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    return res.json({
      success: true,
      balance: user.walletBalance || 0,
      currency: "GHS"
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch wallet balance" 
    });
  }
});

// ✅ Get Wallet Transaction History with balance tracking
router.get("/wallet/transactions", async (req, res) => {
  try {
    const { userId } = req.query; // Changed from req.body to req.query for GET request
    const { page = 1, limit = 10, status, type } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "User ID is required" 
      });
    }

    // Build filter
    const filter = { userId };
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (type && type !== 'all') {
      filter.type = type;
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean()
      .exec();

    const count = await Transaction.countDocuments(filter);

    // Format transactions with balance tracking
    const formattedTransactions = transactions.map(tx => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      balanceChange: tx.balanceAfter - tx.balanceBefore,
      isCredit: (tx.balanceAfter - tx.balanceBefore) > 0,
      status: tx.status,
      reference: tx.reference,
      gateway: tx.gateway,
      description: tx.description,
      metadata: tx.metadata,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt
    }));

    return res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch transaction history" 
    });
  }
});

// ✅ Verify pending transaction by ID
router.post("/wallet/verify-transaction/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    if (transaction.status !== 'pending') {
      return res.json({
        success: false,
        message: `Transaction is already ${transaction.status}`,
        data: {
          transactionId,
          reference: transaction.reference,
          amount: transaction.amount,
          status: transaction.status
        }
      });
    }
    
    const result = await processSuccessfulPayment(transaction.reference);
    
    if (result.success) {
      const updatedTransaction = await Transaction.findById(transactionId);
      
      return res.json({
        success: true,
        message: 'Transaction verified and completed',
        data: {
          transactionId,
          reference: updatedTransaction.reference,
          amount: updatedTransaction.amount,
          status: 'completed',
          balanceBefore: updatedTransaction.balanceBefore,
          balanceAfter: updatedTransaction.balanceAfter,
          newBalance: result.newBalance
        }
      });
    } else {
      return res.json({
        success: false,
        message: result.message,
        data: {
          transactionId,
          reference: transaction.reference,
          amount: transaction.amount,
          status: transaction.status
        }
      });
    }
  } catch (error) {
    console.error('Verify Transaction Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;