// NFL API Service using ESPN API
// ESPN provides public APIs for NFL games and scores

interface ESPNGame {
  id: string;
  name: string;
  shortName: string;
  competitions: Array<{
    id: string;
    date: string;
    competitors: Array<{
      id: string;
      team: {
        id: string;
        displayName: string;
        shortDisplayName: string;
        abbreviation: string;
        color: string;
        alternateColor: string;
      };
      score: string;
      homeAway: 'home' | 'away';
    }>;
    status: {
      period?: number;
      clock?: string;
      type: {
        id: string;
        name: string;
        state: string;
        completed: boolean;
        description: string;
        detail: string;
        shortDetail: string;
      };
    };
  }>;
}

export interface NFLGame {
  id: string;
  name: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
  status: string;
  isCompleted: boolean;
  isInProgress: boolean;
  quarter?: number;
  period?: number;
}

const ESPN_NFL_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

export const fetchNFLGames = async (year?: number, week?: number): Promise<NFLGame[]> => {
  try {
    const currentYear = year || new Date().getFullYear();
    const url = week 
      ? `${ESPN_NFL_API_BASE}/scoreboard?dates=${currentYear}&seasontype=2&week=${week}`
      : `${ESPN_NFL_API_BASE}/scoreboard`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.events?.map((event: ESPNGame): NFLGame => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
      const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
      
      return {
        id: event.id,
        name: event.name,
        homeTeam: homeTeam?.team.displayName || 'TBD',
        awayTeam: awayTeam?.team.displayName || 'TBD',
        homeScore: parseInt(homeTeam?.score || '0'),
        awayScore: parseInt(awayTeam?.score || '0'),
        date: competition.date,
        status: competition.status.type.detail,
        isCompleted: competition.status.type.completed,
        isInProgress: competition.status.type.state === 'in',
        quarter: competition.status.period || 1,
        period: competition.status.period || 1
      };
    }) || [];
  } catch (error) {
    console.error('Error fetching NFL games:', error);
    // Return empty array on error to gracefully handle API failures
    return [];
  }
};

export const fetchGameScore = async (gameId: string): Promise<{ homeScore: number; awayScore: number } | null> => {
  try {
    const response = await fetch(`${ESPN_NFL_API_BASE}/summary?event=${gameId}`);
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json();
    const competition = data.header?.competitions?.[0];
    
    if (competition) {
      const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
      const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
      
      return {
        homeScore: parseInt(homeTeam?.score || '0'),
        awayScore: parseInt(awayTeam?.score || '0')
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching game score:', error);
    return null;
  }
};

export const fetchUpcomingGames = async (): Promise<NFLGame[]> => {
  try {
    // Get current week's games
    const games = await fetchNFLGames();
    
    // Filter for upcoming games (not completed)
    return games.filter(game => !game.isCompleted);
  } catch (error) {
    console.error('Error fetching upcoming games:', error);
    return [];
  }
};

export const fetchLiveScores = async (gameIds?: string[]): Promise<NFLGame[]> => {
  try {
    // Get current week's games
    const games = await fetchNFLGames();
    
    // If specific game IDs provided, filter for those
    if (gameIds && gameIds.length > 0) {
      return games.filter(game => gameIds.includes(game.id));
    }
    
    // Otherwise, filter for live games (in progress or completed today)
    const today = new Date().toDateString();
    return games.filter(game => 
      game.isInProgress || 
      (game.isCompleted && new Date(game.date).toDateString() === today)
    );
  } catch (error) {
    console.error('Error fetching live scores:', error);
    return [];
  }
};
