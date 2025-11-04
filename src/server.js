const app = require('./app');
const config = require('./config/env');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`BotCheckin webhook running on port ${PORT}`);
  console.log(`Database: ${config.database.file}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Twilio configured: ${!!config.twilio.accountSid}`);
});
