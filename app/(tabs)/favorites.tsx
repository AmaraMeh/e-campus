// File: app/(tabs)/favorites.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { collection, getDocs } from 'firebase/firestore';

// Adjust Paths
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Resource, Module } from '../../constants/Data';
import { db } from '../../firebaseConfig';
import AuthGuard from '../auth-guard';

// Constants
const FAVORITES_STORAGE_KEY = '@ModuleResourceFavorites';
const DOWNLOADS_STORAGE_KEY = '@ModuleResourceDownloads';

// Interface
interface DownloadedResourceMeta extends Resource {
  localUri: string;
  downloadedAt: number;
  moduleName?: string;
  resourceType?: string;
}

interface ResourceWithModule extends Resource {
  module?: Module;
}

function FavoritesScreenContent() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = getFavoritesStyles(colorScheme, colors);
  const router = useRouter();

  // State
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedResourceMeta[]>([]);
  const [resources, setResources] = useState<ResourceWithModule[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Resources and Modules from Firestore
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all modules
      const modulesQuery = collection(db, 'modules');
      const modulesSnapshot = await getDocs(modulesQuery);
      const modulesData = modulesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Module[];
      setModules(modulesData);

      // Fetch all resources
      const resourcesQuery = collection(db, 'resources');
      const resourcesSnapshot = await getDocs(resourcesQuery);
      const resourcesData = resourcesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ResourceWithModule[];

      // Attach module data to each resource
      const resourcesWithModules = resourcesData.map((resource) => {
        const module = modulesData.find((m) => m.id === resource.moduleId);
        return { ...resource, module };
      });
      setResources(resourcesWithModules);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Erreur lors du chargement des données.');
    }
  }, []);

  // Load Favorites and Downloads
  const loadData = useCallback(async () => {
    try {
      // Load favorites
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      const favIds = storedFavorites
        ? new Set<string>(JSON.parse(storedFavorites))
        : new Set<string>();
      setFavoriteIds(favIds);

      // Load downloads and verify files exist
      const storedDownloads = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY);
      const downloads: DownloadedResourceMeta[] = storedDownloads
        ? JSON.parse(storedDownloads)
        : [];
      const verifiedDownloads: DownloadedResourceMeta[] = [];
      for (const download of downloads) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(download.localUri);
          if (fileInfo.exists) {
            verifiedDownloads.push(download);
          } else {
            console.warn(`Download missing: ${download.localUri}`);
          }
        } catch (fileError) {
          console.error(`Error checking file ${download.localUri}:`, fileError);
        }
      }
      setDownloadedFiles(verifiedDownloads);
    } catch (e) {
      console.error('Failed to load favorites/downloads:', e);
      setError('Impossible de charger les favoris et téléchargements.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    const initialize = async () => {
      await fetchData();
      await loadData();
    };
    initialize();
  }, [fetchData, loadData]);

  // Reload on Focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Actions
  const handleRemoveFavorite = useCallback(
    async (resourceId: string) => {
      setFavoriteIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(resourceId);
        AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(newSet))).catch(
          (e) => console.error('Failed to save after removing favorite:', e)
        );
        return newSet;
      });
    },
    []
  );

  const handleDeleteDownload = useCallback(
    async (downloadToDelete: DownloadedResourceMeta) => {
      Alert.alert(
        'Supprimer ?',
        `"${downloadToDelete.title}" sera supprimé.`,
        [
          { text: 'Annuler' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                await FileSystem.deleteAsync(downloadToDelete.localUri, { idempotent: true });
                setDownloadedFiles((prev) => prev.filter((d) => d.id !== downloadToDelete.id));
                await AsyncStorage.setItem(
                  DOWNLOADS_STORAGE_KEY,
                  JSON.stringify(downloadedFiles.filter((d) => d.id !== downloadToDelete.id))
                );
              } catch (e) {
                console.error('Failed to delete download:', e);
                Alert.alert('Erreur', 'Impossible de supprimer le fichier.');
              }
            },
          },
        ]
      );
    },
    [downloadedFiles]
  );

  const handleOpenFile = useCallback(
    (download: DownloadedResourceMeta) => {
      router.push({
        pathname: '/pdf-viewer',
        params: { uri: download.localUri, title: download.title },
      });
    },
    [router]
  );

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchData().then(() => loadData());
  }, [fetchData, loadData]);

  // Prepare Data
  const favoriteResources = useMemo(() => {
    return resources.filter((resource) => favoriteIds.has(resource.id));
  }, [resources, favoriteIds]);

  // Render Item
  const renderItem = useCallback(
    ({ item, type }: { item: ResourceWithModule | DownloadedResourceMeta; type: 'favorite' | 'download' }) => {
      const resource = item as ResourceWithModule;
      const downloadMeta = type === 'download' ? (item as DownloadedResourceMeta) : null;
      const moduleName = downloadMeta?.moduleName || resource.module?.name || 'Module Inconnu';
      const resourceType = downloadMeta?.resourceType || resource.type || 'autre';

      // Determine icon based on resource type
      let iconName: string;
      switch (resourceType.toLowerCase()) {
        case 'cours':
          iconName = 'book';
          break;
        case 'td':
          iconName = 'pencil';
          break;
        case 'tp':
          iconName = 'flask';
          break;
        case 'examen':
          iconName = 'file-text';
          break;
        case 'compterendu':
          iconName = 'clipboard';
          break;
        case 'interrogation':
          iconName = 'question-circle';
          break;
        default:
          iconName = 'file';
      }

      return (
        <View style={styles.itemContainer}>
          <View style={styles.itemInfo}>
            <FontAwesome name={iconName} size={20} color={colors.tint} style={styles.itemIcon} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {resource.title || 'Titre Inconnu'}
              </Text>
              <Text style={styles.itemSubtitle}>{moduleName}</Text>
              {downloadMeta && (
                <Text style={styles.itemDate}>
                  Téléchargé : {new Date(downloadMeta.downloadedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.itemActions}>
            {type === 'favorite' && (
              <TouchableOpacity
                onPress={() => handleRemoveFavorite(resource.id)}
                style={styles.actionButton}
              >
                <Ionicons name="star" size={24} color={colors.tint} />
              </TouchableOpacity>
            )}
            {type === 'download' && downloadMeta && (
              <>
                <TouchableOpacity
                  onPress={() => handleOpenFile(downloadMeta)}
                  style={styles.actionButton}
                >
                  <Ionicons name="eye-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteDownload(downloadMeta)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={24} color={colors.danger} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      );
    },
    [colors, handleRemoveFavorite, handleDeleteDownload, handleOpenFile]
  );

  // Loading State
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.emptyStateContainer}>
        <Ionicons name="warning-outline" size={60} color={colors.danger} />
        <Text style={styles.errorText}>Erreur : {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main Render
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Favoris & Téléchargements',
          headerShown: true,
          headerStyle: { backgroundColor: colors.cardBackground },
          headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
          headerTintColor: colors.tint,
          headerRight: () => (
            <TouchableOpacity onPress={handleRetry} style={{ marginRight: 15 }}>
              <Ionicons name="refresh" size={24} color={colors.tint} />
            </TouchableOpacity>
          ),
        }}
      />

      {favoriteResources.length === 0 && downloadedFiles.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="star-outline" size={60} color={`${colors.textSecondary}80`} />
          <Text style={styles.emptyTextLarge}>Aucun favori ni téléchargement</Text>
          <Text style={styles.emptyTextSmall}>
            Ajoutez des favoris ou téléchargez des ressources depuis les modules.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Rafraîchir</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[
            ...(favoriteResources.length > 0
              ? [{ id: 'favorites-header', type: 'header', title: 'Mes Favoris' }]
              : []),
            ...favoriteResources.map((item) => ({ ...item, type: 'favorite' })),
            ...(downloadedFiles.length > 0
              ? [{ id: 'downloads-header', type: 'header', title: 'Mes Téléchargements' }]
              : []),
            ...downloadedFiles.map((item) => ({ ...item, type: 'download' })),
          ]}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{item.title}</Text>
                </View>
              );
            }
            return renderItem({ item, type: item.type as 'favorite' | 'download' });
          }}
          keyExtractor={(item) =>
            item.type === 'header' ? item.id : `${item.type}-${item.id}`
          }
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={<View style={{ height: 30 }} />}
        />
      )}
    </View>
  );
}

// Styles
const getFavoritesStyles = (
  colorScheme: 'light' | 'dark',
  colors: typeof Colors.light | typeof Colors.dark
) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContainer: {
      padding: 15,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.text,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
      backgroundColor: colors.background,
    },
    emptyTextLarge: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 10,
    },
    emptyTextSmall: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    errorText: {
      fontSize: 18,
      color: colors.danger,
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: colors.tint,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginTop: 10,
    },
    retryButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
    sectionHeader: {
      backgroundColor: colors.cardBackground,
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 12,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    itemContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    itemInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    itemIcon: {
      marginRight: 12,
    },
    itemTextContainer: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    itemSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    itemDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    itemActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 15,
    },
    actionButton: {
      padding: 8,
    },
  });
};

// Export with AuthGuard
export default AuthGuard(FavoritesScreenContent);