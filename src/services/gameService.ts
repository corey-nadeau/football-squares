import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Game, GameSquare, UserCode } from '../types';

// Game functions
export const createGame = async (gameData: Omit<Game, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'games'), {
      ...gameData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};

export const getGame = async (gameId: string): Promise<Game | null> => {
  try {
    const docRef = doc(db, 'games', gameId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Game;
    }
    return null;
  } catch (error) {
    console.error('Error getting game:', error);
    throw error;
  }
};

export const updateGameSquares = async (gameId: string, squares: GameSquare[]) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, { squares });
  } catch (error) {
    console.error('Error updating game squares:', error);
    throw error;
  }
};

export const updateGameScores = async (
  gameId: string, 
  team1Score: number, 
  team2Score: number, 
  quarter: number
) => {
  try {
    const game = await getGame(gameId);
    if (!game) throw new Error('Game not found');
    
    const newScore = { team1: team1Score, team2: team2Score, quarter };
    const updatedScores = [...game.scores.filter(s => s.quarter !== quarter), newScore];
    
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, { 
      scores: updatedScores,
      currentQuarter: quarter 
    });
  } catch (error) {
    console.error('Error updating game scores:', error);
    throw error;
  }
};

// User Code functions
export const generateUserCode = async (gameId: string): Promise<string> => {
  try {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    await addDoc(collection(db, 'userCodes'), {
      code,
      gameId,
      isUsed: false,
      createdAt: serverTimestamp(),
    });
    
    return code;
  } catch (error) {
    console.error('Error generating user code:', error);
    throw error;
  }
};

export const validateUserCode = async (code: string): Promise<UserCode | null> => {
  try {
    const q = query(
      collection(db, 'userCodes'), 
      where('code', '==', code.toUpperCase()),
      where('isUsed', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as UserCode;
    }
    
    return null;
  } catch (error) {
    console.error('Error validating user code:', error);
    throw error;
  }
};

export const useUserCode = async (codeId: string, userName: string) => {
  try {
    const codeRef = doc(db, 'userCodes', codeId);
    await updateDoc(codeRef, {
      isUsed: true,
      usedAt: serverTimestamp(),
      assignedUserName: userName,
    });
  } catch (error) {
    console.error('Error using user code:', error);
    throw error;
  }
};

// Real-time listeners
export const subscribeToGame = (gameId: string, callback: (game: Game) => void) => {
  const gameRef = doc(db, 'games', gameId);
  return onSnapshot(gameRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Game);
    }
  });
};

export const getGameUserCodes = async (gameId: string): Promise<UserCode[]> => {
  try {
    const q = query(collection(db, 'userCodes'), where('gameId', '==', gameId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserCode[];
  } catch (error) {
    console.error('Error getting game user codes:', error);
    throw error;
  }
};
