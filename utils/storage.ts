// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_DATA_KEY = '@userData';

export interface UserData {
  uid: string;
  email: string | null; // Can be null
  fullName: string; // Should ideally always exist
  profilePicUrl?: string | null | undefined; // Optional and can be null/undefined
  matricule?: string | null | undefined; // Optional
  year?: string | null | undefined; // Optional
  speciality?: string | null | undefined; // Optional
  phoneNumber?: string | null | undefined; // Optional
  section?: string | null | undefined; // Optional
  group?: string | null | undefined; // Optional
}

export const storeUserData = async (userData: UserData): Promise<void> => {
  try {
    // Ensure essential fields have fallbacks if needed before storing
    const dataToStore = {
        ...userData,
        email: userData.email ?? null,
        fullName: userData.fullName || 'Utilisateur', // Add a fallback name
    };
    const jsonValue = JSON.stringify(dataToStore);
    await AsyncStorage.setItem(USER_DATA_KEY, jsonValue);
    console.log('User data stored successfully');
  } catch (e) {
    console.error('Failed to save user data.', e);
  }
};

export const getUserData = async (): Promise<UserData | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(USER_DATA_KEY);
    // Add a check to ensure parsed data conforms to UserData structure if needed
    return jsonValue != null ? (JSON.parse(jsonValue) as UserData) : null;
  } catch (e) {
    console.error('Failed to fetch user data.', e);
    return null;
  }
};

export const clearUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_DATA_KEY);
    console.log('User data cleared successfully');
  } catch (e) {
    console.error('Failed to clear user data.', e);
  }
};