// File: app/contexts/ResourceContext.tsx
import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { Resource, Module } from '../../constants/Data'; // Keep interfaces
import { useAuth } from './AuthContext'; // Need user context for downloads potentially

// --- Interfaces --- (Can be moved to a central types file)
export interface DownloadedResourceMeta extends Resource {
    localUri: string;
    downloadedAt: number;
    moduleName?: string; // Store context for display
    resourceType?: string; // Store context for display
}

interface ResourceContextProps {
    favorites: Set<string>;
    downloadedFilesInfo: Map<string, DownloadedResourceMeta>;
    downloading: Record<string, boolean>; // { [resourceId]: true/false }
    toggleFavorite: (resourceId: string) => void;
    requestDownload: (resource: Resource, moduleName?: string, resourceType?: string) => Promise<void>;
    deleteDownload: (resourceId: string) => Promise<void>;
    isFavorite: (resourceId: string) => boolean;
    getDownloadInfo: (resourceId: string) => DownloadedResourceMeta | undefined;
    isDownloading: (resourceId: string) => boolean;
    loadResourceData: () => Promise<void>; // Function to trigger loading
    isLoadingResources: boolean;
}

const ResourceContext = createContext<ResourceContextProps | undefined>(undefined);

const FAVORITES_STORAGE_KEY = '@ModuleResourceFavorites';
const DOWNLOADS_STORAGE_KEY = '@ModuleResourceDownloads';

