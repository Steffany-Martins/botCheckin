# Deployment Guide

## Pre-Deployment Checklist

### ✅ Code Verification
- [x] All tests passing (`npm test`)
- [x] Server starts without errors (`npm start`)
- [x] Health endpoint responding (`curl http://localhost:3000/health`)
- [x] Webhook endpoint working

### ✅ Configuration
- [ ] `.env` file configured with production values
- [ ] `ADMIN_PASSWORD` changed from default
- [ ] Twilio credentials added
- [ ] Database path configured

### ✅ Security
- [ ] Strong admin password set (12+ characters)
- [ ] `.env` not committed to git
- [ ] Sensitive data removed from code
- [ ] Rate limiting considered (optional)

## Deployment Options

### Option 1: Heroku (Recommended)

#### Step 1: Prepare Git Repository

```bash
# Initialize git if not already done
git init

# Add files
git add .

# Commit
git commit -m "Deploy BotCheckin WhatsApp system"
```

#### Step 2: Create Heroku App

**Via Heroku Dashboard:**
1. Go to [dashboard.heroku.com](https://dashboard.heroku.com)
2. Click "New" → "Create new app"
3. Name: `your-botcheckin` (must be unique)
4. Region: United States or Europe
5. Click "Create app"

**Via Heroku CLI:**
```bash
heroku login
heroku create your-botcheckin
```

#### Step 3: Connect GitHub (Dashboard Method)

1. In Heroku Dashboard, go to "Deploy" tab
2. Deployment method: Select "GitHub"
3. Click "Connect to GitHub"
4. Search for your repository
5. Click "Connect"

#### Step 4: Configure Environment Variables

In Heroku Dashboard → Settings → Config Vars, add:

```
ADMIN_PASSWORD=your_very_secure_password_here
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Via CLI:**
```bash
heroku config:set ADMIN_PASSWORD=your_password
heroku config:set TWILIO_ACCOUNT_SID=ACxxxxx
heroku config:set TWILIO_AUTH_TOKEN=xxxxxx
heroku config:set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

#### Step 5: Deploy

**Automatic Deployment (Recommended):**
1. Go to "Deploy" tab
2. Scroll to "Automatic deploys"
3. Select branch: `main`
4. Click "Enable Automatic Deploys"
5. Click "Deploy Branch"

**Manual Deployment via Git:**
```bash
# Add Heroku remote
heroku git:remote -a your-botcheckin

# Deploy
git push heroku main
```

#### Step 6: Verify Deployment

```bash
# Check app status
heroku ps

# View logs
heroku logs --tail

# Test health endpoint
curl https://your-botcheckin.herokuapp.com/health

# Open in browser
heroku open
```

Expected output:
```json
{"ok":true,"timestamp":"2025-11-04T..."}
```

#### Step 7: Configure Twilio Webhook

1. Go to [console.twilio.com](https://console.twilio.com)
2. Navigate to: **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Under "Sandbox Settings", set:
   - **When a message comes in**: `https://your-botcheckin.herokuapp.com/webhook`
   - **Method**: POST
4. Click "Save"

#### Step 8: Test with WhatsApp

Send to your Twilio WhatsApp number:
```
REGISTER TestUser staff
```

You should receive the welcome message with menu.

### Option 2: Railway.app

#### Step 1: Create Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

#### Step 2: Deploy from GitHub
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Railway auto-detects Node.js

#### Step 3: Configure Environment Variables
1. Go to your project
2. Click "Variables"
3. Add:
   ```
   ADMIN_PASSWORD=your_password
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

#### Step 4: Deploy
Railway automatically deploys on git push.

Get your URL from the "Settings" tab.

### Option 3: Render.com

#### Step 1: Create Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

#### Step 2: Create Web Service
1. Click "New +"
2. Select "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: your-botcheckin
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

#### Step 3: Add Environment Variables
In "Environment" tab, add:
```
ADMIN_PASSWORD=your_password
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

#### Step 4: Deploy
Click "Create Web Service"

### Option 4: DigitalOcean App Platform

#### Step 1: Create App
1. Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect GitHub repository

#### Step 2: Configure
- **Resource Type**: Web Service
- **Build Command**: `npm install`
- **Run Command**: `npm start`

#### Step 3: Environment Variables
Add in "App-Level Environment Variables":
```
ADMIN_PASSWORD=your_password
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Option 5: Self-Hosted (VPS)

#### Requirements
- Ubuntu 20.04+ or similar Linux
- Node.js 16+
- PM2 for process management
- Nginx (optional, for reverse proxy)

#### Step 1: Setup Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

#### Step 2: Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/your-username/botcheckin.git
cd botcheckin
sudo npm install --production
```

#### Step 3: Configure Environment

```bash
sudo nano .env
```

Add:
```env
PORT=3000
ADMIN_PASSWORD=your_secure_password
DATABASE_FILE=/var/www/botcheckin/data/botcheckin.db
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

#### Step 4: Start with PM2

```bash
pm2 start src/server.js --name botcheckin
pm2 save
pm2 startup
```

#### Step 5: Configure Nginx (Optional)

```bash
sudo nano /etc/nginx/sites-available/botcheckin
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/botcheckin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 6: SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Post-Deployment

### Verify Deployment

```bash
# Test health endpoint
curl https://your-app-url.com/health

# Should return:
# {"ok":true,"timestamp":"..."}
```

### Configure Twilio

1. Update webhook URL to your production URL
2. Test with WhatsApp message
3. Verify logs are clean

### Monitor Logs

**Heroku:**
```bash
heroku logs --tail
```

**Railway:**
Check "Deployments" → "Logs"

**Render:**
Check "Logs" tab

**PM2 (Self-hosted):**
```bash
pm2 logs botcheckin
```

### Database Backup (Important!)

**Heroku/Cloud Platforms:**
- Note: SQLite on Heroku is ephemeral (resets on restart)
- Consider migrating to PostgreSQL for production:
  - Heroku Postgres
  - Supabase
  - ElephantSQL

**Self-hosted:**
```bash
# Backup database
cp /var/www/botcheckin/data/botcheckin.db /backups/botcheckin-$(date +%Y%m%d).db

# Automate with cron (daily at 2 AM)
0 2 * * * cp /var/www/botcheckin/data/botcheckin.db /backups/botcheckin-$(date +\%Y\%m\%d).db
```

### Update Deployment

**Heroku with GitHub:**
- Just `git push` to main branch
- Auto-deploys if enabled

**Manual:**
```bash
git pull
npm install
pm2 restart botcheckin  # or heroku restart
```

## Troubleshooting

### App Crashed
```bash
# Heroku
heroku logs --tail
heroku restart

# PM2
pm2 restart botcheckin
pm2 logs
```

### Webhook Not Responding
1. Check Twilio webhook URL is correct
2. Verify app is running: `curl https://your-app/health`
3. Check logs for errors
4. Verify environment variables are set

### Database Issues
```bash
# Check database file exists
ls -la data/

# Check permissions
chmod 755 data/
chmod 644 data/botcheckin.db

# Reset database (will lose data!)
rm data/botcheckin.db
# Restart app to recreate with seed data
```

### Port Issues
- Heroku sets `PORT` automatically
- Other platforms: ensure `PORT` env var is set or defaults to 3000

## Performance Optimization

### Enable Compression
Add to `src/app.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

### Add Rate Limiting
```bash
npm install express-rate-limit
```

In `src/app.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/webhook', limiter);
```

### Monitor Performance
- Heroku: Use Heroku Metrics
- New Relic: Add APM monitoring
- Datadog: Full-stack monitoring

## Security Checklist

- [x] Strong admin password set
- [x] Environment variables not in code
- [x] HTTPS enabled
- [ ] Rate limiting enabled (optional)
- [ ] Request validation (optional)
- [ ] Webhook signature verification (optional)
- [ ] Regular security updates

## Scaling

### Heroku Scaling
```bash
# Scale to multiple dynos
heroku ps:scale web=2

# Upgrade dyno type
heroku ps:type hobby  # or standard-1x, standard-2x
```

### Database Migration (for high traffic)
Consider migrating from SQLite to PostgreSQL:
1. Export data from SQLite
2. Create PostgreSQL database
3. Update `src/services/database.service.js`
4. Import data

## Cost Estimates

### Free Tier Options
- **Heroku**: Free (with limitations, sleeps after 30 min)
- **Railway**: $5 credit free
- **Render**: Free tier available

### Paid Options
- **Heroku Hobby**: $7/month
- **Railway**: Pay-as-you-go (~$5-10/month)
- **Render**: $7/month
- **DigitalOcean**: $5/month (basic droplet)

## Support

For deployment issues:
1. Check platform documentation
2. Review logs carefully
3. Verify environment variables
4. Test locally first: `npm start`
5. Check Twilio configuration

## Quick Deployment Commands

```bash
# Heroku
heroku create
heroku config:set ADMIN_PASSWORD=xxx TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=xxx TWILIO_WHATSAPP_NUMBER=xxx
git push heroku main
heroku logs --tail

# Verify
curl https://your-app.herokuapp.com/health
```

---

**Deployment Status Checklist:**
- [ ] Code deployed
- [ ] Environment variables set
- [ ] Health check passing
- [ ] Twilio webhook configured
- [ ] Test WhatsApp message sent
- [ ] Logs monitored
- [ ] Database backup configured (if self-hosted)

**Once all checkboxes are complete, your BotCheckin system is live!** ✅
