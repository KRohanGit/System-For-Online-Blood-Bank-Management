const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI (or MONGO_URI).');
  }

  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: 2,
    retryWrites: true
  };

  const maxAttempts = Number(process.env.DB_CONNECT_RETRIES || 5);
  const retryDelayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 4000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Connecting to MongoDB (attempt ${attempt}/${maxAttempts})...`);
      const conn = await mongoose.connect(mongoUri, options);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      console.log(`Database: ${conn.connection.name}`);
      return;
    } catch (error) {
      console.error(`MongoDB connection error (attempt ${attempt}):`, error.message);
      if (attempt === maxAttempts) {
        console.error('Please verify MongoDB Atlas credentials/network allowlist and try again.');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

// This one here handle the connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

module.exports = connectDB;
