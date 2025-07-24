# Email Setup Instructions

To enable email invitations for players using Gmail App Password (No limits, completely free):

## Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", enable "2-Step Verification" if not already enabled
4. Follow the setup process

## Step 2: Generate Gmail App Password
1. Still in "Security" settings, scroll down to "2-Step Verification"
2. At the bottom, click on "App passwords"
3. Select "Mail" as the app and "Other (Custom name)" as the device
4. 4. Enter "Super Squares Game" as the custom name
5. Click "Generate"
6. **Copy the 16-character password** (it will look like: abcd efgh ijkl mnop)

## Step 3: Set up Backend Email Service
1. Open a terminal/command prompt
2. Navigate to the backend folder:
   ```
   cd backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Copy the environment file:
   ```
   copy .env.example .env
   ```
5. Edit the `.env` file and replace the values:
   ```
   GMAIL_USER=youremail@gmail.com
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   PORT=3001
   ```

## Step 4: Start the Email Backend
1. In the backend folder, run:
   ```
   npm start
   ```
   Or for development with auto-restart:
   ```
   npm run dev
   ```
2. You should see: "Email service running on port 3001"

## Step 5: Update Frontend Configuration
1. Open `src/services/emailService.ts`
2. Update the `EMAIL_API_ENDPOINT` if your backend runs on a different port:
   ```typescript
   const EMAIL_API_ENDPOINT = 'http://localhost:3001/api/send-email';
   ```

## Step 6: Test
1. Start both the frontend (`npm run dev`) and backend (`npm start`)
2. Try generating a player code with email invitation enabled
3. Check that emails are being sent successfully

## Alternative: Mailto Fallback
If you don't want to run a backend, the system will automatically fall back to opening your default email client with a pre-filled message. This works without any setup but requires manual sending.

## Benefits of This Setup:
- ✅ **No request limits** (send unlimited emails)
- ✅ **No monthly fees** (completely free)
- ✅ **More reliable delivery** (Gmail's reputation)
- ✅ **Professional looking emails** (from your own Gmail)
- ✅ **Better formatting** (HTML emails with styling)
- ✅ **Full control** (your own backend service)

## Email Features:
- Professional HTML formatting with styling
- Clear join code display
- One-click join button
- Prize structure breakdown
- Game rules explanation
- Host information

## Deployment Options:
- **Local Development**: Run backend on your computer
- **Heroku**: Deploy backend to Heroku (free tier available)
- **Vercel/Netlify**: Deploy as serverless functions
- **Railway/Render**: Alternative hosting platforms
