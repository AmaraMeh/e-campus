// File: app/module/[moduleId].tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert, ActivityIndicator, Platform
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// --- Adjust Paths ---
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { universiteBejaiaData, Module, Resource } from '@/constants/Data';
import { allResourcesMap, populateResourceMap, ResourceMapEntry } from '@/utils/resourceMap'; // Import map utils
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
// --- ---

const Tab = createMaterialTopTabNavigator();
const FAVORITES_STORAGE_KEY = '@ModuleResourceFavorites';
const DOWNLOADS_STORAGE_KEY = '@ModuleResourceDownloads';

// Interface for Download Metadata
interface DownloadedResourceMeta extends Resource { localUri: string; downloadedAt: number; moduleName?: string; resourceType?: string; }

// --- Helper Functions ---
const generateLinkFromName = (name: string): string => { if (!name) return 'invalid-name'; return name.toLowerCase().replace(/ /g, '-').replace(/[èéêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/ç/g, 'c').replace(/[^\w-]+/g, '').replace(/^-+|-+$/g, ''); };
const findModuleData = (moduleId: string | undefined | string[]) => { if (!moduleId || typeof moduleId !== 'string') { console.error("[findModuleData] Invalid moduleId:", moduleId); return null; } const lowerId = moduleId.toLowerCase(); try { const parts = lowerId.split('_'); if (parts.length < 3) { console.error(`[findModuleData] Invalid format: ${lowerId}`); return null; } const specialtyLink = parts[0]; const semesterUrlPart = parts[1]; const moduleLinkPart = parts.slice(2).join('-'); for (const yearKey in universiteBejaiaData) { const yearData = universiteBejaiaData[yearKey as keyof typeof universiteBejaiaData]; if (!yearData) continue; for (const specialtyName in yearData) { const linkIdFromData = generateLinkFromName(specialtyName); if (linkIdFromData === specialtyLink) { const semesterKey = Object.keys(yearData[specialtyName]).find( k => k.toLowerCase().replace(' ', '-') === semesterUrlPart ); if (semesterKey) { const semesterData = yearData[specialtyName]?.[semesterKey]; if (semesterData) { const foundModule = semesterData.find(m => generateLinkFromName(m.matiere) === moduleLinkPart); if (foundModule) return foundModule; } } } } } } catch (e) { console.error("[findModuleData] Error parsing:", moduleId, e); } console.error(`[findModuleData] Not found: ${moduleId}`); return null; };

// --- Resource List Component ---
interface ResourceListProps { resources: Resource[]; favorites: Set<string>; downloadedFilesInfo: Map<string, DownloadedResourceMeta>; onFavoriteToggle: (id: string) => void; onDownloadRequest: (resource: Resource) => void; onViewOnline: (resource: Resource) => void; onOpenOffline: (localUri: string, title: string) => void; downloading: Record<string, boolean>; styles: ReturnType<typeof getResourceStyles>; colors: typeof Colors.light | typeof Colors.dark; }
const ResourceList: React.FC<ResourceListProps> = ({ resources, favorites, downloadedFilesInfo, onFavoriteToggle, onDownloadRequest, onViewOnline, onOpenOffline, downloading, styles, colors }) => { if (!resources || resources.length === 0) { return <View style={styles.emptyTabView}><Text style={styles.noResourcesText}>Aucune ressource ici pour le moment.</Text></View>; } return ( <ScrollView contentContainerStyle={styles.listContainer}> {resources.map((resource) => { const isFavorite = favorites.has(resource.id); const isDownloading = downloading[resource.id]; const downloadInfo = downloadedFilesInfo.get(resource.id); const isDownloaded = !!downloadInfo; const titleStyle = styles.resourceTitle ?? {}; const sourceChipStyle = styles.sourceChip ? styles.sourceChip(resource.source === 'bejaia') : {}; const actionIconStyle = styles.actionIconColor ?? {}; const tintColor = colors.tint; return ( <View key={resource.id} style={styles.resourceItem}> <View style={styles.resourceInfo}> <FontAwesome name="file-text-o" size={18} color={actionIconStyle.color} style={styles.resourceIcon} /> <View style={styles.resourceTextContainer}> <Text style={titleStyle} numberOfLines={2}>{resource.title}</Text> {resource.source && <Text style={sourceChipStyle}>{resource.source === 'bejaia' ? 'Bejaia' : 'Autres'}</Text>} </View> </View> <View style={styles.resourceActions}> <TouchableOpacity onPress={() => onFavoriteToggle(resource.id)} style={styles.actionButton} accessibilityLabel="Favori"> <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={24} color={isFavorite ? tintColor : actionIconStyle.color} /> </TouchableOpacity> <TouchableOpacity onPress={() => onViewOnline(resource)} style={styles.actionButton} accessibilityLabel="Voir en ligne"> <Ionicons name="cloud-outline" size={24} color={actionIconStyle.color} /> </TouchableOpacity> <TouchableOpacity onPress={() => isDownloaded && downloadInfo ? onOpenOffline(downloadInfo.localUri, resource.title) : onDownloadRequest(resource) } style={[styles.actionButton, isDownloading && styles.actionButtonDisabled]} disabled={isDownloading} accessibilityLabel={isDownloaded ? "Ouvrir hors-ligne" : isDownloading ? "Téléchargement..." : "Télécharger"}> {isDownloading ? ( <ActivityIndicator size="small" color={tintColor} /> ) : isDownloaded ? ( <Ionicons name="checkmark-circle" size={24} color={colors.success} /> ) : ( <Ionicons name="cloud-download-outline" size={24} color={actionIconStyle.color} /> )} </TouchableOpacity> </View> </View> ); })} <View style={{ height: 10 }}/> </ScrollView> ); };

// --- Main Module Detail Screen ---
export default function ModuleDetailScreen() {
  const { moduleId } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = getResourceStyles(colorScheme, colors);

  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadedFilesInfo, setDownloadedFilesInfo] = useState<Map<string, DownloadedResourceMeta>>(new Map());

  // --- Effects ---
  useEffect(() => { let isMounted = true; const loadInitialData = async () => { setIsLoading(true); const data = findModuleData(moduleId); const [favs, downloadsMap] = await Promise.all([ loadFavoritesFromStorage(), loadDownloadsFromStorage() ]); if (isMounted) { setModuleData(data); setFavorites(favs); setDownloadedFilesInfo(downloadsMap); setIsLoading(false); } }; loadInitialData(); return () => { isMounted = false; }; }, [moduleId]);
  useEffect(() => { saveFavoritesToStorage(favorites); }, [favorites]);

  // --- Async Storage Helpers ---
  const loadFavoritesFromStorage = async (): Promise<Set<string>> => { try { const s = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY); return s ? new Set<string>(JSON.parse(s)) : new Set<string>(); } catch (e) { console.error("Failed load favs", e); return new Set<string>(); } };
  const saveFavoritesToStorage = async (favs: Set<string>) => { try { await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favs))); } catch (e) { console.error("Failed save favs", e); } };
  const loadDownloadsFromStorage = async (): Promise<Map<string, DownloadedResourceMeta>> => { try { const stored = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY); const downloadsArray = stored ? (JSON.parse(stored) as DownloadedResourceMeta[]) : []; const downloadsMap = new Map<string, DownloadedResourceMeta>(); for (const download of downloadsArray) { try { const fileInfo = await FileSystem.getInfoAsync(download.localUri); if (fileInfo.exists) downloadsMap.set(download.id, download); else console.warn(`DL metadata missing file: ${download.localUri}`); } catch (fileError) { console.error(`Error check file ${download.localUri}:`, fileError); } } return downloadsMap; } catch (e) { console.error("Failed load dls meta", e); return new Map<string, DownloadedResourceMeta>(); } };
  const saveDownloadsToStorage = async (downloadsMap: Map<string, DownloadedResourceMeta>) => { try { const downloadsArray = Array.from(downloadsMap.values()); await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(downloadsArray)); } catch (e) { console.error("Failed save dls meta", e); } };

  // --- Favorite Toggle ---
  const handleFavoriteToggle = useCallback((resourceId: string) => { setFavorites(prev => { const n = new Set(prev); if (n.has(resourceId)) n.delete(resourceId); else n.add(resourceId); return n; }); }, []);

  // --- Download Logic ---
  const generateFilename = (title: string, url: string): string => { let e='pdf';try{const u=new URL(url);const p=u.pathname;const l=p.substring(p.lastIndexOf('/')+1);if(l.includes('.')){const d=l.split('.').pop()?.toLowerCase();if(d && ['pdf','doc','docx','xls','xlsx','ppt','pptx','zip','rar','txt','jpg','png'].includes(d)){e=d;}}}catch(e){console.warn("Cannot get ext:",url);} const s=title.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]+/g,' ').trim().replace(/\s+/g,'_');const m=40;const t=s.length>m?s.substring(0,m):s;return`${t}.${e}`; };
  const proceedWithDownload = async (url: string, localUri: string, fileName: string, resource: Resource) => { const resourceId = resource.id; setDownloading(prev => ({ ...prev, [resourceId]: true })); try { const downloadResult = await FileSystem.downloadAsync(url, localUri); if (!downloadResult || downloadResult.status < 200 || downloadResult.status >= 300) throw new Error(`Status: ${downloadResult?.status ?? 'inconnu'}`); const newDownloadMeta: DownloadedResourceMeta = { ...resource, localUri: downloadResult.uri, downloadedAt: Date.now(), moduleName: moduleData?.matiere, resourceType: Object.keys(moduleData?.resources || {}).find(type => moduleData?.resources?.[type as keyof Module['resources']]?.some(r => r.id === resourceId)) }; const newDownloadsMap = new Map(downloadedFilesInfo); newDownloadsMap.set(resourceId, newDownloadMeta); setDownloadedFilesInfo(newDownloadsMap); await saveDownloadsToStorage(newDownloadsMap); Alert.alert("Téléchargé", `"${fileName}" enregistré.`); } catch (e: any) { console.error("DL failed:", e); Alert.alert("Erreur DL",`Échec.\n${e.message}`); try { await FileSystem.deleteAsync(localUri, { idempotent: true }); } catch (e) {} } finally { setDownloading(prev => ({ ...prev, [resourceId]: false })); } };
  const handleDownloadRequest = async (resource: Resource) => { const{url,title,id}=resource;const fN=generateFilename(title,url);const lU=(FileSystem.documentDirectory||'')+fN;if(!FileSystem.documentDirectory){Alert.alert("Erreur","Dir documents inaccessible.");return;}if(downloading[id]){return;} try{const fI=await FileSystem.getInfoAsync(lU);if(fI.exists){Alert.alert("Téléchargé",`"${fN}" existe déjà.`,[{text:"Annuler"},{text:"Ouvrir",onPress:()=>handleOpenLocalFile(lU,title)},]);}else{await proceedWithDownload(url,lU,fN,resource);}}catch(error:any){console.error("DL Check Err:",error);Alert.alert("Erreur",`Erreur pré-téléchargement.`);setDownloading(prev=>({...prev,[id]:false}));}};

   // --- Open Online Handler ---
   const handleViewOnline = async (resource: Resource) => { const url = resource.url; try { const supported = await Linking.canOpenURL(url); if (supported) await Linking.openURL(url); else Alert.alert("Lien non supporté", `Impossible d'ouvrir: ${url}`); } catch (error) { console.error("Link err:", error); Alert.alert("Erreur", `Lien invalide ou problème réseau.`); } };

  // --- Open Local File Handler ---
   const handleOpenLocalFile = async (localUri: string, title: string) => { try { if (!(await Sharing.isAvailableAsync())) { throw new Error("Sharing indisponible"); } await Sharing.shareAsync(localUri, { dialogTitle: `Ouvrir/Partager "${title}"` }); } catch (error: any) { console.error("Open/Share err:", error); Alert.alert("Impossible", "Aucune app trouvée."); } };

  // --- Combined Handler ---
  // Note: This specific handler isn't used anymore with the separated buttons, but keeping it doesn't hurt
  // const handleDownloadOrView = async (resource: Resource) => { const downloadInfo = downloadedFilesInfo.get(resource.id); if (downloadInfo) handleOpenLocalFile(downloadInfo.localUri, resource.title); else handleDownloadRequest(resource); };

  // --- Loading / Error ---
  if (isLoading) { return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>; }
  if (!moduleData) { return <View style={styles.loadingContainer}><Text style={styles.errorText}>Impossible de charger module ({moduleId}).</Text></View>; }

  // --- Screen Render ---
  const coursResources = moduleData.resources?.cours ?? [];
  const tdResources = moduleData.resources?.td ?? [];
  const tpResources = moduleData.resources?.tp ?? [];
  const examenResources = moduleData.resources?.examen ?? [];

  // Combine TD and TP resources for the tab
  const combinedTdTpResources = [...tdResources, ...tpResources]; // <-- FIX TYPO HERE

  const showCoursTab = coursResources.length > 0;
  const showTdTab = combinedTdTpResources.length > 0; // Use combined list for condition
  const showExamenTab = examenResources.length > 0;
  const hasAnyResources = showCoursTab || showTdTab || showExamenTab;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerTitle: moduleData.matiere, headerStyle: { backgroundColor: colors.cardBackground }, headerTitleStyle: { color: colors.text }, headerTintColor: colors.tint }} />

      {hasAnyResources ? (
          <Tab.Navigator
            screenOptions={{ tabBarLabelStyle: styles.tabLabel, tabBarItemStyle: styles.tabItem, tabBarStyle: { backgroundColor: colors.cardBackground }, tabBarIndicatorStyle: { backgroundColor: colors.tint, height: 3 }, tabBarActiveTintColor: colors.tint, tabBarInactiveTintColor: colors.textSecondary, swipeEnabled: true }} >
            {showCoursTab && (
                 <Tab.Screen name="Cours">
                    {() => <ResourceList resources={coursResources} favorites={favorites} downloadedFilesInfo={downloadedFilesInfo} onFavoriteToggle={handleFavoriteToggle} onDownloadRequest={handleDownloadRequest} onViewOnline={handleViewOnline} onOpenOffline={handleOpenLocalFile} downloading={downloading} styles={styles} colors={colors}/>}
                 </Tab.Screen>
            )}
            {showTdTab && (
                 <Tab.Screen name="TD/TP">
                     {/* Pass the combined list to the component */}
                    {() => <ResourceList resources={combinedTdTpResources} favorites={favorites} downloadedFilesInfo={downloadedFilesInfo} onFavoriteToggle={handleFavoriteToggle} onDownloadRequest={handleDownloadRequest} onViewOnline={handleViewOnline} onOpenOffline={handleOpenLocalFile} downloading={downloading} styles={styles} colors={colors}/>}
                 </Tab.Screen>
            )}
            {showExamenTab && (
                 <Tab.Screen name="Examens">
                    {() => <ResourceList resources={examenResources} favorites={favorites} downloadedFilesInfo={downloadedFilesInfo} onFavoriteToggle={handleFavoriteToggle} onDownloadRequest={handleDownloadRequest} onViewOnline={handleViewOnline} onOpenOffline={handleOpenLocalFile} downloading={downloading} styles={styles} colors={colors}/>}
                 </Tab.Screen>
            )}
          </Tab.Navigator>
       ) : (
           <View style={styles.loadingContainer}>
              <Text style={styles.errorText}>Aucune ressource n'a été ajoutée.</Text>
              <Text style={styles.soonText}>Vérifiez bientôt !</Text>
           </View>
       )}
       {/* PDF Modal Removed */}
    </View>
  );
}

