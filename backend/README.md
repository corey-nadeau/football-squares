# Super Squares Email Backend

Simple Express.js backend for sending email invitations via Gmail SMTP.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   copy .env.example .env
   ```
   Then edit `.env` with your Gmail credentials.

3. **Start the server:**
   ```bash
   npm start
   ```
   Or for development:
   ```bash
   npm run dev
   ```

## Environment Variables

- `GMAIL_USER`: Your Gmail address
- `GMAIL_APP_PASSWORD`: Your Gmail app password (16 characters)
- `PORT`: Server port (default: 3001)

## API Endpoints

- `POST /api/send-email`: Send email invitation
- `GET /api/health`: Health check

## Email Request Format

```json
{
  "playerName": "John Doe",
  "playerEmail": "john@example.com",
  "gameTitle": "Super Bowl 2025",
  "hostName": "Jane Host",
  "joinCode": "ABC123",
  "gameUrl": "http://localhost:5175?gameId=123&code=ABC123"
}
```

## Deployment

This backend can be deployed to:
- Heroku
- Railway
- Render
- Vercel (as serverless functions)
- Any VPS with Node.js

For production, update the frontend `EMAIL_API_ENDPOINT` in `src/services/emailService.ts` to point to your deployed backend URL.
