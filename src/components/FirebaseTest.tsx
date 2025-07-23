import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { signInAnonymously } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';

const FirebaseTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Testing Firebase connection...');
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    testFirebase();
  }, []);

  const addDetail = (message: string) => {
    setDetails(prev => [...prev, message]);
  };

  const testFirebase = async () => {
    try {
      addDetail('✅ Firebase app initialized');
      
      // Test Authentication
      try {
        addDetail('🔐 Testing Authentication...');
        const userCredential = await signInAnonymously(auth);
        addDetail(`✅ Authentication successful! User ID: ${userCredential.user.uid}`);
      } catch (authError: any) {
        addDetail(`❌ Authentication failed: ${authError.message}`);
        if (authError.code === 'auth/configuration-not-found') {
          addDetail('💡 Solution: Enable Anonymous Authentication in Firebase Console');
        }
        throw authError;
      }

      // Test Firestore
      try {
        addDetail('📊 Testing Firestore...');
        const docRef = await addDoc(collection(db, 'test'), {
          message: 'Firebase test',
          timestamp: new Date()
        });
        addDetail(`✅ Firestore successful! Doc ID: ${docRef.id}`);
      } catch (firestoreError: any) {
        addDetail(`❌ Firestore failed: ${firestoreError.message}`);
        if (firestoreError.code === 'permission-denied') {
          addDetail('💡 Solution: Set up Firestore security rules');
        }
        throw firestoreError;
      }

      setStatus('🎉 All Firebase services working!');
      
    } catch (error: any) {
      setStatus(`❌ Firebase test failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Firebase Connection Test</h1>
        
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">{status}</h2>
          
          <div className="space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="text-sm font-mono">
                {detail}
              </div>
            ))}
          </div>
          
          <button 
            onClick={testFirebase}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Run Test Again
          </button>
        </div>
        
        <div className="mt-6 bg-yellow-900 border border-yellow-600 p-4 rounded-lg">
          <h3 className="font-bold mb-2">If you see authentication errors:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Go to <a href="https://console.firebase.google.com/" className="text-blue-400 underline">Firebase Console</a></li>
            <li>Select your project: football-squares-3694e</li>
            <li>Go to Authentication → Sign-in method</li>
            <li>Enable "Anonymous" authentication</li>
            <li>Go to Firestore Database → Rules</li>
            <li>Set rules to allow read/write (for testing)</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default FirebaseTest;
