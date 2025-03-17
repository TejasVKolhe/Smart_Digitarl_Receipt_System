const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const path = require('path');
require('dotenv').config();
require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Fix CORS configuration (you have it defined twice)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5000'], // Allow both server and client origins
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Passport middleware
app.use(passport.initialize());

// Passport config
require('./config/passport')(passport);

// Basic route for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Routes
const authRoutes = require('./routes/auth');
const receiptRoutes = require('./routes/receipts');

app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);

// Connect to MongoDB - Add more debugging
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/receipt_manager', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  console.log('Connection string:', process.env.MONGO_URI ? 'Using environment variable' : 'Using default localhost');
})
.catch(err => console.log('MongoDB connection error:', err));

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
