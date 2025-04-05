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
  SafeAreaView, // Use SafeAreaView for top/bottom padding
  StatusBar,
} from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons'; // Keep FontAwesome for diverse icons if needed
import * as Sharing from 'expo-sharing'; // Import Sharing
import { collection, getDocs, query, where, documentId } from 'firebase/firestore'; // Import query tools

// Adjust Paths
import { useColorScheme } from '../../hooks/useColorScheme'; // Assuming this hook provides 'light' | 'dark'
import { Resource, Module } from '../../constants/Data'; // Assuming these interfaces exist
import { db } from '../../firebaseConfig'; // Adjust path
import AuthGuard from '../auth-guard'; // Assuming this handles auth redirection
// *** Import the hook to use the Resource context ***
import { useResources, DownloadedResourceMeta } from '../contexts/ResourceContext'; // Adjust path

// Interface combining Resource with optional Module data
interface ResourceWithModule extends Resource {
  module?: Module; // Module details might be fetched separately
}

function FavoritesScreenContent() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme); // Use the same color fetching logic
  const styles = getFavoritesStyles(colorScheme, colors); // Generate styles based on theme
  const router = useRouter();

  // *** Get state and functions from ResourceContext ***
  const {
    favorites: favoriteIds, // Renaming for clarity within this component
    downloadedFilesInfo,
    isLoadingResources: isLoadingContextData, // Loading state from context
    toggleFavorite, // Use context action
    deleteDownload, // Use context action
    loadResourceData, // Function to potentially trigger context reload
    getDownloadInfo,
    isDownloading, // Might be useful for showing spinners on downloads if needed here
  } = useResources();

  // State for data fetched *specifically* for this screen (resource/module details)
  const [allResourcesDetails, setAllResourcesDetails] = useState<Map<string, ResourceWithModule>>(new Map());
  const [allModules, setAllModules] = useState<Map<string, Module>>(new Map());
  const [isFetchingDetails, setIsFetchingDetails] = useState(true); // Loading state for the details fetch
  const [fetchDetailsError, setFetchDetailsError] = useState<string | null>(null);

  // Fetch details (Resource + Module names) only for favorited items ONCE
  // This is more efficient than fetching ALL resources/modules every time
  const fetchDetailsForFavorites = useCallback(async () => {
    if (favoriteIds.size === 0) {
        // No favorites, no need to fetch details
        setAllResourcesDetails(new Map()); // Clear any previous details
        setAllModules(new Map());
        setIsFetchingDetails(false);
        setFetchDetailsError(null);
        return;
    }

    // Prevent fetching if already loading
    if (isFetchingDetails && allResourcesDetails.size > 0) return;

    console.log(`[FavoritesScreen] Fetching details for ${favoriteIds.size} favorite IDs...`);
    setIsFetchingDetails(true);
    setFetchDetailsError(null);

    try {
        // 1. Fetch Resource details for favorite IDs
        const favoriteIdArray = Array.from(favoriteIds);
        // Firestore 'in' query is limited (usually 10 or 30 items), chunk if necessary
        const MAX_IN_QUERY_SIZE = 30; // Firestore limit for 'in' queries
        let fetchedResourcesMap = new Map<string, ResourceWithModule>();
        const moduleIdsToFetch = new Set<string>();

        for (let i = 0; i < favoriteIdArray.length; i += MAX_IN_QUERY_SIZE) {
             const chunkIds = favoriteIdArray.slice(i, i + MAX_IN_QUERY_SIZE);
             if (chunkIds.length === 0) continue;

             const resourcesQuery = query(collection(db, 'resources'), where(documentId(), 'in', chunkIds));
             const resourcesSnapshot = await getDocs(resourcesQuery);
             resourcesSnapshot.docs.forEach(doc => {
                 const resData = { id: doc.id, ...doc.data() } as ResourceWithModule;
                 fetchedResourcesMap.set(doc.id, resData);
                 if (resData.moduleId) {
                     moduleIdsToFetch.add(resData.moduleId);
                 }
             });
        }
        console.log(`[FavoritesScreen] Fetched details for ${fetchedResourcesMap.size} resources.`);

        // 2. Fetch Module details for needed modules
        const moduleIdArray = Array.from(moduleIdsToFetch);
        let fetchedModulesMap = new Map<string, Module>();

         for (let i = 0; i < moduleIdArray.length; i += MAX_IN_QUERY_SIZE) {
             const chunkIds = moduleIdArray.slice(i, i + MAX_IN_QUERY_SIZE);
             if (chunkIds.length === 0) continue;

             // Avoid fetching modules we might already have
             const idsToFetchNow = chunkIds.filter(id => !allModules.has(id));
             if (idsToFetchNow.length === 0) continue;

             const modulesQuery = query(collection(db, 'modules'), where(documentId(), 'in', idsToFetchNow));
             const modulesSnapshot = await getDocs(modulesQuery);
             modulesSnapshot.docs.forEach(doc => {
                 fetchedModulesMap.set(doc.id, { id: doc.id, ...doc.data() } as Module);
             });
         }
         console.log(`[FavoritesScreen] Fetched details for ${fetchedModulesMap.size} new modules.`);

        // 3. Combine fetched resources with module details
        fetchedResourcesMap.forEach(res => {
             if (res.moduleId) {
                 res.module = fetchedModulesMap.get(res.moduleId) ?? allModules.get(res.moduleId); // Use newly fetched or existing
             }
         });

        // 4. Update state
         setAllResourcesDetails(prev => new Map([...prev, ...fetchedResourcesMap])); // Merge with potentially existing details
         setAllModules(prev => new Map([...prev, ...fetchedModulesMap])); // Merge with potentially existing modules

    } catch (err: any) {
      console.error('[FavoritesScreen] Error fetching details:', err);
      setFetchDetailsError(err.message || 'Erreur lors du chargement des détails.');
    } finally {
      setIsFetchingDetails(false);
    }
  }, [favoriteIds, allModules]); // Re-fetch details if the set of favorite IDs changes

  // Fetch details when favorite IDs load or change
  useEffect(() => {
    if (!isLoadingContextData) { // Fetch details only after context (and fav IDs) has loaded
        fetchDetailsForFavorites();
    }
  }, [favoriteIds, isLoadingContextData, fetchDetailsForFavorites]);

  // Optional: Reload details on focus if needed (might be excessive)
  // useFocusEffect(
  //   useCallback(() => {
  //     console.log("[FavoritesScreen] Focus effect - Refreshing details if needed");
  //     // Re-fetch details only if favorites exist and details seem stale or missing
  //     if (favoriteIds.size > 0 && (!isFetchingDetails)) {
  //        // Maybe add a check here to see if all favorite IDs have details already?
  //        fetchDetailsForFavorites();
  //     }
  //   }, [favoriteIds, isFetchingDetails, fetchDetailsForFavorites])
  // );

  // --- Actions ---

  // Remove Favorite (Uses Context)
  const handleRemoveFavorite = useCallback(
    (resourceId: string) => {
        // Optimistically update UI? Or wait for context? Let's just call context.
        toggleFavorite(resourceId);
        // Optionally remove details from local state if you want instant UI feedback before context update propagates
        // setAllResourcesDetails(prev => {
        //     const newMap = new Map(prev);
        //     newMap.delete(resourceId);
        //     return newMap;
        // })
    },
    [toggleFavorite]
  );

  // Delete Download (Uses Context)
  const handleDeleteDownload = useCallback(
    (resourceId: string) => {
      const downloadInfo = getDownloadInfo(resourceId); // Get info from context
      if (!downloadInfo) return; // Should not happen if button is shown

      Alert.alert(
        'Supprimer le Téléchargement?',
        `"${downloadInfo.title}" (${downloadInfo.fileExtension}) sera supprimé de votre appareil.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => {
              deleteDownload(resourceId); // Call context action
            },
          },
        ],
        { cancelable: true }
      );
    },
    [deleteDownload, getDownloadInfo] // Depend on context functions
  );

  // Open File (Uses Sharing) - Adapted from modules.tsx
   const handleOpenFile = useCallback(async (downloadInfo: DownloadedResourceMeta) => {
      if (!downloadInfo?.localUri) {
          Alert.alert('Erreur', 'Fichier local introuvable.'); return;
      }
      try {
          if (!(await Sharing.isAvailableAsync())) {
               Alert.alert('Ouverture non supportée', "Impossible d'ouvrir ou partager."); return;
          }
          let mimeType: string | undefined;
          const extension = downloadInfo.fileExtension?.toLowerCase();
          if (extension === '.pdf') mimeType = 'application/pdf';
          else if (extension === '.png') mimeType = 'image/png';
          else if (extension === '.jpg' || extension === '.jpeg') mimeType = 'image/jpeg';
          else if (extension === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (extension === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          else if (extension === '.pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

          let uti: string | undefined;
          if (extension === '.pdf') uti = 'com.adobe.pdf';
          else if (extension === '.png') uti = 'public.png';
          else if (extension === '.jpg' || extension === '.jpeg') uti = 'public.jpeg';

          console.log(`Sharing: URI=${downloadInfo.localUri}, MIME=${mimeType}, UTI=${uti}`);
          await Sharing.shareAsync(downloadInfo.localUri, { dialogTitle: `Ouvrir/Partager "${downloadInfo.title}"`, mimeType, UTI: uti });
       } catch (error: any) {
           console.error('Error sharing/opening file:', error);
           let errorMessage = `Impossible d'ouvrir/partager "${downloadInfo.title}".`;
           if (error.message?.includes('No Activity found')) errorMessage += " Aucune application installée pour ce type.";
           else if (error instanceof Error) errorMessage += ` ${error.message}`;
           Alert.alert('Erreur d\'ouverture', errorMessage);
       }
   }, []); // No external dependencies needed

  // Retry Fetching Details
  const handleRetryDetails = useCallback(() => {
    fetchDetailsForFavorites();
  }, [fetchDetailsForFavorites]);

  // --- Prepare Data for Rendering ---
  const favoriteResourcesWithDetails = useMemo(() => {
    // Map favorite IDs to the details we have fetched
    return Array.from(favoriteIds)
            .map(id => allResourcesDetails.get(id))
            .filter((res): res is ResourceWithModule => !!res); // Filter out any undefined results (if details fetch failed for some)
            // Add sorting if desired e.g., .sort((a, b) => a.title.localeCompare(b.title));
  }, [favoriteIds, allResourcesDetails]);

  const downloadedFilesArray = useMemo(() => {
      // Convert the map from context into an array for the FlatList
      return Array.from(downloadedFilesInfo.values());
      // Add sorting if desired e.g., .sort((a, b) => a.downloadedAt - b.downloadedAt);
  }, [downloadedFilesInfo]);


  // --- Render Item ---
  const renderItem = useCallback(
    ({ item, type }: { item: ResourceWithModule | DownloadedResourceMeta; type: 'favorite' | 'download' }) => {
      const isFavoriteItem = type === 'favorite';
      const resourceDetail = isFavoriteItem ? (item as ResourceWithModule) : null;
      const downloadMeta = type === 'download' ? (item as DownloadedResourceMeta) : null;

      // Get data preferentially from downloadMeta if available, otherwise from resourceDetail
      const displayTitle = downloadMeta?.title || resourceDetail?.title || 'Titre Inconnu';
      const resourceId = downloadMeta?.id || resourceDetail?.id;
      const moduleName = downloadMeta?.moduleName || resourceDetail?.module?.name || 'Module Inconnu';
      const resourceType = downloadMeta?.resourceType || resourceDetail?.type || 'autre';
      const fileExtension = downloadMeta?.fileExtension; // Only available for downloads

      if (!resourceId) return null; // Should not happen if data is clean

      // Determine icon based on resource type
      let iconName: string; // Use string for FontAwesome name prop
      switch (resourceType.toLowerCase()) {
        case 'cours': iconName = 'book'; break;
        case 'td': iconName = 'pencil'; break;
        case 'tp': iconName = 'flask'; break;
        case 'examen': iconName = 'file-text'; break; // Or graduation-cap?
        case 'compterendu': iconName = 'clipboard'; break;
        case 'interrogation': iconName = 'question-circle'; break;
        default: iconName = 'file'; break;
      }

      return (
        <View style={styles.itemContainer}>
          {/* Info Section */}
          <View style={styles.itemInfo}>
            <FontAwesome name={iconName as any} size={24} color={colors.accent} style={styles.itemIcon} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {displayTitle}
              </Text>
              <Text style={styles.itemSubtitle}>{moduleName}</Text>
              {downloadMeta && (
                <Text style={styles.itemDate}>
                  Téléchargé {new Date(downloadMeta.downloadedAt).toLocaleDateString()} ({fileExtension})
                </Text>
              )}
            </View>
          </View>

          {/* Actions Section */}
          <View style={styles.itemActions}>
            {isFavoriteItem && (
              <TouchableOpacity
                onPress={() => handleRemoveFavorite(resourceId)}
                style={styles.actionButton}
                accessibilityLabel="Retirer des favoris"
              >
                {/* Show filled star for favorites */}
                <Ionicons name="star" size={24} color={colors.favorite} />
              </TouchableOpacity>
            )}
            {downloadMeta && (
              <>
                {/* Open Button */}
                <TouchableOpacity
                  onPress={() => handleOpenFile(downloadMeta)}
                  style={styles.actionButton}
                  accessibilityLabel="Ouvrir le fichier"
                >
                  <Ionicons name="document-outline" size={24} color={colors.text} />
                </TouchableOpacity>
                {/* Delete Button */}
                <TouchableOpacity
                  onPress={() => handleDeleteDownload(resourceId)}
                  style={styles.actionButton}
                   accessibilityLabel="Supprimer le téléchargement"
               >
                  <Ionicons name="trash-outline" size={24} color={colors.danger} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      );
    },
    [colors, handleRemoveFavorite, handleDeleteDownload, handleOpenFile, styles] // Dependencies for renderItem
  );

  // --- Loading State ---
  // Show loading if context is loading OR if fetching details for favorites
  if (isLoadingContextData || (isFetchingDetails && favoriteIds.size > 0 && favoriteResourcesWithDetails.length === 0)) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
         <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.secondary }]}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  // --- Error State ---
  // Show error if fetching details failed (context errors might be handled globally)
  if (fetchDetailsError) {
    return (
      <SafeAreaView style={[styles.emptyStateContainer, { backgroundColor: colors.background }]}>
         <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <Ionicons name="warning-outline" size={60} color={colors.danger} />
        <Text style={styles.errorText}>Erreur : {fetchDetailsError}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={handleRetryDetails}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Main Render ---
  const combinedData = [
       ...(favoriteResourcesWithDetails.length > 0
          ? [{ id: 'fav-header', type: 'header', title: 'Mes Favoris' } as const] // Header object
          : []),
       ...favoriteResourcesWithDetails.map((item) => ({ ...item, type: 'favorite' as const })), // Mark as favorite type
       ...(downloadedFilesArray.length > 0
          ? [{ id: 'dl-header', type: 'header', title: 'Mes Téléchargements' } as const] // Header object
          : []),
       ...downloadedFilesArray.map((item) => ({ ...item, type: 'download' as const })), // Mark as download type
    ];


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Stack.Screen
        options={{
          headerTitle: 'Favoris & Téléchargements',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card }, // Match card background
          headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
          headerTintColor: colors.accent, // Color for back button, etc.
          headerShadowVisible: false, // Cleaner look
          headerBorderWidth: StyleSheet.hairlineWidth,
          headerBorderColor: colors.separator,
          // Optional: Add a refresh button for the details fetch
          // headerRight: () => (
          //   <TouchableOpacity onPress={handleRetryDetails} style={{ marginRight: 15 }}>
          //     <Ionicons name="refresh" size={24} color={colors.accent} />
          //   </TouchableOpacity>
          // ),
        }}
      />

      {combinedData.length === 0 ? ( // Check combined length (excluding potential headers if logic was different)
        <View style={styles.emptyStateContainer}>
          <Ionicons name="star-outline" size={60} color={colors.secondary} />
          <Text style={styles.emptyTextLarge}>Aucun favori ni téléchargement</Text>
          <Text style={styles.emptyTextSmall}>
            Marquez des ressources comme favorites ou téléchargez-les depuis les modules.
          </Text>
          {/* Optional: Button to navigate somewhere */}
           <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={() => router.push('/(tabs)/')}>
               <Text style={styles.retryButtonText}>Explorer les Modules</Text>
           </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={combinedData}
          renderItem={({ item }) => {
            // Render header items
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{item.title}</Text>
                </View>
              );
            }
            // Render favorite or download items
            return renderItem({ item, type: item.type });
          }}
          keyExtractor={(item) => `${item.type}-${item.id}`} // Unique key combining type and ID
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />} // Optional separator between items
          ListFooterComponent={<View style={{ height: 30 }} />} // Space at the bottom
        />
      )}
    </SafeAreaView>
  );
}

