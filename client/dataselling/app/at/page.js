'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AirtelTigoBundleCards = () => {
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [userId, setUserId] = useState(null);
  const [networkAvailability, setNetworkAvailability] = useState({
    mtn: true,
    at: true, // Airtel-Tigo
    telecel: true
  });
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bundleToConfirm, setBundleToConfirm] = useState(null);
  const [successDetails, setSuccessDetails] = useState({
    phoneNumber: '',
    bundleCapacity: '',
    reference: ''
  });

  // Get user ID from localStorage and check network availability on component mount
  useEffect(() => {
    // Get user ID
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      console.error('User ID not found in localStorage');
      setMessage({ text: 'Please login to purchase data bundles', type: 'error' });
      setShowErrorModal(true);
    }

    // Check network availability
    fetchNetworkAvailability();
  }, []);

  // Function to fetch network availability
  const fetchNetworkAvailability = async () => {
    try {
      setCheckingAvailability(true);
      const response = await axios.get('https://bignsah.onrender.com/api/networks-availability');
      
      if (response.data.success) {
        setNetworkAvailability(response.data.networks);
        
        // If Airtel-Tigo is out of stock, show message in modal
        if (!response.data.networks.at) {
          setMessage({ 
            text: 'Airtel-Tigo bundles are currently out of stock. Please check back later.', 
            type: 'error' 
          });
          setShowErrorModal(true);
        }
      } else {
        console.error('Failed to fetch network availability');
        // Default to available to avoid blocking purchases if the check fails
      }
    } catch (err) {
      console.error('Error checking network availability:', err);
      // Default to available to avoid blocking purchases if the check fails
    } finally {
      setCheckingAvailability(false);
    }
  };

  const bundles = [
    { capacity: '1', mb: '1000', price: '5.00', network: 'at' },
    { capacity: '2', mb: '2000', price: '10.00', network: 'at' },
    { capacity: '3', mb: '3000', price: '14.00', network: 'at' },
    { capacity: '4', mb: '4000', price: '17.80', network: 'at' },
    { capacity: '5', mb: '5000', price: '23.50', network: 'at' },
    { capacity: '6', mb: '6000', price: '27.50', network: 'at' },
    { capacity: '7', mb: '7000', price: '31.90', network: 'at' },
    { capacity: '8', mb: '8000', price: '35.00', network: 'at' },
    { capacity: '9', mb: '9000', price: '40.30', network: 'at' },
    { capacity: '10', mb: '10000', price: '47.0', network: 'at' },
    { capacity: '12', mb: '12000', price: '53.40', network: 'at' },
    { capacity: '15', mb: '15000', price: '65.50', network: 'at' },
    { capacity: '20', mb: '20000', price: '84.00', network: 'at' },
    { capacity: '25', mb: '25000', price: '104.50', network: 'at' },
    { capacity: '30', mb: '30000', price: '124.00', network: 'at' },
    { capacity: '40', mb: '40000', price: '162.00', network: 'at' },
    { capacity: '50', mb: '50000', price: '200.00', network: 'at' },
    { capacity: '100', mb: '10000', price: '390.00', network: 'at' },
  ];
  
  // Airtel-Tigo Logo SVG with correct branding colors
  const AirtelTigoLogo = () => (
    <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="85" fill="#0033A0" stroke="#fff" strokeWidth="2"/>
      <path d="M60 100 Q100 60, 140 100 T60 100" stroke="#E40000" strokeWidth="12" fill="none" strokeLinecap="round"/>
      <text x="100" y="140" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="22" fill="white">AirtelTigo</text>
    </svg>
  );

  const handleSelectBundle = (index) => {
    // Only allow selection if Airtel-Tigo is in stock
    if (!networkAvailability.at) {
      setMessage({ 
        text: 'Airtel-Tigo bundles are currently out of stock. Please check back later.', 
        type: 'error' 
      });
      setShowErrorModal(true);
      return;
    }
    
    setSelectedBundleIndex(index === selectedBundleIndex ? null : index);
    setPhoneNumber('');
    setMessage({ text: '', type: '' });
  };

  const validatePhoneNumber = (number) => {
    // Trim the number first to remove any whitespace
    const trimmedNumber = number.trim();
    // Basic Airtel-Tigo Ghana number validation (starts with 026, 027, 056, or 057)
    const pattern = /^(026|027|056|057)\d{7}$/;
    return pattern.test(trimmedNumber);
  };

  // Handle phone number input change with automatic trimming
  const handlePhoneNumberChange = (e) => {
    // Automatically trim the input value as it's entered
    setPhoneNumber(e.target.value.trim());
  };

  const initiateConfirmation = (bundle) => {
    // Reset message state
    setMessage({ text: '', type: '' });
    
    // Check if Airtel-Tigo is available before proceeding
    if (!networkAvailability.at) {
      setMessage({ 
        text: 'Airtel-Tigo bundles are currently out of stock. Please check back later.', 
        type: 'error' 
      });
      setShowErrorModal(true);
      return;
    }
    
    // The phone number is already trimmed in the input handler,
    // but we'll trim again just to be safe
    const trimmedPhoneNumber = phoneNumber.trim();
    
    // Validate phone number
    if (!trimmedPhoneNumber) {
      setMessage({ text: 'Please enter a phone number', type: 'error' });
      setShowErrorModal(true);
      return;
    }
    
    if (!validatePhoneNumber(trimmedPhoneNumber)) {
      setMessage({ 
        text: 'Please enter a valid Airtel-Tigo phone number (must start with 026, 027, 056, or 057 followed by 7 digits)', 
        type: 'error' 
      });
      setShowErrorModal(true);
      return;
    }

    if (!userId) {
      setMessage({ text: 'Please login to purchase data bundles', type: 'error' });
      setShowErrorModal(true);
      return;
    }

    // If all validations pass, show confirmation dialog
    setBundleToConfirm(bundle);
    setShowConfirmation(true);
  };

  const handlePurchase = async () => {
    if (!bundleToConfirm) return;
    
    setIsLoading(true);
    const bundle = bundleToConfirm;
    const trimmedPhoneNumber = phoneNumber.trim();

    try {
      // Check availability one more time before sending order
      await fetchNetworkAvailability();
      
      // Double-check availability after fetching
      if (!networkAvailability.at) {
        setMessage({ 
          text: 'Airtel-Tigo bundles are currently out of stock. Please check back later.', 
          type: 'error' 
        });
        setIsLoading(false);
        setShowConfirmation(false);
        setShowErrorModal(true);
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Calculate data amount in GB for database storage
      const dataAmountInGB = parseFloat(bundle.mb) / 1000;
      
      // Generate a unique reference
      const reference = `DATA-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
       
      // Directly process the order with all required data
      const processResponse = await axios.post('https://datamall.onrender.com/api/data/process-data-order', {
        userId: userId,
        phoneNumber: trimmedPhoneNumber,
        network: bundle.network,
        dataAmount: bundle.mb/1000, // Store in GB
        price: parseFloat(bundle.price),
        reference: reference
      }, { 
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (processResponse.data.success) {
        // Set success message with more details
        setMessage({ 
          text: `✅ ${bundle.capacity}GB data bundle purchased successfully for ${trimmedPhoneNumber}! Your bundle will be activated shortly.`, 
          type: 'success' 
        });
        
        // Set success details for the modal
        setSuccessDetails({
          phoneNumber: trimmedPhoneNumber,
          bundleCapacity: bundle.capacity,
          reference: reference
        });
        
        // Close confirmation modal and reset states
        setSelectedBundleIndex(null);
        setPhoneNumber('');
        
        // Show success modal
        setShowSuccessModal(true);
      } else {
        setMessage({ 
          text: processResponse.data.error || 'Failed to process data order', 
          type: 'error' 
        });
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setMessage({ 
        text: error.response?.data?.error || error.message || 'Failed to purchase data bundle', 
        type: 'error' 
      });
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
      setBundleToConfirm(null);
    }
  };

  const NetworkStatusIndicator = () => (
    <div className="mt-8 p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-2">Network Status</h2>
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${networkAvailability.at ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="mr-1">AirtelTigo:</span>
        <span className={`text-sm font-semibold ${networkAvailability.at ? 'text-green-600' : 'text-red-600'}`}>
          {networkAvailability.at ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
    </div>
  );

  // Confirmation Modal
  const ConfirmationModal = () => {
    if (!showConfirmation || !bundleToConfirm) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-blue-700 dark:bg-blue-800 p-3">
            <h2 className="text-lg font-bold text-white text-center">Confirm Purchase</h2>
          </div>
          
          {/* Body - Simplified */}
          <div className="p-4">
            {/* Warning - Moved to top for visibility */}
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded-r-lg">
              <p className="font-bold text-red-800 dark:text-red-100 text-sm">
                NO REFUNDS will be provided for incorrect phone numbers.
              </p>
            </div>
            
            {/* Phone Number and Price - Essential info only */}
            <div className="mb-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 dark:text-gray-200">Phone:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-200">Price:</span>
                <span className="font-semibold text-gray-900 dark:text-white">GH₵ {bundleToConfirm.price} ({bundleToConfirm.capacity}GB)</span>
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex justify-between space-x-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setBundleToConfirm(null);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition-colors font-medium text-sm"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                    Processing...
                  </div>
                ) : (
                  'Confirm Purchase'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Success Modal
  const SuccessModal = () => {
    if (!showSuccessModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-green-500 p-3">
            <h2 className="text-lg font-bold text-white text-center">Purchase Successful!</h2>
          </div>
          
          {/* Body */}
          <div className="p-4">
            <div className="flex items-center justify-center mb-4 text-green-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            
            <div className="text-center mb-4">
              <p className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {successDetails.bundleCapacity}GB Data Bundle Purchased!
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                Your bundle will be activated shortly on {successDetails.phoneNumber}.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Reference:</p>
              <p className="font-mono bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-center text-gray-800 dark:text-gray-200">
                {successDetails.reference}
              </p>
            </div>
            
            {/* Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Error Modal
  const ErrorModal = () => {
    if (!showErrorModal || !message.text || message.type !== 'error') return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-red-500 p-3">
            <h2 className="text-lg font-bold text-white text-center">Error</h2>
          </div>
          
          {/* Body */}
          <div className="p-4">
            <div className="flex items-center justify-center mb-4 text-red-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            
            <div className="text-center mb-4">
              <p className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                Unable to Complete Request
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                {message.text}
              </p>
            </div>
            
            {/* Button */}
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Define animation for modals
  const fadeInAnimation = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
  `;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Airtel-Tigo Non-Expiry Bundles</h1>
      
      {/* We no longer need to show messages in the main page as they all appear in modals */}

      {checkingAvailability ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Checking availability...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bundles.map((bundle, index) => (
            <div key={index} className="flex flex-col relative">
              <div 
                className={`flex flex-col bg-blue-800 overflow-hidden shadow-md transition-transform duration-300 ${networkAvailability.at ? 'cursor-pointer hover:translate-y-[-5px]' : 'cursor-not-allowed hover:translate-y-[-5px]'} ${selectedBundleIndex === index ? 'rounded-t-lg' : 'rounded-lg'}`}
                onClick={() => handleSelectBundle(index)}
              >
                <div className="flex flex-col items-center justify-center p-5 space-y-3">
                  <div className="w-20 h-20 flex justify-center items-center">
                    <AirtelTigoLogo />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {bundle.capacity} GB
                  </h3>
                </div>
                <div className="grid grid-cols-2 text-white bg-black"
                     style={{ borderRadius: selectedBundleIndex === index ? '0' : '0 0 0.5rem 0.5rem' }}>
                  <div className="flex flex-col items-center justify-center p-3 text-center border-r border-r-gray-600">
                    <p className="text-lg">GH₵ {bundle.price}</p>
                    <p className="text-sm font-bold">Price</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <p className="text-lg">No-Expiry</p>
                    <p className="text-sm font-bold">Duration</p>
                  </div>
                </div>
                
                {/* Small out of stock badge in the corner */}
                {!networkAvailability.at && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-block px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-md">
                      OUT OF STOCK
                    </span>
                  </div>
                )}
              </div>
              
              {selectedBundleIndex === index && networkAvailability.at && (
                <div className="bg-blue-800 p-4 rounded-b-lg shadow-md">
                  <div className="mb-4">
                    <input
                      type="tel"
                      className="w-full px-4 py-2 rounded bg-blue-100 text-black placeholder-blue-700 border border-blue-500 focus:outline-none focus:border-blue-800"
                      placeholder="Enter recipient number (e.g., 0271234567)"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                    />
                  </div>
                  <button
                    onClick={() => initiateConfirmation(bundle)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Purchase'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Network Status Indicator */}
      <NetworkStatusIndicator />
      
      {/* Confirmation Modal */}
      <ConfirmationModal />
      
      {/* Success Modal */}
      <SuccessModal />
      
      {/* Error Modal */}
      <ErrorModal />
      
      {/* Add style for animations */}
      <style dangerouslySetInnerHTML={{ __html: fadeInAnimation }} />
    </div>
  );
};

export default AirtelTigoBundleCards;