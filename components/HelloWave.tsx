// File: app/(tabs)/favorites.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router'; // To reload data when tab becomes active
import { Ionicons, FontAwesome } from '@expo/vector-icons';
// --- Adjust Paths ---
import { Colors } from '../constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { universiteBejaiaData, Resource, Module } from '../constants/Data'; // Import data and types
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
// --- ---

// Keys for AsyncStorage
const FAVORITES_STORAGE_KEY = '@ModuleResourceFavorites'; // Same key as in [moduleId].tsx
const DOWNLOADS_STORAGE_KEY = '@ModuleResourceDownloads';

// Interface for stored download metadata
interface DownloadedResourceMeta extends Resource {
  localUri: string; // Path to the downloaded file
  downloadedAt: number; // Timestamp of download
  moduleName?: string; // Optional: Store module context
  resourceType?: string; // Optional: Store type (cours, td, etc.)
}

// Helper: Flatten all resources from universiteBejaiaData into a map for easy lookup by ID
const allResourcesMap = new Map<string, { resource: Resource, module: Module }>();
const populateResourceMap = () => {
    if (allResourcesMap.size > 0) return; // Populate only once
    for (const yearKey in universiteBejaiaData) {
        const year = universiteBejaiaData[yearKey];
        for (const specKey in year) {
            const spec = year[specKey];
            for (const semKey in spec) {
                const semester = spec[semKey];
                semester.forEach(module => {
                    for (const resType in module.resources) {
                        const resources = module.resources[resType as keyof Module['resources']];
                        if (resources) {
                            resources.forEach(resource => {
                                if (resource.id) { // Ensure resource has an ID
                                    allResourcesMap.set(resource.id, { resource, module });
                                } else {
                                     console.warn("Resource missing ID:", resource.title, "in module", module.matiere);
                                }
                            });
                        }
                    }
                });
            }
        }
    }
    console.log(`Populated resource map with ${allResourcesMap.size} items.`);
};
// Call once when the app loads or before first use
populateResourceMap();
// --- ---


