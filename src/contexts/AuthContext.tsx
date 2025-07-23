import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signInAsHost: () => Promise<void>;
  signInAsPlayer: (userName: string, userCode: string) => Promise<void>;
  logout: () => Promise<void>;
  userType: 'host' | 'player' | null;
  playerName: string | null;
  gameId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'host' | 'player' | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  const signInAsHost = async () => {
    try {
      await signInAnonymously(auth);
      setUserType('host');
      localStorage.setItem('userType', 'host');
    } catch (error) {
      console.error('Error signing in as host:', error);
      throw error;
    }
  };

  const signInAsPlayer = async (userName: string, userCode: string) => {
    try {
      await signInAnonymously(auth);
      setUserType('player');
      setPlayerName(userName);
      localStorage.setItem('userType', 'player');
      localStorage.setItem('playerName', userName);
      localStorage.setItem('userCode', userCode);
    } catch (error) {
      console.error('Error signing in as player:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserType(null);
      setPlayerName(null);
      setGameId(null);
      localStorage.removeItem('userType');
      localStorage.removeItem('playerName');
      localStorage.removeItem('userCode');
      localStorage.removeItem('gameId');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // Restore user type from localStorage
      if (user) {
        const savedUserType = localStorage.getItem('userType') as 'host' | 'player' | null;
        const savedPlayerName = localStorage.getItem('playerName');
        const savedGameId = localStorage.getItem('gameId');
        
        setUserType(savedUserType);
        setPlayerName(savedPlayerName);
        setGameId(savedGameId);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    signInAsHost,
    signInAsPlayer,
    logout,
    userType,
    playerName,
    gameId,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
