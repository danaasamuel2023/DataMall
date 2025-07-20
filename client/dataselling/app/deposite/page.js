'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Deposit() {
    const [userId, setUserId] = useState(null);
    const [email, setEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        const storedEmail = localStorage.getItem('email');
        if (storedUserId) setUserId(storedUserId);
        if (storedEmail) setEmail(storedEmail);
    }, []);

    const handleDeposit = async () => {
        if (!userId) {
            setMessage('User ID not found. Please log in.');
            setMessageType('error');
            return;
        }
    
        const amountValue = parseFloat(amount);
        if (!amount || isNaN(amountValue) || amountValue <= 0) {
            setMessage('Please enter a valid amount.');
            setMessageType('error');
            return;
        }
    
        // Add minimum deposit validation
        if (amountValue < 10) {
            setMessage('Minimum deposit amount is 10 GHS.');
            setMessageType('error');
            return;
        }
    
        setLoading(true);
        setMessage('');
    
        try {
            const response = await axios.post('https://datamall.onrender.com/api/wallet/add-funds', {
                userId,
                email,
                amount: amountValue,
                paymentMethod: 'paystack'
            });
            
            if (response.data.success) {
                if (response.data.authorizationUrl) {
                    window.location.href = response.data.authorizationUrl;
                    return;
                }
                
                setMessage(response.data.message || 'Deposit successful!');
                setMessageType('success');
                setAmount('');
            } else {
                setMessage(response.data.error || 'Deposit failed. Try again.');
                setMessageType('error');
            }
        } catch (error) {
            console.error('Deposit error:', error);
            setMessage(error.response?.data?.error || 'Deposit failed. Try again.');
            setMessageType('error');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Deposit Money</h2>
                
                {/* Paystack Badge */}
                <div className="mb-6 flex justify-center">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Secure Payment with Paystack</span>
                    </div>
                </div>
                
                <div className="mb-6">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">GHS</span>
                        </div>
                        <input
                            type="number"
                            id="amount"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="block w-full pl-12 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Minimum deposit: GHS 10.00
                    </p>
                </div>
                
                <button 
                    onClick={handleDeposit} 
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        loading 
                            ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                    }`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </span>
                    ) : 'Proceed to Payment'
                    }
                </button>
                
                {/* Payment Security Info */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Your payment is secured by
                    </p>
                    <div className="mt-2 flex justify-center">
                        <span className="text-lg font-bold text-gray-700 dark:text-gray-300">Paystack</span>
                    </div>
                </div>
                
                {message && (
                    <div className={`mt-4 p-3 rounded-md ${
                        messageType === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                    }`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}