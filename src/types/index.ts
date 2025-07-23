// Types for the Football Squares game

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
  title: string;
  team1: string;
  team2: string;
  squares: GameSquare[];
  rowNumbers: number[];
  colNumbers: number[];
  isActive: boolean;
  isCompleted: boolean;
  createdAt: Date;
  maxSquaresPerUser: number;
  currentQuarter: number;
  scores: {
    team1: number;
    team2: number;
    quarter: number;
  }[];
}

export interface UserCode {
  id: string;
  code: string;
  gameId: string;
  isUsed: boolean;
  createdAt: Date;
  usedAt?: Date;
  assignedUserName?: string;
}
