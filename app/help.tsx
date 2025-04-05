// File: app/(tabs)/help.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
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
  link: '#2563eb',
};
const darkColors = {
  background: '#111827',
  card: '#1f2937',
  text: '#f9fafb',
  secondary: '#9ca3af',
  accent: '#0a84ff',
  border: '#374151',
  link: '#60a5fa',
};

function HelpScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const router = useRouter();

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const sendEmail = () => {
    Linking.openURL('mailto:mehdi.amara@tech.univ-bejaia.dz').catch((err) =>
      console.error('Failed to open email:', err)
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: 'Help & Support',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontSize: 24, fontWeight: '700' },
          headerTintColor: colors.accent,
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="help-circle-outline" size={70} color={colors.accent} style={styles.icon} />
          <Text style={[styles.title, { color: colors.text }]}>Help & Support</Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Everything you need to get started and thrive at university.
          </Text>
        </View>

        {/* How to Use the App */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How to Use E-Campus</Text>
          <Text style={[styles.sectionText, { color: colors.secondary }]}>
            Welcome to E-Campus! Here's a quick guide to get you started:
          </Text>
          <View style={styles.list}>
            <Text style={[styles.listItem, { color: colors.text }]}>
              • <Text style={styles.bold}>Profile:</Text> View and edit your student details under the Profile tab.
            </Text>
            <Text style={[styles.listItem, { color: colors.text }]}>
              • <Text style={styles.bold}>Notifications:</Text> Customize alerts in the Notification Preferences section.
            </Text>
            <Text style={[styles.listItem, { color: colors.text }]}>
              • <Text style={styles.bold}>Password:</Text> Reset your password anytime via the Change Password option.
            </Text>
            <Text style={[styles.listItem, { color: colors.text }]}>
              • <Text style={styles.bold}>Support:</Text> Reach out to us here if you need help!
            </Text>
          </View>
        </View>

        {/* University Guide */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>University Guide</Text>
          <Text style={[styles.sectionText, { color: colors.secondary }]}>
            Tips to make the most of your university experience:
          </Text>
          <View style={styles.list}>
            <Text style={[styles.listItem, { color: colors.text }]}>
              • <Text style={styles.bold}>Stay Organized:</Text> Use a planner or app to track classes and deadlines.
            </Text>
            <Text style={[styles.listItem, { color: colors.text }]}>
              • <Text style={styles.bold}>Get Involved:</Text> Join clubs or events to meet new people.
            </Text>
            <Text style={[styles.listItem, { color: colors.text }]}>
              • <Text style={styles.bold}>Ask for Help:</Text> Professors and staff are here to support you.
            </Text>
            <Text style={[styles.listItem, { color: colors.text }]}>
              • <Text style={styles.bold}>Explore:</Text> Check out the campus library, labs, and resources.
            </Text>
          </View>
        </View>

        {/* Contact Us */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
          <TouchableOpacity style={styles.contactItem} onPress={sendEmail}>
            <Ionicons name="mail-outline" size={24} color={colors.accent} style={styles.contactIcon} />
            <Text style={[styles.contactText, { color: colors.text }]}>
              Email: <Text style={{ color: colors.link }}>mehdi.amara@tech.univ-bejaia.dz</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => openLink('https://instagram.com/spot_campuselkseur')}
          >
            <Ionicons name="logo-instagram" size={24} color={colors.accent} style={styles.contactIcon} />
            <Text style={[styles.contactText, { color: colors.text }]}>
              Instagram: <Text style={{ color: colors.link }}>@spot_campuselkseur</Text>
            </Text>
          </TouchableOpacity>
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={24} color={colors.accent} style={styles.contactIcon} />
            <Text style={[styles.contactText, { color: colors.text }]}>Phone: +213542264585</Text>
          </View>
        </View>

        {/* Policies */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Policies</Text>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => openLink('https://icosium.store/policy')}
          >
            <Text style={[styles.linkText, { color: colors.link }]}>
              Politique de Confidentialité
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => openLink('https://icosium.store/policy2')}
          >
            <Text style={[styles.linkText, { color: colors.link }]}>
              Conditions d'utilisation
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.secondary }]}>
            App Version: 0.0.5
          </Text>
          <Text style={[styles.footerText, { color: colors.secondary }]}>
            © 2025 Made by Amara Mehdi
          </Text>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.accent }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.accent }]}>Back to Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  header: { alignItems: 'center', marginBottom: 40 },
  icon: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 24 },
  section: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  sectionText: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
  list: { gap: 12 },
  listItem: { fontSize: 15, lineHeight: 22 },
  bold: { fontWeight: '600' },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactIcon: { marginRight: 16 },
  contactText: { fontSize: 16, fontWeight: '500' },
  linkItem: { paddingVertical: 12 },
  linkText: { fontSize: 16, fontWeight: '500' },
  footer: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  footerText: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  backButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  backButtonText: { fontSize: 18, fontWeight: '600' },
});

export default HelpScreen;