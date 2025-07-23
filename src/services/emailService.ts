// Email service for Football Squares invitations
// Uses Netlify Functions for serverless email sending

interface EmailInvitation {
  playerName: string;
  playerEmail: string;
  gameTitle: string;
  hostName: string;
  joinCode: string;
  gameUrl: string;
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
    const subject = encodeURIComponent(`You're invited to join ${invitation.gameTitle} - Football Squares`);
    const body = encodeURIComponent(`Hi ${invitation.playerName},

${invitation.hostName} has invited you to join their Football Squares game: "${invitation.gameTitle}"

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

This message was sent from Football Squares Game.
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