// Define SPACING here, before styles are used
const SPACING = 8;

// Base colors and getColors function needed here too
const baseColorsFavorites = { /* ... copy from modules.tsx ... */
  blue: '#007AFF', lightGray: '#E5E5EA', mediumGray: '#AEAEB2', darkGray: '#8E8E93',
  black: '#000000', white: '#FFFFFF', red: '#FF3B30', green: '#34C759',
  yellow: '#FFCC00', offWhite: '#F2F2F7', nearBlack: '#1C1C1E', darkSurface: '#2C2C2E',
  hairline: Platform.select({ ios: '#C6C6C8', android: '#D1D1D6' }),
};
const getColorsFavorites = (scheme: 'light' | 'dark') => { /* ... copy from modules.tsx ... */
   const isDark = scheme === 'dark';
   return {
     background: isDark ? baseColorsFavorites.black : baseColorsFavorites.offWhite,
     card: isDark ? baseColorsFavorites.nearBlack : baseColorsFavorites.white,
     text: isDark ? baseColorsFavorites.white : baseColorsFavorites.black,
     secondary: isDark ? baseColorsFavorites.mediumGray : baseColorsFavorites.darkGray,
     accent: baseColorsFavorites.blue,
     border: isDark ? baseColorsFavorites.darkSurface : (baseColorsFavorites.hairline ?? baseColorsFavorites.lightGray),
     separator: isDark ? baseColorsFavorites.darkSurface : (baseColorsFavorites.hairline ?? baseColorsFavorites.lightGray),
     danger: baseColorsFavorites.red,
     success: baseColorsFavorites.green,
     favorite: baseColorsFavorites.yellow, // Use favorite color
     // Add other needed colors if getFavoritesStyles uses them
     buttonText: baseColorsFavorites.white,
   };
};
// Redefine getColors locally or import from a central theme file
const getColors = getColorsFavorites;

