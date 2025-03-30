// File: app/specialty/[specialtyId].tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, LayoutAnimation, UIManager
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'; // Firestore imports

import { db } from '../../firebaseConfig'; // Adjust path
import { Colors } from  '../../constants/Colors'; // Adjust path
import { useColorScheme } from '../../hooks/useColorScheme'
import { Module } from '../../constants/Data'; // Keep Module interface
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SpecialtyDetailScreen() {
  const { specialtyId } = useLocalSearchParams<{ specialtyId: string }>(); // Type specialtyId
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { currentUser } = useAuth(); // Get user status for conditional logic

  // --- State ---
  const [specialtyName, setSpecialtyName] = useState<string>('Chargement...');
  const [specialtyYear, setSpecialtyYear] = useState<string>(''); // Store Year name if needed
  const [modulesBySemester, setModulesBySemester] = useState<Record<string, Module[]>>({});
  const [availableSemesterKeys, setAvailableSemesterKeys] = useState<string[]>([]);
  const [selectedSemesterKey, setSelectedSemesterKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    if (!specialtyId || !db) {
        setFetchError("Invalid Specialty ID or Database unavailable.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setFetchError(null);
    console.log("[SpecialtyDetailScreen] Loading for ID:", specialtyId);

    try {
        // 1. Fetch Specialty Details
        const specialtyDocRef = doc(db, "specialties", specialtyId);
        const specialtySnap = await getDoc(specialtyDocRef);

        if (!specialtySnap.exists()) {
            throw new Error(`Specialty document not found for ID: ${specialtyId}`);
        }
        const specialtyData = specialtySnap.data();
        setSpecialtyName(specialtyData.name || 'Nom Inconnu');

        // Optionally fetch Year name if needed for display
        if (specialtyData.yearId) {
            const yearDocRef = doc(db, "years", specialtyData.yearId);
            const yearSnap = await getDoc(yearDocRef);
            if (yearSnap.exists()) {
                setSpecialtyYear(yearSnap.data()?.name || '');
            }
        }

        // 2. Fetch Modules for this Specialty
        const modulesQuery = query(
            collection(db, "modules"),
            where("specialtyId", "==", specialtyId)
            // Add orderBy('semesterKey') or order by module name if desired
        );
        const modulesSnapshot = await getDocs(modulesQuery);

        const fetchedModulesBySemester: Record<string, Module[]> = {};
        modulesSnapshot.forEach(doc => {
            const moduleData = { id: doc.id, ...doc.data() } as Module;
            const semester = moduleData.semesterKey || 'Semestre Inconnu';
            if (!fetchedModulesBySemester[semester]) {
                fetchedModulesBySemester[semester] = [];
            }
            fetchedModulesBySemester[semester].push(moduleData);
        });

        setModulesBySemester(fetchedModulesBySemester);
        const semesterKeys = Object.keys(fetchedModulesBySemester).sort(); // Sort keys if needed
        setAvailableSemesterKeys(semesterKeys);

        if (semesterKeys.length > 0) {
            setSelectedSemesterKey(semesterKeys[0]); // Default to first semester
        } else {
            setSelectedSemesterKey(null);
        }

    } catch (error: any) {
        console.error("[SpecialtyDetailScreen] Error fetching data:", error);
        setFetchError(error.message || "Failed to load specialty details.");
        setSpecialtyName('Erreur Chargement');
    } finally {
        setIsLoading(false);
    }
  }, [specialtyId]); // Re-run if specialtyId changes

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Memoize Current Modules ---
  const currentModules = useMemo(() => {
    return (selectedSemesterKey && modulesBySemester[selectedSemesterKey]) ? modulesBySemester[selectedSemesterKey] : [];
  }, [selectedSemesterKey, modulesBySemester]);


    // --- Render Helper for Module Card (Navigates on Press) ---
    const renderModuleCard = (module: Module, index: number) => {
        const moduleIdForNav = module.id; // Use the Firestore document ID directly

        // We don't know if resources exist until the next screen,
        // so we won't disable the card here. We'll rely on the next screen
        // showing "No resources" or the AuthGuard/login prompt.
        // const hasAnyResource = /* Logic removed */;

        const handleCardPress = () => {
            if (!currentUser) {
                 Alert.alert("Connexion Requise", "Connectez-vous pour accéder aux modules.", [ { text: "Annuler" }, { text: "Se Connecter", onPress: () => router.push('/auth') } ]);
                 return; // Stop further execution
            }
            if (!moduleIdForNav) {
                 console.error("Module missing Firestore ID:", module);
                 Alert.alert("Erreur", "Impossible d'ouvrir ce module (ID manquant).");
                 return;
            }
            console.log("Navigating to module screen with ID:", moduleIdForNav);
            router.push(`/module/${moduleIdForNav}`); // Navigate using Firestore ID
        };

        return (
            <TouchableOpacity
                key={moduleIdForNav || `module-${index}`} // Fallback key
                style={styles.moduleCard}
                onPress={handleCardPress}
                activeOpacity={0.7}
            >
                {/* Content of the card */}
                <View style={styles.moduleCardContent}>
                   <Text style={styles.moduleTitle}>{module.name}</Text>
                   <View style={styles.moduleInfoContainer}>
                        {/* ... Module Info Rows (Coefficient, Credits, Evals, Elim) ... */}
                        <View style={styles.moduleInfoRow}>
                            <Text style={styles.moduleInfoText}><FontAwesome name="bookmark" size={12} color={styles.iconColor.color} /> Coef: {module.coefficient}</Text>
                            <Text style={styles.moduleInfoText}><FontAwesome name="star" size={12} color={styles.iconColor.color} /> Crédits: {module.credits}</Text>
                        </View>
                        <View style={styles.moduleInfoRow}>
                            <Text style={styles.moduleInfoLabel}>Évaluations:</Text>
                            <Text style={styles.moduleInfoText}>{module.evaluations.join(', ')}</Text>
                        </View>
                        {module.noteEliminatoire !== undefined && module.noteEliminatoire !== null && (
                            <View style={styles.moduleInfoRow}>
                                <Text style={[styles.moduleInfoLabel, styles.eliminationNote]}><FontAwesome name="exclamation-triangle" size={12} color={styles.eliminationNote.color}/> Note Élim.:</Text>
                                <Text style={[styles.moduleInfoText, styles.eliminationNote]}>{module.noteEliminatoire}</Text>
                            </View>
                        )}
                   </View>
                </View>
                {/* Arrow indicator */}
                <View style={styles.moduleArrowContainer}>
                   <Ionicons name="chevron-forward" size={20} color={styles.chevronColor.color} />
                </View>
            </TouchableOpacity>
        );
    }


  // --- Loading / Error States ---
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }
   if (fetchError) {
       return (
           <View style={styles.loadingContainer}>
               <Ionicons name="cloud-offline-outline" size={50} color={colors.danger} />
               <Text style={styles.errorText}>{fetchError}</Text>
               {/* Optional: Add a retry button */}
               <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
                   <Text style={styles.retryButtonText}>Réessayer</Text>
               </TouchableOpacity>
           </View>
       );
   }

  // --- Main Screen Render ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Configure Header */}
        <Stack.Screen
            options={{
                headerTitle: specialtyName === 'Chargement...' || specialtyName === 'Erreur Chargement' ? 'Détails' : specialtyName,
                // ... other header options
                headerStyle: { backgroundColor: colors.cardBackground },
                headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
                headerTintColor: colors.tint
            }}
        />
        <Text style={styles.headerTitle}>{specialtyName}</Text>
        {specialtyYear && <Text style={styles.headerSubtitle}>{specialtyYear}</Text>}

        {/* Semester Selection (Keep logic as is, using fetched keys) */}
         {availableSemesterKeys.length === 0 && !isLoading ? (
              <Text style={styles.infoText}>Aucun semestre trouvé pour cette spécialité.</Text>
         ) : availableSemesterKeys.length === 1 && selectedSemesterKey ? (
               <Text style={styles.singleSemesterText}>{selectedSemesterKey}</Text>
         ) : availableSemesterKeys.length > 1 ? (
           <View style={styles.semesterSelector}>
             {availableSemesterKeys.map((semKey) => (
               <TouchableOpacity
                 key={semKey}
                 style={[ styles.semesterButton, selectedSemesterKey === semKey && styles.semesterButtonActive ]}
                 onPress={() => {
                     LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                     setSelectedSemesterKey(semKey);
                 }}
                 disabled={selectedSemesterKey === semKey}
                 activeOpacity={0.7}
               >
                 <Text style={[ styles.semesterButtonText, selectedSemesterKey === semKey && styles.semesterButtonTextActive ]}>
                   {semKey}
                 </Text>
               </TouchableOpacity>
             ))}
           </View>
         ) : null}


        {/* Module List */}
        <View style={styles.moduleList}>
          {currentModules.length > 0 ? (
            currentModules.map(renderModuleCard)
          ) : (selectedSemesterKey && !isLoading) ? (
            <Text style={styles.infoText}>Aucun module trouvé pour {selectedSemesterKey}.</Text>
          ): null}
        </View>

        <View style={{ height: 50 }} />{/* Bottom Spacer */}
    </ScrollView>
  );
}


