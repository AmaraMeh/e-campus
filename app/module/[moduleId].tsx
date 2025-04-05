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
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useResources, DownloadedResourceMeta } from '../contexts/ResourceContext';

// Fallback for useColorScheme if custom hook is unavailable
import { useColorScheme as useNativeColorScheme } from 'react-native';

// Screen dimensions for iPhone 14 Pro Max optimization
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Tab = createMaterialTopTabNavigator();

// Interfaces
interface Module {
  id: string;
  name: string;
  description?: string;
}

interface Resource {
  id: string;
  title: string;
  url: string;
  type?: string;
  source?: string;
  moduleId: string;
}

interface ResourceListParams {
  resources: Resource[];
  moduleName: string;
  resourceType: string;
}

// Color Scheme (Same as Home Screen)
const lightColors = {
  background: '#ffffff',
  card: '#f8f8f8',
  text: '#1a1a1a',
  secondary: '#757575',
  accent: '#007aff',
  border: '#e0e0e0',
  danger: '#ff3b30',
  success: '#34c759',
};
const darkColors = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  secondary: '#a0a0a0',
  accent: '#0a84ff',
  border: '#333333',
  danger: '#ff453a',
  success: '#30d158',
};

// Resource Item Component
const ResourceItem: React.FC<{
  resource: Resource;
  moduleName: string;
  resourceType: string;
  colors: typeof lightColors | typeof darkColors;
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
        Alert.alert('Erreur', 'Impossible d’ouvrir le lien.');
      }
    }, [resource.url]);

    const handleOpenOffline = useCallback(async (downloadInfo: DownloadedResourceMeta) => {
      try {
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error('Partage non disponible');
        }
        await Sharing.shareAsync(downloadInfo.localUri, {
          dialogTitle: `Partager "${downloadInfo.title}"`,
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } catch (error) {
        Alert.alert('Erreur', 'Impossible d’ouvrir le fichier.');
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
      ? colors.accent
      : downloaded
      ? colors.success
      : colors.secondary;

    return (
      <Animated.View entering={FadeIn.duration(300)} style={[styles.resourceItem, { backgroundColor: colors.card }]}>
        <View style={styles.resourceInfo}>
          <FontAwesome name="file-text-o" size={28} color={colors.accent} style={styles.resourceIcon} />
          <View style={styles.resourceTextContainer}>
            <Text style={[styles.resourceTitle, { color: colors.text }]} numberOfLines={2}>
              {resource.title}
            </Text>
            {resource.source && (
              <Text
                style={[
                  styles.sourceChip,
                  {
                    backgroundColor: resource.source === 'bejaia' ? colors.accent : colors.border,
                    color: resource.source === 'bejaia' ? '#fff' : colors.text,
                  },
                ]}
              >
                {resource.source.charAt(0).toUpperCase() + resource.source.slice(1)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.resourceActions}>
          <TouchableOpacity onPress={() => toggleFavorite(resource.id)} style={styles.actionButton}>
            <Ionicons
              name={favorite ? 'star' : 'star-outline'}
              size={28}
              color={favorite ? '#FFD700' : colors.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleViewOnline} style={styles.actionButton}>
            <Ionicons name="cloud-outline" size={28} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDownloadPress}
            style={[styles.actionButton, downloading && styles.actionButtonDisabled]}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name={downloadIcon} size={28} color={downloadColor} />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }
);

// Resource List Component
const ResourceList: React.FC<{ route: { params: ResourceListParams } }> = ({ route }) => {
  const { resources, moduleName, resourceType } = route.params;
  const colorScheme = useNativeColorScheme() ?? 'light'; // Fallback to native useColorScheme
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const { toggleFavorite, requestDownload, isFavorite, getDownloadInfo, isDownloading, deleteDownload } = useResources();

  if (!resources?.length) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="document-outline" size={64} color={colors.secondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>Aucune ressource disponible</Text>
        <Text style={[styles.emptySubText, { color: colors.secondary }]}>
          Consultez plus tard pour de nouvelles ressources !
        </Text>
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
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

// Main Module Detail Screen
export default function ModuleDetailScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const colorScheme = useNativeColorScheme() ?? 'light'; // Fallback to native useColorScheme
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const { currentUser } = useAuth();

  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!moduleId || !db) {
        setFetchError('ID de module invalide ou base de données indisponible');
        setIsLoading(false);
        return;
      }
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setFetchError(null);

      try {
        const moduleDocRef = doc(db, 'modules', moduleId);
        const moduleSnap = await getDoc(moduleDocRef);
        if (!moduleSnap.exists()) {
          throw new Error(`Aucun module trouvé pour l’ID : ${moduleId}`);
        }
        const fetchedModuleData = { id: moduleSnap.id, ...moduleSnap.data() } as Module;
        setModuleData(fetchedModuleData);

        const resourcesQuery = query(collection(db, 'resources'), where('moduleId', '==', moduleId));
        const resourcesSnapshot = await getDocs(resourcesQuery);
        const fetchedResources: Resource[] = resourcesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Resource[];
        setResources(fetchedResources);
      } catch (error: any) {
        setFetchError(error.message || 'Échec du chargement des données');
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
    return grouped;
  }, [resources]);

  const tabConfig = useMemo(
    () => [
      { key: 'cours', name: 'Cours', icon: 'book' },
      { key: 'td', name: 'TD', icon: 'document-text' },
      { key: 'tp', name: 'TP', icon: 'flask' },
      { key: 'compterendu', name: 'Rapports', icon: 'clipboard' },
      { key: 'interrogation', name: 'Interrogations', icon: 'help-circle' },
      { key: 'examen', name: 'Examens', icon: 'school' },
      { key: 'autres', name: 'Autres', icon: 'ellipsis-horizontal' },
    ],
    []
  );

  const availableTabs = tabConfig.filter((tab) => resourcesByType[tab.key]?.length > 0);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Chargement du module...</Text>
      </SafeAreaView>
    );
  }

  if (fetchError || !moduleData) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="warning" size={64} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {fetchError || 'Module non trouvé'}
        </Text>
        <TouchableOpacity onPress={() => fetchData()} style={[styles.retryButton, { backgroundColor: colors.accent }]}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Animated.View entering={SlideInDown.duration(500)} style={styles.header}>
        <Text style={[styles.moduleTitle, { color: colors.text }]}>{moduleData.name || moduleId}</Text>
        {moduleData.description && (
          <Text style={[styles.moduleDescription, { color: colors.secondary }]}>
            {moduleData.description}
          </Text>
        )}
      </Animated.View>
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: [styles.tabBar, { backgroundColor: colors.card }],
          tabBarIndicatorStyle: { backgroundColor: colors.accent },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.secondary,
          tabBarScrollEnabled: availableTabs.length > 4,
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
                <Ionicons name={tab.icon} size={22} color={color} />
              ),
            }}
            listeners={{
              tabPress: () => setIsRefreshing(false), // Reset refreshing on tab switch
            }}
          />
        ))}
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  moduleTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 16,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  listContainer: {
    padding: 24,
    paddingBottom: 80,
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 16,
    fontWeight: '400',
    marginTop: 8,
    textAlign: 'center',
  },
  resourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    marginBottom: 12,
  },
  resourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  resourceIcon: {
    marginRight: 16,
  },
  resourceTextContainer: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 6,
  },
  sourceChip: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  resourceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});