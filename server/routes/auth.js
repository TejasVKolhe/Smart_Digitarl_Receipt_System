// Backend code (Node.js/Express)

// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { handleCallback } = require('../services/gmailAuth');
// FIXED: Remove the duplicate passport declaration
// const passport = require("passport");  <-- THIS LINE CAUSES THE ERROR

// Import passport from the app
const passport = require('passport');

// Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    // Create user with hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = new User({
      username,
      email,
      password: hashedPassword// Use the hashed password here
    });

    // Save user
    await newUser.save();

    // Create JWT token
    const payload = {
      id: newUser.id,
      email: newUser.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'jwt_secret', {
      expiresIn: '1d'
    });

    res.json({
      success: true,
      token: token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const payload = {
      id: user.id,
      email: user.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'jwt_secret', { 
      expiresIn: '1d' 
    });

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// This is where your Google auth route is likely located

router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { email, name, picture } = ticket.getPayload();
    
    // First check if user already exists with this email
    let user = await User.findOne({ email });
    
    if (user) {
      // User exists, generate token and return
      const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });
      
      return res.json({
        token: authToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          profilePicture: user.profilePicture || picture
        }
      });
    }
    
    // User doesn't exist, create new user
    const username = await generateUniqueUsername(name);
    
    // Create a user object with authProvider explicitly set to 'google'
    user = new User({
      email,
      username,
      profilePicture: picture,
      authProvider: 'google',
      // Do not include password field for Google users
    });
    
    await user.save();
    
    const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    
    return res.json({
      token: authToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture
      }
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

// Helper function to generate unique username
async function generateUniqueUsername(baseName) {
  let username = baseName;
  let counter = 1;
  let isUnique = false;
  
  // Try to find a unique username
  while (!isUnique) {
    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      isUnique = true;
    } else {
      // If username exists, append a number and try again
      username = `${baseName}${counter}`;
      counter++;
    }
  }
  
  return username;
}

// @route   GET /api/auth/google/callback
// @desc    Handle Google OAuth callback
// @access  Public
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      console.error('Missing code or state in Google callback');
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/receipts?auth=error&message=Missing+required+parameters`);
    }
    
    console.log('Received Google auth callback with code and state');
    
    try {
      // Process the callback and get tokens
      const { userId, tokens } = await handleCallback(code, state);
      
      console.log(`Successfully authenticated user ${userId}`);
      
      // Store the refresh token in the user's document
      await User.findByIdAndUpdate(userId, {
        googleRefreshToken: tokens.refresh_token,
        googleAccessToken: tokens.access_token
      });
      
      // Redirect back to the receipts page in the frontend
      res.redirect(`${process.env.FRONTEND_URL}/dashboard/receipts?auth=success`);
    } catch (callbackError) {
      console.error('Error processing Google callback:', callbackError);
      res.redirect(`${process.env.FRONTEND_URL}/dashboard/receipts?auth=error&message=${encodeURIComponent(callbackError.message)}`);
    }
  } catch (error) {
    console.error('Unexpected error in Google callback route:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/receipts?auth=error&message=Server+error`);
  }
});

// @route   GET /api/auth/current
// @desc    Get current user
// @access  Private
router.get(
  '/current',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { token, user } = req.user;

    // Redirect to frontend with JWT token
    res.redirect(`http://localhost:5173?token=${token}`);
  }
);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Find the user by ID (from the JWT payload)
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update fields if provided
      if (username) user.username = username;
      if (email) user.email = email;

      // Hash and update password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      // Save the updated user
      const updatedUser = await user.save();

      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email
        }
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;