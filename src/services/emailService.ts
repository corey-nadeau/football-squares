// Email service for Super Squares invitations
// Uses Netlify Functions for serverless email sending

interface EmailInvitation {
  playerName: string;
  playerEmail: string;
  gameTitle: string;
  hostName: string;
  joinCode: string;
  gameUrl: string;
}

interface WinnerNotification {
  gameTitle: string;
  quarter: number;
  winnerName: string;
  winnerEmail: string | null;
  prizeAmount: number;
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
}

// Netlify Function endpoint
const EMAIL_API_ENDPOINT = '/.netlify/functions/send-email';

export const sendPlayerInvitation = async (invitation: EmailInvitation): Promise<boolean> => {
  try {
    const response = await fetch(EMAIL_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invitation),
    });

    if (response.ok) {
      console.log('Email sent successfully');
      return true;
    } else {
      console.error('Failed to send email:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Fallback: Open mailto link
    const subject = encodeURIComponent(`You're invited to join ${invitation.gameTitle} - Super Squares`);
    const body = encodeURIComponent(`Hi ${invitation.playerName},

${invitation.hostName} has invited you to join their Super Squares game: "${invitation.gameTitle}"

Your join code is: ${invitation.joinCode}

Click here to join the game: ${invitation.gameUrl}

How to play:
1. Click the link above or go to the game website
2. Enter your join code: ${invitation.joinCode}
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
Game hosted by ${invitation.hostName}`);

    const mailtoUrl = `mailto:${invitation.playerEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
    
    return true; // Return true since we opened the mailto link
  }
};

// Function to get the current game URL for invitations
export const getGameInvitationUrl = (gameId: string, userCode: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}?gameId=${gameId}&code=${userCode}`;
};

export const sendWinnerNotification = async (notification: WinnerNotification): Promise<boolean> => {
  if (!notification.winnerEmail) {
    console.log('No email provided for winner notification');
    return false;
  }

  try {
    const response = await fetch('/.netlify/functions/send-winner-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    if (response.ok) {
      console.log('Winner notification email sent successfully');
      return true;
    } else {
      console.error('Failed to send winner notification email:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error sending winner notification email:', error);
    
    // Fallback: Open mailto link
    const quarterName = notification.quarter === 4 ? 'Final Score' : `Quarter ${notification.quarter}`;
    const subject = encodeURIComponent(`🎉 You won ${quarterName} in ${notification.gameTitle}!`);
    const body = encodeURIComponent(`Congratulations ${notification.winnerName}!

You won ${quarterName} in the Super Squares game: "${notification.gameTitle}"

Winning Score: ${notification.team1} ${notification.team1Score} - ${notification.team2} ${notification.team2Score}
Your Prize: $${notification.prizeAmount.toFixed(2)}

The winning square was determined by the last digits of the scores:
${notification.team1}: ${notification.team1Score} (last digit: ${notification.team1Score % 10})
${notification.team2}: ${notification.team2Score} (last digit: ${notification.team2Score % 10})

Congratulations on your win! 🏆

This message was sent from Super Squares Game.`);

    const mailtoUrl = `mailto:${notification.winnerEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
    
    return true; // Return true since we opened the mailto link
  }
};
