require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  database: {
    file: process.env.DATABASE_FILE || './data/botcheckin.db'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
  },
  session: {
    expiryHours: 24
  }
};
