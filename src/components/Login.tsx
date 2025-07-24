import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateUserCode, useUserCode } from '../services/gameService';

const Login: React.FC = () => {
  const [loginType, setLoginType] = useState<'host' | 'player' | null>(null);
  const [isHostSignUp, setIsHostSignUp] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [userCode, setUserCode] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [hostPassword, setHostPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signInAsHost, signUpAsHost, signInAsPlayer } = useAuth();

  const handleHostLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (isHostSignUp) {
      // Handle host registration
      if (!hostName.trim() || !hostEmail.trim() || !hostPassword.trim()) {
        setError('Please fill in all fields');
        return;
      }
      
      if (hostPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      
      try {
        setLoading(true);
        setError('');
        
        await signUpAsHost(hostEmail, hostPassword, hostName);
        
      } catch (error: any) {
        console.error('Host registration error:', error);
        let errorMessage = 'Failed to create account';
        
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      // Handle host login
      if (!hostEmail.trim() || !hostPassword.trim()) {
        setError('Please enter your email and password');
        return;
      }
      
      try {
        setLoading(true);
        setError('');
        
        await signInAsHost(hostEmail, hostPassword);
        
      } catch (error: any) {
        console.error('Host login error:', error);
        let errorMessage = 'Failed to sign in';
        
        if (error.code === 'auth/invalid-email') {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email. Please sign up first.';
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-credential') {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
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
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="max-w-4xl w-full mx-4 grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Information */}
          <div className="text-white space-y-6">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-center md:text-left">
                🏆 <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">Super Squares</span>
              </h1>
              <p className="text-xl text-gray-300 text-center md:text-left">
                The ultimate game experience for any sporting event
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 rounded-full p-2 mt-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Easy to Play</h3>
                  <p className="text-gray-400">Simple grid-based game that anyone can enjoy</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-600 rounded-full p-2 mt-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Play with Friends</h3>
                  <p className="text-gray-400">Invite friends and family to join your game</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-purple-600 rounded-full p-2 mt-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Real-time Updates</h3>
                  <p className="text-gray-400">Live score tracking and instant notifications</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Login Options */}
          <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              Get Started
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={() => setLoginType('host')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"/>
                  </svg>
                  <span>Host a Game</span>
                </div>
                <p className="text-sm text-blue-100 mt-1">Create and manage your own game</p>
              </button>
              
              <button
                onClick={() => setLoginType('player')}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>Join a Game</span>
                </div>
                <p className="text-sm text-green-100 mt-1">Enter your code to join an existing game</p>
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-center text-gray-400 text-sm">
                New to Super Squares? <br/>
                <span className="text-blue-400">Start by hosting a game or ask for an invite code!</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loginType === 'host') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">
              {isHostSignUp ? '🎯 Create Host Account' : '🏆 Host Login'}
            </h2>
            <p className="text-gray-400">
              {isHostSignUp ? 'Start hosting your own Super Squares games' : 'Welcome back, game host!'}
            </p>
          </div>
          
          {error && (
            <div className="bg-red-600 text-white p-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={(e) => { e.preventDefault(); handleHostLogin(); }} className="space-y-4">
            {isHostSignUp && (
              <div>
                <label className="block text-sm font-bold mb-2 text-white">
                  Host Name
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold mb-2 text-white">
                Email Address
              </label>
              <input
                type="email"
                value={hostEmail}
                onChange={(e) => setHostEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2 text-white">
                Password
              </label>
              <input
                type="password"
                value={hostPassword}
                onChange={(e) => setHostPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter your password"
                minLength={6}
                required
              />
              {isHostSignUp && (
                <p className="text-xs text-gray-400 mt-1">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? (isHostSignUp ? 'Creating Account...' : 'Signing in...') : (isHostSignUp ? 'Create Account' : 'Sign In')}
            </button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsHostSignUp(!isHostSignUp);
                  setError('');
                }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {isHostSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
            
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
      <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-700">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            🎮 Player Login
          </h2>
          <p className="text-gray-400">
            Ready to join the action? Enter your details below!
          </p>
        </div>
        
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
