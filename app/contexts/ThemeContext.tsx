// app/contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeContextType = {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemTheme = useSystemColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        } else {
          setTheme(systemTheme || 'light');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        setTheme(systemTheme || 'light');
      }
    };

    loadSavedTheme();
  }, [systemTheme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    AsyncStorage.setItem('userTheme', newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: (newTheme) => {
          setTheme(newTheme);
          AsyncStorage.setItem('userTheme', newTheme);
        },
        isDark: theme === 'dark',
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);