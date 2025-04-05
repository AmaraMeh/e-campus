// File: app/(tabs)/modules.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Platform,
  useColorScheme,
  StatusBar,
  Linking, // Import Linking for potential fallback
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeIn } from 'react-native-reanimated';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Adjust path if needed
// *** Import the hook to use the context ***
import { useResources, DownloadedResourceMeta } from '../contexts/ResourceContext'; // Adjust path if needed
// Assume Resource interface might be defined centrally or here if not
// import { Resource } from '../../constants/Data'; // Example path

const Tab = createMaterialTopTabNavigator();
const SPACING = 8; // Base spacing unit

// --- Interfaces --- (Ensure these align with your data structure)
interface Module {
  id: string;
  name: string;
  description?: string;
}

// Make sure this Resource interface is consistent across your app
interface Resource {
  id: string;
  title: string;
  url: string;
  type?: string; // e.g., 'cours', 'td', 'tp', 'examen'
  source?: string; // e.g., 'bejaia', 'tizi'
  moduleId: string;
}

interface ResourceListProps {
  route: {
    params: {
      resources: Resource[];
      moduleName: string;
      resourceType: string; // Friendly name for display
      isRefreshing: boolean;
      onRefresh: () => void;
      colors: ReturnType<typeof getColors>; // Pass typed colors
    };
  };
}

// --- Color Scheme ---
const baseColors = {
  blue: '#007AFF', // iOS System Blue
  lightGray: '#E5E5EA', // iOS Light Gray
  mediumGray: '#AEAEB2', // Adjusted medium gray
  darkGray: '#8E8E93', // iOS Dark Gray
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF3B30', // iOS System Red
  green: '#34C759', // iOS System Green
  yellow: '#FFCC00', // iOS System Yellow
  offWhite: '#F2F2F7', // iOS System Grouped Background Light
  nearBlack: '#1C1C1E', // iOS System Gray 6 Dark
  darkSurface: '#2C2C2E', // iOS System Gray 5 Dark
  hairline: Platform.select({ ios: '#C6C6C8', android: '#D1D1D6' }), // Platform-specific hairline
};

const getColors = (scheme: 'light' | 'dark') => {
  const isDark = scheme === 'dark';
  return {
    background: isDark ? baseColors.black : baseColors.offWhite,
    card: isDark ? baseColors.nearBlack : baseColors.white, // Used for list item background
    text: isDark ? baseColors.white : baseColors.black,
    secondary: isDark ? baseColors.mediumGray : baseColors.darkGray,
    accent: baseColors.blue,
    border: isDark ? baseColors.darkSurface : baseColors.lightGray,
    separator: isDark ? baseColors.darkSurface : (baseColors.hairline ?? baseColors.lightGray),
    danger: baseColors.red,
    success: baseColors.green,
    favorite: baseColors.yellow,
    tabInactive: isDark ? baseColors.darkGray : baseColors.mediumGray,
    tabBar: isDark ? baseColors.nearBlack : baseColors.white,
    headerBorder: isDark ? baseColors.darkSurface : (baseColors.hairline ?? baseColors.lightGray),
    chipBejaiaBg: baseColors.blue,
    chipBejaiaText: baseColors.white,
    chipOtherBg: isDark ? baseColors.darkSurface : baseColors.lightGray,
    chipOtherText: isDark ? baseColors.mediumGray : baseColors.darkGray,
    refreshControl: baseColors.blue,
    buttonText: baseColors.white,
    ripple: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };
};

