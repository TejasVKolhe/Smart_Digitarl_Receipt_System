const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

module.exports = { oauth2Client, GMAIL_SCOPES };
