const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',  // Frontend URL
    credentials: true                  // Allow cookies/session handling
  }));
  
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Routes
app.get('/', (req, res) => {
  res.send('Digital Receipt Management System');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
