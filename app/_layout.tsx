// File: app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated'; // Keep this import

// ** ENSURE these imports point correctly to your context files **
// Assuming contexts folder is a direct child of app/
import { AuthProvider } from './contexts/AuthContext';
import { ResourceProvider } from './contexts/ResourceContext';
// Assuming hooks folder is a direct child of app/
import { useColorScheme } from '../hooks/useColorScheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // Add other fonts if needed
  });

  useEffect(() => { if (error) console.error("Font loading error:", error); }, [error]);
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);

  if (!loaded && !error) return null;

  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    // ** Providers MUST wrap ThemeProvider and Stack **
    <AuthProvider>
      <ResourceProvider>
        <ThemeProvider value={navigationTheme}>
          {/* Root Stack Navigator */}
          <Stack
             screenOptions={{
                // Apply default header styles if needed
                // headerStyle: { backgroundColor: Colors[colorScheme]?.cardBackground },
                // headerTintColor: Colors[colorScheme]?.tint,
                // headerTitleStyle: { color: Colors[colorScheme]?.text }
             }}
          >
             {/* Tabs are nested inside the Stack */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

             {/* Define ALL other screens managed by this Stack */}
            <Stack.Screen name="module/[moduleId]" options={{ headerBackTitleVisible: false }} />
            <Stack.Screen name="specialty/[specialtyId]" options={{ headerBackTitleVisible: false }} />
            <Stack.Screen name="edit-profile" options={{ headerBackTitleVisible: false, title: "Modifier Profil" }} />
            <Stack.Screen name="report-found" options={{ headerBackTitleVisible: false, title: "Signaler Objet" }} />
            <Stack.Screen name="lost-found" options={{ headerBackTitleVisible: false, title: "Objets Trouvés" }} />
            <Stack.Screen name="web-viewer" options={{ presentation: 'modal', headerBackTitleVisible: false, title: "Navigateur" }} />
            <Stack.Screen name="pdf-viewer" options={{ presentation: 'modal', headerBackTitleVisible: false, title: "Lecteur PDF" }} />
            <Stack.Screen name="+not-found" />
             {/* Auth screen typically replaces this stack or is presented modally, no need to list here if handled by redirection */}
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </ResourceProvider>
    </AuthProvider>
  );
}