export const ResourceProvider = ({ children }: { children: ReactNode }) => {
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [downloadedFilesInfo, setDownloadedFilesInfo] = useState<Map<string, DownloadedResourceMeta>>(new Map());
    const [downloading, setDownloading] = useState<Record<string, boolean>>({});
    const [isLoadingResources, setIsLoadingResources] = useState(true);
    const { currentUser } = useAuth(); // Get user status

    // --- Load initial data from AsyncStorage ---
    const loadResourceData = useCallback(async () => {
        console.log("[ResourceContext] Loading favorites and downloads from AsyncStorage...");
        setIsLoadingResources(true);
        try {
            const [favsJson, downloadsJson] = await Promise.all([
                AsyncStorage.getItem(FAVORITES_STORAGE_KEY),
                AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY)
            ]);

            // Load Favorites
            const favIds = favsJson ? new Set<string>(JSON.parse(favsJson)) : new Set<string>();
            setFavorites(favIds);
            console.log(`[ResourceContext] Loaded ${favIds.size} favorites.`);

            // Load and Verify Downloads
            const downloadsArray = downloadsJson ? (JSON.parse(downloadsJson) as DownloadedResourceMeta[]) : [];
            const verifiedMap = new Map<string, DownloadedResourceMeta>();
            for (const download of downloadsArray) {
                try {
                    const fileInfo = await FileSystem.getInfoAsync(download.localUri);
                    if (fileInfo.exists) {
                        verifiedMap.set(download.id, download);
                    } else {
                        console.warn(`[ResourceContext] Downloaded file missing, removing metadata: ${download.localUri}`);
                    }
                } catch (fileError) {
                    console.error(`[ResourceContext] Error checking file ${download.localUri}:`, fileError);
                    // Decide if you want to keep the metadata even if check fails
                }
            }
            setDownloadedFilesInfo(verifiedMap);
             console.log(`[ResourceContext] Loaded and verified ${verifiedMap.size} downloads.`);
             // If verification removed items, save the cleaned list back
             if (verifiedMap.size !== downloadsArray.length) {
                 await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(Array.from(verifiedMap.values())));
             }

        } catch (error) {
            console.error("[ResourceContext] Failed to load resource data from storage:", error);
            // Optionally clear state or show error
        } finally {
            setIsLoadingResources(false);
        }
    }, []);

    // Load data when the provider mounts or when user logs in/out
    useEffect(() => {
       loadResourceData();
    }, [currentUser, loadResourceData]); // Reload if user changes

    // --- Actions ---
    const toggleFavorite = useCallback(async (resourceId: string) => {
        setFavorites(prev => {
            const newFavs = new Set(prev);
            if (newFavs.has(resourceId)) {
                newFavs.delete(resourceId);
                 console.log(`[ResourceContext] Removed favorite: ${resourceId}`);
            } else {
                newFavs.add(resourceId);
                 console.log(`[ResourceContext] Added favorite: ${resourceId}`);
            }
            // Save immediately to AsyncStorage
            AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(newFavs)))
                .catch(e => console.error("[ResourceContext] Failed to save favorites:", e));
            return newFavs;
        });
    }, []);

    const generateFilename = (title: string, url: string): string => {
        const urlPath = url.split('?')[0]; // Remove query params
        const urlExtensionMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/);
        const extension = urlExtensionMatch ? urlExtensionMatch[1] : 'file'; // Default extension
        const safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_');
        return `${safeTitle}.${extension}`;
    };

    const requestDownload = useCallback(async (resource: Resource, moduleName?: string, resourceType?: string) => {
        if (!currentUser) {
             Alert.alert("Connexion Requise", "Veuillez vous connecter pour télécharger des fichiers.");
             return;
        }
        if (downloading[resource.id] || downloadedFilesInfo.has(resource.id)) {
             console.log(`[ResourceContext] Download already in progress or completed for: ${resource.id}`);
            return; // Already downloading or downloaded
        }

        console.log(`[ResourceContext] Requesting download for: ${resource.title} (${resource.id})`);
        setDownloading(prev => ({ ...prev, [resource.id]: true }));

        const fileName = generateFilename(resource.title, resource.url);
        // Ensure the directory exists
        const directory = FileSystem.documentDirectory + 'resource_downloads/';
        try {
            await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        } catch (dirError) {
            console.error("[ResourceContext] Failed to create download directory:", dirError);
            Alert.alert("Erreur Téléchargement", "Impossible de créer le dossier de destination.");
            setDownloading(prev => ({ ...prev, [resource.id]: false }));
            return;
        }

        const localUri = directory + fileName;

        try {
             console.log(`[ResourceContext] Starting download from ${resource.url} to ${localUri}`);
            const downloadResumable = FileSystem.createDownloadResumable(
                resource.url,
                localUri,
                {}, // Optional options
                 (downloadProgress) => {
                     const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                     // console.log(`Download Progress (${resource.id}): ${progress * 100}%`); // Can be noisy
                 }
            );

            const result = await downloadResumable.downloadAsync();

            if (result && result.status === 200) { // Check for successful status code
                 console.log(`[ResourceContext] Download finished successfully: ${result.uri}`);
                const newDownloadMeta: DownloadedResourceMeta = {
                    ...resource,
                    localUri: result.uri,
                    downloadedAt: Date.now(),
                    moduleName: moduleName, // Store context
                    resourceType: resourceType,
                };

                setDownloadedFilesInfo(prev => {
                    const newMap = new Map(prev);
                    newMap.set(resource.id, newDownloadMeta);
                    // Save updated map to AsyncStorage
                    AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(Array.from(newMap.values())))
                        .catch(e => console.error("[ResourceContext] Failed to save downloads meta:", e));
                    return newMap;
                });

            } else {
                throw new Error(`Download failed with status: ${result?.status}`);
            }

        } catch (error) {
            console.error(`[ResourceContext] Download error for ${resource.id}:`, error);
            Alert.alert("Erreur Téléchargement", `Impossible de télécharger "${resource.title}". Vérifiez votre connexion ou le lien.`);
             // Clean up potentially incomplete file
             try { await FileSystem.deleteAsync(localUri, { idempotent: true }); } catch (delError) { /* Ignore delete error */ }
        } finally {
            setDownloading(prev => {
                const newState = { ...prev };
                delete newState[resource.id]; // Remove from downloading state regardless of outcome
                return newState;
            });
        }
    }, [currentUser, downloading, downloadedFilesInfo]); // Include dependencies


    const deleteDownload = useCallback(async (resourceId: string) => {
        const downloadInfo = downloadedFilesInfo.get(resourceId);
        if (!downloadInfo) return;

        console.log(`[ResourceContext] Deleting download: ${downloadInfo.title} (${resourceId})`);
        try {
            await FileSystem.deleteAsync(downloadInfo.localUri, { idempotent: true });
            setDownloadedFilesInfo(prev => {
                const newMap = new Map(prev);
                newMap.delete(resourceId);
                // Save updated map to AsyncStorage
                AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(Array.from(newMap.values())))
                    .catch(e => console.error("[ResourceContext] Failed to save downloads meta after delete:", e));
                return newMap;
            });
             console.log(`[ResourceContext] Deleted file and metadata: ${resourceId}`);
        } catch (error) {
            console.error(`[ResourceContext] Failed to delete download ${resourceId}:`, error);
            Alert.alert("Erreur", "Impossible de supprimer le fichier téléchargé.");
        }
    }, [downloadedFilesInfo]);

    // --- Helper functions for components ---
    const isFavorite = (resourceId: string) => favorites.has(resourceId);
    const getDownloadInfo = (resourceId: string) => downloadedFilesInfo.get(resourceId);
    const isDownloading = (resourceId: string) => !!downloading[resourceId];

    const value = {
        favorites,
        downloadedFilesInfo,
        downloading,
        toggleFavorite,
        requestDownload,
        deleteDownload,
        isFavorite,
        getDownloadInfo,
        isDownloading,
        loadResourceData,
        isLoadingResources
    };

    return <ResourceContext.Provider value={value}>{children}</ResourceContext.Provider>;
};

// Custom hook to use the Resource context
export const useResources = () => {
    const context = useContext(ResourceContext);
    if (context === undefined) {
        throw new Error('useResources must be used within a ResourceProvider');
    }
    return context;
};