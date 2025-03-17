const express = require('express');
const router = express.Router();
const passport = require('passport');

// @route   GET api/receipts
// @desc    Get all receipts
// @access  Private
router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    // This is a placeholder - you'll implement actual receipt retrieval later
    res.json({ message: 'Receipts API is working', receipts: [] });
  }
);

// @route   POST api/receipts
// @desc    Create a new receipt
// @access  Private
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    // This is a placeholder - you'll implement actual receipt creation later
    res.json({ message: 'Receipt created successfully', receipt: req.body });
  }
);

module.exports = router;
