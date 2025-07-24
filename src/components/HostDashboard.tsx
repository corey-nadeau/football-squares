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
  getGamesByHost,
  deleteGame,
  getAllHostGames,
  setGameActive,
  lockGameSelections,
  randomizeGameNumbers,
  completeGame
} from '../services/gameService';
import { fetchUpcomingGames, fetchLiveScores, NFLGame } from '../services/nflApiService';
import { Game, GameSquare, UserCode } from '../types';

const HostDashboard: React.FC = () => {
  const { logout, currentUser, hostName: authenticatedHostName } = useAuth();
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [allHostGames, setAllHostGames] = useState<Game[]>([]);
  const [showGameManager, setShowGameManager] = useState(false);
  const [userCodes, setUserCodes] = useState<UserCode[]>([]);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Game creation form
  const [gameTitle, setGameTitle] = useState('');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [prizeDistribution, setPrizeDistribution] = useState({
    quarter1: 25,
    quarter2: 25,
    quarter3: 25,
    quarter4: 25
  });
  const [nflGames, setNflGames] = useState<NFLGame[]>([]);
  const [selectedNflGame, setSelectedNflGame] = useState<NFLGame | null>(null);
  const [useCustomTeams, setUseCustomTeams] = useState(false);
  
  // Code generation
  const [squaresToAssign, setSquaresToAssign] = useState(5);
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [sendEmailInvite, setSendEmailInvite] = useState(true);
  
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

  // Winner popup
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerData, setWinnerData] = useState<any>(null);

  const loadAllHostGames = async () => {
    if (currentUser) {
      try {
        const games = await getAllHostGames(currentUser.uid);
        setAllHostGames(games);
      } catch (error) {
        console.error('Error loading all host games:', error);
      }
    }
  };

  const handleSwitchToGame = async (gameId: string) => {
    try {
      setLoading(true);
      localStorage.setItem('gameId', gameId);
      
      subscribeToGame(gameId, (game) => {
        setCurrentGame(game);
      });
      
      loadUserCodes(gameId);
      setShowGameManager(false);
      
    } catch (error) {
      console.error('Error switching to game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId: string, gameTitle: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the game "${gameTitle}"? This action cannot be undone and will remove all players and data associated with this game.`)) {
      try {
        setLoading(true);
        await deleteGame(gameId);
        
        // If this was the current game, clear it
        if (currentGame?.id === gameId) {
          setCurrentGame(null);
          localStorage.removeItem('gameId');
        }
        
        // Reload the games list
        await loadAllHostGames();
        
      } catch (error) {
        console.error('Error deleting game:', error);
        alert('Failed to delete game. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleGameActive = async (gameId: string, isActive: boolean) => {
    try {
      await setGameActive(gameId, !isActive);
      await loadAllHostGames();
      
      // If this is the current game, update it
      if (currentGame?.id === gameId) {
        setCurrentGame(prev => prev ? { ...prev, isActive: !isActive } : null);
      }
    } catch (error) {
      console.error('Error toggling game active status:', error);
    }
  };

  useEffect(() => {
    const loadHostGames = async () => {
      if (currentUser) {
        try {
          // Load all host games first
          await loadAllHostGames();
          
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

  // Fetch NFL games on component mount
  useEffect(() => {
    fetchUpcomingGames().then(games => {
      setNflGames(games);
    }).catch(error => {
      console.error('Error fetching NFL games:', error);
    });
  }, []);

  // Auto-fetch NFL scores every 30 seconds for games with NFL IDs
  useEffect(() => {
    if (currentGame?.nflGameId) {
      const interval = setInterval(fetchNFLScores, 30000); // 30 seconds
      // Fetch immediately
      fetchNFLScores();
      
      return () => clearInterval(interval);
    }
  }, [currentGame?.nflGameId]);

  const resetCreateGameForm = () => {
    setGameTitle('');
    setTeam1('');
    setTeam2('');
    setSelectedNflGame(null);
    setUseCustomTeams(false);
    setPrizeDistribution({
      quarter1: 25,
      quarter2: 25,
      quarter3: 25,
      quarter4: 25
    });
  };

  // Auto-fetch live scores for NFL games
  const fetchNFLScores = async () => {
    if (currentGame?.nflGameId) {
      try {
        const liveScores = await fetchLiveScores([currentGame.nflGameId]);
        if (liveScores.length > 0) {
          const scores = liveScores[0];
          
          // Update if scores have changed
          if (scores.homeScore !== team1Score || scores.awayScore !== team2Score) {
            setTeam1Score(scores.homeScore);
            setTeam2Score(scores.awayScore);
            
            // Auto-update the game if scores changed
            if (scores.quarter && scores.quarter !== currentQuarter) {
              setCurrentQuarter(scores.quarter);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching live NFL scores:', error);
      }
    }
  };

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
    
    // Validate prize distribution totals $100
    const totalPrizes = prizeDistribution.quarter1 + prizeDistribution.quarter2 + prizeDistribution.quarter3 + prizeDistribution.quarter4;
    if (totalPrizes !== 100) {
      alert('Prize distribution must total exactly $100');
      return;
    }

    // Validate team names
    let finalTeam1 = team1;
    let finalTeam2 = team2;
    
    if (!useCustomTeams && selectedNflGame) {
      finalTeam1 = selectedNflGame.homeTeam;
      finalTeam2 = selectedNflGame.awayTeam;
    } else if (useCustomTeams) {
      if (!team1.trim() || !team2.trim()) {
        alert('Please enter both team names');
        return;
      }
    } else {
      alert('Please select an NFL game or choose custom teams');
      return;
    }
    
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
      
      // Create ordered numbers for rows and columns (0-9)
      const rowNumbers = Array.from({ length: 10 }, (_, i) => i);
      const colNumbers = Array.from({ length: 10 }, (_, i) => i);
      
      const gameData = {
        hostId: 'host', // Since we're using anonymous auth
        hostUserId: currentUser?.uid || '',
        hostName: authenticatedHostName || 'Unknown Host',
        title: gameTitle,
        team1: finalTeam1,
        team2: finalTeam2,
        squares,
        rowNumbers,
        colNumbers,
        isActive: true,
        isCompleted: false,
        isLocked: false, // New: Allow square selection initially
        prizeDistribution, // Use custom prize distribution
        totalPrizePool: 100, // Fixed: Total pool is always $100
        maxSquaresPerUser: 25, // Allow users to select up to 25 squares
        currentQuarter: 1,
        quarterWinners: [], // Initialize empty quarter winners array
        scores: [],
        nflGameId: selectedNflGame?.id, // Store NFL game ID if selected
      };
      
      const gameId = await createGame(gameData);
      localStorage.setItem('gameId', gameId);
      
      setShowCreateGame(false);
      resetCreateGameForm();
      
      // Reload all games to show the new one
      await loadAllHostGames();
      
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
      
      // Show winner modal instead of alert
      setWinnerData({
        quarter: currentQuarter,
        quarterLabel: currentQuarter === 4 ? 'Final Score' : `Quarter ${currentQuarter}`,
        winner: result.winner,
        isGameComplete: result.isGameComplete,
        nextQuarter: result.nextQuarter,
        team1: currentGame.team1,
        team2: currentGame.team2,
        team1Score,
        team2Score
      });
      setShowWinnerModal(true);
      
      // Update quarter state if needed
      if (result.nextQuarter && !result.isGameComplete) {
        setCurrentQuarter(result.nextQuarter);
      }
      
      setQuarterResults([...quarterResults, result.winner]);
    } catch (error) {
      console.error('Error updating scores:', error);
      alert('Error updating scores. Please try again.');
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

  const handleLockSelections = async () => {
    if (!currentGame) return;
    
    const soldSquares = currentGame.squares.filter(s => s.claimed).length;
    const confirmMessage = `Lock square selections? This will:\n\n• Prevent players from changing their selections\n• Finalize the game with ${soldSquares} squares sold\n• Start the game officially\n\nThis action cannot be undone. Continue?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      await lockGameSelections(currentGame.id);
      alert('Square selections have been locked! The game is now officially started.');
    } catch (error) {
      console.error('Error locking game selections:', error);
      alert('Failed to lock selections. Please try again.');
    }
  };

  const handleRandomizeNumbers = async () => {
    if (!currentGame) return;
    
    const confirmMessage = `Randomize the grid numbers? This will:\n\n• Shuffle the row and column numbers (0-9)\n• Change which squares win for each score combination\n• This is typically done after all squares are sold\n\nContinue?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      await randomizeGameNumbers(currentGame.id);
      alert('Grid numbers have been randomized!');
    } catch (error) {
      console.error('Error randomizing numbers:', error);
      alert('Failed to randomize numbers. Please try again.');
    }
  };

  const handleCompleteGame = async () => {
    if (!currentGame) return;
    
    const confirmMessage = `Complete and archive this game?\n\nThis will:\n• Mark the game as finished\n• Deactivate the game\n• Move it to completed games archive\n\nThis action cannot be undone. Continue?`;
    
    if (confirm(confirmMessage)) {
      try {
        await completeGame(currentGame.id);
        alert('Game completed successfully!');
        
        // Reload games to refresh the list
        await loadAllHostGames();
      } catch (error) {
        console.error('Error completing game:', error);
        alert('Failed to complete game. Please try again.');
      }
    }
  };

  if (showGameManager && !currentGame && !showCreateGame) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Manage Your Games</h1>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
          
          <div className="space-y-4">
            {allHostGames.map((game) => (
              <div key={game.id} className="bg-gray-900 p-6 rounded-lg flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-bold text-2xl">{game.title}</h3>
                  <p className="text-gray-400 text-lg">{game.team1} vs {game.team2}</p>
                  <p className="text-sm text-gray-500">
                    Created: {game.createdAt ? (
                      game.createdAt instanceof Date 
                        ? game.createdAt.toLocaleDateString()
                        : new Date((game.createdAt as any).seconds * 1000).toLocaleDateString()
                    ) : 'Unknown'}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`px-3 py-1 rounded text-sm ${game.isActive ? 'bg-green-600' : 'bg-gray-600'}`}>
                      {game.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-sm text-gray-400">
                      {game.isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleSwitchToGame(game.id)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                  >
                    Switch To
                  </button>
                  <button
                    onClick={() => handleToggleGameActive(game.id, game.isActive)}
                    className={`px-4 py-2 rounded ${
                      game.isActive 
                        ? 'bg-yellow-600 hover:bg-yellow-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {game.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteGame(game.id, game.title)}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            
            <div className="flex justify-center space-x-4 mt-8">
              <button
                onClick={() => setShowCreateGame(true)}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg"
              >
                Create New Game
              </button>
              <button
                onClick={() => setShowGameManager(false)}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentGame && !showCreateGame && !showGameManager) {
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
            <h2 className="text-xl mb-4">No active game selected</h2>
            <div className="space-y-4">
              <button
                onClick={() => setShowCreateGame(true)}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-lg block mx-auto"
              >
                Create New Game
              </button>
              
              {allHostGames.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-2">Or choose from your existing games:</p>
                  <button
                    onClick={() => setShowGameManager(true)}
                    className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-lg"
                  >
                    Manage Existing Games ({allHostGames.length})
                  </button>
                </div>
              )}
            </div>
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
            
            {/* Team Selection */}
            <div>
              <label className="block text-sm font-bold mb-2">Game Selection</label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="nfl-game"
                    name="gameType"
                    checked={!useCustomTeams}
                    onChange={() => setUseCustomTeams(false)}
                    className="text-blue-600"
                  />
                  <label htmlFor="nfl-game" className="text-sm">Use NFL Game</label>
                </div>
                
                {!useCustomTeams && (
                  <div>
                    <select
                      value={selectedNflGame?.id || ''}
                      onChange={(e) => {
                        const gameId = e.target.value;
                        const game = nflGames.find(g => g.id === gameId);
                        setSelectedNflGame(game || null);
                      }}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                      required={!useCustomTeams}
                    >
                      <option value="">Select an NFL game...</option>
                      {nflGames.map(game => (
                        <option key={game.id} value={game.id}>
                          {game.awayTeam} @ {game.homeTeam} - {new Date(game.date).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    {selectedNflGame && (
                      <p className="text-xs text-gray-400 mt-1">
                        Game: {selectedNflGame.awayTeam} @ {selectedNflGame.homeTeam}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="custom-teams"
                    name="gameType"
                    checked={useCustomTeams}
                    onChange={() => setUseCustomTeams(true)}
                    className="text-blue-600"
                  />
                  <label htmlFor="custom-teams" className="text-sm">Custom Teams</label>
                </div>
                
                {useCustomTeams && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Home Team</label>
                      <input
                        type="text"
                        value={team1}
                        onChange={(e) => setTeam1(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                        placeholder="e.g. Chiefs"
                        required={useCustomTeams}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Away Team</label>
                      <input
                        type="text"
                        value={team2}
                        onChange={(e) => setTeam2(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                        placeholder="e.g. 49ers"
                        required={useCustomTeams}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Prize Distribution ($100 Total)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Q1 Prize ($)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={prizeDistribution.quarter1}
                    onChange={(e) => setPrizeDistribution(prev => ({
                      ...prev,
                      quarter1: parseInt(e.target.value) || 0
                    }))}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Q2 Prize ($)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={prizeDistribution.quarter2}
                    onChange={(e) => setPrizeDistribution(prev => ({
                      ...prev,
                      quarter2: parseInt(e.target.value) || 0
                    }))}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Q3 Prize ($)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={prizeDistribution.quarter3}
                    onChange={(e) => setPrizeDistribution(prev => ({
                      ...prev,
                      quarter3: parseInt(e.target.value) || 0
                    }))}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Final Prize ($)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={prizeDistribution.quarter4}
                    onChange={(e) => setPrizeDistribution(prev => ({
                      ...prev,
                      quarter4: parseInt(e.target.value) || 0
                    }))}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
                  />
                </div>
              </div>
              <div className={`text-xs mt-1 ${
                (prizeDistribution.quarter1 + prizeDistribution.quarter2 + prizeDistribution.quarter3 + prizeDistribution.quarter4) === 100 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                Total: ${prizeDistribution.quarter1 + prizeDistribution.quarter2 + prizeDistribution.quarter3 + prizeDistribution.quarter4} 
                {(prizeDistribution.quarter1 + prizeDistribution.quarter2 + prizeDistribution.quarter3 + prizeDistribution.quarter4) !== 100 && ' (Must equal $100)'}
              </div>
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
                onClick={() => {
                  setShowCreateGame(false);
                  resetCreateGameForm();
                }}
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <h1 className="text-2xl sm:text-3xl font-bold">{currentGame?.title || 'Host Dashboard'}</h1>
            {allHostGames.length > 1 && (
              <button
                onClick={() => setShowGameManager(true)}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm w-fit"
              >
                Manage Games ({allHostGames.length})
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => setShowCreateGame(true)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium"
            >
              Create New Game
            </button>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Game Manager Modal */}
        {showGameManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Manage Your Games</h2>
              
              <div className="space-y-3">
                {allHostGames.map((game) => (
                  <div key={game.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{game.title}</h3>
                      <p className="text-gray-400">{game.team1} vs {game.team2}</p>
                      <p className="text-sm text-gray-500">
                        Created: {game.createdAt ? (
                          game.createdAt instanceof Date 
                            ? game.createdAt.toLocaleDateString()
                            : new Date((game.createdAt as any).seconds * 1000).toLocaleDateString()
                        ) : 'Unknown'}
                        {game.id === currentGame?.id && <span className=" text-green-400 ml-2">(Current)</span>}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs ${game.isActive ? 'bg-green-600' : 'bg-gray-600'}`}>
                          {game.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {game.isCompleted ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {game.id !== currentGame?.id && (
                        <button
                          onClick={() => handleSwitchToGame(game.id)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                        >
                          Switch To
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleGameActive(game.id, game.isActive)}
                        className={`px-3 py-1 rounded text-sm ${
                          game.isActive 
                            ? 'bg-yellow-600 hover:bg-yellow-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {game.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteGame(game.id, game.title)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowCreateGame(true)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                >
                  Create New Game
                </button>
                <button
                  onClick={() => setShowGameManager(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
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
            
            {/* Live Score Display for NFL Games */}
            {currentGame?.nflGameId && (
              <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-blue-300">🏈 Live NFL Scores</h3>
                  <button
                    onClick={fetchNFLScores}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                  >
                    🔄 Refresh
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-lg font-bold">{currentGame.team1}</div>
                    <div className="text-2xl font-bold text-green-400">{team1Score}</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-lg font-bold">{currentGame.team2}</div>
                    <div className="text-2xl font-bold text-green-400">{team2Score}</div>
                  </div>
                </div>
                <div className="text-center mt-2 text-sm text-gray-400">
                  Quarter {currentQuarter} • Auto-updates every 30 seconds
                </div>
              </div>
            )}
            
            <div className="space-y-4">{currentGame?.nflGameId && (
                <div className="mb-4">
                  <h4 className="text-md font-bold mb-2 text-gray-300">Manual Score Override</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Use these fields to manually adjust scores if needed
                  </p>
                </div>
              )}
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
                  <li>• Q1 Winner: ${currentGame?.prizeDistribution?.quarter1 || 25}</li>
                  <li>• Q2 Winner: ${currentGame?.prizeDistribution?.quarter2 || 25}</li>
                  <li>• Q3 Winner: ${currentGame?.prizeDistribution?.quarter3 || 25}</li>
                  <li>• Final Score Winner: ${currentGame?.prizeDistribution?.quarter4 || 25}</li>
                  <li>• Total Pool: $100</li>
                </ul>
                <p className="text-xs text-yellow-300 mt-2">
                  Same grid used for all quarters
                </p>
              </div>
              
              {/* Game Lock Control */}
              <div className="bg-yellow-900 p-4 rounded border border-yellow-600">
                <h3 className="font-bold text-yellow-300 mb-2">Game Control</h3>
                {!currentGame?.isLocked ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-yellow-200 mb-2">
                        Players can still select squares. Lock selections when ready to start the game.
                      </p>
                      <button
                        onClick={handleLockSelections}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-yellow-100 py-2 rounded font-bold"
                      >
                        🔒 Lock Square Selections
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-yellow-200 mb-2">
                        Randomize grid numbers (typically done after all squares are sold):
                      </p>
                      <button
                        onClick={handleRandomizeNumbers}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-blue-100 py-2 rounded font-bold"
                      >
                        🎲 Randomize Grid Numbers
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-yellow-200 font-bold">🔒 Square Selections Locked</p>
                    <p className="text-xs text-yellow-300 mt-1">Players can no longer change their selections</p>
                    <button
                      onClick={handleRandomizeNumbers}
                      className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-blue-100 py-2 rounded font-bold"
                    >
                      🎲 Randomize Grid Numbers
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdateScores}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded"
                >
                  Update Scores
                </button>
                
                {currentGame?.nflGameId && (
                  <button
                    onClick={fetchNFLScores}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded"
                    title="Refresh live NFL scores"
                  >
                    🔄
                  </button>
                )}
              </div>
              
              {/* Game Management Actions */}
              <div className="mt-4 pt-4 border-t border-gray-600">
                <button
                  onClick={handleCompleteGame}
                  className="w-full bg-red-600 hover:bg-red-700 py-3 rounded font-bold"
                >
                  🏁 End & Archive Game
                </button>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Complete the game and move it to archive
                </p>
              </div>
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

        {/* Master Grid */}
        {currentGame && (
          <div className="mt-8 bg-gray-900 p-4 sm:p-6 rounded-lg">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Master Grid - All Player Selections</h2>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Column headers (Team 2) */}
                <div className="flex mb-1">
                  <div className="w-6 sm:w-8 h-6 sm:h-8"></div> {/* Empty corner */}
                  <div className="text-center font-bold text-xs sm:text-sm mb-1 flex-1">{currentGame.team2}</div>
                </div>
                <div className="flex mb-1">
                  <div className="w-6 sm:w-8 h-6 sm:h-8"></div> {/* Empty corner */}
                  {currentGame.colNumbers.map((num, index) => (
                    <div key={index} className="w-8 sm:w-12 h-6 sm:h-8 border border-gray-600 bg-blue-800 text-white text-xs flex items-center justify-center font-bold">
                      {num}
                    </div>
                  ))}
                </div>
                
                {/* Grid rows */}
                {Array.from({ length: 10 }, (_, rowIndex) => (
                  <div key={rowIndex} className="flex">
                    {/* Row header (Team 1) */}
                    {rowIndex === 0 && (
                      <div className="w-6 sm:w-8 flex items-center justify-center text-xs font-bold text-center transform -rotate-90 mb-1">
                        {currentGame.team1}
                      </div>
                    )}
                    {rowIndex !== 0 && <div className="w-6 sm:w-8"></div>}
                    <div className="w-8 sm:w-12 h-8 sm:h-12 border border-gray-600 bg-red-800 text-white text-xs flex items-center justify-center font-bold">
                      {currentGame.rowNumbers[rowIndex]}
                    </div>
                    
                    {/* Grid squares */}
                    {Array.from({ length: 10 }, (_, colIndex) => {
                      const square = currentGame.squares.find(s => s.row === rowIndex && s.col === colIndex);
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`w-8 sm:w-12 h-8 sm:h-12 border border-gray-600 text-xs flex items-center justify-center ${
                            square?.claimed 
                              ? 'bg-green-800 text-green-100' 
                              : 'bg-gray-700 text-gray-400'
                          }`}
                          title={square?.claimed ? `${square.userName}` : 'Available'}
                        >
                          <div className="text-center">
                            {square?.claimed && (
                              <div className="font-bold text-[8px] sm:text-[10px] leading-none">
                                {square.userInitials || square.userName?.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 text-xs sm:text-sm text-gray-400">
              <p>• Green squares are claimed by players</p>
              <p>• Gray squares are still available</p>
              <p>• Hover over squares to see player names</p>
            </div>
          </div>
        )}

        {/* Quarter Winners */}
        {currentGame?.quarterWinners && currentGame.quarterWinners.length > 0 && (
          <div className="mt-8 bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Quarter Winners</h2>
            <div className="grid gap-4">
              {currentGame.quarterWinners
                .sort((a, b) => a.quarter - b.quarter)
                .map((winner) => (
                  <div 
                    key={winner.quarter} 
                    className="bg-green-900 border border-green-600 p-4 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-green-300 text-lg">
                          {winner.quarter === 4 ? 'Final Score' : `Quarter ${winner.quarter}`}
                        </h3>
                        <p className="text-green-200 text-sm">
                          {currentGame.team1} {winner.team1Score} - {currentGame.team2} {winner.team2Score}
                        </p>
                        <p className="text-green-100 font-semibold mt-1">
                          Winner: {winner.winnerName}
                        </p>
                        {winner.winnerEmail && (
                          <p className="text-green-200 text-sm">
                            Email: {winner.winnerEmail}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-300">
                          ${winner.prizeAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-green-400">
                          Prize Won
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-green-300">
                      Winning numbers: {currentGame.team1} {winner.team1Score % 10}, {currentGame.team2} {winner.team2Score % 10}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
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

      {/* Winner Modal */}
      {showWinnerModal && winnerData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full mx-4 border-2 border-yellow-500">
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                {winnerData.quarterLabel} Results
              </h2>
              
              <div className="bg-gray-900 p-4 rounded-lg mb-4">
                <div className="text-lg font-bold mb-2">
                  {winnerData.team1} {winnerData.team1Score} - {winnerData.team2} {winnerData.team2Score}
                </div>
                <div className="text-sm text-gray-400">
                  Winning Numbers: {winnerData.team1} {winnerData.team1Score % 10}, {winnerData.team2} {winnerData.team2Score % 10}
                </div>
              </div>

              {winnerData.winner.winnerName === 'No Winner (Square not sold)' ? (
                <div className="text-center">
                  <div className="text-xl text-red-400 font-bold mb-2">No Winner</div>
                  <div className="text-gray-400">This square was not sold</div>
                  <div className="text-lg font-bold text-yellow-400 mt-2">
                    Prize: ${winnerData.winner.prizeAmount}
                  </div>
                  <div className="text-sm text-gray-400">
                    (Prize rolls over or returned to pool)
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-xl text-green-400 font-bold mb-2">🎉 Winner!</div>
                  <div className="text-2xl font-bold text-white mb-2">
                    {winnerData.winner.winnerName}
                  </div>
                  <div className="text-lg font-bold text-yellow-400">
                    Wins ${winnerData.winner.prizeAmount}!
                  </div>
                </div>
              )}

              {winnerData.isGameComplete && (
                <div className="mt-4 p-3 bg-purple-900/50 border border-purple-500 rounded">
                  <div className="text-lg font-bold text-purple-300">🎊 Game Complete!</div>
                  <div className="text-sm text-purple-200">All quarters have been played</div>
                </div>
              )}

              {!winnerData.isGameComplete && winnerData.nextQuarter && (
                <div className="mt-4 p-3 bg-blue-900/50 border border-blue-500 rounded">
                  <div className="text-blue-300 font-bold">
                    Ready for Quarter {winnerData.nextQuarter}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setShowWinnerModal(false);
                  setWinnerData(null);
                }}
                className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-bold"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;
