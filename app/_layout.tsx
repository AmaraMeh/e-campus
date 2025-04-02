// File: app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native'; // Renamed import
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ** Import Your Context Providers **
import { AuthProvider } from './contexts/AuthContext';
import { ResourceProvider } from './contexts/ResourceContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; // Import new ThemeProvider and useTheme

// ** REMOVE useColorScheme import from hooks, use context instead **
// import { useColorScheme } from '../hooks/useColorScheme';

SplashScreen.preventAutoHideAsync();

// Inner component to access theme context
function AppNavigation() {
  const { theme } = useTheme(); // Get theme from context
  const navigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme;

  // You might want to merge your custom colors into the navigation theme
  // const navigationTheme = {
  //   ... (theme === 'dark' ? DarkTheme : DefaultTheme),
  //   colors: {
  //     ... (theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
  //     // Override specific navigation colors if needed using your theme context colors
  //     // background: colors.background,
  //     // card: colors.cardBackground,
  //     // text: colors.text,
  //     // primary: colors.tint,
  //     // border: colors.border,
  //   },
  // };


  return (
      <NavigationThemeProvider value={navigationTheme}>
        {/* Root Stack Navigator */}
        <Stack screenOptions={{
            // headerStyle: { backgroundColor: colors.cardBackground }, // Get colors from context if needed here
            // headerTintColor: colors.tint,
            // headerTitleStyle: { color: colors.text }
        }}>
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
          {/* Auth screen might replace this stack or be presented modally */}
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </NavigationThemeProvider>
  );
}


export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // Add other fonts if needed
  });

  useEffect(() => { if (error) console.error("Font loading error:", error); }, [error]);
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      {/* Wrap with your ThemeProvider FIRST */}
      <ThemeProvider>
          <AuthProvider>
            <ResourceProvider>
                {/* AppNavigation now consumes the theme context */}
                <AppNavigation />
            </ResourceProvider>
          </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}