// --- Styles --- (Adapted to use common color names)
const getFavoritesStyles = (
  colorScheme: 'light' | 'dark',
  colors: ReturnType<typeof getColors> // Use the same color type
) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      // backgroundColor set dynamically
    },
    listContainer: {
      paddingVertical: SPACING * 2,
      paddingHorizontal: SPACING * 1.5, // Slightly less horizontal padding for list
    },
    listSeparator: {
        height: SPACING * 1.5, // Space between items
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      // backgroundColor set dynamically
      padding: 20,
    },
    loadingText: {
      marginTop: SPACING * 1.5,
      fontSize: 16,
      // color set dynamically
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING * 4,
      // backgroundColor set dynamically
      textAlign: 'center',
    },
    emptyTextLarge: {
      fontSize: 20,
      fontWeight: '600',
      // color set dynamically
      textAlign: 'center',
      marginTop: SPACING * 2.5,
      marginBottom: SPACING,
    },
    emptyTextSmall: {
      fontSize: 14,
      // color set dynamically (secondary)
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: SPACING * 2.5,
    },
    errorText: {
      fontSize: 18,
      fontWeight: '600',
      // color set dynamically (danger)
      textAlign: 'center',
      marginTop: SPACING * 2,
      marginBottom: SPACING * 2,
    },
    retryButton: { // Re-use button style from modules.tsx
       flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
       paddingVertical: SPACING * 1.25, paddingHorizontal: SPACING * 2.5,
       borderRadius: SPACING * 3, minWidth: 140, marginTop: SPACING, // Reduced top margin
       // backgroundColor set dynamically (accent)
       shadowColor: baseColorsFavorites.black, shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
    },
    retryButtonText: { // Re-use button text style
      fontSize: 16, fontWeight: '600', textAlign: 'center',
      color: colors.buttonText, // Use buttonText color
    },
    sectionHeader: {
      // backgroundColor: colors.background, // Make header blend more? Or use card?
      paddingVertical: SPACING * 1.5,
      paddingHorizontal: SPACING * 0.5, // Less horizontal padding for header
      marginBottom: SPACING * 1.5,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold', // Bold section titles
      color: colors.text,
    },
    itemContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card, // Use card background for items
      borderRadius: 12,
      paddingHorizontal: SPACING * 1.5,
      paddingVertical: SPACING * 1.5,
      // Add subtle shadow/elevation like ResourceItem
       shadowColor: baseColorsFavorites.black,
       shadowOffset: { width: 0, height: 1 },
       shadowOpacity: colorScheme === 'light' ? 0.08 : 0.15, // Adjust opacity for dark/light
       shadowRadius: 3,
       elevation: 2,
    },
    itemInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1, // Allow info to take available space
      marginRight: SPACING, // Space before actions
    },
    itemIcon: {
      marginRight: SPACING * 1.5, // Space next to icon
       width: 28, // Consistent width for icon area
       textAlign: 'center',
    },
    itemTextContainer: {
      flex: 1, // Allow text to wrap
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: '600', // Slightly bolder title
      color: colors.text,
      marginBottom: SPACING * 0.25,
    },
    itemSubtitle: {
      fontSize: 14,
      color: colors.secondary,
      marginTop: SPACING * 0.25,
    },
    itemDate: { // Style for download date/extension
      fontSize: 12,
      color: colors.secondary,
      marginTop: SPACING * 0.5,
    },
    itemActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING, // Use gap for spacing between action buttons
    },
    actionButton: { // Re-use action button style
      padding: SPACING,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 40, // Minimum touch target
      minHeight: 40,
    },
  });
};


// Export the component wrapped in the AuthGuard HOC
export default AuthGuard(FavoritesScreenContent);