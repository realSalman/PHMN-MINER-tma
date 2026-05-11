const mongoose = require('mongoose');



const connectionOptions = {
  maxPoolSize: 100,
  minPoolSize: 20,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  w: 'majority',
  wtimeoutMS: 10000,
  journal: true,
  readPreference: 'secondaryPreferred',
  readConcern: { level: 'majority' },
  retryWrites: true,
  retryReads: true,
  tls: process.env.MONGODB_SSL === 'true',
  compressors: ['zlib'],
  zlibCompressionLevel: 6,
  bufferCommands: false,
  heartbeatFrequencyMS: 10000,
};



async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.CONNECTION_URI) {
    throw new Error('CONNECTION_URI environment variable is not set');
  }

  try {
    await mongoose.connect(process.env.CONNECTION_URI, connectionOptions);
    console.log('✅ MongoDB connected');
    
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}



process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
});

module.exports = mongoose;
module.exports.connectToDatabase = connectToDatabase;
