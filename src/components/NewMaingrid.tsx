import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToGame, updateGameSquares } from '../services/gameService';
import { Game, GameSquare } from '../types';

function Maingrid() {
  const { playerName, userType } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedSquares, setSelectedSquares] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const gameId = localStorage.getItem('gameId');
    if (gameId) {
      const unsubscribe = subscribeToGame(gameId, (gameData) => {
        setGame(gameData);
      });
      
      return unsubscribe;
    }
  }, []);

  const handleSquareClick = (squareId: string) => {
    if (!game || userType !== 'player' || !playerName) return;
    
    const square = game.squares.find(s => s.id === squareId);
    if (!square || square.claimed) return;
    
    const userSquareCount = game.squares.filter(s => s.userName === playerName).length;
    const isSelected = selectedSquares.includes(squareId);
    
    if (isSelected) {
      // Deselect square
      setSelectedSquares(prev => prev.filter(id => id !== squareId));
    } else {
      // Select square (check max limit)
      if (userSquareCount + selectedSquares.length >= game.maxSquaresPerUser) {
        alert(`You can only select ${game.maxSquaresPerUser} squares maximum.`);
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
        return 'shadow-blue-500';
      }
      return 'shadow-red-500';
    }
    return 'shadow-white';
  };

  const getUserSquareCount = () => {
    if (!game || !playerName) return 0;
    return game.squares.filter(s => s.userName === playerName).length;
  };

  const getRemainingSquares = () => {
    if (!game || !playerName) return 0;
    return game.maxSquaresPerUser - getUserSquareCount() - selectedSquares.length;
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
        <div className="text-lg mb-4">
          {game.team1} vs {game.team2}
        </div>
        
        {userType === 'player' && (
          <div className="mb-4">
            <div className="text-lg">
              Welcome, <span className="font-bold">{playerName}</span>!
            </div>
            <div className="text-sm">
              You have <span className="font-bold text-yellow-400">{getRemainingSquares()}</span> squares remaining
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

      {/* Current Scores */}
      {game.scores.length > 0 && (
        <div className="text-center py-8">
          <h2 className="text-xl font-bold mb-4">Current Scores</h2>
          <div className="flex justify-center space-x-8">
            <div className="text-center">
              <div className="text-lg font-bold">{game.team1}</div>
              <div className="text-3xl text-blue-400">{game.scores[game.scores.length - 1]?.team1 || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{game.team2}</div>
              <div className="text-3xl text-red-400">{game.scores[game.scores.length - 1]?.team2 || 0}</div>
            </div>
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Quarter {game.scores[game.scores.length - 1]?.quarter || 1}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="text-center py-8 space-y-2">
        <h3 className="text-lg font-bold mb-4">Legend</h3>
        <div className="flex justify-center space-x-6 text-sm">
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
