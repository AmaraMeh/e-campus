import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, 
  RefreshControl, Platform, Dimensions, Alert, Modal
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useAuth } from '../contexts/AuthContext';
import { UserData } from '../../utils/storage';
import ExamCountdown from '../../components/ExamCountdown';

// --- Interfaces ---
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

// --- Define Colors ---
const getThemeColors = (scheme: 'light' | 'dark') => {
  const base = scheme === 'dark' ? Colors.dark : Colors.light;
  return { ...base };
};

// --- Reusable Components ---
const InfoWidget: React.FC<{
  styles: any;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  colors: typeof Colors.light | typeof Colors.dark;
}> = ({ styles, title, icon, children, colors }) => (
  <View style={styles.widgetCard}>
    <View style={styles.widgetHeader}>
      <Ionicons name={icon} size={styles.widgetIconSize} color={colors.textSecondary} />
      <Text style={styles.widgetTitle}>{title}</Text>
    </View>
    <View style={styles.widgetContent}>{children}</View>
  </View>
);

const ActionCard: React.FC<{
  styles: any;
  title: string;
  icon: keyof typeof FontAwesome.glyphMap;
  onPress: () => void;
  color: string;
}> = ({ styles, title, icon, onPress, color }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
    <FontAwesome name={icon} size={styles.actionIconSize} color={color} style={styles.actionIcon} />
    <Text style={styles.actionText}>{title}</Text>
  </TouchableOpacity>
);

const WidgetRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  text: string | React.ReactNode;
  styles: any;
  colors: typeof Colors.light | typeof Colors.dark;
}> = ({ icon, text, styles, colors }) => (
  <View style={styles.widgetRow}>
    <Ionicons name={icon} size={styles.widgetRowIconSize} color={colors.textSecondary} style={{ marginRight: styles.basePadding / 2 }} />
    <Text style={styles.widgetRowText} numberOfLines={1}>{text}</Text>
  </View>
);

const LostFoundPreview: React.FC<{
  styles: any;
  items: FoundItem[];
  isLoading: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
}> = ({ styles, items, isLoading, colors }) => {
  const router = useRouter();
  const formatDate = (dateData: Timestamp | { seconds: number; nanoseconds: number }): string => {
    if (!dateData) return '...';
    try {
      const date = 'toDate' in dateData ? dateData.toDate() : new Date((dateData as any).seconds * 1000);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Date invalide';
    }
  };

  return (
    <InfoWidget title="Objets Trouvés Récemment" icon="search-outline" styles={styles} colors={colors}>
      {isLoading ? (
        <ActivityIndicator color={colors.tint} style={{ marginVertical: styles.basePadding }} />
      ) : items.length === 0 ? (
        <WidgetRow icon="close-circle-outline" text="Aucun objet trouvé signalé." styles={styles} colors={colors} />
      ) : (
        items.map(item => (
          <WidgetRow
            key={item.id}
            icon="archive-outline"
            text={`${item.itemName} (${item.locationFound}, ${formatDate(item.dateFound)})`}
            styles={styles}
            colors={colors}
          />
        ))
      )}
      <View style={styles.widgetFooterActions}>
        <TouchableOpacity style={[styles.reportButtonSmall, { backgroundColor: colors.tint + 'E0' }]} onPress={() => router.push('/report-found')}>
          <FontAwesome name="plus" size={styles.smallIconSize} color="white" />
          <Text style={styles.reportButtonTextSmall}>Signaler</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/lost-found')}>
          <Text style={[styles.viewAllLink, { color: colors.tint }]}>Voir tout</Text>
        </TouchableOpacity>
      </View>
    </InfoWidget>
  );
};

// --- Timetable Helper ---
const getNextClass = (userData: UserData | null): ScheduleEntry | null => {
  if (!userData?.section || !userData?.group) {
    return null;
  }
  // TODO: Implement actual Firestore timetable fetching
  console.warn("getNextClass needs Firestore implementation");
  return null; // Placeholder until implemented
};

