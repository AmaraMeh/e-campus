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
  Dimensions,
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
import Animated, { FadeIn, SlideInLeft, withSpring, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

// Screen dimensions for iPhone 14 Pro Max optimization
const { width, height } = Dimensions.get('window');

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
  day?: string;
}

// Color Scheme
const lightColors = {
  background: '#ffffff',
  card: '#f8f8f8',
  text: '#1a1a1a',
  secondary: '#757575',
  accent: '#007aff',
  border: '#e0e0e0',
  danger: '#ff3b30',
  success: '#34c759',
};
const darkColors = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  secondary: '#a0a0a0',
  accent: '#0a84ff',
  border: '#333333',
  danger: '#ff453a',
  success: '#30d158',
};

// Reusable Components
const ActionCard = ({ title, icon, onPress, colors }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={animatedStyle}>
        <FontAwesome name={icon} size={30} color={colors.accent} />
      </Animated.View>
      <Text style={[styles.actionText, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

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
      console.error('Erreur lors de la récupération des objets trouvés:', e);
      Alert.alert('Erreur', 'Échec du chargement des objets trouvés.');
    } finally {
      setLoadingFoundItems(false);
    }
  }, []);

  // Enhanced Get Next Class
  const getNextClass = useCallback((userData: UserData | null): ScheduleEntry | null => {
    if (!userData?.section || !userData?.group) return null;
    return {
      subject: 'Algorithmes Avancés',
      time: { start: '10:00', end: '11:30' },
      location: 'Salle A-12',
      teacher: 'Dr. Smith',
      frequency: 'hebdomadaire',
      day: 'Lundi',
    };
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
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth?.signOut();
            router.replace('/(tabs)');
          } catch (e) {
            Alert.alert('Erreur', 'Échec de la déconnexion.');
            console.error('Erreur de déconnexion:', e);
          }
        },
      },
    ]);
  }, [router]);

  // Loading State
  if (isLoadingAuth) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Logged Out View (Dark Theme)
  if (!currentUser) {
    return (
      <LinearGradient
        colors={[darkColors.background, darkColors.card]}
        style={styles.authContainer}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Animated.View entering={FadeIn.duration(600)} style={styles.authContent}>
          <Image
            source={require('../../logo.png')}
            style={styles.authLogo}
            resizeMode="contain"
          />
          <Text style={[styles.authTitle, { color: colors.text }]}>
            E-Campus
          </Text>
          <Text style={[styles.authSubtitle, { color: colors.secondary }]}>
            Votre compagnon à l'Université
          </Text>
          <View style={[styles.authButtonContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/auth')}
            >
              <Text style={[styles.authButtonText, { color: colors.card }]}>
                Se connecter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authButton, styles.secondaryButton]}
              onPress={() => router.push({ pathname: '/auth', params: { tab: 'register' } })}
            >
              <Text style={[styles.authButtonText, { color: colors.accent }]}>
                Créer un compte
              </Text>
            </TouchableOpacity>
            <Text style={[styles.authFooter, { color: colors.secondary }]}>
              Version 0.0.5 • © 2025 Amara Mehdi
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
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
            <View style={styles.headerTextContainer}>
              <Text style={[styles.welcomeText, { color: colors.secondary }]}>Bienvenue,</Text>
              <Text
                style={[styles.userName, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {userData?.fullName || 'Étudiant'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={30} color={colors.danger} />
          </TouchableOpacity>
        </Animated.View>

        {/* Student Card */}
        <Animated.View entering={SlideInLeft.delay(200).duration(500)}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => setIsStudentCardVisible(true)}
          >
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Carte Étudiant</Text>
              <MaterialCommunityIcons name="id-card" size={34} color={colors.accent} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={SlideInLeft.delay(400).duration(500)} style={styles.actions}>
          <ActionCard title="Notes" icon="calculator" onPress={() => router.push('/(tabs)/calculator')} colors={colors} />
          <ActionCard title="Cours" icon="book" onPress={() => router.push('/(tabs)/courses')} colors={colors} />
          <ActionCard title="Emploi du temps" icon="calendar" onPress={() => Alert.alert('Bientôt disponible')} colors={colors} />
          <ActionCard title="Notes" icon="graduation-cap" onPress={() => router.push('../notes')} colors={colors} />
          <ActionCard title="Campus Chat" icon="comments-o" onPress={() => router.push('/(tabs)/ai')} colors={colors} />
          <ActionCard title="Objets Perdus" icon="search" onPress={() => router.push('/lost-found')} colors={colors} />
        </Animated.View>

        {/* Quick Overview */}
        <Animated.View entering={SlideInLeft.delay(600).duration(500)}>
          <InfoWidget title="Examens de Rattrapage" colors={colors}>
            <ExamCountdown />
          </InfoWidget>
          <InfoWidget title="Prochain Cours" colors={colors}>
            {isLoadingData ? (
              <ActivityIndicator color={colors.accent} />
            ) : nextClass ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.nextClassContainer}>
                <View style={styles.nextClassIcon}>
                  <MaterialCommunityIcons name="school" size={26} color={colors.accent} />
                </View>
                <View style={styles.nextClassDetails}>
                  <Text style={[styles.widgetText, { color: colors.text }]}>{nextClass.subject}</Text>
                  <Text style={[styles.widgetSubText, { color: colors.secondary }]}>
                    {nextClass.day} • {nextClass.time.start} - {nextClass.time.end}
                  </Text>
                  <Text style={[styles.widgetSubText, { color: colors.secondary }]}>
                    {nextClass.location} • {nextClass.teacher}
                  </Text>
                </View>
              </Animated.View>
            ) : (
              <Text style={[styles.widgetSubText, { color: colors.secondary }]}>
                Consultez votre emploi du temps pour les cours à venir
              </Text>
            )}
          </InfoWidget>
          <InfoWidget title="Objets Trouvés Récents" colors={colors}>
            {loadingFoundItems ? (
              <ActivityIndicator color={colors.accent} />
            ) : recentFoundItems.length > 0 ? (
              recentFoundItems.map((item) => (
                <Text key={item.id} style={[styles.widgetSubText, { color: colors.secondary }]}>
                  {item.itemName} - {item.locationFound}
                </Text>
              ))
            ) : (
              <Text style={[styles.widgetSubText, { color: colors.secondary }]}>Aucun objet récent</Text>
            )}
            <TouchableOpacity onPress={() => router.push('/lost-found')}>
              <Text style={[styles.linkText, { color: colors.accent }]}>Voir tout</Text>
            </TouchableOpacity>
          </InfoWidget>
        </Animated.View>
      </ScrollView>

      {/* Student Card Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isStudentCardVisible}
        onRequestClose={() => setIsStudentCardVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setIsStudentCardVisible(false)}
        >
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { backgroundColor: `${colors.accent}15` }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Université de Béjaïa</Text>
              <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>Carte Étudiant</Text>
            </View>
            <View style={styles.modalBody}>
              <Image source={profilePictureSource} style={styles.modalProfilePic} />
              <Text style={[styles.modalName, { color: colors.text }]}>
                {userData?.fullName || 'Étudiant Invité'}
              </Text>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: colors.secondary }]}>Matricule :</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {userData?.matricule || 'Non Assigné'}
                </Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: colors.secondary }]}>Année :</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {userData?.year || 'N/A'}
                </Text>
              </View>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalLabel, { color: colors.secondary }]}>Spécialité :</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {userData?.speciality || 'Non Spécifiée'}
                </Text>
              </View>
              {userData?.group && (
                <View style={styles.modalInfo}>
                  <Text style={[styles.modalLabel, { color: colors.secondary }]}>Groupe :</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{userData.group}</Text>
                </View>
              )}
              <Text style={[styles.modalFooterText, { color: colors.secondary }]}>
                Valable pour l'année académique : 2024-2025
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsStudentCardVisible(false)}
            >
              <Ionicons name="close" size={30} color={colors.accent} />
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  authContent: { 
    alignItems: 'center', 
    padding: 32, 
    width: '90%', 
    maxWidth: 420,
  },
  authLogo: { width: 150, height: 150, marginBottom: 24 },
  authTitle: { 
    fontSize: 38, 
    fontWeight: '700', 
    marginBottom: 12, 
    textAlign: 'center',
  },
  authSubtitle: { 
    fontSize: 18, 
    fontWeight: '400', 
    textAlign: 'center', 
    marginBottom: 32, 
    opacity: 0.85,
  },
  authButtonContainer: { 
    width: '100%', 
    padding: 24, 
    borderRadius: 18, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 6,
  },
  authButton: { 
    paddingVertical: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginBottom: 16,
  },
  secondaryButton: { 
    borderWidth: 2, 
    borderColor: '#0a84ff', 
    backgroundColor: 'transparent',
  },
  authButtonText: { 
    fontSize: 18, 
    fontWeight: '600',
  },
  authFooter: { 
    fontSize: 14, 
    marginTop: 24, 
    textAlign: 'center', 
    opacity: 0.8,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 32,
    maxWidth: width - 48,
  },
  profileContainer: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  headerTextContainer: { flexShrink: 1 },
  profilePic: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: lightColors.accent },
  welcomeText: { fontSize: 18, fontWeight: '400' },
  userName: { fontSize: 28, fontWeight: '700', maxWidth: width * 0.5 },
  card: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: lightColors.card,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    marginBottom: 32,
  },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 22, fontWeight: '600' },
  actions: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginBottom: 32,
    gap: 16,
  },
  actionCard: {
    width: (width - 96) / 3,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  actionText: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginTop: 10 },
  widgetCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  widgetTitle: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  widgetText: { fontSize: 18, fontWeight: '500', marginBottom: 8 },
  widgetSubText: { fontSize: 16, fontWeight: '400', marginBottom: 8 },
  linkText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  nextClassContainer: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nextClassIcon: { padding: 10 },
  nextClassDetails: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { width: '90%', maxWidth: 420, borderRadius: 20, overflow: 'hidden' },
  modalHeader: { padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  modalSubtitle: { fontSize: 16, fontWeight: '400' },
  modalBody: { padding: 28, alignItems: 'center' },
  modalProfilePic: { width: 120, height: 120, borderRadius: 60, marginBottom: 24, borderWidth: 2, borderColor: lightColors.accent },
  modalName: { fontSize: 24, fontWeight: '600', marginBottom: 24 },
  modalInfo: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  modalLabel: { fontSize: 16, fontWeight: '500', flex: 1 },
  modalValue: { fontSize: 16, fontWeight: '400', flex: 2, textAlign: 'right' },
  modalFooterText: { fontSize: 14, fontStyle: 'italic', marginTop: 24 },
  closeButton: { position: 'absolute', top: 18, right: 18 },
});