// --- Resource Item Component ---
const ResourceItem: React.FC<{
  resource: Resource;
  colors: ReturnType<typeof getColors>;
  toggleFavorite: (id: string) => void;
  requestDownload: (resource: Resource, moduleName: string, resourceType: string) => void;
  isFavorite: (id: string) => boolean;
  getDownloadInfo: (id: string) => DownloadedResourceMeta | undefined;
  isDownloading: (id: string) => boolean;
  deleteDownload: (id: string) => void;
  moduleName: string;
  resourceType: string;
}> = React.memo(
  ({
    resource, colors, toggleFavorite, requestDownload, isFavorite,
    getDownloadInfo, isDownloading, deleteDownload, moduleName, resourceType,
  }) => {

    const handleViewOnline = useCallback(async () => {
      try {
        await WebBrowser.openBrowserAsync(resource.url);
      } catch (error) {
        console.error('Error opening web browser:', error);
        // Fallback to Linking if WebBrowser fails (less ideal UX)
        try {
            const supported = await Linking.canOpenURL(resource.url);
            if (supported) {
                await Linking.openURL(resource.url);
            } else {
                 Alert.alert('Erreur', 'Impossible d’ouvrir ce type de lien.');
            }
        } catch (linkError) {
             Alert.alert('Erreur', 'Impossible d’ouvrir le lien.');
        }
      }
    }, [resource.url]);

    const handleOpenOffline = useCallback(async (downloadInfo: DownloadedResourceMeta) => {
      if (!downloadInfo?.localUri) {
          Alert.alert('Erreur', 'Fichier local introuvable ou corrompu.');
          return;
      }
      try {
        if (!(await Sharing.isAvailableAsync())) {
          Alert.alert('Ouverture non supportée', "Impossible d'ouvrir ou partager des fichiers sur cet appareil.");
          return;
        }

        // Determine MIME type based on stored extension
        let mimeType: string | undefined;
        const extension = downloadInfo.fileExtension?.toLowerCase(); // Stored extension from context
        if (extension === '.pdf') {
            mimeType = 'application/pdf';
        } else if (extension === '.png') {
            mimeType = 'image/png';
        } else if (extension === '.jpg' || extension === '.jpeg') {
            mimeType = 'image/jpeg';
        } // Add more common types as needed: docx, xlsx, pptx etc.
          else if (extension === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (extension === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          else if (extension === '.pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';


        // UTI for iOS (helps suggest appropriate apps)
        let uti: string | undefined;
        if (extension === '.pdf') uti = 'com.adobe.pdf';
        else if (extension === '.png') uti = 'public.png';
        else if (extension === '.jpg' || extension === '.jpeg') uti = 'public.jpeg';
        // Add more UTIs if known

        console.log(`Attempting to share: URI=${downloadInfo.localUri}, MIME=${mimeType}, UTI=${uti}`);

        await Sharing.shareAsync(downloadInfo.localUri, {
          dialogTitle: `Ouvrir ou Partager "${downloadInfo.title}"`,
          mimeType,
          UTI: uti,
        });
      } catch (error: any) {
        console.error('Error sharing/opening file:', error);
        // Provide more specific error if possible
        let errorMessage = `Impossible d'ouvrir ou partager le fichier "${downloadInfo.title}".`;
        if (error.message && error.message.includes('No Activity found')) {
            errorMessage += " Aucune application n'est installée pour ouvrir ce type de fichier.";
        } else if (error instanceof Error) {
            errorMessage += ` ${error.message}`;
        }
        Alert.alert('Erreur d\'ouverture', errorMessage);
      }
    }, []); // Empty dependency array, relies on downloadInfo passed in

    const handleDownloadPress = useCallback(() => {
      const downloadInfo = getDownloadInfo(resource.id);
      if (downloadInfo) {
        // File is downloaded
        Alert.alert(
          `"${resource.title}"`, // Title
          `Fichier (${downloadInfo.fileExtension}) téléchargé et disponible hors ligne.`, // Message
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => deleteDownload(resource.id) },
            // Pass the retrieved downloadInfo which has the correct localUri and extension
            { text: `Ouvrir (${downloadInfo.fileExtension.toUpperCase()})`, onPress: () => handleOpenOffline(downloadInfo) },
          ],
          { cancelable: true }
        );
      } else if (!isDownloading(resource.id)) {
        // File not downloaded, confirm download
        Alert.alert(
            "Télécharger le Fichier",
            `Voulez-vous télécharger "${resource.title}"?`,
            [
                 { text: 'Annuler', style: 'cancel' },
                 // Trigger the download process via context
                 { text: 'Télécharger', onPress: () => requestDownload(resource, moduleName, resourceType) }
            ],
            { cancelable: true }
        );
      }
      // If isDownloading(resource.id) is true, the button is disabled, so no action needed here.
    }, [resource, moduleName, resourceType, getDownloadInfo, deleteDownload, handleOpenOffline, requestDownload, isDownloading]);

    const favorite = isFavorite(resource.id);
    const downloading = isDownloading(resource.id);
    const downloadInfo = getDownloadInfo(resource.id);
    const downloaded = !!downloadInfo;
    const activelyDownloading = downloading && !downloaded; // True only during the actual download process

    let downloadIconName: React.ComponentProps<typeof Ionicons>['name'] = 'cloud-download-outline';
    let downloadIconColor = colors.secondary;
    if (downloaded) {
      downloadIconName = 'checkmark-done-circle-outline'; // Clearer completed state icon
      downloadIconColor = colors.success;
    }

    const sourceStyle = resource.source === 'bejaia'
     ? { backgroundColor: colors.chipBejaiaBg, color: colors.chipBejaiaText }
     : { backgroundColor: colors.chipOtherBg, color: colors.chipOtherText };

    return (
      <Animated.View entering={FadeIn.duration(300)} style={[styles.resourceItemContainer, { backgroundColor: colors.card }]}>
          <View style={styles.resourceItem}>
              {/* Icon representing the resource type (document) */}
              <Ionicons name="document-text-outline" size={28} color={colors.accent} style={styles.resourceTypeIcon} />

              {/* Text Content */}
              <View style={styles.resourceTextContent}>
                  <Text style={[styles.resourceTitle, { color: colors.text }]} numberOfLines={2}>
                      {resource.title}
                  </Text>
                  {resource.source && (
                      <View style={[styles.sourceChip, { backgroundColor: sourceStyle.backgroundColor }]}>
                          <Text style={[styles.sourceChipText, { color: sourceStyle.color }]}>
                              {resource.source.charAt(0).toUpperCase() + resource.source.slice(1)}
                          </Text>
                      </View>
                  )}
              </View>

              {/* Action Buttons */}
              <View style={styles.resourceActions}>
                  {/* Favorite */}
                  <TouchableOpacity onPress={() => toggleFavorite(resource.id)} style={styles.actionButton} accessibilityLabel="Ajouter aux favoris">
                      <Ionicons name={favorite ? 'star' : 'star-outline'} size={24} color={favorite ? colors.favorite : colors.secondary} />
                  </TouchableOpacity>

                  {/* View Online */}
                  <TouchableOpacity onPress={handleViewOnline} style={styles.actionButton} accessibilityLabel="Voir en ligne">
                      <Ionicons name="open-outline" size={24} color={colors.accent} />
                  </TouchableOpacity>

                  {/* Download/Open */}
                  <TouchableOpacity
                      onPress={handleDownloadPress}
                      style={styles.actionButton}
                      disabled={activelyDownloading} // Disable only when actively downloading
                      accessibilityLabel={downloaded ? "Ouvrir le fichier téléchargé" : "Télécharger"}
                  >
                      {activelyDownloading ? (
                          <ActivityIndicator size="small" color={colors.accent} style={styles.actionIconSize} />
                      ) : (
                          <Ionicons name={downloadIconName} size={24} color={downloadIconColor} style={styles.actionIconSize} />
                      )}
                  </TouchableOpacity>
              </View>
          </View>
      </Animated.View>
    );
  }
);

// --- Resource List Component ---
const ResourceList: React.FC<ResourceListProps> = ({ route }) => {
    const { resources, moduleName, resourceType, isRefreshing, onRefresh, colors } = route.params;
    // *** Get functions from the context ***
    const { toggleFavorite, requestDownload, isFavorite, getDownloadInfo, isDownloading, deleteDownload } = useResources();

    // Memoize renderItem to prevent unnecessary re-renders of ResourceItem
    const renderItem = useCallback(({ item }: { item: Resource }) => (
        <ResourceItem
            resource={item}
            moduleName={moduleName}
            resourceType={resourceType} // Pass the friendly type name
            colors={colors}
            // Pass context functions down
            toggleFavorite={toggleFavorite}
            requestDownload={requestDownload}
            isFavorite={isFavorite}
            getDownloadInfo={getDownloadInfo}
            isDownloading={isDownloading}
            deleteDownload={deleteDownload}
        />
     // Add ALL props and context values used inside as dependencies
    ), [
        colors, moduleName, resourceType, // Props passed down
        toggleFavorite, requestDownload, isFavorite, getDownloadInfo, isDownloading, deleteDownload // Context functions
    ]);

    const ListEmptyComponent = useMemo(() => (
        <View style={[styles.emptyListContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="file-tray-outline" size={60} color={colors.secondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Aucune ressource ici</Text>
            <Text style={[styles.emptySubText, { color: colors.secondary }]}>
                Pas de {resourceType.toLowerCase()} disponible pour "{moduleName}" pour le moment.
            </Text>
        </View>
    ), [colors, resourceType, moduleName]); // Dependencies for empty state

    return (
        <FlatList
            data={resources}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContainer, resources.length === 0 && styles.listContainerEmpty]}
            ItemSeparatorComponent={() => <View style={[styles.itemSeparator, { backgroundColor: colors.separator }]} />}
            ListEmptyComponent={!isRefreshing ? ListEmptyComponent : null} // Show empty state only if not refreshing
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    colors={[colors.refreshControl]} // Android spinner color
                    tintColor={colors.refreshControl} // iOS spinner color
                />
            }
            // Performance optimizations
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={11} // Render 5 screens above/below viewport
        />
    );
};


// --- Main Module Detail Screen Component ---
export default function ModuleDetailScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  // *** Use context hook here as well if needed (e.g., for global loading state) ***
  const { isLoadingResources: isContextLoading, loadResourceData } = useResources();

  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoadingModule, setIsLoadingModule] = useState(true); // Specific loading state for this screen's data
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Function to fetch module details and its resources from Firestore
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!moduleId) {
        setFetchError("ID de module manquant.");
        setIsLoadingModule(false); // Stop loading if no ID
        setIsRefreshing(false);
        return;
      }
      if (!db) {
           setFetchError('Connexion base de données indisponible.');
           setIsLoadingModule(false);
           setIsRefreshing(false);
           return;
       }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoadingModule(true); // Use screen-specific loader
      }
      setFetchError(null); // Clear previous errors for this screen

      try {
        // Fetch Module Details
        console.log(`[ModuleDetailScreen] Fetching data for moduleId: ${moduleId}`);
        const moduleDocRef = doc(db, 'modules', moduleId);
        const moduleSnap = await getDoc(moduleDocRef);

        if (!moduleSnap.exists()) {
          throw new Error(`Module introuvable (ID: ${moduleId})`);
        }
        const fetchedModuleData = { id: moduleSnap.id, ...moduleSnap.data() } as Module;
        setModuleData(fetchedModuleData);
        console.log(`[ModuleDetailScreen] Fetched module: ${fetchedModuleData.name}`);

        // Fetch Resources for this Module
        const resourcesQuery = query(collection(db, 'resources'), where('moduleId', '==', moduleId));
        const resourcesSnapshot = await getDocs(resourcesQuery);
        const fetchedResources: Resource[] = resourcesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Resource, 'id'>),
        }));

        // Sort resources alphabetically by title (optional, can be done later)
        // fetchedResources.sort((a, b) => a.title.localeCompare(b.title));
        setResources(fetchedResources);
        console.log(`[ModuleDetailScreen] Fetched ${fetchedResources.length} resources for module ${moduleId}`);

      } catch (error: any) {
         console.error("[ModuleDetailScreen] Firebase Fetch Error:", error);
        setFetchError(error.message || "Erreur lors du chargement des données du module.");
        // Decide if you want to clear data on error, maybe only on initial load?
        if (!isRefresh) {
            setModuleData(null);
            setResources([]);
        }
      } finally {
        setIsLoadingModule(false); // Stop screen-specific loader
        setIsRefreshing(false);
      }
    },
    [moduleId] // Dependency: only re-create fetchData if moduleId changes
  );

  // Fetch data when the component mounts or moduleId changes
  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData is memoized by useCallback

  // Group resources by type, sorting within each group
  const resourcesByType = useMemo(() => {
    const grouped: { [type: string]: Resource[] } = {};
    resources.forEach((res) => {
      // Normalize type: lowercase, handle undefined/empty strings, trim spaces
      const type = (res.type || 'autres').toLowerCase().trim() || 'autres';
      grouped[type] = grouped[type] || [];
      grouped[type].push(res);
    });
    // Sort each group alphabetically by title after grouping
    Object.values(grouped).forEach(group => group.sort((a, b) => a.title.localeCompare(b.title)));
    return grouped;
  }, [resources]); // Re-group only when resources array changes

  // Define tab configuration
   const tabConfig = useMemo(
    () => [
        { key: 'cours', name: 'Cours', icon: 'book-outline' as const },
        { key: 'td', name: 'TD', icon: 'document-text-outline' as const },
        { key: 'tp', name: 'TP', icon: 'flask-outline' as const },
        { key: 'compterendu', name: 'Rapports', icon: 'clipboard-outline' as const }, // Example: compte rendu
        { key: 'interrogation', name: 'Interros', icon: 'help-circle-outline' as const }, // Example: interrogation
        { key: 'examen', name: 'Examens', icon: 'school-outline' as const },
        { key: 'autres', name: 'Autres', icon: 'ellipsis-horizontal-circle-outline' as const },
    ],
    [] // No dependencies, config is static
  );

  // Filter tabs to show only those that have corresponding resources
  const availableTabs = useMemo(() =>
    tabConfig.filter((tab) => resourcesByType[tab.key]?.length > 0)
  , [tabConfig, resourcesByType]); // Re-filter if config or grouped resources change

  // --- Render Logic ---

  // Show initial loading state (uses screen-specific loader)
  if (isLoadingModule && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.centeredScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.secondary }]}>Chargement du module...</Text>
      </SafeAreaView>
    );
  }

  // Show full error screen only if initial fetch failed completely
  if (fetchError && !moduleData && !resources.length) {
    return (
      <SafeAreaView style={[styles.centeredScreen, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={70} color={colors.danger} />
        <Text style={[styles.errorTitleText, { color: colors.danger }]}>Erreur de Chargement</Text>
        <Text style={[styles.errorSubText, { color: colors.secondary }]}>{fetchError}</Text>
        <Text style={[styles.errorSubText, { color: colors.secondary, marginTop: SPACING }]}>
          Vérifiez votre connexion ou réessayez.
        </Text>
        <TouchableOpacity
            onPress={() => fetchData()} // Retry fetch (not a refresh)
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            >
          <Ionicons name="refresh-outline" size={20} color={colors.buttonText} style={styles.buttonIcon} />
          <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Réessayer</Text>
        </TouchableOpacity>
         {/* Optional Back Button */}
         {router.canGoBack() && (
              <TouchableOpacity onPress={() => router.back()} style={[styles.retryButton, { backgroundColor: colors.accent, marginTop: SPACING * 1.5, opacity: 0.8 }]}>
                  <Ionicons name="arrow-back-outline" size={20} color={colors.buttonText} style={styles.buttonIcon} />
                  <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Retour</Text>
              </TouchableOpacity>
         )}
      </SafeAreaView>
    );
  }

  // Handle case where module ID was valid but module doesn't exist in DB (or fetch failed mildly)
  if (!moduleData) {
      // This case might be hit if fetch failed but wasn't the initial load, or module genuinely not found
      return (
           <SafeAreaView style={[styles.centeredScreen, { backgroundColor: colors.background }]}>
                <Ionicons name="help-buoy-outline" size={70} color={colors.secondary} />
                <Text style={[styles.errorTitleText, { color: colors.text }]}>Module Introuvable</Text>
                <Text style={[styles.errorSubText, { color: colors.secondary }]}>
                 L'identifiant du module ({moduleId}) semble incorrect ou le module n'existe pas.
                </Text>
                 {router.canGoBack() && (
                    <TouchableOpacity onPress={() => router.back()} style={[styles.retryButton, { backgroundColor: colors.accent, marginTop: SPACING * 3 }]}>
                        <Ionicons name="arrow-back-outline" size={20} color={colors.buttonText} style={styles.buttonIcon} />
                        <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Retour</Text>
                    </TouchableOpacity>
                 )}
            </SafeAreaView>
      );
  }


  // --- Main Screen Content (Module data loaded) ---
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Configure screen options, hide default header */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* Set status bar style based on theme */}
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Custom Header Area */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.header, { borderBottomColor: colors.headerBorder, backgroundColor: colors.background }]}>
        <Text style={[styles.moduleTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
          {moduleData.name} {/* Display module name */}
        </Text>
        {moduleData.description && (
          <Text style={[styles.moduleDescription, { color: colors.secondary }]} numberOfLines={2}>
            {moduleData.description} {/* Display description if available */}
          </Text>
        )}
         {/* Show subtle error indicator if refresh failed but content is visible */}
         {fetchError && isRefreshing && (
             <Text style={[styles.refreshErrorText, { color: colors.danger }]}>Erreur d'actualisation</Text>
         )}
      </Animated.View>

      {/* Top Tab Navigator or Empty State */}
      {availableTabs.length > 0 ? (
          <Tab.Navigator
            screenOptions={{
              tabBarLabelStyle: styles.tabLabel,
              tabBarStyle: [styles.tabBar, { backgroundColor: colors.tabBar, borderBottomColor: colors.headerBorder }],
              tabBarIndicatorStyle: [styles.tabIndicator, { backgroundColor: colors.accent }],
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.tabInactive,
              tabBarScrollEnabled: availableTabs.length > 4, // Enable scroll for 5+ tabs
              tabBarPressColor: colors.ripple, // Use theme ripple color for touch feedback
              tabBarIconStyle: styles.tabIconStyle,
              tabBarItemStyle: styles.tabItemStyle, // Apply styling to each tab item container
            }}
            sceneContainerStyle={{ backgroundColor: colors.background }} // Background for the content area below tabs
          >
            {/* Map through available tabs and create screens */}
            {availableTabs.map((tab) => (
              <Tab.Screen
                key={tab.key}
                name={tab.name} // User-friendly name for the tab route
                component={ResourceList}
                initialParams={{
                  // Pass the filtered & sorted resources for this tab
                  resources: resourcesByType[tab.key] || [],
                  moduleName: moduleData.name, // Pass module name for context
                  resourceType: tab.name, // Pass friendly type name for empty state messages
                  isRefreshing: isRefreshing, // Pass current refresh state down
                  onRefresh: () => fetchData(true), // Pass refresh handler (triggers fetchData with refresh flag)
                  colors: colors, // Pass color theme down
                }}
                options={{
                  tabBarIcon: ({ color, focused }) => (
                    // Display icon for the tab
                    <Ionicons
                        name={tab.icon}
                        size={focused ? 22 : 20} // Slightly larger icon when focused
                        color={color} // Color is handled by navigator (active/inactive tint)
                     />
                  ),
                }}
              />
            ))}
          </Tab.Navigator>
      ) : (
        // Show central empty state if NO resources exist AT ALL for this module after fetch
        <View style={[styles.fullScreenEmptyContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="file-tray-stacked-outline" size={70} color={colors.secondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Aucune Ressource</Text>
            <Text style={[styles.emptySubText, { color: colors.secondary }]}>
                Il n'y a pas encore de cours, TD, TP ou autres documents disponibles pour "{moduleData.name}".
            </Text>
             <TouchableOpacity
                onPress={() => fetchData(true)} // Allow refresh even when empty
                style={[styles.retryButton, { backgroundColor: colors.accent, marginTop: SPACING * 3 }]}
                disabled={isRefreshing} // Disable button while refresh is in progress
                >
                {isRefreshing ? (
                    // Show spinner inside button when refreshing
                    <ActivityIndicator size="small" color={colors.buttonText} style={styles.buttonIcon} />
                ) : (
                    // Show refresh icon otherwise
                    <Ionicons name="refresh-outline" size={20} color={colors.buttonText} style={styles.buttonIcon}/>
                )}
              <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Actualiser</Text>
            </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// --- Styles --- (Using consistent spacing and refined layout)
const styles = StyleSheet.create({
  // --- Container, Screen, Header, Error, Loading, Button Styles ---
  container: {
    flex: 1,
    // backgroundColor set dynamically
  },
  centeredScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING * 3,
    // backgroundColor set dynamically
  },
  header: {
    paddingTop: (StatusBar.currentHeight ?? 0) + SPACING * 1.5, // Adjust for status bar
    paddingBottom: SPACING * 2,
    paddingHorizontal: SPACING * 2.5,
    borderBottomWidth: StyleSheet.hairlineWidth, // Thin border
    // borderBottomColor, backgroundColor set dynamically
  },
  moduleTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: SPACING * 0.5,
    // color set dynamically
  },
  moduleDescription: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    // color set dynamically
  },
  refreshErrorText: {
      fontSize: 13,
      fontWeight: '500',
      marginTop: SPACING,
      textAlign: 'left', // Align with title/description
      // color set dynamically
  },
  loadingText: {
    marginTop: SPACING * 1.5,
    fontSize: 16,
    fontWeight: '500',
    // color set dynamically
  },
  errorTitleText: { // For full screen errors
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING * 2,
    marginBottom: SPACING,
    // color set dynamically
  },
  errorSubText: { // For full screen errors
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: SPACING,
    lineHeight: 21,
    maxWidth: '90%',
    // color set dynamically
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING * 1.25,
    paddingHorizontal: SPACING * 2.5,
    borderRadius: SPACING * 3, // Rounded corners
    minWidth: 140,
    marginTop: SPACING * 2,
    // backgroundColor set dynamically
    // Shadow/Elevation for button prominence
    shadowColor: baseColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    // color set dynamically (buttonText)
  },
  buttonIcon: {
      marginRight: SPACING, // Space between icon and text
  },
  // --- Tab Bar Styles ---
  tabBar: {
    elevation: 0, // Remove Android shadow
    shadowOpacity: 0, // Remove iOS shadow
    borderBottomWidth: StyleSheet.hairlineWidth,
    // backgroundColor, borderBottomColor set dynamically
  },
  tabItemStyle: {
      paddingHorizontal: SPACING, // Internal padding for each tab item
      minWidth: 80, // Ensure minimum width for touchability, especially when scrolling
      height: Platform.select({ios: 48, android: 50}), // Consistent height
      justifyContent: 'center',
      alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize', // e.g., 'Cours' not 'COURS'
    marginTop: SPACING * 0.5, // Space between icon and label
    marginBottom: Platform.OS === 'ios' ? 0 : 2,
    textAlign: 'center',
  },
  tabIndicator: {
    height: 3,
    borderRadius: 1.5,
    // backgroundColor set dynamically
  },
  tabIconStyle: {
     margin: 0, // Reset default margins
     padding: 0, // Reset default padding
     width: 24, // Fixed width for alignment
     height: 24, // Fixed height for alignment
     justifyContent: 'center',
     alignItems: 'center',
     marginTop: Platform.select({ios: SPACING * 0.5, android: SPACING}) // Adjust top margin for centering
  },
  // --- List Styles ---
  listContainer: {
    paddingBottom: SPACING * 10, // Ample space at the bottom for scrolling
    // Horizontal padding is handled by ResourceItem container
  },
  listContainerEmpty: {
      flexGrow: 1, // Ensure empty container fills space within the FlatList area
  },
  itemSeparator: {
    height: StyleSheet.hairlineWidth, // Use thin line separator
    marginHorizontal: SPACING * 2, // Indent separator from screen edges
    // backgroundColor set dynamically
  },
  // Empty state shown *within* a tab when it has no items
  emptyListContainer: {
    flexGrow: 1, // Takes available space in the tab view
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING * 4,
    minHeight: 200, // Ensure it doesn't collapse too small
    // backgroundColor set dynamically
  },
  // Empty state shown when NO tabs render (full screen below header)
  fullScreenEmptyContainer: {
    flex: 1, // Takes full remaining screen height below header
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING * 4,
    // backgroundColor set dynamically
  },
  emptyText: { // Used for both empty list and full empty screen
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING * 2,
    textAlign: 'center',
    // color set dynamically
  },
  emptySubText: { // Used for both empty list and full empty screen
    fontSize: 14,
    fontWeight: '400',
    marginTop: SPACING,
    textAlign: 'center',
    maxWidth: '85%',
    lineHeight: 20,
    // color set dynamically
  },
  // --- Resource Item Styles ---
  resourceItemContainer: { // Container for background
     // backgroundColor set dynamically (colors.card)
  },
  resourceItem: { // Inner container for content padding and layout
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING * 1.5, // Vertical padding inside item
    paddingHorizontal: SPACING * 2, // Horizontal padding inside item
    minHeight: 70, // Ensure consistent item height
  },
  resourceTypeIcon: { // Icon representing the file/resource type
    marginRight: SPACING * 2, // Space between icon and text
    width: 30, // Fixed width for alignment
    textAlign: 'center',
  },
  resourceTextContent: {
    flex: 1, // CRITICAL: Allows text to wrap and prevents pushing actions out
    justifyContent: 'center', // Center text block vertically if item grows tall
    marginRight: SPACING, // Space between text block and action buttons
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '500', // Medium weight title
    marginBottom: SPACING * 0.25, // Tighter space below title
    // color set dynamically
  },
  sourceChip: {
    alignSelf: 'flex-start', // Keep chip contained to its text size
    borderRadius: SPACING * 0.75, // Slightly rounded chip corners
    paddingVertical: SPACING * 0.25,
    paddingHorizontal: SPACING * 0.75,
    marginTop: SPACING * 0.5,
    // backgroundColor set dynamically
  },
  sourceChipText: {
     fontSize: 11,
     fontWeight: '600',
     // color set dynamically
  },
  resourceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Align action buttons to the right
  },
  actionButton: {
    padding: SPACING, // Clickable area padding
    marginLeft: SPACING, // Space between action buttons
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44, // Apple Human Interface Guideline minimum touch target
    minHeight: 44, // Apple Human Interface Guideline minimum touch target
  },
  actionIconSize: { // To wrap icon/spinner, ensures consistent layout space
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center'
  }
});