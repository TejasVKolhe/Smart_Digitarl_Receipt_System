// Import required modules
const express = require('express');
const app = express();
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const receiptRoutes = require('./routes/receipts');
const gmailRoutes = require('./routes/gmail'); // Ensure this is correct

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/gmail', gmailRoutes); // Ensure this is correct

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;