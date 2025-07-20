// pages/admin/network-management.js
'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

function NetworkManagement() {
  const [networks, setNetworks] = useState({
    mtn: true,
    tigo: true,
    telecel: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  // Fetch network status on component mount
  useEffect(() => {
    fetchNetworkStatus();
  }, []);

  // Fetch network status from API
  const fetchNetworkStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('https://datamall.onrender.com/api/networks-availability', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setNetworks(response.data.networks);
      } else {
        setError('Failed to fetch network status');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle network availability
  const toggleNetwork = async (network, newStatus) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post('https://datamall.onrender.com/api/toggle-network', 
        { 
          network, 
          available: newStatus 
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        // Update local state
        setNetworks(prev => ({
          ...prev,
          [network]: newStatus
        }));
        setSuccess(`${network.toUpperCase()} is now ${newStatus ? 'in stock' : 'out of stock'}`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(response.data.error || 'Failed to update network status');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Network Management</title>
      </Head>
      
      <div className="max-w-4xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center sm:text-left">Network Availability Management</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 sm:px-4 sm:py-3 mb-4 rounded text-sm sm:text-base">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 sm:px-4 sm:py-3 mb-4 rounded text-sm sm:text-base">
            {success}
          </div>
        )}
        
        {loading && !error ? (
          <div className="flex justify-center my-6 sm:my-8">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {/* For large screens: Table view */}
            <div className="hidden sm:block">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Network
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(networks).map(([network, available]) => (
                    <tr key={network}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {network.toUpperCase()}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {available ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleNetwork(network, !available)}
                          className={`px-3 py-1.5 text-sm font-medium text-white rounded-md ${
                            available 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                          disabled={loading}
                        >
                          {available ? 'Mark Out of Stock' : 'Mark In Stock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* For mobile: Card view */}
            <div className="sm:hidden">
              <ul className="divide-y divide-gray-200">
                {Object.entries(networks).map(([network, available]) => (
                  <li key={network} className="px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{network.toUpperCase()}</div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        available 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {available ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => toggleNetwork(network, !available)}
                        className={`w-full px-3 py-2 text-sm font-medium text-white rounded-md ${
                          available 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                        disabled={loading}
                      >
                        {available ? 'Mark Out of Stock' : 'Mark In Stock'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the component with the auth HOC, requiring admin role
export default NetworkManagement