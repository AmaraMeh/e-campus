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
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Module, Resource } from '../../constants/Data';
import { useAuth } from '../contexts/AuthContext';
import { useResources, DownloadedResourceMeta } from '../contexts/ResourceContext';
import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const Tab = createMaterialTopTabNavigator();
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ResourceListParams {
  resources: Resource[];
  moduleName: string;
  resourceType: string;
}

interface ResourceListProps {
  route: { params: ResourceListParams };
}

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
        Alert.alert('Error', "Couldn't open the link.");
      }
    }, [resource.url]);

    const handleOpenOffline = useCallback(async (downloadInfo: DownloadedResourceMeta) => {
      try {
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error('Sharing not available');
        }
        await Sharing.shareAsync(downloadInfo.localUri, {
          dialogTitle: `Share "${downloadInfo.title}"`,
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } catch (error) {
        Alert.alert('Error', "Couldn't open the file.");
      }
    }, []);

    const handleDownloadPress = useCallback(() => {
      const downloadInfo = getDownloadInfo(resource.id);
      if (downloadInfo) {
        Alert.alert(
          `"${resource.title}"`,
          'This file is already downloaded.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteDownload(resource.id) },
            { text: 'Open', onPress: () => handleOpenOffline(downloadInfo) },
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
      <View style={styles.resourceItem}>
        <View style={styles.resourceInfo}>
          <FontAwesome
            name="file-text-o"
            size={styles.iconSize}
            color={colors.tint}
            style={styles.resourceIcon}
          />
          <View style={styles.resourceTextContainer}>
            <Text style={styles.resourceTitle} numberOfLines={2}>
              {resource.title}
            </Text>
            {resource.source && (
              <Text style={styles.sourceChip(resource.source === 'bejaia')}>
                {resource.source.charAt(0).toUpperCase() + resource.source.slice(1)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.resourceActions}>
          <TouchableOpacity
            onPress={() => toggleFavorite(resource.id)}
            style={styles.actionButton}
          >
            <Ionicons
              name={favorite ? 'star' : 'star-outline'}
              size={styles.iconSize}
              color={favorite ? '#FFD700' : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleViewOnline} style={styles.actionButton}>
            <Ionicons name="cloud-outline" size={styles.iconSize} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDownloadPress}
            style={[styles.actionButton, downloading && styles.actionButtonDisabled]}
            disabled={downloading}
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

const ResourceList: React.FC<ResourceListProps> = ({ route }) => {
  const { resources, moduleName, resourceType } = route.params;
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => createStyles(colorScheme, colors), [colorScheme]);
  const { toggleFavorite, requestDownload, isFavorite, getDownloadInfo, isDownloading, deleteDownload } =
    useResources();

  if (!resources?.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-outline" size={60} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No resources available yet</Text>
        <Text style={styles.emptySubText}>More resources will be added soon!</Text>
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
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

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
        setFetchError('Invalid module ID or database unavailable');
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
          throw new Error(`No module found for ID: ${moduleId}`);
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
        setFetchError(error.message || 'Failed to load data');
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
      { key: 'cours', name: 'Courses', icon: 'book' },
      { key: 'td', name: 'TD', icon: 'document-text' },
      { key: 'tp', name: 'TP', icon: 'flask' },
      { key: 'compterendu', name: 'Reports', icon: 'clipboard' },
      { key: 'interrogation', name: 'Quizzes', icon: 'help-circle' },
      { key: 'examen', name: 'Exams', icon: 'school' },
      { key: 'autres', name: 'Others', icon: 'ellipsis-horizontal' },
    ],
    []
  );

  const availableTabs = tabConfig.filter((tab) => resourcesByType[tab.key]?.length > 0);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Loading module...</Text>
      </SafeAreaView>
    );
  }

  if (fetchError || !moduleData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="warning" size={60} color={colors.danger} />
        <Text style={styles.errorText}>{fetchError || 'Module not found'}</Text>
        <TouchableOpacity onPress={() => fetchData()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: moduleData.name || moduleId,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontSize: 18 },
          headerTintColor: colors.tint,
        }}
      />
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: styles.tabBar,
          tabBarIndicatorStyle: { backgroundColor: colors.tint },
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarScrollEnabled: availableTabs.length > 4,
        }}
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
                <Ionicons name={tab.icon} size={20} color={color} />
              ),
            }}
          />
        ))}
      </Tab.Navigator>
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={() => fetchData(true)}
        tintColor={colors.tint}
      />
    </SafeAreaView>
  );
}

const createStyles = (
  colorScheme: 'light' | 'dark',
  colors: typeof Colors.light | typeof Colors.dark
) => {
  const basePadding = SCREEN_WIDTH * 0.04;
  const baseFontSize = SCREEN_WIDTH * 0.045;

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
    loadingText: {
      marginTop: basePadding,
      fontSize: baseFontSize,
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: basePadding * 2,
    },
    errorText: {
      color: colors.danger,
      fontSize: baseFontSize * 1.1,
      textAlign: 'center',
      marginVertical: basePadding,
    },
    retryButton: {
      backgroundColor: colors.tint,
      paddingVertical: basePadding,
      paddingHorizontal: basePadding * 2,
      borderRadius: 25,
    },
    retryButtonText: {
      color: '#fff',
      fontSize: baseFontSize,
      fontWeight: '600',
    },
    tabBar: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      elevation: 0,
    },
    tabLabel: {
      fontSize: baseFontSize * 0.8,
      fontWeight: '600',
      margin: 4,
    },
    listContainer: {
      padding: basePadding,
    },
    separator: {
      height: basePadding / 2,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: basePadding * 2,
    },
    emptyText: {
      fontSize: baseFontSize * 1.1,
      color: colors.text,
      marginTop: basePadding,
      fontWeight: '500',
    },
    emptySubText: {
      fontSize: baseFontSize * 0.9,
      color: colors.textSecondary,
      marginTop: basePadding / 2,
    },
    resourceItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: basePadding,
      backgroundColor: colors.cardBackground,
      borderRadius: 15,
      marginVertical: basePadding / 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    resourceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: basePadding,
    },
    resourceIcon: {
      marginRight: basePadding,
    },
    resourceTextContainer: {
      flex: 1,
    },
    resourceTitle: {
      fontSize: baseFontSize,
      color: colors.text,
      fontWeight: '500',
    },
    sourceChip: (isBejaia: boolean) => ({
      fontSize: baseFontSize * 0.7,
      fontWeight: '600',
      paddingVertical: 4,
      paddingHorizontal: basePadding,
      borderRadius: 20,
      marginTop: basePadding / 2,
      alignSelf: 'flex-start',
      color: isBejaia ? '#FFFFFF' : colors.text,
      backgroundColor: isBejaia ? colors.tint : colors.border,
    }),
    resourceActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: basePadding,
    },
    actionButton: {
      padding: basePadding / 2,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionIconColor: {
      color: colors.textSecondary,
    },
    iconSize: baseFontSize * 1.3,
  });
};