require('dotenv').config(); // Ensure environment variables are loaded at the start

// Add this near the top of your file

// Ensure tokens directory exists
const fs = require('fs');
const path = require('path');
const tokensDir = path.join(__dirname, 'tokens');

if (!fs.existsSync(tokensDir)) {
  console.log('📁 Creating tokens directory');
  fs.mkdirSync(tokensDir, { recursive: true });
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false })); // Security headers
app.disable('x-powered-by'); // Hide Express from attackers
app.use(morgan('dev')); // Logger for development

// Replace your current CORS configuration with this:

const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Add OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add near the top of your middleware stack

// Debug middleware to log all redirects
app.use((req, res, next) => {
  const originalRedirect = res.redirect;
  res.redirect = function (url) {
    console.log(`🔄 Redirecting to: ${url}`);
    return originalRedirect.call(this, url);
  };
  next();
});

// Passport middleware
app.use(passport.initialize());
require('./config/passport')(passport); // Passport config

// Test API route
app.get('/api/test', (req, res) => res.status(200).json({ message: '✅ API is working!' }));

// Update your API routes to handle CORS properly

// Routes
const authRoutes = require('./routes/auth');
const receiptRoutes = require('./routes/receipts');
const uploadRoutes = require('./routes/upload');
const gmailRoutes = require('./routes/gmail');

// Apply CORS to all API routes
app.use('/api/gmail', cors(corsOptions), gmailRoutes);
app.use('/api/auth', cors(corsOptions), authRoutes);
app.use('/api/receipts', cors(corsOptions), receiptRoutes);
app.use('/api/upload', cors(corsOptions), uploadRoutes);

// Add this to your routes if not already there
app.use('/api/gmail', require('./routes/gmail'));

// Make sure the OAuth callback route is registered
app.get('/api/auth/google/callback', (req, res) => {
  res.redirect(`/api/gmail/callback${req.url.substring(req.url.indexOf('?'))}`);
});

// Add this near your other routes

// Receipt routes
app.use('/api/receipts', require('./routes/receipts'));

// Add this route near your other routes

// Debug route to test CORS
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'CORS is working correctly!',
    headers: {
      origin: req.headers.origin,
      host: req.headers.host
    },
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB
mongoose.set("strictQuery", false); // Avoid deprecation warning
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Handle MongoDB connection errors
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection lost:', err);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🔻 Shutting down server...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed.');
  process.exit(0);
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Add this to your server.js file

// Handle the client-side routes for SPA
app.get(['/dashboard/*', '/auth/*', '/profile/*'], (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Add a proxy route to handle the redirect from Google OAuth
app.get('/dashboard/receipts', (req, res) => {
  const { auth, message } = req.query;
  let redirectUrl = 'http://localhost:3000/dashboard/receipts';
  
  if (auth) {
    redirectUrl += `?auth=${auth}`;
    if (message) {
      redirectUrl += `&message=${message}`;
    }
  }
  
  res.redirect(redirectUrl);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Handle unexpected errors
process.on('unhandledRejection', err => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
