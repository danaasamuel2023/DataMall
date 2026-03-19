const mongoose = require('mongoose');

const ConnectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://datamartghana:0246783840sa@cluster0.s33wv2s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        heartbeatFrequencyMS: 5000,
      });
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
      if (attempt === MAX_RETRIES) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

module.exports = ConnectDB;
