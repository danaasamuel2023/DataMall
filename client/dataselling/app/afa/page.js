// pages/afa-registration.js
'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Head from 'next/head';

export default function AfaRegistration() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('');
  
  // Form fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState('Ghana Card');
  const [idNumber, setIdNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  
  // Fixed price for AFA registration
  const fixedPrice = 8;

  useEffect(() => {
    // Check if dark mode is enabled in system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);

    // Set up event listener for dark mode changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    // Get authentication data from localStorage
    const storedToken = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    const storedUserRole = localStorage.getItem('userrole');

    if (!storedToken || !storedUserId) {
      router.push('/Auth'); // Redirect to login if not authenticated
    } else {
      setToken(storedToken);
      setUserId(storedUserId);
      setUserRole(storedUserRole);
    }

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validate all required fields
    if (!phoneNumber || !fullName || !idType || !idNumber || !dateOfBirth || !occupation || !location) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://bignsah.onrender.com/api/data'}/process-afa-registration`,
        {
          userId,
          phoneNumber,
          fullName,
          idType,
          idNumber,
          dateOfBirth,
          occupation,
          location,
          price: fixedPrice,
          reference: `AFA-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('AFA Registration completed successfully!');
        // Reset form fields
        setPhoneNumber('');
        setFullName('');
        setIdNumber('');
        setDateOfBirth('');
        setOccupation('');
        setLocation('');
        // Redirect to orders page after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to process registration');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during registration');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName = `w-full px-3 py-2 border rounded-md ${
    darkMode 
      ? 'bg-gray-700 border-gray-600 text-white' 
      : 'bg-gray-50 border-gray-300 text-gray-900'
  }`;

  const labelClassName = `block text-sm font-medium mb-2 ${
    darkMode ? 'text-gray-300' : 'text-gray-700'
  }`;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Head>
        <title>AFA Registration</title>
        <meta name="description" content="Register for AFA service" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container mx-auto px-4 py-10">
        <div className={`max-w-lg mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
          <h1 className={`text-2xl font-bold mb-6 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            AFA Registration
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative dark:bg-red-900 dark:text-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative dark:bg-green-900 dark:text-green-100">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="fullName" className={labelClassName}>
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClassName}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="phoneNumber" className={labelClassName}>
                Phone Number *
              </label>
              <input
                type="text"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={inputClassName}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label htmlFor="idType" className={labelClassName}>
                  ID Type *
                </label>
                <select
                  id="idType"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className={inputClassName}
                  required
                >
                  <option value="Ghana Card">Ghana Card</option>
                  {/* <option value="Passport">Passport</option> */}
                  <option value="Voter ID">Voter ID</option>
                  {/* <option value="Driver License">Driver License</option> */}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="idNumber" className={labelClassName}>
                  ID Number *
                </label>
                <input
                  type="text"
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className={inputClassName}
                  placeholder="Enter ID number"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="dateOfBirth" className={labelClassName}>
                Date of Birth *
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputClassName}
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="occupation" className={labelClassName}>
                Occupation *
              </label>
              <input
                type="text"
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className={inputClassName}
                placeholder="Enter your occupation"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="location" className={labelClassName}>
                Location *
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClassName}
                placeholder="Enter your location"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="price" className={labelClassName}>
                Price
              </label>
              <div className={inputClassName}>
                GHC {fixedPrice.toFixed(2)}
              </div>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Fixed price for AFA Registration
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
                ${darkMode ? 'focus:ring-offset-gray-900' : ''}`}
            >
              {isLoading ? 'Processing...' : 'Register'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}