// File: app/(tabs)/favorites.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native'; // Removed FlatList
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, Stack } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
// --- Adjust Paths ---
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Resource, Module } from '@/constants/Data';
import { allResourcesMap, populateResourceMap, ResourceMapEntry } from '@/utils/resourceMap'; // Adjust path if needed
import AuthGuard from '@/app/auth-guard'; // <--- Import the guard ---
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
// --- ---

// Constants
const FAVORITES_STORAGE_KEY = '@ModuleResourceFavorites';
const DOWNLOADS_STORAGE_KEY = '@ModuleResourceDownloads';

// Interface
interface DownloadedResourceMeta extends Resource { localUri: string; downloadedAt: number; moduleName?: string; resourceType?: string; }

// Populate map (should run only once)
populateResourceMap();

// --- Renamed Content Component ---
function FavoritesScreenContent() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = getFavoritesStyles(colorScheme, colors);
  // const router = useRouter(); // Not currently used here

  // --- State ---
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedResourceMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapPopulated, setIsMapPopulated] = useState(allResourcesMap.size > 0);

  // --- Load Data ---
  const loadData = useCallback(async () => {
    if (!isLoading) setIsLoading(true);
    if (allResourcesMap.size === 0 && !isMapPopulated) { populateResourceMap(); setIsMapPopulated(allResourcesMap.size > 0); await new Promise(resolve => setTimeout(resolve, 50)); }
    try {
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      const favIds = storedFavorites ? new Set<string>(JSON.parse(storedFavorites)) : new Set<string>();
      setFavoriteIds(favIds);
      const storedDownloads = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY);
      const downloads = storedDownloads ? (JSON.parse(storedDownloads) as DownloadedResourceMeta[]) : [];
      const verifiedDownloads: DownloadedResourceMeta[] = [];
      for (const download of downloads) { try { const fileInfo = await FileSystem.getInfoAsync(download.localUri); if (fileInfo.exists) verifiedDownloads.push(download); else console.warn(`DL missing: ${download.localUri}`); } catch (fileError) { console.error(`Err check file ${download.localUri}:`, fileError); } }
      setDownloadedFiles(verifiedDownloads);
    } catch (e) { console.error("Failed load favs/dls.", e); Alert.alert("Erreur", "Impossible charger données."); }
    finally { setIsLoading(false); }
  }, [isLoading, isMapPopulated]); // Dependencies

  useFocusEffect(loadData); // Reload on focus

  // --- Actions ---
  const handleRemoveFavorite = useCallback(async (resourceId: string) => { setFavoriteIds(prev => { const n = new Set(prev); n.delete(resourceId); AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(n))).catch(e => console.error("Failed save remove fav", e)); return n; }); }, []);
  const handleDeleteDownload = useCallback(async (downloadToDelete: DownloadedResourceMeta) => { Alert.alert( "Supprimer?", `"${downloadToDelete.title}" sera supprimé.`, [ { text: "Annuler" }, { text: "Supprimer", style: "destructive", onPress: async () => { try { await FileSystem.deleteAsync(downloadToDelete.localUri, { idempotent: true }); const updated = downloadedFiles.filter(d => d.id !== downloadToDelete.id); setDownloadedFiles(updated); await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updated)); } catch (e) { console.error("Failed delete dl", e); Alert.alert("Erreur", "Impossible supprimer."); } }} ] ); }, [downloadedFiles]);
  const handleOpenFile = async (localUri: string, title: string) => { console.log("Opening local:", localUri); try { if (!(await Sharing.isAvailableAsync())) { throw new Error("Sharing indisponible"); } await Sharing.shareAsync(localUri, { dialogTitle: `Ouvrir/Partager "${title}"` }); } catch (error: any) { console.error("Open/Share err:", error); try { await Linking.openURL(localUri); } catch(linkError) { console.error("Linking fallback err:", linkError); Alert.alert("Impossible", "Aucune app trouvée."); } } };

  // --- Render Item Helper ---
  const renderItem = ({ item, type }: { item: Resource | DownloadedResourceMeta; type: 'favorite' | 'download' }) => {
      let resource: Resource | undefined; let downloadMeta: DownloadedResourceMeta | null = null; let mapEntry: ResourceMapEntry | undefined; let resourceId: string | undefined;
      if (type === 'favorite') { resourceId = (item as Resource)?.id; if (!resourceId) { return <View style={[styles.itemContainer, styles.itemError]}><FontAwesome name="exclamation-triangle" size={18} color={colors.danger} style={{ marginRight: 12}}/><Text style={styles.errorTextSmall}>Favori invalide</Text></View>; } mapEntry = allResourcesMap.get(resourceId); resource = mapEntry?.resource; }
      else { downloadMeta = item as DownloadedResourceMeta; resource = downloadMeta; resourceId = resource.id; mapEntry = allResourcesMap.get(resourceId); }
      if (!resource || !resourceId) { const idToShow = resourceId ?? (item as any)?.id ?? 'inconnu'; return ( <View style={[styles.itemContainer, styles.itemError]}> <FontAwesome name="exclamation-triangle" size={18} color={colors.danger} style={{ marginRight: 12}}/> <Text style={styles.errorTextSmall}>Données introuvables (ID: {idToShow})</Text> {type === 'favorite' && ( <TouchableOpacity onPress={() => handleRemoveFavorite(idToShow)} style={styles.actionButton}> <Ionicons name={'trash-outline'} size={24} color={colors.danger} /> </TouchableOpacity> )} </View> ); }
      const moduleName = downloadMeta?.moduleName || mapEntry?.module?.matiere || ''; const actionIconStyle = styles.actionIconColor ?? { color: colors.textSecondary };
      return ( <View style={styles.itemContainer}> <View style={styles.itemInfo}> <FontAwesome name="file-text-o" size={18} color={colors.textSecondary} style={{ marginRight: 12}}/> <View style={{ flex: 1 }}> <Text style={styles.itemTitle} numberOfLines={2}>{resource.title ?? 'Titre Inconnu'}</Text> {moduleName ? <Text style={styles.itemSubtitle}>{moduleName}</Text> : null} {downloadMeta ? <Text style={styles.itemDate}>Téléchargé: {new Date(downloadMeta.downloadedAt).toLocaleDateString()}</Text> : null} </View> </View> <View style={styles.itemActions}> {type === 'favorite' && ( <TouchableOpacity onPress={() => handleRemoveFavorite(resourceId)} style={styles.actionButton}> <Ionicons name={'star'} size={24} color={colors.tint} /> </TouchableOpacity> )} {type === 'download' && downloadMeta && ( <TouchableOpacity onPress={() => handleOpenFile(downloadMeta.localUri, resource.title)} style={styles.actionButton}> <Ionicons name={'folder-open-outline'} size={24} color={actionIconStyle.color} /> </TouchableOpacity> )} {type === 'download' && downloadMeta && ( <TouchableOpacity onPress={() => handleDeleteDownload(downloadMeta)} style={styles.actionButton}> <Ionicons name={'trash-outline'} size={24} color={colors.danger} /> </TouchableOpacity> )} </View> </View> );
  };

  // Prepare data
  const favoriteResources = (!isLoading && isMapPopulated) ? Array.from(favoriteIds).map(id => allResourcesMap.get(id)?.resource).filter((r): r is Resource => r !== undefined) : [];

  // --- Loading/Empty States ---
  if (isLoading) { return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>; }
  if (!isMapPopulated && !isLoading) { return <View style={styles.loadingContainer}><Text style={styles.errorText}>Erreur: Carte ressources non chargée.</Text></View>; }

  // --- Main Render ---
  return (
    <View style={styles.container}>
       <Stack.Screen options={{ headerTitle: 'Favoris & Téléchargements', headerShown: true, headerStyle: { backgroundColor: colors.cardBackground }, headerTitleStyle: { color: colors.text, fontWeight: 'bold' }, headerTintColor: colors.tint }} />

       {(favoriteResources.length === 0 && downloadedFiles.length === 0) ? (
           <View style={styles.emptyStateContainer}> <Ionicons name="star-outline" size={60} color={colors.textSecondary + '80'} /> <Text style={styles.emptyTextLarge}>Vos favoris et téléchargements sont vides.</Text> <Text style={styles.emptyTextSmall}>Ajoutez ou téléchargez depuis l'écran modules.</Text> </View>
       ) : (
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {favoriteResources.length > 0 && ( <View style={styles.sectionContainer}> <Text style={styles.sectionTitle}>Mes Favoris</Text> {favoriteResources.map((item, index) => ( <View key={`fav-${item.id}-${index}`} style={[ index === favoriteResources.length - 1 && styles.itemContainer_last]}>{renderItem({ item, type: 'favorite' })}</View> ))} </View> )}
                {downloadedFiles.length > 0 && ( <View style={styles.sectionContainer}> <Text style={styles.sectionTitle}>Mes Téléchargements</Text> {downloadedFiles.map((item, index) => ( <View key={`dl-${item.id}-${index}`} style={[ index === downloadedFiles.length - 1 && styles.itemContainer_last]}>{renderItem({ item, type: 'download' })}</View> ))} </View> )}
                <View style={{ height: 30 }} />
            </ScrollView>
       )}
    </View>
  );
}

