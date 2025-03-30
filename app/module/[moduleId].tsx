// File: app/module/[moduleId].tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Dimensions
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

// Adjust Paths
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Module, Resource } from '../../constants/Data';
import { useAuth } from '../contexts/AuthContext';
import { useResources, DownloadedResourceMeta } from '../contexts/ResourceContext';
import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const Tab = createMaterialTopTabNavigator();

// --- Resource List Component ---
interface ResourceListRouteParams {
  resources: Resource[];
  moduleName: string;
  resourceType: string;
}

interface ResourceListScreenProps {
  route: { params: ResourceListRouteParams };
}

const ResourceList: React.FC<ResourceListScreenProps> = ({ route }) => {
  const { resources, moduleName, resourceType } = route.params;
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const screenWidth = Dimensions.get('window').width;
  const styles = useMemo(() => getModuleStyles(colorScheme, colors, screenWidth), [colorScheme, screenWidth]);
  const { toggleFavorite, requestDownload, isFavorite, getDownloadInfo, isDownloading, deleteDownload } = useResources();

  const handleViewOnline = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
      Alert.alert("Erreur", "Impossible d'ouvrir le lien.");
    }
  }, []);

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
      console.error("Sharing Error:", error);
      Alert.alert("Erreur", "Impossible d'ouvrir le fichier.");
    }
  }, []);

  const handleDownloadPress = (resource: Resource) => {
    const downloadInfo = getDownloadInfo(resource.id);
    if (downloadInfo) {
      Alert.alert(
        `"${resource.title}"`,
        "Ce fichier est déjà téléchargé.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Supprimer", style: "destructive", onPress: () => deleteDownload(resource.id) },
          { text: "Ouvrir", onPress: () => handleOpenOffline(downloadInfo) },
        ]
      );
    } else {
      requestDownload(resource, moduleName, resourceType);
    }
  };

  if (!resources || resources.length === 0) {
    return (
      <View style={styles.emptyTabView}>
        <Text style={styles.noResourcesText}>Aucune ressource disponible.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.listContainer}>
      {resources.map((resource) => {
        const favorite = isFavorite(resource.id);
        const downloading = isDownloading(resource.id);
        const downloadInfo = getDownloadInfo(resource.id);
        const downloaded = !!downloadInfo;

        let downloadIcon: keyof typeof Ionicons.glyphMap = 'cloud-download-outline';
        let downloadColor = styles.actionIconColor.color;
        if (downloading) {
          downloadIcon = 'hourglass-outline';
          downloadColor = colors.tint;
        } else if (downloaded) {
          downloadIcon = 'checkmark-circle';
          downloadColor = colors.success ?? '#16a34a';
        }

        return (
          <View key={resource.id} style={styles.resourceItem}>
            <View style={styles.resourceInfo}>
              <FontAwesome name="file-text-o" size={styles.iconSize} color={styles.actionIconColor.color} style={styles.resourceIcon} />
              <View style={styles.resourceTextContainer}>
                <Text style={styles.resourceTitle} numberOfLines={2}>{resource.title}</Text>
                {resource.source && (
                  <Text style={styles.sourceChip(resource.source === 'bejaia')} numberOfLines={1}>
                    {resource.source.charAt(0).toUpperCase() + resource.source.slice(1)}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.resourceActions}>
              <TouchableOpacity onPress={() => toggleFavorite(resource.id)} style={styles.actionButton}>
                <Ionicons name={favorite ? 'star' : 'star-outline'} size={styles.iconSize} color={favorite ? colors.tint : styles.actionIconColor.color} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleViewOnline(resource.url)} style={styles.actionButton}>
                <Ionicons name="cloud-outline" size={styles.iconSize} color={styles.actionIconColor.color} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDownloadPress(resource)}
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
      })}
      <View style={{ height: styles.basePadding }} />
    </ScrollView>
  );
};

