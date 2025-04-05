// File: app/contexts/ResourceContext.tsx
import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback,
    ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
// Assuming Resource interface is defined correctly, potentially in a central types file
// If not, define it here or import appropriately
// Example: export interface Resource { id: string; title: string; url: string; type?: string; source?: string; moduleId: string; }
import { Resource } from '../../constants/Data'; // Adjust path if needed
import { useAuth } from './AuthContext';

// --- Helper Function ---
export function sanitizeFilename(name: string): string {
    // Remove invalid characters for filenames, replace spaces, limit length
    // Allows letters, numbers, underscore, hyphen, space (which gets replaced)
    const cleaned = name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
    // Replace multiple spaces/underscores with single underscore, limit length
    return cleaned.replace(/[\s_]+/g, '_').substring(0, 100);
}

// --- Interfaces ---
export interface DownloadedResourceMeta extends Resource {
    localUri: string;
    downloadedAt: number;
    moduleName?: string; // Context info
    resourceType?: string; // Context info
    originalUrl: string; // Store original URL
    fileExtension: string; // Store the extension used for saving '.pdf', '.docx', etc.
}

interface ResourceContextProps {
    favorites: Set<string>;
    downloadedFilesInfo: Map<string, DownloadedResourceMeta>;
    downloading: Record<string, boolean>; // { [resourceId]: true }
    downloadErrors: Record<string, string | null>; // Store download errors per resource { [resourceId]: 'Error message' }
    toggleFavorite: (resourceId: string) => void;
    requestDownload: (
        resource: Resource,
        moduleName?: string,
        resourceType?: string
    ) => Promise<void>;
    deleteDownload: (resourceId: string) => Promise<void>;
    isFavorite: (resourceId: string) => boolean;
    getDownloadInfo: (resourceId: string) => DownloadedResourceMeta | undefined;
    isDownloading: (resourceId: string) => boolean;
    getDownloadError: (resourceId: string) => string | null;
    loadResourceData: () => Promise<void>; // Function to trigger loading manually if needed
    isLoadingResources: boolean; // Loading state for initial load
}

const ResourceContext = createContext<ResourceContextProps | undefined>(
    undefined
);

const FAVORITES_STORAGE_KEY = '@ModuleResourceFavorites_v1'; // Versioning keys is good practice
const DOWNLOADS_STORAGE_KEY = '@ModuleResourceDownloads_v1';
const DOWNLOAD_DIRECTORY = FileSystem.documentDirectory + 'resource_downloads/'; // Define constant directory

