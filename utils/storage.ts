// utils/storage.ts (create this file and folder)
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_DATA_KEY = '@userData';

interface UserData {
    uid: string;
    email: string | null;
    fullName: string;
    profilePicUrl?: string; // Add profile picture URL
    // Add other fields as needed (matricule, year, specialty)
    matricule?: string;
    year?: string;
    speciality?: string;
}

export const storeUserData = async (userData: UserData): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(userData);
    await AsyncStorage.setItem(USER_DATA_KEY, jsonValue);
    console.log('User data stored successfully');
  } catch (e) {
    console.error('Failed to save user data.', e);
  }
};

export const getUserData = async (): Promise<UserData | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(USER_DATA_KEY);
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