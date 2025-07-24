// Netlify Function for sending emails
// Place          <h2 style="color: #1f2937;">🏆 Super Squares Invitation</h2>this file at: netlify/functions/send-email.js

const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { playerName, playerEmail, gameTitle, hostName, joinCode, gameUrl } = JSON.parse(event.body);

    // Gmail SMTP configuration using environment variables
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Super Squares Game" <${process.env.GMAIL_USER}>`,
      to: playerEmail,
      subject: `You're invited to join ${gameTitle} - Super Squares`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">� Super Squares Invitation</h2>
          
          <p>Hi <strong>${playerName}</strong>,</p>
          
          <p><strong>${hostName}</strong> has invited you to join their Super Squares game: "<strong>${gameTitle}</strong>"</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Your Join Code:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #1f2937; letter-spacing: 2px; text-align: center; background-color: white; padding: 15px; border-radius: 4px; margin: 10px 0;">
              ${joinCode}
            </p>
            <p style="text-align: center;">
              <a href="${gameUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                🎯 Join Game Now
              </a>
            </p>
          </div>
          
          <h3 style="color: #374151;">How to Play:</h3>
          <ol style="color: #4b5563;">
            <li>Click the "Join Game Now" button above or go to the game website</li>
            <li>Enter your join code: <strong>${joinCode}</strong></li>
            <li>Select your squares on the grid</li>
            <li>Watch the game and see if you win!</li>
          </ol>
          
          <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #065f46;">💰 Prize Information:</h3>
            <ul style="color: #047857; margin-bottom: 0;">
              <li><strong>Total prize pool: $100</strong></li>
              <li>Winners are determined by the last digit of each team's score at the end of each quarter</li>
              <li><strong>Q1, Q2, Q3 winners get $25 each</strong></li>
              <li><strong>Final score winner gets $25</strong></li>
              <li><em>Note: There is no separate 4th quarter score - the final score is used (including overtime if applicable)</em></li>
            </ul>
          </div>
          
          <p style="color: #6b7280;">Good luck!</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This message was sent from Super Squares Game.<br>
            Game hosted by ${hostName}
          </p>
        </div>
      `,
      text: `
Hi ${playerName},

${hostName} has invited you to join their Super Squares game: "${gameTitle}"

Your join code is: ${joinCode}

Click here to join the game: ${gameUrl}

How to play:
1. Click the link above or go to the game website
2. Enter your join code: ${joinCode}
3. Select your squares on the grid
4. Watch the game and see if you win!

Prize Information:
- Total prize pool: $100
- Winners are determined by the last digit of each team's score at the end of each quarter
- Q1, Q2, Q3 winners get $25 each
- Final score winner gets $25
- Note: There is no separate 4th quarter score - the final score is used (including overtime if applicable)

Good luck!

This message was sent from Super Squares Game.
Game hosted by ${hostName}
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: info.messageId 
      })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to send email',
        error: error.message 
      })
    };
  }
};