// --- Main Module Detail Screen ---
export default function ModuleDetailScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const screenWidth = Dimensions.get('window').width;
  const styles = useMemo(() => getModuleStyles(colorScheme, colors, screenWidth), [colorScheme, screenWidth]);
  const { currentUser } = useAuth();

  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!moduleId || !db) {
      setFetchError("ID du module invalide ou base de données indisponible.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    console.log(`[ModuleDetailScreen] Fetching data for module ID: ${moduleId}`);

    try {
      // Fetch Module Details
      const moduleDocRef = doc(db, "modules", moduleId);
      const moduleSnap = await getDoc(moduleDocRef);
      if (!moduleSnap.exists()) {
        throw new Error(`Aucun module trouvé pour l'ID: ${moduleId}`);
      }
      const fetchedModuleData = { id: moduleSnap.id, ...moduleSnap.data() } as Module;
      setModuleData(fetchedModuleData);
      console.log(`[ModuleDetailScreen] Module fetched: ${fetchedModuleData.name || moduleId}`);

      // Fetch Resources
      const resourcesQuery = query(collection(db, "resources"), where("moduleId", "==", moduleId));
      const resourcesSnapshot = await getDocs(resourcesQuery);
      const fetchedResources: Resource[] = resourcesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Resource[];
      setResources(fetchedResources);
      console.log(`[ModuleDetailScreen] Fetched ${fetchedResources.length} resources:`, fetchedResources);

    } catch (error: any) {
      console.error("[ModuleDetailScreen] Fetch error:", error);
      setFetchError(error.message || "Échec du chargement des données.");
      setModuleData(null);
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]);

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

  const tabOrder = ['cours', 'td', 'tp', 'compterendu', 'interrogation', 'examen', 'autres'];
  const availableTabs = tabOrder.filter((type) => resourcesByType[type]?.length > 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (fetchError || !moduleData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={styles.iconSize * 2} color={colors.danger} />
        <Text style={styles.errorText}>{fetchError || `Module non trouvé: ${moduleId}`}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
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
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.tint,
        }}
      />
      {availableTabs.length > 0 ? (
        <Tab.Navigator
          screenOptions={{
            tabBarLabelStyle: styles.tabLabel,
            tabBarItemStyle: styles.tabItem,
            tabBarStyle: { backgroundColor: colors.cardBackground },
            tabBarIndicatorStyle: { backgroundColor: colors.tint, height: 3 },
            tabBarActiveTintColor: colors.tint,
            tabBarInactiveTintColor: colors.textSecondary,
            swipeEnabled: true,
            tabBarScrollEnabled: availableTabs.length > 4,
          }}
        >
          {availableTabs.map((tabKey) => {
            const typeResources = resourcesByType[tabKey] || [];
            let tabName = tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
            if (tabKey === 'td') tabName = 'TD';
            if (tabKey === 'tp') tabName = 'TP';
            if (tabKey === 'compterendu') tabName = 'CR';
            if (tabKey === 'interrogation') tabName = 'Interro';

            return (
              <Tab.Screen
                key={tabKey}
                name={tabName}
                component={ResourceList}
                initialParams={{
                  resources: typeResources,
                  moduleName: moduleData.name || moduleId,
                  resourceType: tabKey,
                }}
              />
            );
          })}
        </Tab.Navigator>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Aucune ressource pour ce module.</Text>
          <Text style={styles.soonText}>Vérifiez bientôt !</Text>
        </View>
      )}
    </View>
  );
}

// --- Styles ---
const getModuleStyles = (colorScheme: 'light' | 'dark', colors: typeof Colors.light | typeof Colors.dark, screenWidth: number) => {
  const baseFontSize = screenWidth / 20;
  const basePadding = screenWidth / 20;

  return StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: basePadding },
    errorText: { color: colors.danger ?? '#dc2626', fontSize: baseFontSize, textAlign: 'center', marginBottom: basePadding / 2 },
    retryButton: { marginTop: basePadding, backgroundColor: colors.tint, paddingVertical: basePadding / 2, paddingHorizontal: basePadding, borderRadius: 8 },
    retryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: baseFontSize * 0.9 },
    soonText: { color: colors.textSecondary, fontSize: baseFontSize * 0.8, textAlign: 'center', marginTop: basePadding / 2 },
    container: { flex: 1, backgroundColor: colors.background },
    tabLabel: { fontSize: baseFontSize * 0.75, fontWeight: 'bold', textTransform: 'capitalize' },
    tabItem: { height: 50, justifyContent: 'center', width: 'auto', paddingHorizontal: basePadding },
    listContainer: { padding: basePadding, paddingBottom: basePadding * 2 },
    emptyTabView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: basePadding, minHeight: 200 },
    resourceItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: basePadding / 2,
      paddingHorizontal: basePadding,
      marginBottom: basePadding / 2,
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.tint + '90',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    resourceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: basePadding },
    resourceIcon: { marginRight: basePadding / 2, width: basePadding, textAlign: 'center' },
    resourceTextContainer: { flex: 1 },
    resourceTitle: { fontSize: baseFontSize * 0.85, color: colors.text, flexShrink: 1, fontWeight: '500' },
    sourceChip: (isBejaia: boolean) => ({
      fontSize: baseFontSize * 0.5,
      fontWeight: 'bold',
      paddingVertical: 2,
      paddingHorizontal: basePadding / 2,
      borderRadius: 10,
      marginTop: basePadding / 4,
      alignSelf: 'flex-start',
      color: isBejaia ? (colorScheme === 'dark' ? '#a7f3d0' : '#065f46') : (colorScheme === 'dark' ? '#fda4af' : '#9f1239'),
      backgroundColor: isBejaia ? (colorScheme === 'dark' ? '#064e3b' : '#d1fae5') : (colorScheme === 'dark' ? '#881337' : '#ffe4e6'),
      borderWidth: 1,
      borderColor: isBejaia ? (colorScheme === 'dark' ? '#10b981' : '#6ee7b7') : (colorScheme === 'dark' ? '#fb7185' : '#fda4af'),
    }),
    resourceActions: { flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'ios' ? basePadding : basePadding * 0.75 },
    actionButton: { padding: basePadding / 2 },
    actionIconColor: { color: colors.textSecondary },
    actionButtonDisabled: { opacity: 0.4 },
    noResourcesText: { textAlign: 'center', fontSize: baseFontSize * 0.9, color: colors.textSecondary },
    iconSize: baseFontSize * 1.2,
    baseFontSize,
    basePadding,
  });
};