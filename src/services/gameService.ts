import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Game, GameSquare, UserCode } from '../types';
import { sendPlayerInvitation, getGameInvitationUrl } from './emailService';

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

export const getGamesByHost = async (hostUserId: string): Promise<Game[]> => {
  try {
    const q = query(
      collection(db, 'games'), 
      where('hostUserId', '==', hostUserId),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Game[];
  } catch (error) {
    console.error('Error getting games by host:', error);
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
    
    // Calculate winning square
    const team1LastDigit = team1Score % 10;
    const team2LastDigit = team2Score % 10;
    
    const team1Index = game.rowNumbers.indexOf(team1LastDigit);
    const team2Index = game.colNumbers.indexOf(team2LastDigit);
    
    // Find the winning square
    const winningSquare = game.squares.find(square => 
      square.row === team1Index && square.col === team2Index
    );

    // Calculate prize per quarter ($100 total / 4 quarters = $25 per quarter)
    const prizeAmount = game.totalPrizePool / 4;
    
    // Create quarter winner record
    const quarterWinner = {
      quarter,
      team1Score,
      team2Score,
      winningSquareId: winningSquare?.id,
      winnerName: winningSquare?.userName || 'No Winner (Square not sold)',
      winnerEmail: winningSquare?.userId ? await getUserEmailFromSquare(winningSquare.userId) : undefined,
      prizeAmount: winningSquare ? prizeAmount : 0
    };

    // Update quarter winners array
    const updatedQuarterWinners = [
      ...game.quarterWinners?.filter(w => w.quarter !== quarter) || [],
      quarterWinner
    ];
    
    const newScore = { 
      team1: team1Score, 
      team2: team2Score, 
      quarter,
      winningSquare: winningSquare ? winningSquare.id : undefined,
      winner: winningSquare?.userName || undefined
    };
    
    const updatedScores = [...game.scores.filter(s => s.quarter !== quarter), newScore];
    
    // Determine if game is completed (final score entered)
    const isCompleted = quarter === 4; // Final score
    
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, { 
      scores: updatedScores,
      quarterWinners: updatedQuarterWinners,
      currentQuarter: quarter,
      isCompleted
    });

    return {
      winner: quarterWinner,
      isGameComplete: isCompleted,
      nextQuarter: quarter < 4 ? quarter + 1 : null
    };
  } catch (error) {
    console.error('Error updating game scores:', error);
    throw error;
  }
};

// Helper function to get user email (placeholder - implement based on your user system)
const getUserEmailFromSquare = async (_userId: string): Promise<string | undefined> => {
  // This would need to be implemented based on how you store user data
  // For now, return undefined since we're using anonymous auth
  return undefined;
};

// User Code functions
export const generateUserCode = async (
  gameId: string, 
  squaresAllowed: number = 5, 
  playerName?: string, 
  playerEmail?: string,
  shouldSendEmail: boolean = false
): Promise<string> => {
  try {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    await addDoc(collection(db, 'userCodes'), {
      code,
      gameId,
      isUsed: false,
      squaresAllowed,
      playerName: playerName || undefined,
      playerEmail: playerEmail || undefined,
      createdAt: serverTimestamp(),
    });

    // Send email invitation if requested and email provided
    if (shouldSendEmail && playerEmail && playerName) {
      try {
        const game = await getGame(gameId);
        if (game) {
          const gameUrl = getGameInvitationUrl(gameId, code);
          await sendPlayerInvitation({
            playerName,
            playerEmail,
            gameTitle: game.title,
            hostName: game.hostName,
            joinCode: code,
            gameUrl
          });
        }
      } catch (emailError) {
        console.warn('Failed to send email invitation:', emailError);
        // Don't throw error - code generation succeeded even if email failed
      }
    }
    
    return code;
  } catch (error) {
    console.error('Error generating user code:', error);
    throw error;
  }
};

export const updateUserCode = async (
  codeId: string,
  updates: {
    playerName?: string;
    playerEmail?: string;
    squaresAllowed?: number;
  }
): Promise<void> => {
  try {
    const codeRef = doc(db, 'userCodes', codeId);
    await updateDoc(codeRef, updates);
  } catch (error) {
    console.error('Error updating user code:', error);
    throw error;
  }
};

export const deleteUserCode = async (codeId: string): Promise<void> => {
  try {
    const codeRef = doc(db, 'userCodes', codeId);
    await updateDoc(codeRef, { isUsed: true }); // Mark as used instead of deleting
  } catch (error) {
    console.error('Error deleting user code:', error);
    throw error;
  }
};

export const getUserCodeById = async (codeId: string): Promise<UserCode | null> => {
  try {
    const codeRef = doc(db, 'userCodes', codeId);
    const codeSnap = await getDoc(codeRef);
    
    if (codeSnap.exists()) {
      return { id: codeSnap.id, ...codeSnap.data() } as UserCode;
    }
    return null;
  } catch (error) {
    console.error('Error getting user code:', error);
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
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as UserCode;
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

export const getUserCodeByName = async (gameId: string, userName: string): Promise<UserCode | null> => {
  try {
    const q = query(
      collection(db, 'userCodes'), 
      where('gameId', '==', gameId),
      where('assignedUserName', '==', userName)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as UserCode;
    }
    return null;
  } catch (error) {
    console.error('Error getting user code by name:', error);
    throw error;
  }
};

// Game management functions
export const deleteGame = async (gameId: string): Promise<void> => {
  try {
    // First, delete all user codes associated with this game
    const userCodesQuery = query(
      collection(db, 'userCodes'),
      where('gameId', '==', gameId)
    );
    const userCodesSnapshot = await getDocs(userCodesQuery);
    
    // Delete all user codes in batch
    const deletePromises = userCodesSnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    await Promise.all(deletePromises);
    
    // Then delete the game itself
    const gameRef = doc(db, 'games', gameId);
    await deleteDoc(gameRef);
    
    console.log('Game and associated user codes deleted successfully');
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
};

export const setGameActive = async (gameId: string, isActive: boolean): Promise<void> => {
  try {
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, { isActive });
  } catch (error) {
    console.error('Error updating game active status:', error);
    throw error;
  }
};

export const getAllHostGames = async (hostUserId: string): Promise<Game[]> => {
  try {
    const q = query(
      collection(db, 'games'), 
      where('hostUserId', '==', hostUserId)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Game[];
  } catch (error) {
    console.error('Error getting all host games:', error);
    throw error;
  }
};
