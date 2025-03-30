// File: app/web-viewer.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview'; // Import WebView
import { useLocalSearchParams, Stack } from 'expo-router';
import { Colors } from '../constants/Colors'; // Adjust path
import { useColorScheme } from '../hooks/useColorScheme'; // Adjust path

export default function WebViewerScreen() {
    const params = useLocalSearchParams<{ url: string; title?: string }>();
    const { url, title = 'Navigateur Web' } = params; // Default title
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    if (!url) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'Erreur', headerTintColor: colors.tint, headerStyle:{ backgroundColor: colors.cardBackground}, headerTitleStyle:{ color: colors.text} }} />
                <Text style={[styles.errorText, { color: colors.danger }]}>Aucune URL fournie.</Text>
            </View>
        );
    }

    // Function to render loading indicator
    const renderLoading = () => (
        <ActivityIndicator
            color={colors.tint}
            size="large"
            style={styles.loadingOverlay}
        />
    );

    // Function to render error message
    const renderError = (errorDomain: string | undefined, errorCode: number, errorDesc: string) => (
         <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
              <Stack.Screen options={{ title: 'Erreur Chargement', headerTintColor: colors.tint, headerStyle:{ backgroundColor: colors.cardBackground}, headerTitleStyle:{ color: colors.text} }} />
              <Ionicons name="cloud-offline-outline" size={50} color={colors.danger} style={{marginBottom: 15}} />
              <Text style={[styles.errorText, { color: colors.danger }]}>Impossible de charger la page.</Text>
              <Text style={[styles.errorDetails, { color: colors.textSecondary }]}>Détails: {errorDesc} ({errorCode})</Text>
         </View>
    );

     // Handle navigation state changes
     const handleNavigationStateChange = (navState: WebViewNavigation) => {
        setIsLoading(navState.loading);
        if (navState.title) {
            // Optionally update header title dynamically, though Stack Screen handles initial title
            // console.log("WebView Title:", navState.title);
        }
    };


    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Set Header Title */}
            <Stack.Screen options={{ title: title, headerTintColor: colors.tint, headerStyle:{ backgroundColor: colors.cardBackground}, headerTitleStyle:{ color: colors.text, fontSize: 16 } }} />

            <WebView
                source={{ uri: url }}
                style={styles.webview}
                onLoadStart={() => { setIsLoading(true); setError(null); }} // Start loading indicator
                onLoadEnd={() => setIsLoading(false)} // Stop loading indicator on success
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error: ', nativeEvent);
                    setError(nativeEvent.description || 'Erreur de chargement');
                    setIsLoading(false); // Stop loading on error
                }}
                 onNavigationStateChange={handleNavigationStateChange}
                renderLoading={renderLoading} // Use custom loading indicator
                // renderError={renderError} // Optional: Use custom error view (might hide useful browser errors)
                startInLoadingState={true} // Show loader on initial load
                allowsBackForwardNavigationGestures // Allow swipe gestures on iOS
                // Common props for better user experience
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                sharedCookiesEnabled={true} // May help with Google login persistence if needed later
                originWhitelist={['*']} // Allow all origins initially, restrict if needed
            />
            {/* Show loading overlay if webview's onLoadStart/End isn't sufficient */}
            {/* {isLoading && renderLoading()} */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    centered: { // For error/no URL states
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: 'rgba(255, 255, 255, 0.5)', // Optional semi-transparent overlay
    },
    errorText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
     errorDetails: {
        fontSize: 14,
        textAlign: 'center',
    },
});