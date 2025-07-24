const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const {
      gameTitle,
      quarter,
      winnerName,
      winnerEmail,
      prizeAmount,
      team1,
      team2,
      team1Score,
      team2Score
    } = JSON.parse(event.body);

    if (!winnerEmail) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Winner email is required' }) 
      };
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const quarterName = quarter === 4 ? 'Final Score' : `Quarter ${quarter}`;
    
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: winnerEmail,
      subject: `🎉 You won ${quarterName} in ${gameTitle}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a1a; color: #ffffff; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; font-size: 32px; margin: 0;">🏆 CONGRATULATIONS! 🏆</h1>
            <h2 style="color: #3b82f6; margin: 10px 0;">${winnerName}</h2>
          </div>
          
          <div style="background-color: #059669; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 24px;">You Won ${quarterName}!</h2>
            <h3 style="margin: 10px 0; color: #ecfdf5;">Game: ${gameTitle}</h3>
          </div>
          
          <div style="background-color: #374151; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #fbbf24; margin-top: 0;">Winning Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;"><strong>Score:</strong> ${team1} ${team1Score} - ${team2} ${team2Score}</li>
              <li style="margin: 10px 0;"><strong>Winning Numbers:</strong> ${team1Score % 10} & ${team2Score % 10}</li>
              <li style="margin: 10px 0; font-size: 24px; color: #10b981;"><strong>Your Prize: $${prizeAmount.toFixed(2)}</strong></li>
            </ul>
          </div>
          
          <div style="background-color: #1f2937; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #d1d5db;">
              <strong>How You Won:</strong><br>
              Your square corresponds to the intersection of the last digits of each team's score:
              <br>• ${team1}: ${team1Score} (last digit: ${team1Score % 10})
              <br>• ${team2}: ${team2Score} (last digit: ${team2Score % 10})
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 12px;">
              Congratulations on your win! 🎊<br>
              This message was sent from Super Squares Game
            </p>
          </div>
        </div>
      `,
      text: `Congratulations ${winnerName}!

You won ${quarterName} in the Super Squares game: "${gameTitle}"

Winning Score: ${team1} ${team1Score} - ${team2} ${team2Score}
Your Prize: $${prizeAmount.toFixed(2)}

The winning square was determined by the last digits of the scores:
${team1}: ${team1Score} (last digit: ${team1Score % 10})
${team2}: ${team2Score} (last digit: ${team2Score % 10})

Congratulations on your win! 🏆

This message was sent from Super Squares Game.`
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Winner notification email sent successfully',
        recipient: winnerEmail,
        quarter: quarterName
      }),
    };

  } catch (error) {
    console.error('Error sending winner notification email:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send winner notification email',
        details: error.message
      }),
    };
  }
};
