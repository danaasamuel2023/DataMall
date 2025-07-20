const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { User } = require('../schema/schema');

dotenv.config();
const router = express.Router();

// Error logging helper
const errorLogger = (error, route) => {
  console.error(`[${new Date().toISOString()}] Error in ${route}:`, {
    message: error.message,
    stack: error.stack
  });
};

// REGISTER ROUTE
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phoneNumber, role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error(`Registration Error: Email ${email} already exists.`);
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: 'user', // Set default role to 'user'
      ...(phoneNumber ? { phoneNumber } : {}) // Only add phoneNumber if provided
    });
    await newUser.save();
    
    console.log(`User registered successfully: ${email}`);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    errorLogger(error, 'User Registration');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`Login Error: Email ${email} not found.`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error(`Login Error: Incorrect password for ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role // Include role in token for authorization checks
      }, 
      process.env.JWT_SECRET || 'BiGnAH', 
      { expiresIn: '7d' }
    );
    
    console.log(`Login successful for: ${email}`);
    res.json({ 
      message: 'Login successful', 
      token,
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    errorLogger(error, 'User Login');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET USER PROFILE
router.get('/profile', async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'BiGnAH');
    
    // Get user by id (exclude password)
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    errorLogger(error, 'Get User Profile');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;