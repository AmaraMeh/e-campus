// File: app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Platform, Dimensions, Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Added MaterialCommunityIcons
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
// --- Adjust Paths ---
import { auth, db } from '@/firebaseConfig';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserData, clearUserData, UserData } from '@/utils/storage';
import ExamCountdown from '@/components/ExamCountdown';
// --- ---

// --- Interface ---
interface FoundItem { id: string; itemName: string; description: string; locationFound: string; dateFound: Timestamp | { seconds: number; nanoseconds: number }; imageUrl?: string; userId: string; userFullName: string; createdAt: Timestamp; status?: string }
// --- ---

// --- Placeholder Components ---
const NextClassCard = ({ styles }: { styles: any }) => ( <View style={styles.widgetCard}><Text style={styles.widgetTitle}>Prochain Cours</Text><Text style={styles.widgetText}>Données non disponibles.</Text></View> );
const RecentGradesSummary = ({ styles }: { styles: any }) => ( <View style={styles.widgetCard}><Text style={styles.widgetTitle}>Notes Récentes</Text><Text style={styles.widgetText}>Données non disponibles.</Text></View> );
const QuickLinkCard = ({ styles, title, icon, onPress }: { styles: any, title: string, icon: keyof typeof FontAwesome.glyphMap, onPress: () => void }) => ( <TouchableOpacity style={styles.quickLinkCard} onPress={onPress} activeOpacity={0.7}><FontAwesome name={icon} size={26} color={styles.quickLinkIcon.color} /><Text style={styles.quickLinkText}>{title}</Text></TouchableOpacity> );
const LostFoundPreview = ({ styles, items, isLoading, colors }: { styles: any, items: FoundItem[], isLoading: boolean, colors: typeof Colors.light | typeof Colors.dark }) => { const router = useRouter(); return ( <View style={styles.widgetCard}> <View style={styles.widgetHeader}> <Text style={styles.widgetTitle}>Objets Trouvés Récemment</Text> <TouchableOpacity onPress={() => router.push('/lost-found')}> <Text style={[styles.viewAllLink, { color: colors.tint }]}>Voir tout</Text> </TouchableOpacity> </View> {isLoading ? ( <ActivityIndicator color={colors.tint} style={{ marginVertical: 10 }}/> ) : items.length === 0 ? ( <Text style={styles.widgetText}>Aucun objet trouvé signalé.</Text> ) : ( items.map(item => { let dateString = 'Date inconnue'; if (item.dateFound) { try { const date = (item.dateFound as Timestamp)?.toDate ? (item.dateFound as Timestamp).toDate() : new Date((item.dateFound as any).seconds * 1000); dateString = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch (e) {} } return ( <Text key={item.id} style={styles.widgetText} numberOfLines={1}>- {item.itemName} (vu à {item.locationFound} le {dateString})</Text> ); }) )} <TouchableOpacity style={[styles.reportButton, { backgroundColor: colors.tint }]} onPress={() => router.push('/report-found')}> <FontAwesome name="plus-circle" size={16} color="white"/> <Text style={styles.reportButtonText}>Signaler un objet trouvé</Text> </TouchableOpacity> </View> ); };
// --- End Placeholders ---


// --- Main Home Screen ---
export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = getStyles(colorScheme, colors);
  const router = useRouter();

  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentFoundItems, setRecentFoundItems] = useState<FoundItem[]>([]);
  const [loadingFoundItems, setLoadingFoundItems] = useState(false);

  // --- Fetch Recent Found Items ---
   const fetchRecentFoundItems = useCallback(async () => {
        if (!auth.currentUser || !db) return;
        setLoadingFoundItems(true);
        try {
            const itemsRef = collection(db, "foundItems");
            const q = query(itemsRef, orderBy("createdAt", "desc"), limit(2)); // Order by creation time
            const querySnapshot = await getDocs(q);
            const items: FoundItem[] = [];
            querySnapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() } as FoundItem); });
            setRecentFoundItems(items);
        } catch (error) { console.error("Error fetching found items:", error); }
        finally { setLoadingFoundItems(false); }
    }, []);

  // --- Auth Listener & Initial Load ---
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const storedData = await getUserData();
        if (storedData && storedData.uid === user.uid) { setUserData(storedData); }
        else { const basicUserData: UserData = { uid: user.uid, email: user.email, fullName: user.displayName || user.email?.split('@')[0] || "Utilisateur", profilePicUrl: user.photoURL || undefined }; setUserData(basicUserData); /* TODO: Fetch from Firestore */ }
        fetchRecentFoundItems(); // Fetch items when logged in
      } else { setUserData(null); setRecentFoundItems([]); await clearUserData(); }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchRecentFoundItems]); // Add dependency

  // --- Pull to Refresh ---
   const onRefresh = useCallback(async () => { setRefreshing(true); try { const user = auth.currentUser; setCurrentUser(user); if (user) { const storedData = await getUserData(); if (storedData && storedData.uid === user.uid) { setUserData(storedData); } else { /* ... set basic data ... */ } await fetchRecentFoundItems(); } else { setUserData(null); await clearUserData(); setRecentFoundItems([]); } } catch (error) { console.error("Refresh error:", error); } finally { setRefreshing(false); } }, [fetchRecentFoundItems]);

  // --- Handlers ---
  const handleLogout = useCallback(async () => { Alert.alert( "Déconnexion", "...", [ { text: "Annuler" }, { text: "Déconnecter", onPress: async () => { try { await signOut(auth); } catch (e) { Alert.alert("Erreur logout"); } }} ] ); }, [router]);
  const handleThemeToggle = () => { Alert.alert("Thème", "Context requis"); };


  // --- Loading View ---
  if (isLoading) { return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>; }

  // --- Logged Out View ---
  if (!currentUser) { return ( <View style={styles.loggedOutContainer}> <Stack.Screen options={{ headerShown: false }} /> <Image source={require('@/assets/images/LOGO.png')} style={styles.logo} resizeMode='contain'/> <Text style={styles.welcomeTitle}>Bienvenue sur CampusElkseur</Text> <Text style={styles.welcomeSubtitle}>Votre portail étudiant numérique.</Text> <TouchableOpacity style={styles.authButton} onPress={() => router.push('/auth')} activeOpacity={0.7}><Text style={styles.authButtonText}>Connexion</Text></TouchableOpacity> <TouchableOpacity style={[styles.authButton, styles.signUpButton]} onPress={() => router.push('/auth?tab=register')} activeOpacity={0.7}><Text style={[styles.authButtonText, styles.signUpButtonText]}>Créer un compte</Text></TouchableOpacity> </View> ); }

  // --- Logged In View ---
   const profilePictureSource = userData?.profilePicUrl ? { uri: userData.profilePicUrl } : require('@/assets/images/icon.png');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint}/>} showsVerticalScrollIndicator={false} >
       <Stack.Screen options={{ headerShown: false }} />
       {/* Custom Header */}
       <View style={styles.header}>
           <TouchableOpacity style={styles.profileContainer} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.7}>
                <Image source={profilePictureSource} style={styles.profilePic} onError={(e)=>console.log("Img Err:", e.nativeEvent.error)}/>
                <View style={styles.profileNameContainer}>
                    <Text style={styles.welcomeText}>Bonjour,</Text>
                    <Text style={styles.userName} numberOfLines={1} ellipsizeMode='tail'>{userData?.fullName ?? 'Étudiant'}</Text>
                </View>
            </TouchableOpacity>
           <View style={styles.headerIcons}>
                <TouchableOpacity onPress={handleThemeToggle} style={styles.iconButton}><Ionicons name={colorScheme === 'dark' ? 'sunny' : 'moon'} size={22} color={styles.iconButtonText.color} /></TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert("Navigation", "Écran 'Settings'")} style={styles.iconButton}><Ionicons name="settings-outline" size={22} color={styles.iconButtonText.color} /></TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} style={styles.iconButton}><Ionicons name="log-out-outline" size={24} color={colors.danger} /></TouchableOpacity>
           </View>
       </View>
        {/* Widgets */}
        <ExamCountdown />
        <NextClassCard styles={styles} />
        <RecentGradesSummary styles={styles} />
        <LostFoundPreview styles={styles} items={recentFoundItems} isLoading={loadingFoundItems} colors={colors} />
         {/* Quick Links Row */}
         <Text style={styles.sectionTitle}>Accès Rapide</Text>
         <View style={styles.quickLinksContainer}>
             <QuickLinkCard styles={styles} title="Emploi Temps" icon="calendar" onPress={() => Alert.alert("Navigation", "Écran 'Emploi du Temps'")}/>
             <QuickLinkCard styles={styles} title="Calcul Moyenne" icon="calculator" onPress={() => router.push('/(tabs)/calculator')}/>
             <QuickLinkCard styles={styles} title="Espace Cours" icon="book" onPress={() => router.push('/(tabs)/courses')}/>
             {/* ChatAI Button */}
             <QuickLinkCard styles={styles} title="Chat AI" icon="comments-o" onPress={() => router.push('/chat-ai')}/>
         </View>
       <View style={{ height: 40 }}/>
    </ScrollView>
  );
}