// --- Styles (getFavoritesStyles - Keep as is) ---
const lightColors = { /* ... */ background: '#f8fafc', cardBackground: '#ffffff', tint: Colors.light.tint ?? '#3b82f6', border: '#e5e7eb', text: '#1f2937', textSecondary: '#6b7280', success: Colors.success ?? '#16a34a', danger: Colors.danger ?? '#dc2626', };
const darkColors = { /* ... */ background: '#111827', cardBackground: '#1f2937', tint: Colors.dark.tint ?? '#60a5fa', border: '#374151', text: '#f9fafb', textSecondary: '#9ca3af', success: Colors.success ?? '#22c55e', danger: Colors.danger ?? '#f87171', };

const getFavoritesStyles = (colorScheme: 'light' | 'dark', colors: typeof lightColors | typeof darkColors) => { return StyleSheet.create({ loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 }, errorText: { color: colors.danger ?? '#dc2626', fontSize: 16, textAlign: 'center', }, errorTextSmall: { color: colors.danger ?? '#dc2626', fontSize: 13, flexShrink: 1}, container: { flex: 1, backgroundColor: colors.background }, scrollContainer: { padding: 15, paddingBottom: 40 }, emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: colors.background }, emptyTextLarge: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginTop: 20, marginBottom: 10 }, emptyTextSmall: { fontSize: 14, color: colors.textSecondary + 'B0', textAlign: 'center', lineHeight: 20 }, sectionContainer: { marginBottom: 25, backgroundColor: colors.cardBackground, borderRadius: 12, paddingBottom: 5, paddingTop: 15, paddingHorizontal: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2, borderWidth: 1, borderColor: colors.border }, sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 5, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border + 'A0' }, itemContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '80' }, itemContainer_last: { borderBottomWidth: 0 }, itemError: { borderColor: colors.danger + '80', borderLeftWidth: 3, borderLeftColor: colors.danger}, itemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }, itemTitle: { fontSize: 14, fontWeight: '500', color: colors.text, flexShrink: 1 }, itemSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 }, itemDate: { fontSize: 11, color: colors.textSecondary + 'AA', marginTop: 3 }, itemActions: { flexDirection: 'row', alignItems: 'center', gap: 20 }, actionButton: { padding: 5 }, actionIconColor: { color: colors.textSecondary }, }); };

// --- Wrap with Guard ---
export default AuthGuard(FavoritesScreenContent); // Export guarded component