// --- Main Home Screen ---
export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getThemeColors(colorScheme);
  const screenWidth = Dimensions.get('window').width;
  const styles = useMemo(() => getHomeStyles(colorScheme, colors, screenWidth), [colorScheme, screenWidth]);
  const router = useRouter();

  const { currentUser, userData, isLoadingAuth, isLoadingData } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [recentFoundItems, setRecentFoundItems] = useState<FoundItem[]>([]);
  const [loadingFoundItems, setLoadingFoundItems] = useState(false);
  const [isStudentCardVisible, setIsStudentCardVisible] = useState(false);
  const [nextClass, setNextClass] = useState<ScheduleEntry | null>(null);

  // --- Data Fetching ---
  const fetchRecentFoundItems = useCallback(async () => {
    if (!db) {
      console.warn("Firestore DB not available");
      return;
    }
    setLoadingFoundItems(true);
    try {
      const q = query(collection(db, "foundItems"), orderBy("createdAt", "desc"), limit(3));
      const querySnapshot = await getDocs(q);
      const items: FoundItem[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FoundItem));
      setRecentFoundItems(items);
    } catch (e) {
      console.error("Error fetching found items:", e);
      Alert.alert("Erreur", "Impossible de charger les objets trouvés");
    } finally {
      setLoadingFoundItems(false);
    }
  }, []);

  // --- Update Schedule & Fetch Items ---
  useEffect(() => {
    if (userData) {
      fetchRecentFoundItems();
      setNextClass(getNextClass(userData));
    } else {
      setRecentFoundItems([]);
      setNextClass(null);
    }
  }, [userData, fetchRecentFoundItems]);

  // --- Refresh Handler ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (currentUser) {
      await fetchRecentFoundItems();
      setNextClass(getNextClass(userData));
    }
    setRefreshing(false);
  }, [currentUser, userData, fetchRecentFoundItems]);

  // --- Handlers ---
  const handleLogout = useCallback(async () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: async () => {
          try {
            await auth?.signOut();
            console.log("User signed out");
          } catch (e) {
            Alert.alert("Erreur", "La déconnexion a échoué");
            console.error("Logout error:", e);
          }
        }
      }
    ]);
  }, []);

  const handleThemeToggle = () => {
    Alert.alert("Thème", "Changement de thème non implémenté");
  };

  const handleOpenMapWithRoute = (destination: string) => {
    Alert.alert("Carte", `Itinéraire vers ${destination} à implémenter`);
  };

  // --- Loading View ---
  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // --- Logged Out View ---
  if (!currentUser) {
    return (
      <View style={styles.loggedOutContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Image source={require('../../logo.png')} style={styles.logo} resizeMode='contain' />
        <Text style={styles.welcomeTitle}>CampusElkseur</Text>
        <Text style={styles.welcomeSubtitle}>Votre portail étudiant numérique</Text>
        <TouchableOpacity style={styles.authButton} onPress={() => router.push('/auth')}>
          <Text style={styles.authButtonText}>Connexion</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.authButton, styles.signUpButton]} 
          onPress={() => router.push({ pathname: '/auth', params: { tab: 'register' } })}
        >
          <Text style={[styles.authButtonText, styles.signUpButtonText]}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Logged In View ---
  const profilePictureSource = userData?.profilePicUrl 
    ? { uri: userData.profilePicUrl } 
    : require('../../assets/images/icon.png');

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ headerShown: false }} />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.profileContainer} 
            onPress={() => router.push('/(tabs)/profile')} 
            activeOpacity={0.7}
          >
            <Image source={profilePictureSource} style={styles.profilePic} />
            <View style={styles.profileNameContainer}>
              <Text style={styles.welcomeText}>Bonjour,</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {userData?.fullName ?? 'Étudiant'}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={handleThemeToggle} style={styles.iconButton}>
              <Ionicons 
                name={colorScheme === 'dark' ? 'sunny' : 'moon'} 
                size={styles.iconSize} 
                color={styles.iconButtonText.color} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/profile')} 
              style={styles.iconButton}
            >
              <Ionicons 
                name="settings-outline" 
                size={styles.iconSize} 
                color={styles.iconButtonText.color} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
              <Ionicons 
                name="log-out-outline" 
                size={styles.iconSize + 2} 
                color={colors.danger} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Student Card Banner */}
        <TouchableOpacity 
          style={styles.featuredCardWrapper} 
          activeOpacity={0.9} 
          onPress={() => setIsStudentCardVisible(true)}
        >
          <LinearGradient 
            colors={colorScheme === 'dark' ? ['#06b6d4', '#3b82f6'] : ['#2dd4bf', '#3b82f6']} 
            style={styles.featuredCard} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.featuredCardContent}>
              <View>
                <Text style={styles.featuredCardTitle}>Ma Carte Étudiant</Text>
                <Text style={styles.featuredCardSubtitle}>Appuyez pour afficher</Text>
              </View>
              <View style={styles.featuredIconBg}>
                <MaterialCommunityIcons name="id-card" size={styles.featuredIconSize} color="#fff" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Action Grid */}
        <View style={styles.gridContainer}>
          <ActionCard 
            icon="calculator" 
            title="Moyenne" 
            onPress={() => router.push('/(tabs)/calculator')} 
            color="#3b82f6" 
            styles={styles} 
          />
          <ActionCard 
            icon="book" 
            title="Cours" 
            onPress={() => router.push('/(tabs)/courses')} 
            color="#10b981" 
            styles={styles} 
          />
          <ActionCard 
            icon="calendar" 
            title="Emploi Temps" 
            onPress={() => Alert.alert("Bientôt Disponible", "L'emploi du temps sera bientôt intégré.")} 
            color="#f59e0b" 
            styles={styles} 
          />
          <ActionCard 
            icon="graduation-cap" 
            title="Mes Notes" 
            onPress={() => Alert.alert("Bientôt Disponible", "La consultation des notes sera bientôt disponible.")} 
            color="#ef4444" 
            styles={styles} 
          />
          <ActionCard 
            icon="comments-o" 
            title="CampusAI" 
            onPress={() => Alert.alert("Bientôt Disponible", "L'assistant IA arrive prochainement !")} 
            color="#6366f1" 
            styles={styles} 
          />
          <ActionCard 
            icon="search" 
            title="Objets Perdus" 
            onPress={() => router.push('/lost-found')} 
            color="#ec4899" 
            styles={styles} 
          />
        </View>

        {/* Widgets Section */}
        <Text style={styles.sectionTitle}>Aperçu Rapide</Text>
        <ExamCountdown />

        {/* Next Class Widget */}
        <InfoWidget title="Prochain Cours" icon="time-outline" styles={styles} colors={colors}>
          {isLoadingData ? (
            <ActivityIndicator color={colors.tint} style={{ marginVertical: styles.basePadding }} />
          ) : nextClass ? (
            <>
              <WidgetRow icon="book-outline" text={nextClass.subject} styles={styles} colors={colors} />
              <WidgetRow 
                icon="time-outline" 
                text={`${nextClass.time.start} - ${nextClass.time.end}`} 
                styles={styles} 
                colors={colors} 
              />
              <WidgetRow icon="location-outline" text={nextClass.location} styles={styles} colors={colors} />
              {nextClass.teacher && (
                <WidgetRow icon="person-outline" text={nextClass.teacher} styles={styles} colors={colors} />
              )}
              {nextClass.frequency === 'biweekly' && (
                <WidgetRow icon="sync-outline" text="(1 semaine / 2)" styles={styles} colors={colors} />
              )}
              <TouchableOpacity 
                style={styles.widgetButton} 
                onPress={() => handleOpenMapWithRoute(nextClass.location)}
              >
                <Text style={styles.widgetButtonText}>Localiser</Text>
              </TouchableOpacity>
            </>
          ) : (
            <WidgetRow
              icon={(!userData?.section || !userData?.group) ? "information-circle-outline" : "checkmark-done-outline"}
              text={(!userData?.section || !userData?.group) ? "Info Section/Groupe manquante" : "Aucun cours à venir"}
              styles={styles}
              colors={colors}
            />
          )}
        </InfoWidget>

        {/* Lost Found Preview */}
        <LostFoundPreview 
          styles={styles} 
          items={recentFoundItems} 
          isLoading={loadingFoundItems} 
          colors={colors} 
        />

        {/* Other Widgets */}
        <InfoWidget title="Assistant IA (Bêta)" icon="sparkles-outline" styles={styles} colors={colors}>
          <WidgetRow 
            icon="help-circle-outline" 
            text="Posez des questions sur vos cours (Bientôt)" 
            styles={styles} 
            colors={colors} 
          />
          <TouchableOpacity 
            style={styles.widgetButton} 
            onPress={() => Alert.alert("Bientôt Disponible", "L'assistant IA arrive prochainement !")}
          >
            <Text style={styles.widgetButtonText}>Démarrer CampusAI</Text>
          </TouchableOpacity>
        </InfoWidget>

        <InfoWidget title="Transport & Services" icon="bus-outline" styles={styles} colors={colors}>
          <WidgetRow icon="bus-outline" text="Horaires des bus (Bientôt)" styles={styles} colors={colors} />
          <TouchableOpacity 
            style={styles.widgetButton} 
            onPress={() => Alert.alert("Info", "Détails des services bientôt disponibles")}
          >
            <Text style={styles.widgetButtonText}>Consulter Services</Text>
          </TouchableOpacity>
        </InfoWidget>

        <View style={{ height: styles.basePadding * 2 }} />
      </ScrollView>

      {/* Student Card Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isStudentCardVisible}
        onRequestClose={() => setIsStudentCardVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPressOut={() => setIsStudentCardVisible(false)}
        >
          <View style={styles.studentCardModal}>
            <View style={styles.cardBackgroundReplacement}>
              <LinearGradient 
                colors={colorScheme === 'dark' ? ['#1e40af', '#3730a3'] : ['#3b82f6', '#2563eb']} 
                style={styles.studentCardHeader} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }}
              >
                <View>
                  <Text style={styles.universityName}>Université de Béjaïa</Text>
                  <Text style={styles.facultyName}>Faculté de Technologie</Text>
                </View>
              </LinearGradient>
              <View style={styles.studentCardBody}>
                <Text style={styles.cardTypeText}>
                  CARTE D'ÉTUDIANT {userData?.year?.split(' ')[0] ?? ''}
                </Text>
                <Text style={styles.studentCardName}>{userData?.fullName ?? ''}</Text>
                <View style={styles.studentCardGrid}>
                  <View style={styles.studentCardGridItem}>
                    <Text style={styles.studentCardLabel}>Matricule</Text>
                    <Text style={[styles.studentCardValue, styles.idValue]}>
                      {userData?.matricule ?? 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.studentCardGridItem}>
                    <Text style={styles.studentCardLabel}>Année</Text>
                    <Text style={styles.studentCardValue}>{userData?.year ?? 'N/A'}</Text>
                  </View>
                </View>
                <View style={styles.studentCardInfoRowFull}>
                  <Text style={styles.studentCardLabel}>Spécialité</Text>
                  <Text 
                    style={styles.studentCardValue} 
                    numberOfLines={1} 
                    ellipsizeMode='tail'
                  >
                    {userData?.speciality ?? 'N/A'}
                  </Text>
                </View>
                {userData?.group && (
                  <View style={styles.studentCardInfoRowFull}>
                    <Text style={styles.studentCardLabel}>Groupe</Text>
                    <Text style={styles.studentCardValue}>{userData.group}</Text>
                  </View>
                )}
              </View>
              <View style={styles.studentCardFooter}>
                <Text style={styles.validityText}>Année Universitaire: 2024-2025</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => setIsStudentCardVisible(false)} 
              style={styles.modalCloseButton}
            >
              <Ionicons 
                name="close-circle" 
                size={styles.iconSize + 6} 
                color="rgba(255,255,255,0.8)" 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// --- Styles ---
const getHomeStyles = (colorScheme: 'light' | 'dark', colors: typeof Colors.light | typeof Colors.dark, screenWidth: number) => {
  const baseFontSize = screenWidth / 20;
  const basePadding = screenWidth / 20;
  const isNarrowScreen = screenWidth < 320;

  return StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    cardBackgroundReplacement: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.cardBackground,
    },
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { 
      paddingHorizontal: basePadding, 
      paddingTop: Platform.OS === 'android' ? 35 : 50, 
      paddingBottom: basePadding * 3 
    },
    loggedOutContainer: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: basePadding * 2, 
      backgroundColor: colors.background 
    },
    logo: { width: screenWidth * 0.35, height: screenWidth * 0.35, marginBottom: basePadding },
    welcomeTitle: { 
      fontSize: baseFontSize * 1.5, 
      fontWeight: 'bold', 
      color: colors.text, 
      textAlign: 'center', 
      marginBottom: basePadding / 2 
    },
    welcomeSubtitle: { 
      fontSize: baseFontSize * 0.9, 
      color: colors.textSecondary, 
      textAlign: 'center', 
      marginBottom: basePadding * 2 
    },
    authButton: { 
      backgroundColor: colors.tint, 
      paddingVertical: basePadding * 0.8, 
      paddingHorizontal: basePadding, 
      borderRadius: 25, 
      width: '85%', 
      alignItems: 'center', 
      marginBottom: basePadding, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 4, 
      elevation: 3 
    },
    authButtonText: { color: '#fff', fontSize: baseFontSize * 0.9, fontWeight: 'bold' },
    signUpButton: { backgroundColor: colors.cardBackground, borderWidth: 1.5, borderColor: colors.tint },
    signUpButtonText: { color: colors.tint },
    header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: basePadding, 
      marginTop: basePadding / 2 
    },
    profileContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: basePadding / 2 },
    profilePic: { 
      width: screenWidth * 0.12, 
      height: screenWidth * 0.12, 
      borderRadius: screenWidth * 0.06, 
      borderWidth: 2, 
      borderColor: colors.tint, 
      marginRight: basePadding / 2, 
      backgroundColor: colors.border 
    },
    profileNameContainer: { flexShrink: 1 },
    welcomeText: { fontSize: baseFontSize * 0.8, color: colors.textSecondary },
    userName: { fontSize: baseFontSize * 1.1, fontWeight: '600', color: colors.text },
    headerIcons: { flexDirection: 'row', alignItems: 'center', gap: basePadding / 2 },
    iconButton: { padding: basePadding / 2 },
    iconButtonText: { color: colors.textSecondary },
    iconSize: baseFontSize * 1.2,
    featuredCardWrapper: { 
      borderRadius: 18, 
      marginBottom: basePadding * 1.5, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.2, 
      shadowRadius: 8, 
      elevation: 6 
    },
    featuredCard: { borderRadius: 18, padding: basePadding * 1.2 },
    featuredCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    featuredCardTitle: { 
      fontSize: baseFontSize * 1.1, 
      fontWeight: 'bold', 
      color: '#fff', 
      marginBottom: basePadding / 4 
    },
    featuredCardSubtitle: { fontSize: baseFontSize * 0.8, color: '#fffD0' },
    featuredIconBg: { backgroundColor: 'rgba(255,255,255,0.2)', padding: basePadding * 0.6, borderRadius: 30 },
    featuredIconSize: baseFontSize * 1.8,
    gridContainer: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      justifyContent: 'space-between', 
      marginHorizontal: -basePadding / 4, 
      marginBottom: basePadding 
    },
    actionCard: {
      width: isNarrowScreen ? '48%' : '31.5%',
      backgroundColor: colors.cardBackground,
      borderRadius: 15,
      padding: basePadding * 0.6,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: basePadding / 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
      aspectRatio: 1,
      minHeight: screenWidth * 0.25,
    },
    actionIcon: { marginBottom: basePadding / 2 },
    actionIconSize: baseFontSize * 1.6,
    actionText: { 
      fontSize: baseFontSize * 0.7, 
      color: colors.text, 
      fontWeight: '600', 
      textAlign: 'center', 
      marginTop: basePadding / 4 
    },
    sectionTitle: { 
      fontSize: baseFontSize * 1.2, 
      fontWeight: 'bold', 
      color: colors.text, 
      marginBottom: basePadding, 
      marginTop: basePadding 
    },
    widgetCard: { 
      backgroundColor: colors.cardBackground, 
      borderRadius: 12, 
      padding: basePadding, 
      marginBottom: basePadding, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 1 }, 
      shadowOpacity: 0.08, 
      shadowRadius: 3, 
      elevation: 2, 
      borderWidth: 1, 
      borderColor: colors.border 
    },
    widgetHeader: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: basePadding * 0.6, 
      paddingBottom: basePadding / 2, 
      borderBottomWidth: 1, 
      borderBottomColor: colors.border + '80' 
    },
    widgetTitle: { 
      fontSize: baseFontSize * 0.9, 
      fontWeight: '600', 
      color: colors.text, 
      marginLeft: basePadding / 2 
    },
    widgetIconSize: baseFontSize,
    widgetContent: { paddingTop: basePadding / 4 },
    widgetRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: basePadding / 2 },
    widgetRowText: { 
      fontSize: baseFontSize * 0.8, 
      color: colors.textSecondary, 
      flexShrink: 1, 
      marginLeft: basePadding / 2, 
      lineHeight: baseFontSize * 1.1 
    },
    widgetRowIconSize: baseFontSize * 0.9,
    widgetFooterActions: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginTop: basePadding * 0.6, 
      paddingTop: basePadding / 2, 
      borderTopWidth: 1, 
      borderTopColor: colors.border + '80' 
    },
    viewAllLink: { fontSize: baseFontSize * 0.75, fontWeight: '500' },
    reportButtonSmall: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: basePadding / 2, 
      paddingHorizontal: basePadding * 0.6, 
      borderRadius: 20 
    },
    reportButtonTextSmall: { 
      color: '#fff', 
      fontSize: baseFontSize * 0.7, 
      fontWeight: '500', 
      marginLeft: basePadding / 4 
    },
    smallIconSize: baseFontSize * 0.7,
    widgetButton: { 
      alignSelf: 'flex-start', 
      marginTop: basePadding / 2, 
      backgroundColor: colors.tint + '1A', 
      paddingVertical: basePadding / 2, 
      paddingHorizontal: basePadding * 0.6, 
      borderRadius: 15, 
      borderWidth: 1, 
      borderColor: colors.tint + '40' 
    },
    widgetButtonText: { color: colors.tint, fontSize: baseFontSize * 0.75, fontWeight: '500' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.75)' },
    studentCardModal: { 
      backgroundColor: colorScheme === 'dark' ? '#1a202c' : '#ffffff', 
      borderRadius: 16, 
      width: screenWidth * 0.9, 
      aspectRatio: 85.6 / 53.98, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 8 }, 
      shadowOpacity: 0.4, 
      shadowRadius: 12, 
      elevation: 15, 
      position: 'relative', 
      overflow: 'hidden', 
      borderWidth: Platform.OS === 'android' ? 0 : 1, 
      borderColor: colors.border + '30' 
    },
    studentCardHeader: { 
      paddingVertical: basePadding * 0.6, 
      paddingHorizontal: basePadding, 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    },
    universityName: { 
      fontSize: baseFontSize * 0.6, 
      color: '#fff', 
      fontWeight: 'bold', 
      textTransform: 'uppercase', 
      letterSpacing: 0.5, 
      textAlign: 'right' 
    },
    facultyName: { fontSize: baseFontSize * 0.5, color: '#fffC0', textAlign: 'right' },
    studentCardBody: { paddingHorizontal: basePadding, paddingVertical: basePadding * 0.6, flex: 1, justifyContent: 'center' },
    cardTypeText: { 
      fontSize: baseFontSize * 0.55, 
      fontWeight: 'bold', 
      color: colors.textSecondary, 
      textAlign: 'left', 
      marginBottom: basePadding / 2, 
      letterSpacing: 1.5, 
      textTransform: 'uppercase' 
    },
    studentCardName: { 
      fontSize: baseFontSize * 1.05, 
      fontWeight: 'bold', 
      color: colors.text, 
      marginBottom: basePadding * 0.6, 
      textAlign: 'left', 
      lineHeight: baseFontSize * 1.2 
    },
    studentCardGrid: { flexDirection: 'row', width: '100%', marginBottom: basePadding / 2, justifyContent: 'space-between' },
    studentCardGridItem: { flexBasis: '48%', alignItems: 'flex-start' },
    studentCardInfoRowFull: { width: '100%', marginBottom: basePadding / 2, alignItems: 'flex-start' },
    studentCardLabel: { 
      fontSize: baseFontSize * 0.6, 
      color: colors.textSecondary, 
      marginBottom: basePadding / 4, 
      textTransform: 'uppercase', 
      letterSpacing: 0.5 
    },
    studentCardValue: { fontSize: baseFontSize * 0.8, color: colors.text, fontWeight: '600', textAlign: 'left' },
    idValue: { fontWeight: 'bold', letterSpacing: 0.5 },
    studentCardFooter: { 
      paddingVertical: basePadding / 2, 
      borderTopWidth: 1, 
      borderTopColor: colors.border + '50', 
      marginTop: 'auto', 
      alignItems: 'center' 
    },
    validityText: { fontSize: baseFontSize * 0.6, color: colors.textSecondary, fontStyle: 'italic' },
    modalCloseButton: { 
      position: 'absolute', 
      top: basePadding / 2, 
      right: basePadding / 2, 
      padding: basePadding / 4, 
      zIndex: 10, 
      backgroundColor: 'rgba(0,0,0,0.15)', 
      borderRadius: 15 
    },
    baseFontSize,
    basePadding,
  });
};