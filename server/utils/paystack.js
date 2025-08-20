// utils/paystack.js
const axios = require('axios');
const crypto = require('crypto');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    this.baseURL = 'https://api.paystack.co';
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Generate unique reference
  generateReference(prefix = 'WTH') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${prefix}-${timestamp}-${random}`;
  }

  // Verify webhook signature
  verifyWebhookSignature(body, signature) {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(body))
      .digest('hex');
    return hash === signature;
  }

  // Get list of banks
  async getBanks() {
    try {
      const response = await this.axiosInstance.get('/bank');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack getBanks error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch banks'
      };
    }
  }

  // Verify account number
  async verifyAccountNumber(accountNumber, bankCode) {
    try {
      const response = await this.axiosInstance.get('/bank/resolve', {
        params: {
          account_number: accountNumber,
          bank_code: bankCode
        }
      });
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack verifyAccount error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to verify account'
      };
    }
  }

  // Create transfer recipient
  async createTransferRecipient(name, accountNumber, bankCode, description = '') {
    try {
      const response = await this.axiosInstance.post('/transferrecipient', {
        type: 'nuban',
        name: name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'GHS',
        description: description
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack createRecipient error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create recipient'
      };
    }
  }

  // Initiate transfer
  async initiateTransfer(amount, recipientCode, reference, reason = 'Withdrawal') {
    try {
      // Convert amount to pesewas (smallest currency unit)
      const amountInPesewas = Math.round(amount * 100);
      
      const response = await this.axiosInstance.post('/transfer', {
        source: 'balance',
        amount: amountInPesewas,
        recipient: recipientCode,
        reason: reason,
        reference: reference,
        currency: 'GHS'
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack initiateTransfer error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to initiate transfer'
      };
    }
  }

  // Finalize transfer (if OTP is required)
  async finalizeTransfer(transferCode, otp) {
    try {
      const response = await this.axiosInstance.post('/transfer/finalize_transfer', {
        transfer_code: transferCode,
        otp: otp
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack finalizeTransfer error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to finalize transfer'
      };
    }
  }

  // Get transfer status
  async getTransferStatus(transferCode) {
    try {
      const response = await this.axiosInstance.get(`/transfer/${transferCode}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack getTransferStatus error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get transfer status'
      };
    }
  }

  // Verify transfer
  async verifyTransfer(reference) {
    try {
      const response = await this.axiosInstance.get(`/transfer/verify/${reference}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack verifyTransfer error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to verify transfer'
      };
    }
  }

  // Get balance
  async getBalance() {
    try {
      const response = await this.axiosInstance.get('/balance');
      
      // Convert from pesewas to GHS
      const balances = response.data.data.map(balance => ({
        ...balance,
        balance: balance.balance / 100
      }));
      
      return {
        success: true,
        data: balances
      };
    } catch (error) {
      console.error('Paystack getBalance error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get balance'
      };
    }
  }

  // Disable OTP for transfers (one-time setup)
  async disableOTP() {
    try {
      const response = await this.axiosInstance.post('/transfer/disable_otp');
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack disableOTP error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to disable OTP'
      };
    }
  }

  // Enable OTP for transfers
  async enableOTP() {
    try {
      const response = await this.axiosInstance.post('/transfer/enable_otp');
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack enableOTP error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to enable OTP'
      };
    }
  }

  // Resend OTP for transfer
  async resendOTP(transferCode) {
    try {
      const response = await this.axiosInstance.post('/transfer/resend_otp', {
        transfer_code: transferCode
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack resendOTP error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to resend OTP'
      };
    }
  }

  // Process withdrawal (main function)
  async processWithdrawal(withdrawal, bankAccount) {
    try {
      let recipientCode = bankAccount.recipientCode;

      // Create recipient if not exists
      if (!recipientCode) {
        const recipientResult = await this.createTransferRecipient(
          bankAccount.accountName,
          bankAccount.accountNumber,
          bankAccount.bankCode,
          `Withdrawal for user ${withdrawal.userId}`
        );

        if (!recipientResult.success) {
          throw new Error(recipientResult.error);
        }

        recipientCode = recipientResult.data.recipient_code;
        
        // Update bank account with recipient code
        bankAccount.recipientCode = recipientCode;
        await bankAccount.save();
      }

      // Initiate transfer
      const transferResult = await this.initiateTransfer(
        withdrawal.netAmount,
        recipientCode,
        withdrawal.reference,
        'Wallet withdrawal'
      );

      if (!transferResult.success) {
        throw new Error(transferResult.error);
      }

      return {
        success: true,
        data: transferResult.data
      };

    } catch (error) {
      console.error('Process withdrawal error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process withdrawal'
      };
    }
  }

  // List transfers
  async listTransfers(page = 1, perPage = 50) {
    try {
      const response = await this.axiosInstance.get('/transfer', {
        params: {
          page,
          perPage
        }
      });
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack listTransfers error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to list transfers'
      };
    }
  }

  // Get transaction by reference
  async getTransaction(reference) {
    try {
      const response = await this.axiosInstance.get(`/transaction/verify/${reference}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack getTransaction error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get transaction'
      };
    }
  }

  // Initialize payment (for deposits)
  async initializePayment(email, amount, reference, callback_url) {
    try {
      const amountInPesewas = Math.round(amount * 100);
      
      const response = await this.axiosInstance.post('/transaction/initialize', {
        email,
        amount: amountInPesewas,
        reference,
        callback_url,
        currency: 'GHS'
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack initializePayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to initialize payment'
      };
    }
  }

  // Verify payment
  async verifyPayment(reference) {
    try {
      const response = await this.axiosInstance.get(`/transaction/verify/${reference}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack verifyPayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to verify payment'
      };
    }
  }
}

// Create singleton instance
const paystackService = new PaystackService();

module.exports = paystackService;