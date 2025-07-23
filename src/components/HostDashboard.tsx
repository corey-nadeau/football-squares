import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  createGame, 
  generateUserCode, 
  getGameUserCodes, 
  subscribeToGame,
  updateGameScores 
} from '../services/gameService';
import { Game, GameSquare, UserCode } from '../types';

const HostDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [userCodes, setUserCodes] = useState<UserCode[]>([]);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Game creation form
  const [gameTitle, setGameTitle] = useState('');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [maxSquaresPerUser, setMaxSquaresPerUser] = useState(5);
  
  // Score updating
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [currentQuarter, setCurrentQuarter] = useState(1);

  useEffect(() => {
    const gameId = localStorage.getItem('gameId');
    if (gameId) {
      const unsubscribe = subscribeToGame(gameId, (game) => {
        setCurrentGame(game);
      });
      
      loadUserCodes(gameId);
      
      return unsubscribe;
    }
  }, []);

  const loadUserCodes = async (gameId: string) => {
    try {
      const codes = await getGameUserCodes(gameId);
      setUserCodes(codes);
    } catch (error) {
      console.error('Error loading user codes:', error);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Create empty squares array
      const squares: GameSquare[] = [];
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          squares.push({
            id: `${row}-${col}`,
            row,
            col,
            claimed: false,
          });
        }
      }
      
      // Create random numbers for rows and columns
      const rowNumbers = Array.from({ length: 10 }, (_, i) => i).sort(() => Math.random() - 0.5);
      const colNumbers = Array.from({ length: 10 }, (_, i) => i).sort(() => Math.random() - 0.5);
      
      const gameData = {
        hostId: 'host', // Since we're using anonymous auth
        title: gameTitle,
        team1,
        team2,
        squares,
        rowNumbers,
        colNumbers,
        isActive: true,
        isCompleted: false,
        maxSquaresPerUser,
        currentQuarter: 1,
        scores: [],
      };
      
      const gameId = await createGame(gameData);
      localStorage.setItem('gameId', gameId);
      
      setShowCreateGame(false);
      
      // Subscribe to the new game
      const unsubscribe = subscribeToGame(gameId, (game) => {
        setCurrentGame(game);
      });
      
      loadUserCodes(gameId);
      
      return unsubscribe;
      
    } catch (error) {
      console.error('Error creating game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!currentGame) return;
    
    try {
      const code = await generateUserCode(currentGame.id);
      alert(`New user code generated: ${code}`);
      loadUserCodes(currentGame.id);
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const handleUpdateScores = async () => {
    if (!currentGame) return;
    
    try {
      await updateGameScores(currentGame.id, team1Score, team2Score, currentQuarter);
    } catch (error) {
      console.error('Error updating scores:', error);
    }
  };

  const getWinningSquares = () => {
    if (!currentGame || currentGame.scores.length === 0) return [];
    
    const currentScore = currentGame.scores[currentGame.scores.length - 1];
    const team1LastDigit = currentScore.team1 % 10;
    const team2LastDigit = currentScore.team2 % 10;
    
    const team1Index = currentGame.rowNumbers.indexOf(team1LastDigit);
    const team2Index = currentGame.colNumbers.indexOf(team2LastDigit);
    
    return currentGame.squares.filter(square => 
      square.row === team1Index && square.col === team2Index && square.claimed
    );
  };

  if (!currentGame && !showCreateGame) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Host Dashboard</h1>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
          
          <div className="text-center">
            <h2 className="text-xl mb-4">No active game</h2>
            <button
              onClick={() => setShowCreateGame(true)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-lg"
            >
              Create New Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCreateGame) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-6">Create New Game</h2>
          
          <form onSubmit={handleCreateGame} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Game Title</label>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                placeholder="Super Bowl 2025"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Team 1</label>
              <input
                type="text"
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                placeholder="Team 1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Team 2</label>
              <input
                type="text"
                value={team2}
                onChange={(e) => setTeam2(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                placeholder="Team 2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Max Squares per User</label>
              <input
                type="number"
                value={maxSquaresPerUser}
                onChange={(e) => setMaxSquaresPerUser(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                min="1"
                max="10"
                required
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 py-3 rounded"
              >
                {loading ? 'Creating...' : 'Create Game'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowCreateGame(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const winningSquares = getWinningSquares();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{currentGame?.title}</h1>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Codes Section */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">User Codes</h2>
              <button
                onClick={handleGenerateCode}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Generate Code
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {userCodes.map((code) => (
                <div
                  key={code.id}
                  className={`p-3 rounded border ${
                    code.isUsed ? 'bg-green-900 border-green-600' : 'bg-gray-800 border-gray-600'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-mono text-lg">{code.code}</span>
                    <span className={code.isUsed ? 'text-green-400' : 'text-yellow-400'}>
                      {code.isUsed ? 'Used' : 'Available'}
                    </span>
                  </div>
                  {code.assignedUserName && (
                    <div className="text-sm text-gray-400">
                      Used by: {code.assignedUserName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Score Management */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Score Management</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">{currentGame?.team1}</label>
                  <input
                    type="number"
                    value={team1Score}
                    onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2">{currentGame?.team2}</label>
                  <input
                    type="number"
                    value={team2Score}
                    onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Quarter</label>
                <select
                  value={currentQuarter}
                  onChange={(e) => setCurrentQuarter(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                >
                  <option value={1}>1st Quarter</option>
                  <option value={2}>2nd Quarter</option>
                  <option value={3}>3rd Quarter</option>
                  <option value={4}>4th Quarter</option>
                  <option value={5}>Final</option>
                </select>
              </div>
              
              <button
                onClick={handleUpdateScores}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded"
              >
                Update Scores
              </button>
              
              {winningSquares.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-900 border border-yellow-600 rounded">
                  <h3 className="font-bold mb-2">Current Winners:</h3>
                  {winningSquares.map((square) => (
                    <div key={square.id} className="text-yellow-200">
                      {square.userName} - Square ({square.row}, {square.col})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Game Stats */}
        <div className="mt-8 bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Game Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {currentGame?.squares.filter(s => s.claimed).length || 0}
              </div>
              <div className="text-sm text-gray-400">Squares Claimed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {100 - (currentGame?.squares.filter(s => s.claimed).length || 0)}
              </div>
              <div className="text-sm text-gray-400">Squares Available</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {userCodes.filter(c => c.isUsed).length}
              </div>
              <div className="text-sm text-gray-400">Active Players</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {userCodes.filter(c => !c.isUsed).length}
              </div>
              <div className="text-sm text-gray-400">Unused Codes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