// --- Styles ---
// Define colors outside if not already done globally
const lightColors = { background: '#f8fafc', cardBackground: '#ffffff', tint: Colors.light.tint ?? '#3b82f6', border: '#e5e7eb', text: '#1f2937', textSecondary: '#6b7280', success: Colors.success ?? '#16a34a', danger: Colors.danger ?? '#dc2626', };
const darkColors = { background: '#111827', cardBackground: '#1f2937', tint: Colors.dark.tint ?? '#60a5fa', border: '#374151', text: '#f9fafb', textSecondary: '#9ca3af', success: Colors.success ?? '#22c55e', danger: Colors.danger ?? '#f87171', };

// Pass 'colors' object explicitly
const getResourceStyles = (colorScheme: 'light' | 'dark', colors: typeof lightColors | typeof darkColors) => {
    return StyleSheet.create({
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
        errorText: { color: colors.danger, fontSize: 16, textAlign: 'center', marginBottom: 5 },
        soonText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center'},
        container: { flex: 1, backgroundColor: colors.background },
        tabLabel: { fontSize: 13, fontWeight: 'bold', textTransform: 'capitalize' },
        tabItem: { height: 50, justifyContent: 'center' },
        listContainer: { padding: 15, paddingBottom: 30, },
        emptyTabView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: 200 },
        resourceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, marginBottom: 10, backgroundColor: colors.cardBackground, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: colors.tint + '90', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1, },
        resourceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
        resourceIcon: { marginRight: 10, width: 20, textAlign: 'center', color: colors.textSecondary },
        resourceTextContainer: { flex: 1 },
        resourceTitle: { fontSize: 14, color: colors.text, flexShrink: 1, fontWeight: '500'},
        sourceChip: (isBejaia: boolean) => ({ fontSize: 9, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 10, overflow: 'hidden', marginTop: 4, alignSelf: 'flex-start', color: isBejaia ? (colorScheme==='dark'?'#a7f3d0':'#065f46') : (colorScheme==='dark'?'#fda4af':'#9f1239'), backgroundColor: isBejaia ? (colorScheme==='dark'?'#064e3b':'#d1fae5') : (colorScheme==='dark'?'#881337':'#ffe4e6'), borderWidth: 1, borderColor: isBejaia ? (colorScheme==='dark'?'#10b981':'#6ee7b7') : (colorScheme==='dark'?'#fb7185':'#fda4af'), }),
        resourceActions: { flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'ios' ? 18 : 15 },
        actionButton: { padding: 6 },
        actionIconColor: { color: colors.textSecondary },
        actionButtonDisabled: { opacity: 0.4 },
        noResourcesText: { textAlign: 'center', marginTop: 20, fontSize: 15, color: colors.textSecondary },
    });
}