// --- Styles ---
const getStyles = (colorScheme: 'light' | 'dark') => {
    const colors = Colors[colorScheme];
    return StyleSheet.create({
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
        loadingText: { marginTop: 15, fontSize: 16, color: colors.textSecondary },
        errorText: { color: colors.danger ?? '#dc2626', fontSize: 16, textAlign: 'center', marginTop: 10 },
        retryButton: { marginTop: 20, backgroundColor: colors.tint, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
        retryButtonText: { color: '#fff', fontWeight: 'bold' },
        container: { flex: 1, backgroundColor: colors.background },
        contentContainer: { paddingVertical: 20, paddingHorizontal: 15 },
        headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 5 },
        headerSubtitle: { fontSize: 15, color: colors.textSecondary ?? '#666', textAlign: 'center', marginBottom: 25 },
        semesterSelector: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 30, alignSelf: 'center' },
        semesterButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, /* ...shadows... */ },
        semesterButtonActive: { backgroundColor: colors.tint, borderColor: colors.tint, /* ...shadows... */ },
        semesterButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
        semesterButtonTextActive: { color: colorScheme === 'dark' ? colors.text : '#ffffff' },
        singleSemesterText: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 25, marginTop: 10, /* ... styles ... */ },
        moduleList: { marginTop: 10 },
        moduleCard: { backgroundColor: colors.cardBackground ?? '#ffffff', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12, /* ...shadows... */ borderLeftWidth: 5, borderLeftColor: colors.tint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        moduleCardDisabled: { opacity: 0.6, borderLeftColor: colors.border }, // Keep style if needed for UI indication later
        moduleCardContent: { flex: 1, marginRight: 8 },
        moduleTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
        moduleInfoContainer: {},
        moduleInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 },
        moduleInfoLabel: { fontSize: 12, fontWeight: '500', color: colors.textSecondary ?? '#666' },
        moduleInfoText: { fontSize: 13, color: colors.text, marginLeft: 4 },
        iconColor: { color: colors.textSecondary },
        eliminationNote: { color: colors.danger ?? '#dc2626', fontWeight: '600', fontSize: 12 },
        moduleArrowContainer: { paddingLeft: 10 },
        chevronColor: { color: colors.textSecondary + '99' },
        noResourceIndicator: { fontSize: 11, color: colors.textSecondary + 'A0', fontStyle: 'italic' }, // Keep style if needed
        infoText: { textAlign: 'center', color: colors.textSecondary ?? '#777', marginTop: 30, fontSize: 15, paddingHorizontal: 10 },
    });
};