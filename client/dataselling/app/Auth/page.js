'use client'
import { useState, useEffect } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2, Database, User, Mail, Phone, KeyRound, UserPlus, LogIn, Sparkles } from "lucide-react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push('/');
    }
  }, [router]);

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleAuthMode = () => {
    setIsSignup(!isSignup);
    setError("");
    setSuccess("");
    reset();
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = isSignup ? "register" : "login";
      const response = await axios.post(`https://datamall.onrender.com/api/auth/${endpoint}`, data);
      
      if (!isSignup) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userId", response.data.userId);
        localStorage.setItem("userrole", response.data.role);
        
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setSuccess("Account created successfully! You can now login.");
        setTimeout(() => {
          setIsSignup(false);
          reset();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 p-4">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        {/* Logo Section */}
        <motion.div 
          variants={itemVariants}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4 relative">
            <Database className="w-10 h-10 text-white" />
            <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Datamall
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Your Data Hub Marketplace</p>
        </motion.div>

        {/* Form Card */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
            {isSignup ? "Create Your Account" : "Welcome Back"}
          </h2>
          
          {/* Alert Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {error}
                </p>
              </motion.div>
            )}
            
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              >
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  {success}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <AnimatePresence mode="wait">
              {isSignup && (
                <>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="name"
                        type="text"
                        {...register("name", { required: isSignup && "Full name is required" })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                                  focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent
                                  transition-all duration-200"
                        placeholder="Taryn "
                      />
                    </div>
                    {errors.name && (
                      <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="username"
                        type="text"
                        {...register("username", {   
                          required: isSignup && "Username is required",
                          minLength: { value: 3, message: "Username must be at least 3 characters" }
                        })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                                  focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent
                                  transition-all duration-200"
                        placeholder="taryn"
                      />
                    </div> 
                    {errors.username && (
                      <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="phone"
                        type="tel"
                        {...register("phone", { 
                          required: isSignup && "Phone number is required",
                          pattern: { value: /^[0-9+\-\s()]+$/, message: "Invalid phone number" }
                        })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                                  focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent
                                  transition-all duration-200"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  {...register("email", { 
                    required: "Email is required",
                    pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" }
                  })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                            focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent
                            transition-all duration-200"
                  placeholder="taryn@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password", { 
                    required: "Password is required",
                    minLength: { value: 6, message: "Password must be at least 6 characters" }
                  })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                            focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent
                            transition-all duration-200"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={togglePassword} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 
                           hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 
                       text-white font-medium rounded-lg shadow-lg hover:shadow-xl
                       disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {isSignup ? <UserPlus size={20} /> : <LogIn size={20} />}
                  <span>{isSignup ? "Create Account" : "Sign In"}</span>
                </>
              )}
            </motion.button>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 
                           dark:hover:text-indigo-300 transition-colors duration-200"
                >
                  {isSignup ? "Sign In" : "Create Account"}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Footer */}
        <motion.p 
          variants={itemVariants}
          className="text-center mt-8 text-xs text-gray-500 dark:text-gray-400"
        >
          By continuing, you agree to Datamall's Terms of Service and Privacy Policy
        </motion.p>
      </motion.div>
    </div>
  );
}