// --- Styles (getStyles definition - Requires minor additions) ---
const getStyles = (colorScheme: 'light' | 'dark', colors: typeof Colors.light | typeof Colors.dark) => {
    const screenWidth = Dimensions.get('window').width;
    return StyleSheet.create({
        // ... (Keep ALL styles from the previous full index.tsx response)
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
        container: { flex: 1, backgroundColor: colors.background },
        contentContainer: { paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 60 },
        loggedOutContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: colors.background, },
        logo: { width: screenWidth * 0.4, height: screenWidth * 0.4, maxWidth: 180, maxHeight: 180, marginBottom: 30, },
        welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 10, },
        welcomeSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 40, },
        authButton: { backgroundColor: colors.tint, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, width: '90%', alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, },
        authButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', },
        signUpButton: { backgroundColor: colors.cardBackground, borderWidth: 1.5, borderColor: colors.tint, },
        signUpButtonText: { color: colors.tint, },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 10, },
        profileContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10, },
        profilePic: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.tint, marginRight: 12, backgroundColor: colors.border, },
        profileNameContainer: { flexShrink: 1, },
        welcomeText: { fontSize: 13, color: colors.textSecondary, },
        userName: { fontSize: 17, fontWeight: 'bold', color: colors.text, },
        headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12, },
        iconButton: { padding: 6, },
        iconButtonText: { color: colors.textSecondary, }, // Style object for icon color
        sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15, marginTop: 15, },
        widgetCard: { backgroundColor: colors.cardBackground, borderRadius: 12, padding: 16, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2, borderWidth: 1, borderColor: colors.border, },
        widgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, },
        viewAllLink: { fontSize: 13, fontWeight: '500', /* color set dynamically */ },
        widgetTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8, },
        widgetText: { fontSize: 14, color: colors.textSecondary, marginBottom: 4, lineHeight: 20, },
         mapButton: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: colors.tint + '1A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: colors.tint + '40', },
         mapButtonText: { color: colors.tint, fontSize: 13, fontWeight: '500', },
          reportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, /* backgroundColor set dynamically */ paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, },
          reportButtonText: { color: '#fff', fontSize: 14, fontWeight: '500', marginLeft: 8, },
        quickLinksContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginHorizontal: -4, gap: 8, }, // Use gap for spacing
        quickLinkCard: {
            flex: 1, // Allow flex to distribute space
             // marginHorizontal: 4, // Remove margin if using gap
             backgroundColor: colors.cardBackground, borderRadius: 10, paddingVertical: 15, paddingHorizontal: 5, // Reduce horizontal padding slightly
             alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: colors.border,
             minHeight: 90, // Adjust height as needed
             aspectRatio: 1, // Make cards square
        },
        quickLinkIcon: { color: colors.tint, marginBottom: 6, },
        quickLinkText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', textAlign: 'center', marginTop: 2, },
    });
};