import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateUserCode, useUserCode } from '../services/gameService';

const Login: React.FC = () => {
  const [loginType, setLoginType] = useState<'host' | 'player' | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [userCode, setUserCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signInAsHost, signInAsPlayer } = useAuth();

  const handleHostLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInAsHost();
    } catch (error: any) {
      console.error('Host login error:', error);
      let errorMessage = 'Failed to sign in as host';
      
      if (error.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Authentication not configured. Please enable Anonymous auth in Firebase Console.';
      } else if (error.code === 'auth/api-key-not-valid') {
        errorMessage = 'Invalid Firebase API key. Please check your configuration.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim() || !userCode.trim()) {
      setError('Please enter your name and user code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Validate the user code
      const codeData = await validateUserCode(userCode);
      
      if (!codeData) {
        setError('Invalid or already used code');
        return;
      }
      
      // Mark the code as used
      await useUserCode(codeData.id, playerName);
      
      // Sign in the player
      await signInAsPlayer(playerName, userCode);
      
      // Store the game ID
      localStorage.setItem('gameId', codeData.gameId);
      
    } catch (error: any) {
      console.error('Player login error:', error);
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (error.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Authentication not configured. Please enable Anonymous auth in Firebase Console.';
      } else if (error.code === 'auth/api-key-not-valid') {
        errorMessage = 'Invalid Firebase API key. Please check your configuration.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loginType === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-white text-center mb-8">
            🏈 Football Squares
          </h1>
          
          <div className="space-y-4">
            <button
              onClick={() => setLoginType('host')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Host Login
            </button>
            
            <button
              onClick={() => setLoginType('player')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Player Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loginType === 'host') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Host Login
          </h2>
          
          {error && (
            <div className="bg-red-600 text-white p-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <button
              onClick={handleHostLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in as Host'}
            </button>
            
            <button
              onClick={() => setLoginType(null)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          Player Login
        </h2>
        
        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handlePlayerLogin} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-bold mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              placeholder="Enter your name"
              required
            />
          </div>
          
          <div>
            <label className="block text-white text-sm font-bold mb-2">
              User Code
            </label>
            <input
              type="text"
              value={userCode}
              onChange={(e) => setUserCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500 uppercase"
              placeholder="Enter your code"
              maxLength={6}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Join Game'}
          </button>
          
          <button
            type="button"
            onClick={() => setLoginType(null)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
