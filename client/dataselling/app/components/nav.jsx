'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Home, CreditCard, List, User, LogOut, Users, Wallet, ShoppingBag, TrendingUp, ChevronRight, Globe, Zap, Shield, Star } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showLogoutMessage, setShowLogoutMessage] = useState(false);
  const [showNetworksDropdown, setShowNetworksDropdown] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    const storedUserRole = localStorage.getItem('userrole');
    
    if (userId) {
      setIsLoggedIn(true);
      setUsername(storedUsername || 'User');
      setUserRole(storedUserRole || '');
      
      // Fetch wallet balance if logged in
      if (token) {
        fetchWalletBalance(userId, token);
      }
    }
    
    // Close mobile menu when clicking outside
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('#mobile-menu') && !event.target.closest('#menu-button')) {
        setIsMobileMenuOpen(false);
      }
      // Close dropdown when clicking outside
      if (showNetworksDropdown && !event.target.closest('#networks-dropdown')) {
        setShowNetworksDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen, showNetworksDropdown]);

  const fetchWalletBalance = async (userId, token) => {
    try {
      const response = await fetch(`https://datamall.onrender.com/api/wallet/balance?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    localStorage.removeItem('userrole');
    
    // Update state
    setIsLoggedIn(false);
    setIsMobileMenuOpen(false);
    
    // Show logout success message
    setShowLogoutMessage(true);
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      setShowLogoutMessage(false);
      router.push('/Auth');
    }, 1500);
  };

  const isAdmin = userRole === 'adm';

  // Network providers configuration
  const networkProviders = [
    {
      id: 'mtn',
      name: 'MTN',
      icon: <Globe size={16} />,
      color: 'text-yellow-600',
      bgColor: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
    },
    {
      id: 'at',
      name: 'AT',
      icon: <Zap size={16} />,
      color: 'text-blue-600',
      bgColor: 'hover:bg-blue-50 dark:hover:bg-blue-900/30'
    },
    {
      id: 'telecel',
      name: 'Telecel',
      icon: <Shield size={16} />,
      color: 'text-red-600',
      bgColor: 'hover:bg-red-50 dark:hover:bg-red-900/30'
    },
  
  ];

  return (
    <>
      {/* Logout success message */}
      {showLogoutMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl z-50 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-full p-2 mr-3">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold">Logged out successfully! Redirecting...</p>
          </div>
        </div>
      )}
    
      <nav className="w-full bg-white dark:bg-gray-900 shadow-lg sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <h1 className="text-xl font-black tracking-tight">DataMall</h1>
                  </div>
                </Link>
              </div>
              
              {/* Desktop menu */}
              <div className="hidden md:ml-10 md:flex md:space-x-1">
                <Link href="/" className="text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center group">
                  <Home size={18} className="mr-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                  Dashboard
                </Link>
                
                {/* Networks Dropdown */}
                <div className="relative" id="networks-dropdown">
                  <button
                    onClick={() => setShowNetworksDropdown(!showNetworksDropdown)}
                    className="text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center group"
                  >
                    <ShoppingBag size={18} className="mr-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                    Buy Data
                    <ChevronRight size={16} className={`ml-1 transition-transform ${showNetworksDropdown ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showNetworksDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {networkProviders.map((provider) => (
                        <Link
                          key={provider.id}
                          href={`/${provider.id}`}
                          className={`flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 ${provider.bgColor} transition-all duration-200`}
                          onClick={() => setShowNetworksDropdown(false)}
                        >
                          <span className={`${provider.color} mr-3`}>{provider.icon}</span>
                          {provider.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                
                <Link href="/deposite" className="text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center group">
                  <Wallet size={18} className="mr-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                  Top Up
                </Link>
                <Link href="/orders" className="text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center group">
                  <List size={18} className="mr-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                  Orders
                </Link>
                {isAdmin && (
                  <Link href="/users" className="text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center group">
                    <Users size={18} className="mr-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                    Users
                  </Link>
                )}
              </div>
            </div>
            
            {/* User menu */}
            <div className="hidden md:flex items-center space-x-3">
              {isLoggedIn ? (
                <>
                  {/* Wallet Balance Card */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg px-3 py-1.5 border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center">
                      <Wallet className="text-purple-600 dark:text-purple-400 mr-2" size={16} />
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Balance</span>
                        <span className="text-purple-700 dark:text-purple-300 font-bold text-sm">GHS {walletBalance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* User Info */}
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-2">
                      <User size={18} className="text-white" />
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{username}</span>
                      {isAdmin && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full">Admin</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-all duration-200 flex items-center group"
                  >
                    <LogOut size={16} className="mr-2 group-hover:text-red-500 transition-colors" />
                    Log out
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/Auth" className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200">
                    Log in
                  </Link>
                  <Link href="/Auth" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-lg flex items-center">
                    Get Started
                    <ChevronRight size={16} className="ml-1" />
                  </Link>
                </div>
              )}
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              {isLoggedIn && (
                <div className="mr-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg px-2 py-1 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center">
                    <Wallet className="text-purple-600 dark:text-purple-400 mr-1" size={14} />
                    <span className="text-purple-700 dark:text-purple-300 font-bold text-sm">GHS {walletBalance.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <button
                id="menu-button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 focus:outline-none transition-all duration-200"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X size={24} />
                ) : (
                  <Menu size={24} />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu - Slide from right */}
        <div 
          id="mobile-menu"
          className={`fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Mobile menu header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-pink-600">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-lg font-bold text-white">DataMall</span>
                <ShoppingBag className="ml-2 text-white" size={20} />
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg text-white hover:bg-white/20 focus:outline-none transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* User info in mobile menu */}
          {isLoggedIn && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-3">
                  <User size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-gray-900 dark:text-white font-medium">{username}</span>
                    {isAdmin && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full">Admin</span>
                    )}
                  </div>
                  <div className="mt-2 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Balance:</span>
                      <span className="text-purple-700 dark:text-purple-300 font-bold text-sm">GHS {walletBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Mobile menu items */}
          <div className="px-2 py-4 space-y-1">
            <Link 
              href="/" 
              className="flex items-center text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Home size={18} className="mr-3 text-purple-600 dark:text-purple-400" />
              Dashboard
            </Link>
            
            {/* Networks Section in Mobile */}
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Buy Data
              </div>
              {networkProviders.map((provider) => (
                <Link
                  key={provider.id}
                  href={`/${provider.id}`}
                  className={`flex items-center text-gray-700 dark:text-gray-200 ${provider.bgColor} px-4 py-3 rounded-lg text-base font-medium transition-all duration-200`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className={`${provider.color} mr-3`}>{provider.icon}</span>
                  {provider.name}
                </Link>
              ))}
            </div>
            
            <Link 
              href="/deposite" 
              className="flex items-center text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Wallet size={18} className="mr-3 text-purple-600 dark:text-purple-400" />
              Top Up Wallet
            </Link>
            <Link 
              href="/orders" 
              className="flex items-center text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <List size={18} className="mr-3 text-purple-600 dark:text-purple-400" />
              My Orders
            </Link>
            {isAdmin && (
              <Link 
                href="/users" 
                className="flex items-center text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users size={18} className="mr-3 text-purple-600 dark:text-purple-400" />
                Manage Users
              </Link>
            )}
          </div>
          
          {/* Mobile menu footer */}
          <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 transition-all duration-200"
              >
                <LogOut size={18} className="mr-2" />
                Log out
              </button>
            ) : (
              <div className="space-y-3">
                <Link 
                  href="/Auth" 
                  className="block w-full text-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link 
                  href="/Auth" 
                  className="block w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
        
        {/* Overlay when mobile menu is open */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </nav>
    </>
  );
}