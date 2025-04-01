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
    let user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = new User({
      username,
      email,
      password
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

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

// @route   POST /api/auth/google
// @desc    Login/register with Google
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const { email, name, sub: googleId } = ticket.getPayload();
    
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Generate random password for the user
      const randomPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      
      // Create new user
      user = new User({
        username: name,
        email,
        password: hashedPassword,
        googleId
      });
      
      await user.save();
    }
    
    // Create JWT token
    const payload = {
      id: user.id,
      email: user.email
    };
    
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET || 'jwt_secret', { 
      expiresIn: '1d' 
    });
    
    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

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

router.put(
  '/profile',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const userId = req.user.id;

      // Check for existing users with same username/email
      const existingUser = await User.findOne({
        $or: [
          { username, _id: { $ne: userId } },
          { email, _id: { $ne: userId } }
        ]
      });

      if (existingUser) {
        return res.status(409).json({ 
          message: existingUser.username === username 
            ? 'Username already taken' 
            : 'Email already registered'
        });
      }

      const updateFields = { username, email };
      
      // Only update password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateFields.password = await bcrypt.hash(password, salt);
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, select: '-password -__v' }
      );

      res.json({
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;