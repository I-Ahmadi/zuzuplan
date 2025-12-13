# ZuzuPlan Server

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `server` directory with:
   ```env
   DATABASE_URL=mongodb://localhost:27017/zuzuplan
   JWT_SECRET=your-secret-key-here
   PORT=3000
   CLIENT_URL=http://localhost:3001
   
   # Email Configuration (Optional - for production)
   # For development, emails will be logged to console
   EMAIL_DEV_MODE=true
   # Or configure SMTP for production:
   # EMAIL_HOST=smtp.gmail.com
   # EMAIL_PORT=587
   # EMAIL_USER=your-email@gmail.com
   # EMAIL_PASS=your-app-password
   # EMAIL_FROM=noreply@zuzuplan.com
   ```

3. **Make sure MongoDB is running:**
   - Install MongoDB if not already installed
   - Start MongoDB service
   - Or use MongoDB Atlas (cloud) and update DATABASE_URL

4. **Start the server:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   🔄 Connecting to database...
   ✅ MongoDB connected successfully
   🚀 Server running on port 3000
   ```

5. **Verify the server is running:**
   - Open browser: http://localhost:3000/health
   - Should return: `{"status":"ok","timestamp":"..."}`

## Troubleshooting

- **Port 3000 already in use:** Change PORT in `.env` or stop the other process
- **Database connection error:** Check MongoDB is running and DATABASE_URL is correct
- **404 errors:** Make sure the server is actually running (check terminal output)
