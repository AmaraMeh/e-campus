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

// --- Wrap with Guard ---
export default AuthGuard(LostFoundScreenContent);