export const ResourceProvider = ({ children }: { children: ReactNode }) => {
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [downloadedFilesInfo, setDownloadedFilesInfo] = useState<Map<string, DownloadedResourceMeta>>(new Map());
    const [downloading, setDownloading] = useState<Record<string, boolean>>({});
    const [downloadErrors, setDownloadErrors] = useState<Record<string, string | null>>({});
    const [isLoadingResources, setIsLoadingResources] = useState(true);
    const { currentUser } = useAuth(); // Get user context

    // --- Load initial data from AsyncStorage ---
    const loadResourceData = useCallback(async () => {
        console.log('[ResourceContext] Loading favorites and downloads from AsyncStorage...');
        setIsLoadingResources(true);
        try {
            // Ensure download directory exists on load
            try {
                await FileSystem.makeDirectoryAsync(DOWNLOAD_DIRECTORY, { intermediates: true });
                console.log(`[ResourceContext] Ensured download directory exists: ${DOWNLOAD_DIRECTORY}`);
            } catch (dirError) {
                console.error('[ResourceContext] Failed to ensure download directory exists on load:', dirError);
                // Non-fatal, proceed with loading metadata, but downloads might fail later
            }

            const [favsJson, downloadsJson] = await Promise.all([
                AsyncStorage.getItem(FAVORITES_STORAGE_KEY),
                AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY),
            ]);

            // Load Favorites
            const favIds = favsJson ? new Set<string>(JSON.parse(favsJson)) : new Set<string>();
            setFavorites(favIds);
            console.log(`[ResourceContext] Loaded ${favIds.size} favorites.`);

            // Load and Verify Downloads Metadata
            const downloadsArray = downloadsJson ? (JSON.parse(downloadsJson) as DownloadedResourceMeta[]) : [];
            const verifiedMap = new Map<string, DownloadedResourceMeta>();
            let verificationRemovedItems = false;

            for (const download of downloadsArray) {
                // Basic check for essential properties in stored metadata
                if (!download || !download.id || !download.localUri || !download.fileExtension) {
                    console.warn('[ResourceContext] Skipping invalid/incomplete download metadata entry:', download);
                    verificationRemovedItems = true;
                    continue;
                }
                try {
                    // Check if the file actually exists at the stored localUri
                    const fileInfo = await FileSystem.getInfoAsync(download.localUri);
                    if (fileInfo.exists && !fileInfo.isDirectory) {
                        // File exists, keep the metadata
                        verifiedMap.set(download.id, download);
                    } else {
                        // File missing or is a directory (unexpected)
                        console.warn(`[ResourceContext] Downloaded file missing/invalid, removing metadata: ${download.localUri}`);
                        verificationRemovedItems = true;
                    }
                } catch (fileError) {
                    console.error(`[ResourceContext] Error checking file ${download.localUri}:`, fileError);
                    // Remove metadata if file check fails to prevent issues
                    verificationRemovedItems = true;
                }
            }
            setDownloadedFilesInfo(verifiedMap);
            console.log(`[ResourceContext] Loaded and verified ${verifiedMap.size} downloads metadata entries.`);

            // If verification removed any items, update AsyncStorage with the cleaned list
            if (verificationRemovedItems) {
                console.log('[ResourceContext] Saving cleaned download list back to storage.');
                await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(Array.from(verifiedMap.values())));
            }

        } catch (error) {
            console.error('[ResourceContext] Failed to load resource data from storage:', error);
            // Consider resetting state or showing an error to the user
            // setFavorites(new Set());
            // setDownloadedFilesInfo(new Map());
        } finally {
            setIsLoadingResources(false);
        }
    }, []); // Empty dependency array: loadResourceData instance doesn't change

    // Load data when the provider mounts or when user logs in/out (auth status changes)
    useEffect(() => {
        // Check if auth status is determined (not undefined) before loading
        if (currentUser !== undefined) {
            loadResourceData();
        }
    }, [currentUser, loadResourceData]); // Reload if user changes or on initial mount

    // --- Favorite Action ---
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
            // Save immediately to AsyncStorage (fire and forget error handling)
            AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(newFavs)))
                .catch(e => console.error("[ResourceContext] Failed to save favorites:", e));
            return newFavs;
        });
    }, []); // Empty dependency array is correct

    // --- Download Action ---
    const requestDownload = useCallback(async (resource: Resource, moduleName?: string, resourceType?: string) => {
        if (!currentUser) {
            Alert.alert("Connexion Requise", "Veuillez vous connecter pour télécharger des fichiers.");
            return;
        }
        if (downloading[resource.id] || downloadedFilesInfo.has(resource.id)) {
            console.log(`[ResourceContext] Download skipped (already downloading or completed): ${resource.id}`);
            const existing = downloadedFilesInfo.get(resource.id);
            if (existing) {
                Alert.alert("Déjà Téléchargé", `"${resource.title}" (${existing.fileExtension}) est déjà disponible hors ligne.`);
            }
            return;
        }

        console.log(`[ResourceContext] Requesting download for: ${resource.title} (${resource.id})`);
        setDownloading(prev => ({ ...prev, [resource.id]: true }));
        setDownloadErrors(prev => ({ ...prev, [resource.id]: null })); // Clear previous error for this resource

        let finalDownloadUrl = resource.url;
        let fileExtension = '.file'; // Default extension if cannot be determined
        let isGoogleDrive = false;

        // --- Google Drive URL Transformation ---
        if (resource.url.includes('drive.google.com')) {
            try {
                let fileId = null;
                // Try extracting ID from common URL patterns (view, open, file/d/)
                const fileIdMatch = resource.url.match(/\/d\/([a-zA-Z0-9_-]+)/) || resource.url.match(/id=([a-zA-Z0-9_-]+)/);

                if (fileIdMatch && fileIdMatch[1]) {
                    fileId = fileIdMatch[1];
                    finalDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                    fileExtension = '.pdf'; // FORCE PDF extension for Google Drive downloads as requested
                    isGoogleDrive = true;
                    console.log(`[ResourceContext] Transformed Google Drive URL for ${resource.title}: ${finalDownloadUrl}`);
                } else {
                    console.warn(`[ResourceContext] Could not extract Google Drive File ID from URL: ${resource.url}. Attempting download with original URL.`);
                    // Fallback: try original URL, attempt to infer extension
                    const urlPath = resource.url.split('?')[0];
                    const urlExtensionMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/);
                    if (urlExtensionMatch && urlExtensionMatch[1]) {
                         fileExtension = `.${urlExtensionMatch[1].toLowerCase()}`;
                    }
                }
            } catch (e) {
                console.error("[ResourceContext] Error during URL transformation:", e);
                 // Fallback to original URL if transform logic fails
                 finalDownloadUrl = resource.url;
            }
        } else {
            // --- Infer extension for non-Google Drive links ---
            try {
                const urlPath = resource.url.split('?')[0]; // Remove query string
                const urlExtensionMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/); // Match common extensions
                if (urlExtensionMatch && urlExtensionMatch[1]) {
                    fileExtension = `.${urlExtensionMatch[1].toLowerCase()}`;
                } else {
                     console.warn(`[ResourceContext] Could not infer extension for URL: ${resource.url}. Using default: ${fileExtension}`);
                }
            } catch (e) {
                 console.error("[ResourceContext] Error inferring extension:", e);
            }
        }
        // --- End URL Processing ---

        const sanitizedTitle = sanitizeFilename(resource.title);
        const filename = `${sanitizedTitle}${fileExtension}`;
        const localUri = DOWNLOAD_DIRECTORY + filename;

        try {
            console.log(`[ResourceContext] Starting download: ${finalDownloadUrl} -> ${localUri}`);
            // Using createDownloadResumable for potential pause/resume features later
            const downloadResumable = FileSystem.createDownloadResumable(
                finalDownloadUrl,
                localUri,
                {}, // Optional: headers, etc.
                (downloadProgress) => {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    // TODO: Could update state with progress here for UI feedback
                    // console.log(`Download Progress (${resource.id}): ${Math.round(progress * 100)}%`);
                }
            );

            const result = await downloadResumable.downloadAsync();

            if (result && result.status >= 200 && result.status < 300) { // Check for successful HTTP status
                console.log(`[ResourceContext] Download finished successfully: ${result.uri}`);
                const newDownloadMeta: DownloadedResourceMeta = {
                    ...resource, // Spread original resource data
                    localUri: result.uri, // Use the URI returned by downloadAsync (might differ slightly)
                    downloadedAt: Date.now(),
                    moduleName: moduleName,
                    resourceType: resourceType,
                    originalUrl: resource.url, // Store original URL
                    fileExtension: fileExtension, // Store the determined extension
                };

                // Update state and save to AsyncStorage
                setDownloadedFilesInfo(prev => {
                    const newMap = new Map(prev);
                    newMap.set(resource.id, newDownloadMeta);
                    // Save updated map to AsyncStorage
                    AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(Array.from(newMap.values())))
                        .catch(e => console.error("[ResourceContext] Failed to save downloads meta:", e));
                    return newMap;
                });

            } else {
                // Handle non-successful status codes (403, 404, 500 etc.)
                throw new Error(`Download failed: Server responded with status ${result?.status}`);
            }

        } catch (error: any) {
            console.error(`[ResourceContext] Download error for ${resource.id} (${filename}):`, error);
            const errorMessage = error.message || 'Erreur de téléchargement inconnue';
            setDownloadErrors(prev => ({ ...prev, [resource.id]: errorMessage }));
            Alert.alert("Échec du Téléchargement", `Impossible de télécharger "${resource.title}".\n${errorMessage}`);
            // Clean up potentially incomplete file if download failed
            try {
                await FileSystem.deleteAsync(localUri, { idempotent: true });
                console.log(`[ResourceContext] Cleaned up incomplete file: ${localUri}`);
            } catch (delError) {
                console.warn(`[ResourceContext] Failed to clean up incomplete file ${localUri}:`, delError);
            }
        } finally {
            // Remove from 'downloading' state regardless of outcome
            setDownloading(prev => {
                const newState = { ...prev };
                delete newState[resource.id];
                return newState;
            });
        }
    }, [currentUser, downloading, downloadedFilesInfo]); // Dependencies for the download function

    // --- Delete Action ---
    const deleteDownload = useCallback(async (resourceId: string) => {
        const downloadInfo = downloadedFilesInfo.get(resourceId);
        if (!downloadInfo) {
            console.log(`[ResourceContext] Delete skipped: No download info found for ${resourceId}`);
            return;
        }

        console.log(`[ResourceContext] Deleting download: ${downloadInfo.title} (${resourceId}) at ${downloadInfo.localUri}`);
        try {
            // Delete the actual file from the filesystem
            await FileSystem.deleteAsync(downloadInfo.localUri, { idempotent: true }); // idempotent means don't error if already deleted

            // Update state and save to AsyncStorage
            setDownloadedFilesInfo(prev => {
                const newMap = new Map(prev);
                newMap.delete(resourceId);
                AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(Array.from(newMap.values())))
                    .catch(e => console.error("[ResourceContext] Failed to save downloads meta after delete:", e));
                return newMap;
            });
            console.log(`[ResourceContext] Deleted file and metadata: ${resourceId}`);
        } catch (error) {
            console.error(`[ResourceContext] Failed to delete download file ${downloadInfo.localUri}:`, error);
            Alert.alert("Erreur", "Impossible de supprimer le fichier téléchargé du stockage.");
            // Note: Metadata might still be removed even if file deletion fails, or you could choose to keep it.
             setDownloadedFilesInfo(prev => { // Still attempt to remove metadata
                const newMap = new Map(prev);
                 if (newMap.has(resourceId)) {
                     newMap.delete(resourceId);
                     AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(Array.from(newMap.values())))
                         .catch(e => console.error("[ResourceContext] Failed to save downloads meta after delete error:", e));
                     console.warn(`[ResourceContext] Removed metadata for ${resourceId} despite file deletion error.`);
                 }
                return newMap;
            });
        }
    }, [downloadedFilesInfo]); // Depends on the download info map

    // --- Helper accessors ---
    const isFavorite = (resourceId: string) => favorites.has(resourceId);
    const getDownloadInfo = (resourceId: string) => downloadedFilesInfo.get(resourceId);
    const isDownloading = (resourceId: string) => !!downloading[resourceId];
    const getDownloadError = (resourceId: string) => downloadErrors[resourceId] ?? null;

    // --- Context Value ---
    // Memoize the context value to prevent unnecessary re-renders of consumers
    // if the provider itself re-renders but these specific values haven't changed.
    const value = React.useMemo(() => ({
        favorites,
        downloadedFilesInfo,
        downloading,
        downloadErrors,
        toggleFavorite,
        requestDownload,
        deleteDownload,
        isFavorite,
        getDownloadInfo,
        isDownloading,
        getDownloadError,
        loadResourceData,
        isLoadingResources,
    }), [
        favorites,
        downloadedFilesInfo,
        downloading,
        downloadErrors,
        toggleFavorite,
        requestDownload,
        deleteDownload,
        // isFavorite, getDownloadInfo, isDownloading, getDownloadError are derived, no need to list if functions are stable
        loadResourceData,
        isLoadingResources
    ]);

    return (
        <ResourceContext.Provider value={value}>
            {children}
        </ResourceContext.Provider>
    );
};

// --- Custom Hook ---
export const useResources = (): ResourceContextProps => {
    const context = useContext(ResourceContext);
    if (context === undefined) {
        throw new Error('useResources must be used within a ResourceProvider');
    }
    return context;
};