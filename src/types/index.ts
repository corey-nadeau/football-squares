// Types for the Super Squares game

export interface User {
  id: string;
  name: string;
  userCode: string;
  isHost: boolean;
  gameId: string;
}

export interface GameSquare {
  id: string;
  row: number;
  col: number;
  userId?: string;
  userName?: string;
  userInitials?: string;
  claimed: boolean;
}

export interface Game {
  id: string;
  hostId: string;
  hostUserId: string; // Firebase User ID for secure host identification
  hostName: string; // Display name for the host
  title: string;
  team1: string;
  team2: string;
  squares: GameSquare[];
  rowNumbers: number[];
  colNumbers: number[];
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean; // New: Whether square selection is closed
  createdAt: Date;
  prizeDistribution: {
    quarter1: number;
    quarter2: number;
    quarter3: number;
    quarter4: number;
  }; // Custom prize amounts for each quarter
  totalPrizePool: number; // Total prize pool ($100 for full 100 square grid)
  maxSquaresPerUser: number; // Maximum squares a user can select
  currentQuarter: number;
  quarterWinners: {
    quarter: number;
    team1Score: number;
    team2Score: number;
    winningSquareId?: string;
    winnerName?: string;
    winnerEmail?: string;
    prizeAmount: number;
  }[]; // Track winners for each quarter
  scores: {
    team1: number;
    team2: number;
    quarter: number;
    winningSquare?: string; // Which square won this quarter
    winner?: string; // Player name who won this quarter
  }[];
  nflGameId?: string; // Optional NFL API game ID for real-time score updates
}

export interface UserCode {
  id: string;
  code: string;
  gameId: string;
  isUsed: boolean;
  createdAt: Date;
  usedAt?: Date;
  assignedUserName?: string;
  squaresAllowed: number; // Number of squares this player can pick
  playerName?: string; // New: Name assigned by host when creating code
  playerEmail?: string; // New: Email for sending invitation link
}
