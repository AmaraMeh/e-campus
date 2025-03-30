import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../../firebaseConfig'; // Adjust path as needed
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Interfaces ---
interface UserData {
  fullName?: string;
  matricule?: string;
  year?: string;
  speciality?: string;
  section?: string;
  group?: string;
  profilePicUrl?: string;
  [key: string]: any; // Allow additional fields
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  isLoadingAuth: boolean;
  isLoadingData: boolean;
  setUserData: (data: UserData | null) => void;
}

// --- Context Creation ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // --- Fetch User Data from Firestore ---
  const fetchFirestoreUserData = useCallback(async (user: User): Promise<UserData | null> => {
    if (!db) {
      console.warn('Firestore not initialized');
      return null;
    }
    setIsLoadingData(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        await AsyncStorage.setItem('userData', JSON.stringify(data));
        return data;
      } else {
        console.log('No Firestore data for user:', user.uid);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user data from Firestore:', error);
      return null;
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // --- Load Cached Data ---
  const loadCachedUserData = useCallback(async (): Promise<UserData | null> => {
    try {
      const cachedData = await AsyncStorage.getItem('userData');
      if (cachedData) {
        return JSON.parse(cachedData) as UserData;
      }
      return null;
    } catch (error) {
      console.error('Error loading cached user data:', error);
      return null;
    }
  }, []);

  // --- Auth State Listener ---
  useEffect(() => {
    if (!auth) {
      console.warn('Firebase Auth not initialized');
      setIsLoadingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);

      if (user) {
        const cachedData = await loadCachedUserData();
        if (cachedData) {
          setUserData(cachedData);
        }

        const freshData = await fetchFirestoreUserData(user);
        if (freshData) {
          setUserData(freshData);
        } else if (!cachedData) {
          setUserData(null);
        }
      } else {
        setUserData(null);
        await AsyncStorage.removeItem('userData');
      }
    });

    const timeout = setTimeout(() => {
      if (isLoadingAuth) {
        console.warn('Auth loading timed out after 10 seconds');
        setIsLoadingAuth(false);
      }
    }, 10000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [fetchFirestoreUserData, loadCachedUserData]);

  // --- Context Value ---
  const value: AuthContextType = {
    currentUser,
    userData,
    isLoadingAuth,
    isLoadingData,
    setUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom Hook ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};