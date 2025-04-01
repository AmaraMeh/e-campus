// File: app/module/[moduleId].tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

// Adjust Paths (Update these based on your project structure)
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Module, Resource } from '../../constants/Data';
import { useAuth } from '../contexts/AuthContext';
import { useResources, DownloadedResourceMeta } from '../contexts/ResourceContext';
import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const Tab = createMaterialTopTabNavigator();
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Interfaces ---
interface ResourceListParams {
  resources: Resource[];
  moduleName: string;
  resourceType: string;
}

interface ResourceListProps {
  route: { params: ResourceListParams };
}

// --- Resource Item Component ---
const ResourceItem: React.FC<{
  resource: Resource;
  moduleName: string;
  resourceType: string;
  styles: ReturnType<typeof createStyles>;
  colors: typeof Colors.light;
  toggleFavorite: (id: string) => void;
  requestDownload: (resource: Resource, moduleName: string, resourceType: string) => void;
  isFavorite: (id: string) => boolean;
  getDownloadInfo: (id: string) => DownloadedResourceMeta | undefined;
  isDownloading: (id: string) => boolean;
  deleteDownload: (id: string) => void;
}> = React.memo(
  ({
    resource,
    moduleName,
    resourceType,
    styles,
    colors,
    toggleFavorite,
    requestDownload,
    isFavorite,
    getDownloadInfo,
    isDownloading,
    deleteDownload,
  }) => {
    const handleViewOnline = useCallback(async () => {
      try {
        await WebBrowser.openBrowserAsync(resource.url);
      } catch (error) {
        console.error('Failed to open URL:', error);
        Alert.alert('Erreur', "Impossible d'ouvrir le lien.");
      }
    }, [resource.url]);

    const handleOpenOffline = useCallback(async (downloadInfo: DownloadedResourceMeta) => {
      try {
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error("Le partage n'est pas disponible.");
        }
        await Sharing.shareAsync(downloadInfo.localUri, {
          dialogTitle: `Partager "${downloadInfo.title}"`,
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } catch (error) {
        console.error('Sharing Error:', error);
        Alert.alert('Erreur', "Impossible d'ouvrir le fichier.");
      }
    }, []);

    const handleDownloadPress = useCallback(() => {
      const downloadInfo = getDownloadInfo(resource.id);
      if (downloadInfo) {
        Alert.alert(
          `"${resource.title}"`,
          'Ce fichier est déjà téléchargé.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => deleteDownload(resource.id) },
            { text: 'Ouvrir', onPress: () => handleOpenOffline(downloadInfo) },
          ],
          { cancelable: true }
        );
      } else {
        requestDownload(resource, moduleName, resourceType);
      }
    }, [
      resource,
      moduleName,
      resourceType,
      getDownloadInfo,
      deleteDownload,
      handleOpenOffline,
      requestDownload,
    ]);

    const favorite = isFavorite(resource.id);
    const downloading = isDownloading(resource.id);
    const downloadInfo = getDownloadInfo(resource.id);
    const downloaded = !!downloadInfo;

    const downloadIcon = downloading
      ? 'hourglass-outline'
      : downloaded
      ? 'checkmark-circle'
      : 'cloud-download-outline';
    const downloadColor = downloading
      ? colors.tint
      : downloaded
      ? colors.success ?? '#16a34a'
      : styles.actionIconColor.color;

    return (
      <View style={styles.resourceItem} accessible accessibilityLabel={resource.title}>
        <View style={styles.resourceInfo}>
          <FontAwesome
            name="file-text-o"
            size={styles.iconSize}
            color={styles.actionIconColor.color}
            style={styles.resourceIcon}
          />
          <View style={styles.resourceTextContainer}>
            <Text style={styles.resourceTitle} numberOfLines={2} ellipsizeMode="tail">
              {resource.title}
            </Text>
            {resource.source && (
              <Text
                style={styles.sourceChip(resource.source === 'bejaia')}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {resource.source.charAt(0).toUpperCase() + resource.source.slice(1)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.resourceActions}>
          <TouchableOpacity
            onPress={() => toggleFavorite(resource.id)}
            style={styles.actionButton}
            accessibilityLabel={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Ionicons
              name={favorite ? 'star' : 'star-outline'}
              size={styles.iconSize}
              color={favorite ? colors.tint : styles.actionIconColor.color}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleViewOnline}
            style={styles.actionButton}
            accessibilityLabel="Voir en ligne"
          >
            <Ionicons name="cloud-outline" size={styles.iconSize} color={styles.actionIconColor.color} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDownloadPress}
            style={[styles.actionButton, downloading && styles.actionButtonDisabled]}
            disabled={downloading}
            accessibilityLabel={downloading ? 'Téléchargement en cours' : downloaded ? 'Ouvrir' : 'Télécharger'}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Ionicons name={downloadIcon} size={styles.iconSize} color={downloadColor} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

// --- Resource List Component ---
const ResourceList: React.FC<ResourceListProps> = ({ route }) => {
  const { resources, moduleName, resourceType } = route.params;
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => createStyles(colorScheme, colors), [colorScheme]);
  const { toggleFavorite, requestDownload, isFavorite, getDownloadInfo, isDownloading, deleteDownload } =
    useResources();

  if (!resources?.length) {
    return (
      <View style={styles.emptyTabView}>
        <Text style={styles.noResourcesText}>Aucune ressource disponible.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={resources}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ResourceItem
          resource={item}
          moduleName={moduleName}
          resourceType={resourceType}
          styles={styles}
          colors={colors}
          toggleFavorite={toggleFavorite}
          requestDownload={requestDownload}
          isFavorite={isFavorite}
          getDownloadInfo={getDownloadInfo}
          isDownloading={isDownloading}
          deleteDownload={deleteDownload}
        />
      )}
      contentContainerStyle={styles.listContainer}
      ItemSeparatorComponent={() => <View style={{ height: styles.basePadding / 2 }} />}
      ListFooterComponent={<View style={{ height: styles.basePadding }} />}
    />
  );
};

// --- Main Module Detail Screen ---
export default function ModuleDetailScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => createStyles(colorScheme, colors), [colorScheme]);
  const { currentUser } = useAuth();

  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!moduleId || !db) {
        setFetchError('ID du module invalide ou base de données indisponible.');
        setIsLoading(false);
        return;
      }
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setFetchError(null);

      try {
        // Fetch Module Details
        const moduleDocRef = doc(db, 'modules', moduleId);
        const moduleSnap = await getDoc(moduleDocRef);
        if (!moduleSnap.exists()) {
          throw new Error(`Aucun module trouvé pour l'ID: ${moduleId}`);
        }
        const fetchedModuleData = { id: moduleSnap.id, ...moduleSnap.data() } as Module;
        setModuleData(fetchedModuleData);

        // Fetch Resources
        const resourcesQuery = query(collection(db, 'resources'), where('moduleId', '==', moduleId));
        const resourcesSnapshot = await getDocs(resourcesQuery);
        const fetchedResources: Resource[] = resourcesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Resource[];
        setResources(fetchedResources);
      } catch (error: any) {
        console.error('[ModuleDetailScreen] Fetch error:', error);
        setFetchError(error.message || 'Échec du chargement des données.');
        setModuleData(null);
        setResources([]);
      } finally {
        setIsLoading(false);
        if (isRefresh) setIsRefreshing(false);
      }
    },
    [moduleId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resourcesByType = useMemo(() => {
    const grouped: { [type: string]: Resource[] } = {};
    resources.forEach((res) => {
      const type = res.type?.toLowerCase() || 'autres';
      grouped[type] = grouped[type] || [];
      grouped[type].push(res);
    });
    Object.keys(grouped).forEach((type) => {
      grouped[type].sort((a, b) => a.title.localeCompare(b.title));
    });
    return grouped;
  }, [resources]);

  const tabConfig = useMemo(
    () => [
      { key: 'cours', name: 'Cours', icon: 'book-outline' },
      { key: 'td', name: 'TD', icon: 'document-text-outline' },
      { key: 'tp', name: 'TP', icon: 'flask-outline' },
      { key: 'compterendu', name: 'CR', icon: 'clipboard-outline' },
      { key: 'interrogation', name: 'Interro', icon: 'help-circle-outline' },
      { key: 'examen', name: 'Examen', icon: 'school-outline' },
      { key: 'autres', name: 'Autres', icon: 'ellipsis-horizontal-outline' },
    ],
    []
  );
  const availableTabs = tabConfig.filter((tab) => resourcesByType[tab.key]?.length > 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (fetchError || !moduleData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={styles.iconSize * 2} color={colors.danger} />
        <Text style={styles.errorText}>{fetchError || `Module non trouvé: ${moduleId}`}</Text>
        <TouchableOpacity onPress={() => fetchData()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: moduleData.name || moduleId,
          headerStyle: { backgroundColor: colors.cardBackground },
          headerTitleStyle: { color: colors.text, fontSize: styles.baseFontSize },
          headerTintColor: colors.tint,
        }}
      />
      {availableTabs.length > 0 ? (
        <Tab.Navigator
          screenOptions={{
            tabBarLabelStyle: styles.tabLabel,
            tabBarItemStyle: styles.tabItem,
            tabBarStyle: { backgroundColor: colors.cardBackground, elevation: 0, shadowOpacity: 0 },
            tabBarIndicatorStyle: { backgroundColor: colors.tint, height: 3 },
            tabBarActiveTintColor: colors.tint,
            tabBarInactiveTintColor: colors.textSecondary,
            swipeEnabled: Platform.OS !== 'android', // Disable swipe on Android for better performance
            tabBarScrollEnabled: availableTabs.length > 3,
          }}
          sceneContainerStyle={{ backgroundColor: colors.background }}
        >
          {availableTabs.map((tab) => (
            <Tab.Screen
              key={tab.key}
              name={tab.name}
              component={ResourceList}
              initialParams={{
                resources: resourcesByType[tab.key] || [],
                moduleName: moduleData.name || moduleId,
                resourceType: tab.key,
              }}
              options={{
                tabBarIcon: ({ color }) => (
                  <Ionicons name={tab.icon} size={styles.iconSize * 0.8} color={color} />
                ),
              }}
            />
          ))}
        </Tab.Navigator>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Aucune ressource pour ce module.</Text>
          <Text style={styles.soonText}>Vérifiez bientôt !</Text>
        </View>
      )}
      <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={colors.tint} />
    </View>
  );
}

