'use client'
import React, { useState, useEffect } from 'react';
import { Zap, Shield, Clock, TrendingUp, ChevronRight, Star, Users, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Network Provider Card Component with unique gradient design
const NetworkProviderCard = ({ provider }) => {
  const router = useRouter();
  
  // Provider-specific styling with gradient designs
  const providerDetails = {
    mtn: {
      name: "MTN Data Plans",
      gradient: "from-yellow-400 to-orange-500",
      shadowColor: "shadow-yellow-500/30",
      icon: <Globe size={28} className="text-white" />,
      badge: "Most Popular",
      badgeColor: "bg-orange-500",
      features: ["Fast delivery", "24/7 support", "Best coverage"],
      logo: (
        <div className="relative">
          <div className="text-3xl font-black text-white tracking-tight">MTN</div>
          <div className="absolute -bottom-1 -right-2 w-2 h-2 bg-white rounded-full"></div>
        </div>
      )
    },
    at: {
      name: "AT Data Bundles",
      gradient: "from-blue-500 to-indigo-600",
      shadowColor: "shadow-blue-500/30",
      icon: <Zap size={28} className="text-white" />,
      badge: "Fast Speed",
      badgeColor: "bg-indigo-600",
      features: ["5G ready", "Flexible plans", "No expiry"],
      logo: (
        <div className="flex items-center">
          <div className="text-3xl font-black">
            <span className="text-red-500">a</span>
            <span className="text-white">t</span>
          </div>
          <div className="ml-1 w-1.5 h-8 bg-white/50 rounded-full"></div>
        </div>
      )
    },
    telecel: {
      name: "TELECEL Packages",
      gradient: "from-red-500 to-pink-600",
      shadowColor: "shadow-red-500/30",
      icon: <Shield size={28} className="text-white" />,
      badge: "Best Value",
      badgeColor: "bg-pink-600",
      features: ["Quick processing", "Competitive rates", "Reliable service"],
      logo: (
        <div className="relative">
          <div className="text-2xl font-black text-white">TELECEL</div>
          <div className="absolute -top-1 -right-2 text-xs text-yellow-300">★</div>
        </div>
      )
    },
   
  };
  
  const details = providerDetails[provider];
  
  const handleClick = () => {
    router.push(`/${provider}`);
  };
  
  return (
    <div
      onClick={handleClick}
      className={`relative bg-gradient-to-br ${details.gradient} rounded-2xl overflow-hidden cursor-pointer group hover:shadow-2xl ${details.shadowColor} shadow-lg transition-all duration-500 transform hover:scale-105 hover:-translate-y-1`}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full transform translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full transform -translate-x-12 translate-y-12"></div>
      </div>
      
      {/* Badge */}
      <div className={`absolute top-3 right-3 ${details.badgeColor} text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg`}>
        {details.badge}
      </div>
      
      <div className="relative p-6">
        {/* Logo */}
        <div className="mb-4">
          {details.logo}
        </div>
        
        {/* Content */}
        <h3 className="text-xl font-bold text-white mb-3">{details.name}</h3>
        
        {/* Features */}
        <ul className="space-y-2 mb-4">
          {details.features.map((feature, index) => (
            <li key={index} className="flex items-center text-white/90 text-sm">
              <Star size={12} className="mr-2 text-yellow-300" />
              {feature}
            </li>
          ))}
        </ul>
        
        {/* CTA Button */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center">
            {details.icon}
            <span className="ml-2 text-white font-semibold">Get Started</span>
          </div>
          <ChevronRight className="text-white group-hover:translate-x-2 transition-transform" size={20} />
        </div>
      </div>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
  </div>
);

// Main Services Dashboard Component
const ServicesNetwork = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    
    if (token && userId) {
      setIsLoggedIn(true);
    }
    
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  const scrollToServices = (e) => {
    e.preventDefault();
    document.getElementById('services-section').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section with animated gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 animate-gradient"></div>
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Animated shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed"></div>
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6 inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Globe className="text-white mr-2" size={16} />
              <span className="text-white text-sm font-semibold">Ghana's #1 Data Marketplace</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">DataMall</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
              Your one-stop shop for affordable data bundles. Buy, sell, and save on all major networks.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                href="/mtn" 
                className="group bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-bold transition-all transform hover:scale-105 shadow-xl flex items-center"
              >
                Start Selling
                <TrendingUp className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Link>
              <a 
                href="#services-section"
                onClick={scrollToServices}
                className="bg-white/20 backdrop-blur-sm text-white border-2 border-white hover:bg-white hover:text-purple-600 px-8 py-4 rounded-lg font-bold transition-all transform hover:scale-105"
              >
                Explore Plans
              </a>
            </div>
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-white/80 text-sm">Happy Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-white/80 text-sm">Support</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-white/80 text-sm">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Choose DataMall?</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Trusted by thousands for reliable data services across Ghana
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <FeatureCard 
            icon={<Zap className="text-white" size={24} />}
            title="Fast Processing"
            description="Quick order processing with timely delivery of your data bundles"
          />
          <FeatureCard 
            icon={<Shield className="text-white" size={24} />}
            title="Secure Platform"
            description="Safe and encrypted transactions to protect your information"
          />
          <FeatureCard 
            icon={<Clock className="text-white" size={24} />}
            title="Always Available"
            description="Place orders anytime - our platform is available 24/7"
          />
          <FeatureCard 
            icon={<Users className="text-white" size={24} />}
            title="Best Prices"
            description="Competitive rates on all networks - save more on every purchase"
          />
        </div>
      </div>
      
      {/* Services Section */}
      <div id="services-section" className="container mx-auto px-4 py-8 max-w-6xl scroll-mt-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-purple-100 dark:bg-purple-900/30 rounded-full px-4 py-2 mb-4">
            <span className="text-purple-600 dark:text-purple-400 text-sm font-semibold">CHOOSE YOUR NETWORK</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Select Your Provider
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            We support all major networks in Ghana with competitive rates and reliable delivery
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <NetworkProviderCard provider="mtn" />
          <NetworkProviderCard provider="at" />
          <NetworkProviderCard provider="telecel" />
          <NetworkProviderCard provider="afa" />
        </div>
        
        {/* CTA Section for logged in users */}
        {isLoggedIn && (
          <div className="mt-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-center shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Top Up?</h3>
            <p className="text-white/90 mb-6 max-w-2xl mx-auto">
              Add funds to your DataMall wallet and enjoy seamless transactions with instant activation
            </p>
            <Link 
              href="/deposite" 
              className="inline-flex items-center bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
            >
              Deposit Now
              <ChevronRight className="ml-2" size={20} />
            </Link>
          </div>
        )}
      </div>
      
      {/* Footer */}
      {/* <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg inline-block mb-4">
                <h3 className="text-xl font-black">DataMall</h3>
              </div>
              <p className="text-gray-400">Your trusted partner for affordable data solutions in Ghana.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/mtn" className="hover:text-white transition-colors">MTN Bundles</Link></li>
                <li><Link href="/at" className="hover:text-white transition-colors">AT Packages</Link></li>
                <li><Link href="/telecel" className="hover:text-white transition-colors">Telecel Data</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <p className="text-gray-400 mb-4">Need help? We're here 24/7</p>
              <p className="text-gray-400">support@datamall.gh</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 DataMall. All rights reserved.</p>
          </div>
        </div>
      </footer> */}
      
      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 15s ease infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(120deg); }
          66% { transform: translateY(20px) rotate(240deg); }
        }
        
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float 20s ease-in-out infinite;
          animation-delay: 5s;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ServicesNetwork;