// File: app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useAuth } from '../contexts/AuthContext';
import { UserData } from '../../utils/storage';
import ExamCountdown from '../../components/ExamCountdown';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';

// Interfaces
interface FoundItem {
  id: string;
  itemName: string;
  description: string;
  locationFound: string;
  dateFound: Timestamp | { seconds: number; nanoseconds: number };
  imageUrl?: string;
  userId: string;
  userFullName: string;
  createdAt: Timestamp;
  status?: string;
}

interface ScheduleEntry {
  subject: string;
  time: { start: string; end: string };
  location: string;
  teacher?: string;
  frequency?: 'weekly' | 'biweekly';
}

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

// Reusable Components
const ActionCard = ({ title, icon, onPress, colors }: any) => (
  <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={onPress}>
    <FontAwesome name={icon} size={28} color={colors.accent} />
    <Text style={[styles.actionText, { color: colors.text }]}>{title}</Text>
  </TouchableOpacity>
);

const InfoWidget = ({ title, children, colors }: any) => (
  <View style={[styles.widgetCard, { backgroundColor: colors.card }]}>
    <Text style={[styles.widgetTitle, { color: colors.text }]}>{title}</Text>
    {children}
  </View>
);

// Main Home Screen
export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const { currentUser, userData, isLoadingAuth, isLoadingData } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [recentFoundItems, setRecentFoundItems] = useState<FoundItem[]>([]);
  const [loadingFoundItems, setLoadingFoundItems] = useState(false);
  const [isStudentCardVisible, setIsStudentCardVisible] = useState(false);
  const [nextClass, setNextClass] = useState<ScheduleEntry | null>(null);

  // Fetch Recent Found Items
  const fetchRecentFoundItems = useCallback(async () => {
    if (!db) return;
    setLoadingFoundItems(true);
    try {
      const q = query(collection(db, 'foundItems'), orderBy('createdAt', 'desc'), limit(3));
      const querySnapshot = await getDocs(q);
      const items: FoundItem[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as FoundItem));
      setRecentFoundItems(items);
    } catch (e) {
      console.error('Error fetching found items:', e);
      Alert.alert('Error', 'Failed to load found items.');
    } finally {
      setLoadingFoundItems(false);
    }
  }, []);

  // Get Next Class (Placeholder)
  const getNextClass = useCallback((userData: UserData | null): ScheduleEntry | null => {
    if (!userData?.section || !userData?.group) return null;
    // Placeholder: Replace with Firestore fetch later
    return null;
  }, []);

  useEffect(() => {
    if (userData) {
      fetchRecentFoundItems();
      setNextClass(getNextClass(userData));
    }
  }, [userData, fetchRecentFoundItems, getNextClass]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (currentUser) {
      await fetchRecentFoundItems();
      setNextClass(getNextClass(userData));
    }
    setRefreshing(false);
  }, [currentUser, userData, fetchRecentFoundItems, getNextClass]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth?.signOut();
          } catch (e) {
            Alert.alert('Error', 'Logout failed.');
            console.error('Logout error:', e);
          }
        },
      },
    ]);
  }, []);

  // Loading State
  if (isLoadingAuth) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Logged Out View (Improved)
  if (!currentUser) {
    return (
      <View style={[styles.authContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Animated.View entering={SlideInLeft.duration(500)} style={styles.authContent}>
          <Image source={require('../../logo.png')} style={styles.authLogo} resizeMode="contain" />
          <Text style={[styles.authTitle, { color: colors.text }]}>Welcome to CampusElkseur</Text>
          <Text style={[styles.authSubtitle, { color: colors.secondary }]}>
            Your gateway to a seamless student experience at Université de Béjaïa.
          </Text>
          <TouchableOpacity style={styles.authButton} onPress={() => router.push('/auth')}>
            <LinearGradient colors={colors.accentGradient} style={styles.gradient}>
              <Text style={styles.buttonText}>Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authButton, styles.secondaryButton]}
            onPress={() => router.push({ pathname: '/auth', params: { tab: 'register' } })}
          >
            <Text style={[styles.buttonText, { color: colors.accent }]}>Create Account</Text>
          </TouchableOpacity>
          <Text style={[styles.authFooter, { color: colors.secondary }]}>
            Version 0.0.5 • © 2025 Amara Mehdi
          </Text>
        </Animated.View>
      </View>
    );
  }

  // Logged In View
  const profilePictureSource = userData?.profilePicUrl
    ? { uri: userData?.profilePicUrl }
    : require('../../assets/images/icon.png');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <Animated.View entering={SlideInLeft.duration(500)} style={styles.header}>
          <TouchableOpacity style={styles.profileContainer} onPress={() => router.push('/(tabs)/profile')}>
            <Image source={profilePictureSource} style={styles.profilePic} />
            <View>
              <Text style={[styles.welcomeText, { color: colors.secondary }]}>Hello,</Text>
              <Text style={[styles.userName, { color: colors.text }]}>
                {userData?.fullName || 'Student'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={28} color={colors.danger} />
          </TouchableOpacity>
        </Animated.View>

        {/* Student Card (Improved) */}
        <Animated.View entering={SlideInLeft.delay(200).duration(500)}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => setIsStudentCardVisible(true)}
          >
            <LinearGradient colors={colors.accentGradient} style={styles.cardGradient}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Your Student ID</Text>
                <MaterialCommunityIcons name="id-card" size={40} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={SlideInLeft.delay(400).duration(500)} style={styles.actions}>
          <ActionCard title="Grades" icon="calculator" onPress={() => router.push('/(tabs)/calculator')} colors={colors} />
          <ActionCard title="Courses" icon="book" onPress={() => router.push('/(tabs)/courses')} colors={colors} />
          <ActionCard title="Schedule" icon="calendar" onPress={() => Alert.alert('Coming Soon')} colors={colors} />
          <ActionCard title="Notes" icon="graduation-cap" onPress={() => router.push('../notes')} colors={colors} />
          <ActionCard title="CampusAI" icon="comments-o" onPress={() => router.push('/(tabs)/ai')} colors={colors} />
          <ActionCard title="Lost & Found" icon="search" onPress={() => router.push('/lost-found')} colors={colors} />
        </Animated.View>

        {/* Quick Overview */}
        <Animated.View entering={SlideInLeft.delay(600).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Overview</Text>
          <ExamCountdown />
          <InfoWidget title="Next Class" colors={colors}>
            {isLoadingData ? (
              <ActivityIndicator color={colors.accent} />
            ) : nextClass ? (
              <>
                <Text style={[styles.widgetText, { color: colors.secondary }]}>
                  {nextClass.subject} ({nextClass.time.start} - {nextClass.time.end})
                </Text>
                <Text style={[styles.widgetText, { color: colors.secondary }]}>
                  Location: {nextClass.location}
                </Text>
              </>
            ) : (
              <Text style={[styles.widgetText, { color: colors.secondary }]}>
                No upcoming classes
              </Text>
            )}
          </InfoWidget>
          <InfoWidget title="Recent Found Items" colors={colors}>
            {loadingFoundItems ? (
              <ActivityIndicator color={colors.accent} />
            ) : recentFoundItems.length > 0 ? (
              recentFoundItems.map((item) => (
                <Text key={item.id} style={[styles.widgetText, { color: colors.secondary }]}>
                  {item.itemName} - {item.locationFound}
                </Text>
              ))
            ) : (
              <Text style={[styles.widgetText, { color: colors.secondary }]}>
                No recent items
              </Text>
            )}
            <TouchableOpacity onPress={() => router.push('/lost-found')}>
              <Text style={[styles.linkText, { color: colors.accent }]}>View All</Text>
            </TouchableOpacity>
          </InfoWidget>
        </Animated.View>
      </ScrollView>

      {/* Student Card Modal (Improved) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isStudentCardVisible}
        onRequestClose={() => setIsStudentCardVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPressOut={() => setIsStudentCardVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={colors.accentGradient} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Université de Béjaïa</Text>
              <Text style={styles.modalSubtitle}>Student Identification Card</Text>
            </LinearGradient>
            <View style={styles.modalBody}>
              <Image source={profilePictureSource} style={styles.modalProfilePic} />
              <Text style={[styles.modalName, { color: colors.text }]}>
                {userData?.fullName || 'Student Name'}
              </Text>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: colors.secondary }]}>Matricule:</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {userData?.matricule || 'N/A'}
                </Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: colors.secondary }]}>Year:</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {userData?.year || 'N/A'}
                </Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: colors.secondary }]}>Speciality:</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {userData?.speciality || 'N/A'}
                </Text>
              </View>
              {userData?.group && (
                <View style={styles.modalInfo}>
                  <Text style={[styles.modalLabel, { color: colors.secondary }]}>Group:</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {userData.group}
                  </Text>
                </View>
              )}
              <View style={styles.modalFooter}>
                <Text style={[styles.modalFooterText, { color: colors.secondary }]}>
                  Valid for Academic Year: 2024-2025
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsStudentCardVisible(false)}
            >
              <Ionicons name="close-circle" size={32} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  authContent: { alignItems: 'center', padding: 32 },
  authLogo: { width: 150, height: 150, marginBottom: 40 },
  authTitle: { fontSize: 36, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  authSubtitle: { fontSize: 18, textAlign: 'center', marginBottom: 40, lineHeight: 26 },
  authButton: { width: '80%', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: lightColors.accent },
  gradient: { paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  authFooter: { fontSize: 14, marginTop: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  profileContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profilePic: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: lightColors.accent },
  welcomeText: { fontSize: 16, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '700' },
  card: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    overflow: 'hidden',
    marginBottom: 24,
  },
  cardGradient: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  cardTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 32 },
  actionCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  actionText: { fontSize: 16, fontWeight: '500', marginTop: 8 },
  sectionTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  widgetCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  widgetTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  widgetText: { fontSize: 16, lineHeight: 24, marginBottom: 8 },
  linkText: { fontSize: 16, fontWeight: '500', marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalHeader: { padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  modalSubtitle: { fontSize: 16, color: '#fff', opacity: 0.9 },
  modalBody: { padding: 24, alignItems: 'center' },
  modalProfilePic: { width: 100, height: 100, borderRadius: 50, marginBottom: 20, borderWidth: 2, borderColor: lightColors.accent },
  modalName: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  modalInfo: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  modalLabel: { fontSize: 16, fontWeight: '500', flex: 1 },
  modalValue: { fontSize: 16, fontWeight: '600', flex: 2, textAlign: 'right' },
  modalFooter: { marginTop: 20, borderTopWidth: 1, borderTopColor: lightColors.border, paddingTop: 16, width: '100%', alignItems: 'center' },
  modalFooterText: { fontSize: 14, fontStyle: 'italic' },
  closeButton: { position: 'absolute', top: 16, right: 16 },
});
