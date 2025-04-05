// File: app/(tabs)/notifications.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/useColorScheme';

// Color Scheme
const lightColors = {
  background: '#f5f7fa',
  card: '#ffffff',
  text: '#1a1a1a',
  secondary: '#6b7280',
  accent: '#007aff',
  border: '#d1d5db',
  success: '#10b981',
};
const darkColors = {
  background: '#111827',
  card: '#1f2937',
  text: '#f9fafb',
  secondary: '#9ca3af',
  accent: '#0a84ff',
  border: '#374151',
  success: '#34d399',
};

function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  // State for notification preferences
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);

  const toggleSwitch = (setter: React.Dispatch<React.SetStateAction<boolean>>) => (value: boolean) =>
    setter(value);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: 'Notification Preferences',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontSize: 24, fontWeight: '700' },
          headerTintColor: colors.accent,
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="notifications-outline" size={70} color={colors.accent} style={styles.icon} />
          <Text style={[styles.title, { color: colors.text }]}>Manage Notifications</Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Customize how you receive updates and alerts.
          </Text>
        </View>

        <View style={styles.preferences}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.option}>
              <Ionicons name="phone-portrait-outline" size={24} color={colors.accent} style={styles.optionIcon} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>
                  Receive alerts on your device.
                </Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={toggleSwitch(setPushNotifications)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={pushNotifications ? colors.accent : colors.card}
              />
            </View>

            <View style={[styles.option, styles.optionBorder]}>
              <Ionicons name="mail-outline" size={24} color={colors.accent} style={styles.optionIcon} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Email Notifications</Text>
                <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>
                  Get updates via email.
                </Text>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={toggleSwitch(setEmailNotifications)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={emailNotifications ? colors.accent : colors.card}
              />
            </View>

            <View style={styles.option}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.accent} style={styles.optionIcon} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>SMS Notifications</Text>
                <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>
                  Receive text message alerts (coming soon).
                </Text>
              </View>
              <Switch
                value={smsNotifications}
                onValueChange={toggleSwitch(setSmsNotifications)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={smsNotifications ? colors.accent : colors.card}
                disabled // Placeholder for future implementation
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { borderColor: colors.accent }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.saveButtonText, { color: colors.accent }]}>Save & Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48, flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 40 },
  icon: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 24 },
  preferences: { alignItems: 'center', gap: 24 },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  optionBorder: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb', // Light mode separator (adjust for dark mode if needed)
  },
  optionIcon: { marginRight: 16 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600' },
  optionSubtitle: { fontSize: 14, marginTop: 4 },
  saveButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 18, fontWeight: '600' },
});

export default NotificationsScreen;