const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function dropPhoneNumberIndex() {
  try {
    // Connect to MongoDB
    const password = '0246783840Sa';
    await mongoose.connect(process.env.MONGO_URI ||  `mongodb+srv://dajounimarket:${password}@cluster0.kp8c2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`);
    console.log('Connected to MongoDB');
    
    // Get the collection
    const collection = mongoose.connection.collection('usernashes');
    
    // Drop the index
    await collection.dropIndex('phoneNumber_1');
    console.log('Successfully dropped phoneNumber_1 index');
    
    // Close connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error dropping index:', error);
  }
}

// Run the function
dropPhoneNumberIndex();