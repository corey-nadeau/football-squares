import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signInAsHost: (email: string, password: string) => Promise<void>;
  signUpAsHost: (email: string, password: string, hostName: string) => Promise<void>;
  signInAsPlayer: (userName: string, userCode: string) => Promise<void>;
  logout: () => Promise<void>;
  userType: 'host' | 'player' | null;
  playerName: string | null;
  hostName: string | null;
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
  const [hostName, setHostName] = useState<string | null>(
    localStorage.getItem('hostName')
  );
  const [gameId, setGameId] = useState<string | null>(null);

  const signInAsHost = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const hostName = userCredential.user.displayName || 'Unknown Host';
      
      setUserType('host');
      setHostName(hostName);
      localStorage.setItem('userType', 'host');
      localStorage.setItem('hostName', hostName);
    } catch (error) {
      console.error('Error signing in as host:', error);
      throw error;
    }
  };

  const signUpAsHost = async (email: string, password: string, hostName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's profile with their display name
      await updateProfile(userCredential.user, {
        displayName: hostName
      });
      
      setUserType('host');
      setHostName(hostName);
      localStorage.setItem('userType', 'host');
      localStorage.setItem('hostName', hostName);
    } catch (error) {
      console.error('Error signing up as host:', error);
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
      setHostName(null);
      setGameId(null);
      localStorage.removeItem('userType');
      localStorage.removeItem('playerName');
      localStorage.removeItem('hostName');
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
        
        // For hosts, get name from user profile or localStorage
        if (savedUserType === 'host') {
          const hostName = user.displayName || localStorage.getItem('hostName') || 'Unknown Host';
          setHostName(hostName);
          localStorage.setItem('hostName', hostName);
        }
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    signInAsHost,
    signUpAsHost,
    signInAsPlayer,
    logout,
    userType,
    playerName,
    hostName,
    gameId,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
