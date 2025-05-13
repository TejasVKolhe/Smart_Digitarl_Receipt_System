const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  password: {
    type: String,
    required: function() {
      return this.authProvider === 'local' || !this.authProvider;
    }
  },
  date: {
    type: Date,
    default: Date.now
  },
  profilePicture: {
    type: String
  },
  gmailConnection: {
    tokens: {
      access_token: String,
      refresh_token: String,
      scope: String,
      token_type: String,
      expiry_date: Number
    },
    connected: { type: Boolean, default: false },
    lastSyncDate: Date,
    syncStatus: { type: String, enum: ['idle', 'syncing', 'failed'], default: 'idle' }
  }
});

module.exports = mongoose.model('User', UserSchema);