// --- Styles ---
const createStyles = (
  colorScheme: 'light' | 'dark',
  colors: typeof Colors.light | typeof Colors.dark
) => {
  const baseFontSize = SCREEN_WIDTH / 22;
  const basePadding = SCREEN_WIDTH / 25;
  const isSmallScreen = SCREEN_WIDTH < 360;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: basePadding,
    },
    loadingText: {
      marginTop: basePadding,
      fontSize: baseFontSize * 0.9,
      color: colors.textSecondary,
    },
    errorText: {
      color: colors.danger ?? '#dc2626',
      fontSize: baseFontSize,
      textAlign: 'center',
      marginBottom: basePadding / 2,
    },
    retryButton: {
      marginTop: basePadding,
      backgroundColor: colors.tint,
      paddingVertical: basePadding / 2,
      paddingHorizontal: basePadding,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: baseFontSize * 0.9,
    },
    soonText: {
      color: colors.textSecondary,
      fontSize: baseFontSize * 0.8,
      textAlign: 'center',
      marginTop: basePadding / 2,
    },
    tabLabel: {
      fontSize: isSmallScreen ? baseFontSize * 0.65 : baseFontSize * 0.75,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    tabItem: {
      height: 50,
      justifyContent: 'center',
      width: 'auto',
      paddingHorizontal: basePadding / 2,
    },
    listContainer: { padding: basePadding, paddingBottom: basePadding * 2 },
    emptyTabView: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: basePadding,
      minHeight: SCREEN_HEIGHT * 0.3,
    },
    resourceItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: basePadding / 1.5,
      paddingHorizontal: basePadding,
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.tint + '80',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 3,
    },
    resourceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: basePadding },
    resourceIcon: { marginRight: basePadding / 2, width: basePadding, textAlign: 'center' },
    resourceTextContainer: { flex: 1 },
    resourceTitle: {
      fontSize: baseFontSize * 0.85,
      color: colors.text,
      fontWeight: '500',
    },
    sourceChip: (isBejaia: boolean) => ({
      fontSize: baseFontSize * 0.6,
      fontWeight: 'bold',
      paddingVertical: 3,
      paddingHorizontal: basePadding / 2,
      borderRadius: 12,
      marginTop: basePadding / 4,
      alignSelf: 'flex-start',
      color: isBejaia
        ? colorScheme === 'dark'
          ? '#a7f3d0'
          : '#065f46'
        : colorScheme === 'dark'
        ? '#fda4af'
        : '#9f1239',
      backgroundColor: isBejaia
        ? colorScheme === 'dark'
          ? '#064e3b'
          : '#d1fae5'
        : colorScheme === 'dark'
        ? '#881337'
        : '#ffe4e6',
      borderWidth: 1,
      borderColor: isBejaia
        ? colorScheme === 'dark'
          ? '#10b981'
          : '#6ee7b7'
        : colorScheme === 'dark'
        ? '#fb7185'
        : '#fda4af',
    }),
    resourceActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Platform.OS === 'ios' ? basePadding : basePadding * 0.8,
    },
    actionButton: { padding: basePadding / 1.5, minWidth: basePadding * 2 },
    actionIconColor: { color: colors.textSecondary },
    actionButtonDisabled: { opacity: 0.5 },
    noResourcesText: {
      textAlign: 'center',
      fontSize: baseFontSize * 0.9,
      color: colors.textSecondary,
    },
    iconSize: baseFontSize * 1.2,
    baseFontSize,
    basePadding,
  });
};