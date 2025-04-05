// File: app/(tabs)/change-password.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '../hooks/useColorScheme';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Color Scheme
const lightColors = {
  background: '#f5f7fa',
  card: '#ffffff',
  text: '#1a1a1a',
  secondary: '#6b7280',
  accent: '#007aff',
  accentGradient: ['#007aff', '#00c6ff'],
  border: '#d1d5db',
  danger: '#ef4444',
  success: '#10b981',
};
const darkColors = {
  background: '#111827',
  card: '#1f2937',
  text: '#f9fafb',
  secondary: '#9ca3af',
  accent: '#0a84ff',
  accentGradient: ['#0a84ff', '#60a5fa'],
  border: '#374151',
  danger: '#f87171',
  success: '#34d399',
};

function ChangePasswordScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  // State
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle password reset
  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Invalid email format.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      Alert.alert(
        'Success',
        'A password reset link has been sent to your email. Check your inbox (and spam folder).',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      console.error('Password Reset Error:', err);
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No user found with this email.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email.');
          break;
        default:
          setError('An error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerTitle: 'Reset Password',
            headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { color: colors.text, fontSize: 24, fontWeight: '700' },
            headerTintColor: colors.accent,
          }}
        />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Ionicons name="lock-closed-outline" size={70} color={colors.accent} style={styles.icon} />
            <Text style={[styles.title, { color: colors.text }]}>Reset Your Password</Text>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              Enter your email to receive a secure reset link.
            </Text>
          </View>

          <View style={styles.form}>
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: isFocused ? colors.accent : error ? colors.danger : colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            >
              <Ionicons name="mail-outline" size={24} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Your Email"
                placeholderTextColor={colors.secondary}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}
            {success && (
              <Text style={[styles.successText, { color: colors.success }]}>
                Reset link sent successfully!
              </Text>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <LinearGradient
                colors={colors.accentGradient}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backButton, { borderColor: colors.accent }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.backButtonText, { color: colors.accent }]}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  icon: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 24 },
  form: { alignItems: 'center', gap: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, paddingVertical: 16 },
  errorText: { fontSize: 14, textAlign: 'center', marginTop: 8, fontWeight: '500' },
  successText: { fontSize: 14, textAlign: 'center', marginTop: 8, fontWeight: '500' },
  button: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  gradient: { paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  backButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: { fontSize: 16, fontWeight: '600' },
});

export default ChangePasswordScreen;