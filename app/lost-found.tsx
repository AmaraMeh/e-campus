// File: app/lost-found.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
// --- Adjust Paths ---
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { auth, db } from '../firebaseConfig';
import AuthGuard from '../app/auth-guard'; // <--- Import Guard ---
// --- ---

// --- Interface (Keep as is) ---
interface FoundItem { id: string; itemName: string; description: string; locationFound: string; dateFound: Timestamp; imageUrl?: string; contactInfo?: string; reporterEmail?: string; status?: string; }

// --- Renamed Content Component ---
function LostFoundScreenContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
    const styles = getListStyles(colorScheme, colors);
    const router = useRouter();

    // --- State (Keep as is, removed currentUser/authChecked) ---
    const [items, setItems] = useState<FoundItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // --- Fetch Items (Modified - assumes authenticated by guard) ---
    const fetchItems = useCallback(async () => {
        if (!db) { console.error("DB not initialized"); setIsLoading(false); setRefreshing(false); return; } // Guard against null db
        setIsLoading(true);
        try {
            const itemsRef = collection(db, "foundItems");
            const q = query(itemsRef, orderBy("dateFound", "desc"));
            const querySnapshot = await getDocs(q);
            const fetchedItems: FoundItem[] = [];
            querySnapshot.forEach((doc) => { fetchedItems.push({ id: doc.id, ...doc.data() } as FoundItem); });
            setItems(fetchedItems);
        } catch (error) { console.error("Error fetching found items:", error); Alert.alert("Erreur", "Chargement objets échoué."); }
        finally { setIsLoading(false); setRefreshing(false); }
    }, []); // Removed auth dependency

    // --- Initial Fetch Effect ---
    useEffect(() => {
        fetchItems(); // Fetch items on initial mount (guard ensures user is logged in)
    }, [fetchItems]); // Depend on fetchItems

    // --- Pull to Refresh (Keep as is) ---
    const onRefresh = useCallback(() => { setRefreshing(true); fetchItems(); }, [fetchItems]);

    // --- Render Item (Keep as is) ---
    const renderItem = ({ item }: { item: FoundItem }) => ( <View style={styles.itemCard}> {item.imageUrl && ( <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" /> )} <View style={styles.itemContent}> <Text style={styles.itemName}>{item.itemName}</Text> <Text style={styles.itemDescription} numberOfLines={3}>{item.description}</Text> <View style={styles.itemDetailRow}><Ionicons name="location-outline" size={14} color={colors.textSecondary} /><Text style={styles.itemDetailText}>{item.locationFound}</Text></View> <View style={styles.itemDetailRow}><Ionicons name="calendar-outline" size={14} color={colors.textSecondary} /><Text style={styles.itemDetailText}>Trouvé: {item.dateFound?.toDate().toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) ?? 'Inconnue'}</Text></View> {item.contactInfo && ( <View style={styles.itemDetailRow}><Ionicons name="call-outline" size={14} color={colors.textSecondary} /><Text style={styles.itemDetailText}>Contact: {item.contactInfo}</Text></View> )} <View style={[styles.statusBadge, item.status === 'claimed' && styles.statusClaimed]}><Text style={styles.statusText}>{item.status === 'claimed' ? 'Récupéré' : 'Disponible'}</Text></View> </View> </View> );

    // --- Loading State ---
     if (isLoading && items.length === 0) { // Show loading only on initial load
         return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>;
     }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerTitle: 'Objets Trouvés', headerRight: () => ( <TouchableOpacity onPress={() => router.push('/report-found')} style={{ marginRight: 15 }}> <Ionicons name="add-circle-outline" size={28} color={colors.tint} /> </TouchableOpacity> ), headerStyle: { backgroundColor: colors.cardBackground }, headerTitleStyle: { color: colors.text }, headerTintColor: colors.tint }} />

            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContentContainer}
                ListEmptyComponent={ // Show empty state only if NOT loading
                    !isLoading && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={50} color={colors.textSecondary + '80'} />
                            <Text style={styles.emptyText}>Aucun objet trouvé signalé.</Text>
                            <TouchableOpacity style={styles.reportButtonSmall} onPress={() => router.push('/report-found')}>
                                <Text style={styles.reportButtonTextSmall}>Signaler un objet</Text>
                            </TouchableOpacity>
                        </View>
                    )
                }
                refreshControl={ <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} /> }
            />
        </View>
    );
}

// --- Styles (getListStyles - Keep as is) ---
// ...

// --- Styles ---
const getListStyles = (colorScheme: 'light' | 'dark', colors: typeof Colors.light | typeof Colors.dark) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    listContentContainer: {
      padding: 15,
      paddingBottom: 80, // Ensure space for potential floating action buttons or tab bar
    },
    itemCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      marginBottom: 15,
      overflow: 'hidden', // Ensures image corners are rounded
      flexDirection: 'row', // Arrange image and content side-by-side
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    itemImage: {
      width: 100, // Fixed width for the image
      height: 130, // Fixed height for consistency
    },
    itemContent: {
      flex: 1, // Takes remaining space
      padding: 12,
    },
    itemName: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 5,
    },
    itemDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    itemDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    itemDetailText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 6,
    },
    statusBadge: {
      position: 'absolute', // Position badge within the card
      top: 10,
      right: 10,
      backgroundColor: colors.success + '30', // Semi-transparent success
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.success + '80',
    },
    statusClaimed: {
      backgroundColor: colors.warning + '30', // Semi-transparent warning
      borderColor: colors.warning + '80',
    },
    statusText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.success, // Success color for text by default
    },
    // You might want a specific style for claimed text color
    // statusClaimedText: {
    //   color: colors.warning,
    // },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
      marginTop: 50, // Add some top margin
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 15,
      marginBottom: 20,
    },
    reportButtonSmall: {
      backgroundColor: colors.tint,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    reportButtonTextSmall: {
      color: '#fff', // Assuming white text on tint background
      fontSize: 14,
      fontWeight: '500',
    },
  });
};


export default AuthGuard(LostFoundScreenContent);