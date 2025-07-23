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
      alert('Squares submitted successfully!');
      
    } catch (error) {
      console.error('Error submitting squares:', error);
      alert('Error submitting squares. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSquareColor = (square: GameSquare) => {
    if (selectedSquares.includes(square.id)) {
      return 'shadow-yellow-500';
    }
    if (square.claimed) {
      if (square.userName === playerName) {
        return 'shadow-blue-500'; // Your squares
      }
      return 'shadow-red-500'; // Other players' squares
    }
    return 'shadow-white';
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
            <div className="font-bold">Prize per Quarter: ${game.prizePerQuarter}</div>
            <div>Total Prize Pool: ${game.totalPrizePool}</div>
          </div>
        </div>
        
        {userType === 'player' && userCode && (
          <div className="mb-4">
            <div className="text-lg">
              Welcome, <span className="font-bold">{playerName}</span>!
            </div>
            <div className="text-sm">
              You can select <span className="font-bold text-yellow-400">{getRemainingSquares()}</span> more squares
            </div>
            <div className="text-xs text-gray-400">
              ({userCode.squaresAllowed} squares allowed total)
            </div>
            {selectedSquares.length > 0 && (
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
          <div key={`col-${index}`} className="border border-white h-8 w-8 md:w-12 md:h-12 flex items-center justify-center font-bold shadow-md shadow-green-500 text-base">
            {num}
          </div>
        ))}
        
        {/* Grid rows */}
        {Array.from({ length: 10 }, (_, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {/* Row header */}
            <div className="border border-white h-8 w-8 md:w-12 md:h-12 flex items-center justify-center font-bold shadow-md shadow-green-500 text-base">
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
                    border border-white h-8 w-8 md:w-12 md:h-12 flex items-center justify-center font-bold text-xs
                    shadow-md ${square ? getSquareColor(square) : 'shadow-white'}
                    ${isClickable ? 'cursor-pointer hover:bg-gray-700' : ''}
                    ${selectedSquares.includes(squareId) ? 'bg-yellow-900' : ''}
                  `}
                >
                  {square?.userInitials || ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Current Scores and Winners */}
      {game.scores.length > 0 && (
        <div className="text-center py-8">
          <h2 className="text-xl font-bold mb-4">Current Scores</h2>
          <div className="flex justify-center space-x-8 mb-6">
            <div className="text-center">
              <div className="text-lg font-bold">{game.team1}</div>
              <div className="text-3xl text-blue-400">{game.scores[game.scores.length - 1]?.team1 || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{game.team2}</div>
              <div className="text-3xl text-red-400">{game.scores[game.scores.length - 1]?.team2 || 0}</div>
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-6">
            Quarter {game.scores[game.scores.length - 1]?.quarter || 1}
          </div>
          
          {/* Quarter Winners */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-4">Quarter Winners</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(quarter => {
                const quarterScore = game.scores.find(s => s.quarter === quarter);
                return (
                  <div key={quarter} className="bg-gray-800 p-4 rounded-lg">
                    <div className="font-bold mb-2">Q{quarter}</div>
                    {quarterScore ? (
                      <>
                        <div className="text-sm mb-1">
                          {quarterScore.team1} - {quarterScore.team2}
                        </div>
                        {quarterScore.winner ? (
                          <div className="text-green-400 font-bold">
                            🏆 {quarterScore.winner}
                          </div>
                        ) : (
                          <div className="text-gray-400">No winner</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          ${game.prizePerQuarter}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400">Pending</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="text-center py-8 space-y-2">
        <h3 className="text-lg font-bold mb-4">Legend</h3>
        <div className="flex justify-center space-x-6 text-sm flex-wrap gap-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-white shadow-md shadow-white"></div>
            <span>Available</span>
          </div>
          {userType === 'player' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border border-white shadow-md shadow-yellow-500"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border border-white shadow-md shadow-blue-500"></div>
                <span>Your Squares</span>
              </div>
            </>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-white shadow-md shadow-red-500"></div>
            <span>Other Players</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Maingrid;
