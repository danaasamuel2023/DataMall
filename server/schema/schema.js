const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: {
    type: String,
    // unique: true,  // Only if you need uniqueness
    sparse: true,  // This will only apply the index to documents that have the field
    default: undefined  // This ensures the field isn't set if not provided
  },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'agent'], 
    default: 'user' 
  },
  walletBalance: { type: Number, default: 0 }, // Wallet balance field
  userCapacity: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const DataOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserNASH', required: true },
  network: { type: String, required: true, enum: ['mtn', 'Tigo', 'Airtel','at','TELECEL','afa-registration'] },
  dataAmount: { type: Number, required: true },
  price: { type: Number, required: true },
  phoneNumber: { type: String, required: true },
  reference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending','processing','completed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  // AFA Registration specific fields
  fullName: { type: String },
  idType: { type: String },
  idNumber: { type: String },
  dateOfBirth: { type: Date },
  occupation: { type: String },
  location: { type: String },
  completedAt: { type: Date },
  failureReason: { type: String }
});


const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "purchase", "refund"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "GHS",
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
    balanceAfter: {
      type: Number,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Add this to your schema.js file
const NetworkAvailabilitySchema = new mongoose.Schema({
  network: { 
    type: String, 
    required: true, 
    unique: true,
    enum: ['mtn', 'tigo', 'telecel','at','afa-registration']
  },
  available: { 
    type: Boolean, 
    default: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create the model


// module.exports = { Transaction };

const User = mongoose.model('UserNASH', UserSchema);
const DataOrder = mongoose.model('DataOrder', DataOrderSchema);
const Transaction = mongoose.model("TransactionNASH", TransactionSchema);
const NetworkAvailability = mongoose.model('NetworkAvailability', NetworkAvailabilitySchema);


module.exports = { User, DataOrder, Transaction,NetworkAvailability};