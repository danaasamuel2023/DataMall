'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

// Client component that uses useSearchParams
function VerifyDepositClient() {
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your payment...');
  const [balance, setBalance] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams?.get('reference');
  
  useEffect(() => {
    // Check if user prefers dark mode
    if (typeof window !== 'undefined') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Check localStorage (if user manually set preference)
      const storedTheme = localStorage.getItem('theme');
      setDarkMode(storedTheme === 'dark' || (storedTheme !== 'light' && prefersDark));
    }

    const verifyPayment = async () => {
      if (!reference) {
        setStatus('error');
        setMessage('Payment reference not found. Please try again or contact support.');
        return;
      }
      
      try {
        const response = await axios.get(
          `http://localhost:5000/api/wallet/verify-payment?reference=${reference}`
        );
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Payment verified successfully!');
          setBalance(response.data.balance);
        } else {
          setStatus('error');
          setMessage(response.data.error || 'Payment verification failed. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.error || 
          'Payment verification failed. Our team has been notified.'
        );
        console.error('Verification error:', error);
      }
    };
    
    verifyPayment();
  }, [reference]);
  
  const handleDashboardReturn = () => {
    router.push('/'); // Adjust this to your dashboard route
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };
  
  // Get appropriate background and text colors based on dark mode
  const getCardBg = () => darkMode ? 'bg-gray-800' : 'bg-white';
  const getTextColor = () => darkMode ? 'text-white' : 'text-gray-900';
  const getSubTextColor = () => darkMode ? 'text-gray-300' : 'text-gray-500';
  const getButtonBg = () => darkMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700';
  const getShadow = () => darkMode ? 'shadow-lg shadow-gray-900/30' : 'shadow-md';
  const getPageBg = () => darkMode ? 'bg-gray-900' : 'bg-gray-50';
  
  return (
    <div className={`min-h-screen py-10 px-4 ${getPageBg()} transition-colors duration-300`}>
      <div className={`max-w-md mx-auto p-6 ${getCardBg()} rounded-lg ${getShadow()} transition-colors duration-300`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-2xl font-bold ${getTextColor()}`}>Payment Verification</h2>
          <button 
            onClick={toggleDarkMode}
            className={`px-3 py-1 rounded text-sm ${darkMode ? 'bg-yellow-500 hover:bg-yellow-400 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
        
        {status === 'verifying' && (
          <div className="flex flex-col items-center py-4">
            <div className={`animate-spin h-10 w-10 border-4 ${darkMode ? 'border-blue-400' : 'border-blue-500'} rounded-full border-t-transparent mb-4`}></div>
            <p className={getTextColor()}>{message}</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center py-4">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className={`text-lg mb-2 ${getTextColor()}`}>{message}</p>
            {balance !== null && (
              <p className={`font-semibold mb-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                Your new wallet balance: GHS {balance.toFixed(2)}
              </p>
            )}
            <button 
              onClick={handleDashboardReturn}
              className={`mt-4 px-6 py-2 ${getButtonBg()} text-white rounded transition-colors`}
            >
              Return to Dashboard
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center py-4">
            <div className={`${darkMode ? 'text-red-400' : 'text-red-600'} text-5xl mb-4`}>✕</div>
            <p className={`text-lg mb-4 ${getTextColor()}`}>{message}</p>
            <button 
              onClick={handleDashboardReturn}
              className={`mt-4 px-6 py-2 ${getButtonBg()} text-white rounded transition-colors`}
            >
              Return to Dashboard
            </button>
          </div>
        )}
        
        {reference && (
          <p className={`text-sm ${getSubTextColor()} mt-6`}>Reference: {reference}</p>
        )}
      </div>
    </div>
  );
}

// Fallback component to show while loading
function VerifyDepositFallback() {
  // We'll use a similar check for dark mode to ensure consistent appearance
  const isDarkMode = typeof window !== 'undefined' && 
    (localStorage.getItem('theme') === 'dark' || 
    (localStorage.getItem('theme') !== 'light' && 
    window.matchMedia('(prefers-color-scheme: dark)').matches));

  const getCardBg = () => isDarkMode ? 'bg-gray-800' : 'bg-white';
  const getTextColor = () => isDarkMode ? 'text-white' : 'text-gray-900';
  const getShadow = () => isDarkMode ? 'shadow-lg shadow-gray-900/30' : 'shadow-md';
  const getPageBg = () => isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  
  return (
    <div className={`min-h-screen py-10 px-4 ${getPageBg()}`}>
      <div className={`max-w-md mx-auto p-6 ${getCardBg()} rounded-lg ${getShadow()}`}>
        <h2 className={`text-2xl font-bold mb-4 ${getTextColor()}`}>Payment Verification</h2>
        <div className="flex flex-col items-center py-4">
          <div className={`animate-spin h-10 w-10 border-4 ${isDarkMode ? 'border-blue-400' : 'border-blue-500'} rounded-full border-t-transparent mb-4`}></div>
          <p className={getTextColor()}>Loading payment verification...</p>
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the client component with Suspense
export default function VerifyDeposit() {
  return (
    <Suspense fallback={<VerifyDepositFallback />}>
      <VerifyDepositClient />
    </Suspense>
  );
}