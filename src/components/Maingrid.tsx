import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToGame, updateGameSquares, getUserCodeByName } from '../services/gameService';
import { Game, GameSquare, UserCode } from '../types';

function Maingrid() {
  const { playerName, userType } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedSquares, setSelectedSquares] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [userCode, setUserCode] = useState<UserCode | null>(null);

  useEffect(() => {
    const gameId = localStorage.getItem('gameId');
    if (gameId) {
      const unsubscribe = subscribeToGame(gameId, (gameData) => {
        setGame(gameData);
      });
      
      // Load user's code information
      if (playerName && userType === 'player') {
        getUserCodeByName(gameId, playerName).then(code => {
          setUserCode(code);
        });
      }
      
      return unsubscribe;
    }
  }, [playerName, userType]);

  const handleSquareClick = (squareId: string) => {
    if (!game || userType !== 'player' || !playerName || !userCode) return;
    
    // Check if game selections are locked
    if (game.isLocked) {
      alert('Square selections have been locked by the host. No more changes are allowed.');
      return;
    }
    
    const square = game.squares.find(s => s.id === squareId);
    if (!square || square.claimed) return;
    
    const userSquareCount = game.squares.filter(s => s.userName === playerName).length;
    const isSelected = selectedSquares.includes(squareId);
    
    if (isSelected) {
      // Deselect square
      setSelectedSquares(prev => prev.filter(id => id !== squareId));
    } else {
      // Select square (check max limit from user code)
      if (userSquareCount + selectedSquares.length >= userCode.squaresAllowed) {
        alert(`You can only select ${userCode.squaresAllowed} squares maximum.`);
        return;
      }
      setSelectedSquares(prev => [...prev, squareId]);
    }
  };

  const handleSubmitSquares = async () => {
    if (!game || !playerName || selectedSquares.length === 0) return;
    
    try {
      setLoading(true);
      
      const updatedSquares = game.squares.map(square => {
        if (selectedSquares.includes(square.id)) {
          return {
            ...square,
            claimed: true,
            userName: playerName,
            userInitials: playerName.split(' ').map(n => n[0]).join('').toUpperCase(),
            userId: playerName, // Using name as ID since we don't have user IDs
          };
        }
        return square;
      });
      
      await updateGameSquares(game.id, updatedSquares);
      setSelectedSquares([]);
      alert('Squares submitted successfully! 🎉');
      
    } catch (error: any) {
      console.error('Error submitting squares:', error);
      
      // Check for conflict error and show specific message
      if (error.message.includes('already selected by another player')) {
        alert('⚠️ ' + error.message);
        // Clear selected squares since they're no longer valid
        setSelectedSquares([]);
      } else {
        alert('Error submitting squares. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getSquareColor = (square: GameSquare) => {
    if (square.claimed) {
      if (square.userName === playerName) {
        return 'bg-blue-700 text-blue-100 border-blue-500'; // Your squares
      }
      return 'bg-green-700 text-green-100 border-green-500'; // Other players' squares
    }
    return 'bg-gray-800 text-gray-400'; // Available squares
  };

  const getUserSquareCount = () => {
    if (!game || !playerName) return 0;
    return game.squares.filter(s => s.userName === playerName).length;
  };

  const getRemainingSquares = () => {
    if (!game || !playerName || !userCode) return 0;
    return userCode.squaresAllowed - getUserSquareCount() - selectedSquares.length;
  };

  if (!game) {
    return (
      <div className="text-center py-20 text-white">
        <div className="text-xl">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Game Header */}
      <div className="text-center py-5">
        <h1 className="text-2xl font-bold mb-2">{game.title}</h1>
        <div className="text-lg mb-2">
          {game.team1} vs {game.team2}
        </div>
        
        {/* Prize Information */}
        <div className="mb-4 text-sm">
          <div className="bg-green-900 px-4 py-2 rounded-lg inline-block">
            <div className="font-bold">Prize Distribution:</div>
            <div className="text-xs grid grid-cols-2 gap-2 mt-1">
              <div>Q1: ${game.prizeDistribution?.quarter1 || 25}</div>
              <div>Q2: ${game.prizeDistribution?.quarter2 || 25}</div>
              <div>Q3: ${game.prizeDistribution?.quarter3 || 25}</div>
              <div>Final: ${game.prizeDistribution?.quarter4 || 25}</div>
            </div>
            <div className="font-bold mt-1">Total Prize Pool: ${game.totalPrizePool}</div>
          </div>
        </div>

        {/* Current Scores and Winners - Moved to Top */}
        {game.scores.length > 0 && (
          <div className="mb-6 bg-gray-900 p-4 rounded-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">🏈 Live Scores</h2>
              {game.nflGameId && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400">Live NFL Updates</span>
                </div>
              )}
            </div>
            <div className="flex justify-center space-x-8 mb-6">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">{game.team1}</div>
                <div className="text-3xl text-blue-400">{game.scores[game.scores.length - 1]?.team1 || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-400">{game.team2}</div>
                <div className="text-3xl text-red-400">{game.scores[game.scores.length - 1]?.team2 || 0}</div>
              </div>
            </div>
            
            {/* Quarter Winners */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(quarter => {
                const quarterScore = game.scores.find(s => s.quarter === quarter);
                const quarterWinner = game.quarterWinners?.find(w => w.quarter === quarter);
                return (
                  <div key={quarter} className="bg-gray-800 p-3 rounded-lg">
                    <div className="font-bold mb-2">{quarter === 4 ? 'Final' : `Q${quarter}`}</div>
                    {quarterScore ? (
                      <>
                        <div className="text-sm mb-1">
                          {quarterScore.team1} - {quarterScore.team2}
                        </div>
                        {quarterWinner && quarterWinner.winnerName !== 'No Winner (Square not sold)' ? (
                          <div className="text-green-400 font-bold text-xs">
                            🏆 {quarterWinner.winnerName}
                            <div className="text-green-300">${quarterWinner.prizeAmount}</div>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">No winner</div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-400 text-xs">Pending</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {userType === 'player' && userCode && (
          <div className="mb-4">
            <div className="text-lg">
              Welcome, <span className="font-bold">{playerName}</span>!
            </div>
            {game.isLocked ? (
              <div className="text-red-400 font-bold text-sm">
                🔒 Square selections are locked. No more changes allowed.
              </div>
            ) : (
              <>
                <div className="text-sm">
                  You can select <span className="font-bold text-yellow-400">{getRemainingSquares()}</span> more squares
                </div>
                <div className="text-xs text-gray-400">
                  ({userCode.squaresAllowed} squares allowed total)
                </div>
              </>
            )}
            {selectedSquares.length > 0 && !game.isLocked && (
              <button
                onClick={handleSubmitSquares}
                disabled={loading}
                className="mt-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-6 py-2 rounded"
              >
                {loading ? 'Submitting...' : `Submit ${selectedSquares.length} Square${selectedSquares.length > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-11 gap-1 p-4 mx-4 md:mx-20 lg:mx-40 text-xs">
        {/* Top row headers */}
        <div className="text-xl text-center">🏈</div>
        {game.colNumbers.map((num, index) => (
          <div key={`col-${index}`} className="border border-gray-600 h-8 w-8 md:w-12 md:h-12 bg-blue-800 text-blue-100 flex items-center justify-center font-bold text-base">
            {num}
          </div>
        ))}
        
        {/* Grid rows */}
        {Array.from({ length: 10 }, (_, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {/* Row header */}
            <div className="border border-gray-600 h-8 w-8 md:w-12 md:h-12 bg-red-800 text-red-100 flex items-center justify-center font-bold text-base">
              {game.rowNumbers[rowIndex]}
            </div>
            
            {/* Row squares */}
            {Array.from({ length: 10 }, (_, colIndex) => {
              const squareId = `${rowIndex}-${colIndex}`;
              const square = game.squares.find(s => s.id === squareId);
              const isClickable = userType === 'player' && square && !square.claimed;
              
              return (
                <div
                  key={squareId}
                  onClick={() => isClickable && handleSquareClick(squareId)}
                  className={`
                    border border-gray-600 h-8 w-8 md:w-12 md:h-12 flex items-center justify-center font-bold text-xs
                    ${square ? getSquareColor(square) : 'bg-gray-800 text-gray-400'}
                    ${isClickable ? 'cursor-pointer hover:bg-gray-600 hover:text-white' : ''}
                    ${selectedSquares.includes(squareId) ? 'bg-yellow-600 text-yellow-100 border-yellow-400' : ''}
                    transition-colors duration-200
                  `}
                >
                  {square?.userInitials || ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="text-center py-8 space-y-2">
        <h3 className="text-lg font-bold mb-4">Legend</h3>
        <div className="flex justify-center space-x-6 text-sm flex-wrap gap-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-800 border border-gray-600"></div>
            <span>Available</span>
          </div>
          {userType === 'player' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-600 border border-yellow-400"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-700 border border-blue-500"></div>
                <span>Your Squares</span>
              </div>
            </>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-700 border border-green-500"></div>
            <span>Other Players</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Maingrid;
