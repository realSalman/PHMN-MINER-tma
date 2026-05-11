const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const socketManager = require('./socket/socketManager');
const mongoose = require('./config/database');
const { connectToDatabase } = mongoose;
const { initializeBot } = require('./bot/telegramBot');

const app = express();

app.use(require('cors')({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json());
app.use(express.static('build', {
  maxAge: '0',
  etag: false,
}));

app.use('/api', require('./routes/api'));

app.get(/^(?!\/(api|socket\.io)).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
const server = http.createServer(app);


socketManager.initialize(server);


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎯 Server running on port ${PORT}`);
});


(async () => {
  try {
    await connectToDatabase();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    console.log('⚠️ Server will continue running without database connection');
  }
})();

initializeBot();