export default function FavoritesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getFavoritesStyles(colorScheme);
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedResourceMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Load Data ---
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load Favorites
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      const favIds = storedFavorites ? new Set<string>(JSON.parse(storedFavorites)) : new Set<string>();
      setFavoriteIds(favIds);
      console.log("Loaded favorite IDs:", favIds.size);

      // Load Downloads Metadata
      const storedDownloads = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY);
      const downloads = storedDownloads ? (JSON.parse(storedDownloads) as DownloadedResourceMeta[]) : [];

      // Optional: Verify downloaded files still exist
      const verifiedDownloads: DownloadedResourceMeta[] = [];
      for (const download of downloads) {
          const fileInfo = await FileSystem.getInfoAsync(download.localUri);
          if (fileInfo.exists) {
              verifiedDownloads.push(download);
          } else {
              console.warn(`Downloaded file missing: ${download.localUri}`);
              // Optionally remove missing entry from storage here
          }
      }
      setDownloadedFiles(verifiedDownloads);
      console.log("Loaded and verified downloads:", verifiedDownloads.length);

    } catch (e) {
      console.error("Failed to load favorites/downloads.", e);
      Alert.alert("Erreur", "Impossible de charger les favoris ou téléchargements.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload data when the screen comes into focus
  useFocusEffect(loadData);

  // --- Actions ---
  const handleRemoveFavorite = useCallback(async (resourceId: string) => {
     setFavoriteIds(prev => {
         const newFavs = new Set(prev);
         newFavs.delete(resourceId);
         // Save immediately
         AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(newFavs)))
            .catch(e => console.error("Failed to save after removing favorite", e));
         return newFavs;
     });
  }, []);

  const handleDeleteDownload = useCallback(async (downloadToDelete: DownloadedResourceMeta) => {
     Alert.alert(
         "Supprimer le fichier ?",
         `"${downloadToDelete.title}" sera supprimé de l'appareil.`,
         [
            { text: "Annuler", style: "cancel" },
            { text: "Supprimer", style: "destructive", onPress: async () => {
                try {
                    await FileSystem.deleteAsync(downloadToDelete.localUri, { idempotent: true });
                    const updatedDownloads = downloadedFiles.filter(d => d.id !== downloadToDelete.id);
                    setDownloadedFiles(updatedDownloads);
                    await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updatedDownloads));
                    console.log("Deleted download:", downloadToDelete.localUri);
                } catch (e) {
                    console.error("Failed to delete download", e);
                    Alert.alert("Erreur", "Impossible de supprimer le fichier téléchargé.");
                }
            }}
         ]
     );
  }, [downloadedFiles]); // Depend on downloadedFiles to ensure filter works correctly

    const handleOpenFile = async (localUri: string) => {
        try {
            // For native platforms, try to open with default app
            // Linking might work for some file types depending on OS setup
            await Linking.openURL(localUri);
        } catch (error) {
            console.error("Error opening local file with Linking:", error);
            Alert.alert("Impossible d'ouvrir", "Aucune application trouvée pour ouvrir ce type de fichier, ou le fichier est corrompu.");
        }
    };


  // --- Render Item Helper ---
  const renderItem = ({ item, type }: { item: Resource | DownloadedResourceMeta; type: 'favorite' | 'download' }) => {
      const resource = type === 'favorite' ? (item as Resource) : (item as DownloadedResourceMeta).resource;
      const downloadMeta = type === 'download' ? (item as DownloadedResourceMeta) : null;
      const moduleName = downloadMeta?.moduleName || allResourcesMap.get(resource.id)?.module?.matiere || '';

      return (
          <View style={styles.itemContainer}>
              <View style={styles.itemInfo}>
                   <FontAwesome name="file-o" size={18} color={colors.textSecondary} style={{ marginRight: 12}}/>
                  <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{resource.title}</Text>
                      {moduleName && <Text style={styles.itemSubtitle}>{moduleName}</Text>}
                      {downloadMeta && <Text style={styles.itemDate}>Téléchargé: {new Date(downloadMeta.downloadedAt).toLocaleDateString()}</Text>}
                  </View>
              </View>
              <View style={styles.itemActions}>
                  {type === 'favorite' && (
                      <TouchableOpacity onPress={() => handleRemoveFavorite(resource.id)} style={styles.actionButton}>
                          <Ionicons name={'star'} size={24} color={colors.tint} />
                      </TouchableOpacity>
                  )}
                   {type === 'download' && downloadMeta && (
                      <TouchableOpacity onPress={() => handleOpenFile(downloadMeta.localUri)} style={styles.actionButton}>
                          <Ionicons name={'folder-open-outline'} size={24} color={styles.actionIconColor.color} />
                      </TouchableOpacity>
                   )}
                  {type === 'download' && downloadMeta && (
                       <TouchableOpacity onPress={() => handleDeleteDownload(downloadMeta)} style={styles.actionButton}>
                          <Ionicons name={'trash-outline'} size={24} color={colors.danger} />
                       </TouchableOpacity>
                  )}
              </View>
          </View>
      );
  };

  // Prepare data for FlatLists
  const favoriteResources = Array.from(favoriteIds)
                               .map(id => allResourcesMap.get(id)?.resource)
                               .filter((r): r is Resource => r !== undefined); // Type guard


  // --- Loading/Empty States ---
  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>;
  }

  // --- Main Render ---
  return (
    <View style={styles.container}>
       <Stack.Screen options={{ headerTitle: 'Favoris & Téléchargements', headerShown: true, headerStyle: { backgroundColor: colors.cardBackground }, headerTitleStyle: { color: colors.text, fontWeight: 'bold' }, headerTintColor: colors.tint }} />

       {/* Using Sections - better approach might be two FlatLists or SectionList */}
       <ScrollView>
            {/* Favorites Section */}
            <View style={styles.sectionContainer}>
                 <Text style={styles.sectionTitle}>Mes Favoris</Text>
                 {favoriteResources.length > 0 ? (
                     favoriteResources.map(item => renderItem({ item, type: 'favorite' }))
                 ) : (
                     <Text style={styles.emptyText}>Vous n'avez pas encore ajouté de ressources à vos favoris.</Text>
                 )}
            </View>

            {/* Downloads Section */}
            <View style={styles.sectionContainer}>
                 <Text style={styles.sectionTitle}>Mes Téléchargements</Text>
                 {downloadedFiles.length > 0 ? (
                     downloadedFiles.map(item => renderItem({ item, type: 'download' }))
                 ) : (
                     <Text style={styles.emptyText}>Aucun fichier téléchargé pour une consultation hors ligne.</Text>
                 )}
            </View>

             <View style={{ height: 40 }} />{/* Bottom Spacer */}
        </ScrollView>

    </View>
  );
}

// --- Styles ---
const getFavoritesStyles = (colorScheme: 'light' | 'dark') => {
    const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
    return StyleSheet.create({
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        sectionContainer: {
            margin: 15,
            marginBottom: 25,
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            padding: 15,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 2,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 15,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        itemContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border + '80', // Lighter separator
        },
         // Remove bottom border for last item (can be done via FlatList prop or logic)
         itemContainer_last: { borderBottomWidth: 0 },
        itemInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1, // Allow info to take space
            marginRight: 10,
        },
        itemTitle: {
            fontSize: 14,
            fontWeight: '500',
            color: colors.text,
            flexShrink: 1, // Allow wrapping/shrinking
        },
        itemSubtitle: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 2,
        },
        itemDate: {
             fontSize: 11,
             color: colors.textSecondary + 'AA', // Faded
             marginTop: 3,
        },
        itemActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20, // Space buttons out
        },
        actionButton: {
            padding: 5,
        },
        actionIconColor: { // For non-favorite/non-delete icons
            color: colors.textSecondary,
        },
        emptyText: {
            textAlign: 'center',
            color: colors.textSecondary,
            marginTop: 20,
            marginBottom: 10,
            fontSize: 14,
            paddingHorizontal: 10,
        },
    });
};