import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  createGame, 
  generateUserCode, 
  getGameUserCodes, 
  subscribeToGame,
  updateGameScores,
  updateUserCode,
  deleteUserCode,
  getGamesByHost
} from '../services/gameService';
import { Game, GameSquare, UserCode } from '../types';

const HostDashboard: React.FC = () => {
  const { logout, currentUser, hostName: authenticatedHostName } = useAuth();
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [userCodes, setUserCodes] = useState<UserCode[]>([]);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Game creation form
  const [gameTitle, setGameTitle] = useState('');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  
  // Code generation
  const [squaresToAssign, setSquaresToAssign] = useState(5);
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [sendEmailInvite, setSendEmailInvite] = useState(false);
  
  // Score updating
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const [quarterResults, setQuarterResults] = useState<any[]>([]);
  
  // Player management
  const [selectedPlayer, setSelectedPlayer] = useState<UserCode | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerEmail, setEditPlayerEmail] = useState('');
  const [editSquaresAllowed, setEditSquaresAllowed] = useState(5);

  useEffect(() => {
    const loadHostGames = async () => {
      if (currentUser) {
        try {
          // First, check for a specific game in localStorage
          const gameId = localStorage.getItem('gameId');
          if (gameId) {
            const unsubscribe = subscribeToGame(gameId, (game) => {
              setCurrentGame(game);
            });
            
            loadUserCodes(gameId);
            
            return unsubscribe;
          } else {
            // No specific game ID, load the host's existing games
            const hostGames = await getGamesByHost(currentUser.uid);
            if (hostGames.length > 0) {
              // Load the most recent active game
              const mostRecentGame = hostGames[0];
              localStorage.setItem('gameId', mostRecentGame.id);
              
              const unsubscribe = subscribeToGame(mostRecentGame.id, (game) => {
                setCurrentGame(game);
              });
              
              loadUserCodes(mostRecentGame.id);
              
              return unsubscribe;
            }
          }
        } catch (error) {
          console.error('Error loading host games:', error);
        }
      }
    };

    loadHostGames();
  }, [currentUser]);

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
        hostUserId: currentUser?.uid || '',
        hostName: authenticatedHostName || 'Unknown Host',
        title: gameTitle,
        team1,
        team2,
        squares,
        rowNumbers,
        colNumbers,
        isActive: true,
        isCompleted: false,
        prizePerQuarter: 25, // Fixed: $25 per quarter for $100 total
        totalPrizePool: 100, // Fixed: Total pool is always $100
        maxSquaresPerUser: 25, // Allow users to select up to 25 squares
        currentQuarter: 1,
        quarterWinners: [], // Initialize empty quarter winners array
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
      const code = await generateUserCode(
        currentGame.id, 
        squaresToAssign, 
        playerName || undefined,
        playerEmail || undefined,
        sendEmailInvite && playerEmail.length > 0
      );
      
      if (sendEmailInvite && playerEmail) {
        alert(`New user code generated: ${code} (${squaresToAssign} squares for ${playerName || 'Player'})\nEmail invitation sent to ${playerEmail}`);
      } else {
        alert(`New user code generated: ${code} (${squaresToAssign} squares for ${playerName || 'Player'})`);
      }
      
      loadUserCodes(currentGame.id);
      // Reset form
      setPlayerName('');
      setPlayerEmail('');
      setSquaresToAssign(5);
      setSendEmailInvite(false);
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const handleUpdateScores = async () => {
    if (!currentGame) return;
    
    try {
      const result = await updateGameScores(currentGame.id, team1Score, team2Score, currentQuarter);
      
      // Show quarter result
      const quarterLabel = currentQuarter === 4 ? 'Final Score' : `Quarter ${currentQuarter}`;
      const winnerMessage = result.winner.winnerName === 'No Winner (Square not sold)' 
        ? `${quarterLabel}: No winner - square not sold`
        : `${quarterLabel} Winner: ${result.winner.winnerName} wins $${result.winner.prizeAmount}!`;
      
      let message = `${quarterLabel} Results:\n${winnerMessage}`;
      
      if (result.isGameComplete) {
        message += '\n\nGame Complete! All quarters finished.';
      } else if (result.nextQuarter) {
        message += `\n\nNow ready for Quarter ${result.nextQuarter}`;
        setCurrentQuarter(result.nextQuarter);
      }
      
      alert(message);
      setQuarterResults([...quarterResults, result.winner]);
    } catch (error) {
      console.error('Error updating scores:', error);
    }
  };

  const handleEditPlayer = (player: UserCode) => {
    setSelectedPlayer(player);
    setEditPlayerName(player.playerName || '');
    setEditPlayerEmail(player.playerEmail || '');
    setEditSquaresAllowed(player.squaresAllowed);
    setShowEditModal(true);
  };

  const handleUpdatePlayer = async () => {
    if (!selectedPlayer) return;
    
    try {
      await updateUserCode(selectedPlayer.id, {
        playerName: editPlayerName || undefined,
        playerEmail: editPlayerEmail || undefined,
        squaresAllowed: editSquaresAllowed,
      });
      
      alert('Player updated successfully!');
      setShowEditModal(false);
      setSelectedPlayer(null);
      
      // Refresh user codes
      if (currentGame) {
        loadUserCodes(currentGame.id);
      }
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Failed to update player');
    }
  };

  const handleDeletePlayer = async (player: UserCode) => {
    if (!confirm(`Are you sure you want to remove ${player.playerName || player.code}?`)) {
      return;
    }
    
    try {
      await deleteUserCode(player.id);
      alert('Player removed successfully!');
      
      // Refresh user codes
      if (currentGame) {
        loadUserCodes(currentGame.id);
      }
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Failed to remove player');
    }
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
              <label className="block text-sm font-bold mb-2">Host Name</label>
              <input
                type="text"
                value={authenticatedHostName || 'Unknown Host'}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300"
                readOnly
              />
              <p className="text-xs text-gray-400 mt-1">
                This is your registered host name
              </p>
            </div>
            
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
              <label className="block text-sm font-bold mb-2">Home Team</label>
              <input
                type="text"
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                placeholder="e.g. Chiefs"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Away Team</label>
              <input
                type="text"
                value={team2}
                onChange={(e) => setTeam2(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                placeholder="e.g. 49ers"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                These are the actual teams playing (used for score tracking only)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Prize per Quarter ($)</label>
              <input
                type="number"
                value={25}
                readOnly
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">
                Fixed: $25 per quarter for $100 total pool (same grid used for all quarters)
              </p>
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
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-4">Generate User Code</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Player Name (Required)</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                    placeholder="John Smith"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2">Player Email</label>
                  <input
                    type="email"
                    value={playerEmail}
                    onChange={(e) => setPlayerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                    placeholder="john@example.com"
                  />
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={sendEmailInvite}
                      onChange={(e) => setSendEmailInvite(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="sendEmail" className="text-sm">
                      Send email invitation with join code
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2">Squares Allowed</label>
                  <input
                    type="number"
                    value={squaresToAssign}
                    onChange={(e) => setSquaresToAssign(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                    min="1"
                    max="25"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={handleGenerateCode}
                    disabled={!playerName.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-4 py-2 rounded"
                  >
                    Generate Code
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-3">Player Management</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {userCodes.map((code) => (
                  <div
                    key={code.id}
                    className={`p-4 rounded border ${
                      code.isUsed ? 'bg-green-900 border-green-600' : 'bg-gray-800 border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-lg font-bold">{code.code}</span>
                          <span className={`px-2 py-1 rounded text-xs ${code.isUsed ? 'bg-green-600 text-green-100' : 'bg-yellow-600 text-yellow-100'}`}>
                            {code.isUsed ? 'Used' : 'Available'}
                          </span>
                        </div>
                        {code.playerName && (
                          <div className="text-sm text-blue-400 font-semibold mb-1">
                            Player: {code.playerName}
                          </div>
                        )}
                        {code.playerEmail && (
                          <div className="text-sm text-gray-400 mb-1">
                            Email: {code.playerEmail}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {code.squaresAllowed} squares allowed
                        </div>
                        {code.assignedUserName && (
                          <div className="text-sm text-gray-400 mt-1">
                            Used by: {code.assignedUserName}
                          </div>
                        )}
                      </div>
                      
                      {!code.isUsed && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditPlayer(code)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(code)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {userCodes.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No players added yet. Generate codes above to invite players.
                  </div>
                )}
              </div>
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
                <label className="block text-sm font-bold mb-2">Quarter/Period</label>
                <select
                  value={currentQuarter}
                  onChange={(e) => setCurrentQuarter(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                >
                  <option value={1}>1st Quarter</option>
                  <option value={2}>2nd Quarter</option>
                  <option value={3}>3rd Quarter</option>
                  <option value={4}>Final Score (includes OT)</option>
                </select>
                <p className="text-xs text-yellow-400 mt-2">
                  Note: There is no separate 4th quarter score. The final score includes overtime if applicable.
                </p>
              </div>
              
              <div className="bg-blue-900 p-4 rounded border border-blue-600">
                <h3 className="font-bold text-blue-300 mb-2">Prize Structure</h3>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• Q1 Winner: $25</li>
                  <li>• Q2 Winner: $25</li>
                  <li>• Q3 Winner: $25</li>
                  <li>• Final Score Winner: $25</li>
                  <li>• Total Pool: $100</li>
                </ul>
                <p className="text-xs text-yellow-300 mt-2">
                  Same grid used for all quarters
                </p>
              </div>
              
              <button
                onClick={handleUpdateScores}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded"
              >
                Update Scores
              </button>
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
      
      {/* Edit Player Modal */}
      {showEditModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Edit Player: {selectedPlayer.code}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Player Name</label>
                <input
                  type="text"
                  value={editPlayerName}
                  onChange={(e) => setEditPlayerName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Player Email</label>
                <input
                  type="email"
                  value={editPlayerEmail}
                  onChange={(e) => setEditPlayerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Squares Allowed</label>
                <input
                  type="number"
                  value={editSquaresAllowed}
                  onChange={(e) => setEditSquaresAllowed(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  min="1"
                  max="25"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdatePlayer}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium"
              >
                Update Player
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedPlayer(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;
