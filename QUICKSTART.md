# Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## Configuration

Edit `.env` file:

```env
PORT=3000
ADMIN_PASSWORD=your_secure_password_here

# Get these from https://console.twilio.com/
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## Running

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Run Tests
```bash
npm test
```

## Quick Test

### 1. Start the server
```bash
npm run dev
```

### 2. Test health endpoint
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"ok":true,"timestamp":"2025-11-04T..."}
```

### 3. Expose webhook for Twilio (development)

Using ngrok:
```bash
ngrok http 3000
```

Or using cloudflared (included):
```bash
.\cloudflared.exe tunnel --url http://localhost:3000
```

Copy the public URL (e.g., `https://abc123.ngrok.io`)

### 4. Configure Twilio

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to: **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Configure the Sandbox webhook URL:
   ```
   https://your-ngrok-url.ngrok.io/webhook
   ```
4. Method: **POST**
5. Save

### 5. Test with WhatsApp

Send a message to your Twilio WhatsApp number:

```
REGISTER YourName staff
```

You should receive:
```
👤 Bem-vindo(a), YourName!

✅ Seu cadastro foi realizado com sucesso como *staff*.

Você já está logado e pronto para começar!

👤 *Olá, YourName!*

📋 Selecione uma opção:

1️⃣ Check-in
2️⃣ Iniciar Pausa
3️⃣ Voltar da Pausa
4️⃣ Fechar Expediente
5️⃣ Ver Meu Histórico
6️⃣ Sair

💡 _Envie o número ou comando_
```

### 6. Test check-in

Send:
```
1
```

You should receive:
```
🟢 *Check-in registrado!*

⏰ Horário: 04/11/2025 08:30:15

👤 *Olá, YourName!*
...
```

## Common Commands

### Staff User
```
REGISTER João staff          # Register
1                            # Check-in
2                            # Start break
3                            # Return from break
4                            # Check-out
5                            # View history
6                            # Logout
```

### Manager User
```
REGISTER Ana manager PASSWORD    # Register with admin password
LOGIN PASSWORD                    # Login
1                                 # View all schedules
SEARCH João                       # Search users
3 123 2024-01-15T08:30:00        # Edit checkin #123
DEL 123                          # Delete checkin #123
ADD 2 checkin 2024-01-15T08:30:00 Office  # Add manual checkin
```

### Supervisor User
```
REGISTER Carlos supervisor PASSWORD  # Register
1                                    # View active team
2                                    # Team history
```

## Project Structure

```
src/
├── config/          # Configuration
├── controllers/     # HTTP handlers
├── services/        # Business logic
├── utils/           # Helper functions
└── server.js        # Entry point
```

## Testing

```bash
# Run all tests
npm test

# Watch mode (for development)
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

## Deployment

### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create my-botcheckin

# Set environment variables
heroku config:set ADMIN_PASSWORD=your_password
heroku config:set TWILIO_ACCOUNT_SID=ACxxx
heroku config:set TWILIO_AUTH_TOKEN=xxx
heroku config:set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

Configure Twilio webhook to:
```
https://my-botcheckin.herokuapp.com/webhook
```

## Troubleshooting

### Server won't start
- Check if port 3000 is available
- Verify `.env` file exists
- Run `npm install` again

### Twilio not receiving messages
- Verify webhook URL is correct
- Check Twilio console for errors
- View server logs: `heroku logs --tail` (or local console)

### Tests failing
- Run `npm install` to ensure all dependencies installed
- Delete `node_modules` and run `npm install` again
- Check if database file has correct permissions

### Database issues
- Delete `data/` folder and restart (will recreate with seed data)
- Check `DATABASE_FILE` path in `.env`

## Next Steps

1. **Customize messages**: Edit `src/services/whatsapp.service.js`
2. **Add features**: Follow the modular pattern in `src/services/`
3. **Improve tests**: Add more test cases in `tests/`
4. **Deploy to production**: Use Heroku or your preferred platform

## Documentation

- **README.md**: Main project documentation
- **TESTING.md**: Comprehensive testing guide
- **WHATSAPP_TEMPLATES.md**: All message templates
- **REFACTORING_SUMMARY.md**: Refactoring details
- **BEFORE_AFTER.md**: Comparison of old vs new code

## Support

For issues or questions:
1. Check the documentation above
2. Review the code examples in `BEFORE_AFTER.md`
3. Run tests to verify setup: `npm test`
4. Check Twilio console for webhook errors

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm test` | Run all tests with coverage |
| `npm run test:watch` | Run tests in watch mode |

**Default Port**: 3000
**Health Endpoint**: `GET /health`
**Webhook Endpoint**: `POST /webhook`

---

**Happy coding!** 🚀
