// File: app/auth-guard.tsx
import React from 'react'; // Removed useEffect, useState
import { useRouter, Redirect, usePathname } from 'expo-router'; // Keep pathname
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

// Adjust path to your AuthContext and Colors
import { useAuth } from '../app/contexts/AuthContext'; // Use alias or correct relative path
import { Colors } from '../constants/Colors'; // Use alias or correct relative path
import { useColorScheme } from '../hooks/useColorScheme'; // Use alias or correct relative path

export default function AuthGuard(WrappedComponent: React.ComponentType<any>) {
  return function GuardedComponent(props: any) {
    const { currentUser, isLoadingAuth } = useAuth(); // Get user and loading state
    const router = useRouter();
    const pathname = usePathname();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme]; // Get colors based on scheme

    // **NEW:** Wait until the initial Firebase Auth check is complete
    if (isLoadingAuth) {
        console.log(`[AuthGuard] Waiting for auth check on path: ${pathname}`);
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.tint} />
                {/* Optional: <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Vérification...</Text> */}
            </View>
        );
    }

    // After auth check, if no user, redirect to login
    if (!currentUser) {
        console.log(`[AuthGuard] Not authenticated after check. Redirecting from ${pathname} to /auth`);
        // Use Redirect component for declarative redirection within the render phase
        return <Redirect href={{ pathname: '/auth', params: { redirect: pathname } }} />;
        // Or using router.replace, but Redirect is often preferred in this scenario
        // router.replace({ pathname: '/auth', params: { redirect: pathname } });
        // return null; // Prevent rendering wrapped component while redirecting
    }

    // If loading is done and user exists, render the protected component
    console.log(`[AuthGuard] Authenticated. Rendering component for path: ${pathname}`);
    return <WrappedComponent {...props} />;
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});