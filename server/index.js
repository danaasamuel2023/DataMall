const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const ConnectDB = require('./DatabaseConnection/connection.js');
const authRoutes = require('./routes/SignUp.js');
const dataOrderRoutes = require('./routes/placeOrder.js');
const Depoite = require('./routes/deposite.js');
const adminOrder = require('./routes/ordermanagement.js')
const Profits = require('./routes/profits.js')
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to Database
ConnectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataOrderRoutes);
app.use('/api', Depoite);
app.use('/api', adminOrder);
app.use('/api', Profits);

// Default Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
