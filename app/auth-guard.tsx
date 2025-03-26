// File: app/auth-guard.tsx
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname, Redirect } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

// Adjust path to your Firebase config and Colors
import { auth } from '@/firebaseConfig';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * AuthGuard Higher-Order Component (HOC).
 * Wraps a screen component and redirects to the login screen if the user is not authenticated.
 * Shows a loading indicator while checking the authentication state.
 *
 * @param WrappedComponent The screen component to protect.
 */
export default function AuthGuard(WrappedComponent: React.ComponentType<any>) {
  return function GuardedComponent(props: any) {
    const router = useRouter();
    const pathname = usePathname(); // Get the current path the user is trying to access
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const colorScheme = useColorScheme() ?? 'light';
    const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

    useEffect(() => {
        console.log(`[AuthGuard] Checking auth for path: ${pathname}`);
        // Set up the listener for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log(`[AuthGuard] onAuthStateChanged triggered. User: ${user ? user.uid : 'null'}`);
            if (user) {
                // User is signed in
                setIsAuthenticated(true);
            } else {
                // User is signed out
                setIsAuthenticated(false);
                console.log(`[AuthGuard] Not authenticated. Redirecting from ${pathname} to /auth`);
                // Redirect to the login screen, passing the current path as the redirect target
                // Using replace ensures the user can't press 'back' to get to the protected screen
                router.replace({
                    pathname: '/auth', // Your login/auth screen route
                    params: { redirect: pathname } // Pass the original path
                });
            }
            setIsLoading(false); // Auth check complete
        });

        // Cleanup function: unsubscribe from the listener when the component unmounts
        return () => {
             console.log("[AuthGuard] Unsubscribing auth listener.");
             unsubscribe();
        };
    }, [router, pathname]); // Dependencies: re-run if router or pathname changes

    // While checking the auth state, show a loading indicator
    if (isLoading) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Vérification de l'accès...</Text>
        </View>
      );
    }

    // If loading is finished and user is authenticated, render the wrapped component
    if (isAuthenticated) {
      return <WrappedComponent {...props} />;
    }

    // If loading is finished and user is not authenticated, render null or a placeholder.
    // The redirect in the useEffect should handle navigation, but this prevents rendering the protected component.
    return null;
    // Alternatively, you could show a minimal "Redirecting..." message:
    // return (
    //   <View style={[styles.container, { backgroundColor: colors.background }]}>
    //     <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Redirection vers la connexion...</Text>
    //   </View>
    // );
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