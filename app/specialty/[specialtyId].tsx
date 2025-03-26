// File: app/specialty/[specialtyId].tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  LayoutAnimation, // Import LayoutAnimation
  UIManager // Import UIManager
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
// Adjust paths as needed
import { universiteBejaiaData, Module, Resource } from '@/constants/Data';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
// Note: ResourceModal and related state/functions are removed as requested.

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Helper function (MUST MATCH THE ONE IN courses.tsx) ---
const generateLinkFromName = (name: string): string => {
    if (!name) return 'invalid-name';
    return name.toLowerCase()
               .replace(/ /g, '-')
               .replace(/[èéê]/g, 'e')
               .replace(/[àâ]/g, 'a')
               .replace(/[ùûü]/g, 'u')
               .replace(/[îï]/g, 'i')
               .replace(/[ô]/g, 'o')
               .replace(/ç/g, 'c')
               .replace(/[^a-z0-9-]/g, '');
};

// Refined Helper function to find specialty details based on the generated link ID
const findSpecialtyDetailsByLink = (linkId: string | undefined | string[]) => {
    if (!linkId || typeof linkId !== 'string') return null;
    const lowerLinkId = linkId.toLowerCase();

    for (const yearKey in universiteBejaiaData) {
        if (Object.prototype.hasOwnProperty.call(universiteBejaiaData, yearKey)) {
            const yearData = universiteBejaiaData[yearKey];
            for (const specialtyName in yearData) {
                if (Object.prototype.hasOwnProperty.call(yearData, specialtyName)) {
                    // Generate the link ID from the data's specialty name for comparison
                    const linkIdFromData = generateLinkFromName(specialtyName);

                    if (linkIdFromData === lowerLinkId) {
                        return {
                            name: specialtyName,
                            year: yearKey,
                            semesters: yearData[specialtyName] || {},
                        };
                    }
                }
            }
        }
    }
    console.warn(`No specialty found in universiteBejaiaData matching link ID: ${lowerLinkId}`);
    return null;
};


export default function SpecialtyDetailScreen() {
  const { specialtyId } = useLocalSearchParams(); // Get the dynamic parameter from the route
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme); // Generate styles based on theme
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light; // Get color palette
  const router = useRouter(); // Initialize router for navigation

  // --- State ---
  const [specialtyName, setSpecialtyName] = useState<string>('Chargement...');
  const [specialtyYear, setSpecialtyYear] = useState<string>('');
  const [semesters, setSemesters] = useState<Record<string, Module[]>>({});
  const [availableSemesterKeys, setAvailableSemesterKeys] = useState<string[]>([]);
  const [selectedSemesterKey, setSelectedSemesterKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // --- No Modal State Needed Here ---

  // --- Load Specialty Data Effect ---
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    console.log("[SpecialtyDetailScreen] Loading for ID:", specialtyId);

    const details = findSpecialtyDetailsByLink(specialtyId);

    if (isMounted) {
        if (details) {
            console.log("[SpecialtyDetailScreen] Found Details:", details);
            setSpecialtyName(details.name);
            setSpecialtyYear(details.year);
            setSemesters(details.semesters);
            const semesterKeys = Object.keys(details.semesters);
            setAvailableSemesterKeys(semesterKeys);
            // Default to first semester if available
            if (semesterKeys.length > 0) {
                setSelectedSemesterKey(semesterKeys[0]);
            } else {
                setSelectedSemesterKey(null);
            }
        } else {
            console.error("[SpecialtyDetailScreen] Details not found for ID:", specialtyId);
            setSpecialtyName('Spécialité Introuvable');
            setSpecialtyYear('');
            setSemesters({});
            setAvailableSemesterKeys([]);
            setSelectedSemesterKey(null);
            Alert.alert("Erreur", `Détails non trouvés pour la spécialité: ${specialtyId}. Vérifiez les données ou le lien.`);
            // Optionally navigate back if critical error
            // if(router.canGoBack()) router.back();
        }
        setIsLoading(false);
    }
    return () => { isMounted = false; }; // Cleanup on unmount
  }, [specialtyId]); // Re-run if the route parameter changes

  // --- Memoize Current Modules ---
  const currentModules = useMemo(() => {
    return (selectedSemesterKey && semesters[selectedSemesterKey]) ? semesters[selectedSemesterKey] : [];
  }, [selectedSemesterKey, semesters]);

  // --- Helper: Generate Unique Module ID for Navigation ---
  const generateModuleIdForNav = (module: Module): string => {
        const specialtyLinkId = (specialtyId as string) || 'unknown-specialty'; // Get from route param
        const semesterId = selectedSemesterKey?.toLowerCase().replace(' ', '-') || 'unknown-semester';
        const moduleLinkPart = module.matiere.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        // Combine parts ensuring uniqueness (specialty_semester_module)
        return `${specialtyLinkId}_${semesterId}_${moduleLinkPart}`;
   };
  // --- ---


  // --- Loading State ---
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  // --- Render Helper for Module Card (Navigates on Press) ---
  const renderModuleCard = (module: Module, index: number) => {
     const moduleIdForNav = generateModuleIdForNav(module); // Generate ID for navigation

     // Check if there are ANY resources defined for this module
     const hasAnyResource = module.resources && Object.values(module.resources).some(arr => arr && arr.length > 0);

     return (
         <TouchableOpacity
             key={moduleIdForNav} // Use unique ID as key
             style={[styles.moduleCard, !hasAnyResource && styles.moduleCardDisabled]}
             onPress={() => {
                 if (hasAnyResource) {
                    console.log("Navigating to module screen with ID:", moduleIdForNav);
                    router.push(`/module/${moduleIdForNav}`); // Navigate to the resource screen
                 } else {
                    Alert.alert("Info", "Aucune ressource n'est actuellement disponible pour ce module.");
                 }
             }}
             disabled={!hasAnyResource}
             activeOpacity={hasAnyResource ? 0.7 : 1.0}
         >
             {/* Content of the card */}
             <View style={styles.moduleCardContent}>
                <Text style={styles.moduleTitle}>{module.matiere}</Text>
                <View style={styles.moduleInfoContainer}>
                    <View style={styles.moduleInfoRow}>
                        <Text style={styles.moduleInfoText}><FontAwesome name="bookmark" size={12} color={styles.iconColor.color} /> Coef: {module.coefficient}</Text>
                        <Text style={styles.moduleInfoText}><FontAwesome name="star" size={12} color={styles.iconColor.color} /> Crédits: {module.credits}</Text>
                    </View>
                    <View style={styles.moduleInfoRow}>
                        <Text style={styles.moduleInfoLabel}>Évaluations:</Text>
                        <Text style={styles.moduleInfoText}>{module.evaluations.join(', ')}</Text>
                    </View>
                    {module.noteEliminatoire !== undefined && (
                        <View style={styles.moduleInfoRow}>
                            <Text style={[styles.moduleInfoLabel, styles.eliminationNote]}><FontAwesome name="exclamation-triangle" size={12} color={styles.eliminationNote.color}/> Note Élim.:</Text>
                            <Text style={[styles.moduleInfoText, styles.eliminationNote]}>{module.noteEliminatoire}</Text>
                        </View>
                    )}
                </View>
             </View>

             {/* Arrow indicator */}
             <View style={styles.moduleArrowContainer}>
                {hasAnyResource ? (
                    <Ionicons name="chevron-forward" size={20} color={styles.chevronColor.color} />
                ) : (
                    <Text style={styles.noResourceIndicator}>Aucune ressource</Text>
                )}
             </View>
         </TouchableOpacity>
     );
  }

  // --- Main Screen Render ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Configure Header */}
        <Stack.Screen
            options={{
                headerTitle: specialtyName === 'Chargement...' || specialtyName === 'Spécialité Introuvable' ? 'Détails' : specialtyName,
                headerShown: true,
                headerStyle: { backgroundColor: colors.cardBackground },
                headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
                headerTintColor: colors.tint
            }}
        />

        {/* Screen Content Header */}
        <Text style={styles.headerTitle}>{specialtyName}</Text>
        {specialtyYear && <Text style={styles.headerSubtitle}>{specialtyYear}</Text>}

        {/* Semester Selection */}
        {availableSemesterKeys.length === 0 && !isLoading ? (
             <Text style={styles.infoText}>Aucun semestre défini pour cette spécialité.</Text>
        ) : availableSemesterKeys.length === 1 && selectedSemesterKey ? (
              <Text style={styles.singleSemesterText}>{selectedSemesterKey}</Text>
        ) : availableSemesterKeys.length > 1 ? (
          <View style={styles.semesterSelector}>
            {availableSemesterKeys.map((semKey) => (
              <TouchableOpacity
                key={semKey}
                style={[ styles.semesterButton, selectedSemesterKey === semKey && styles.semesterButtonActive ]}
                onPress={() => {
                    // Animate list change
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
            currentModules.map(renderModuleCard) // Use the updated card renderer
          ) : (selectedSemesterKey && !isLoading) ? (
            <Text style={styles.infoText}>Aucun module trouvé pour {selectedSemesterKey}.</Text>
          ): null}
        </View>

        <View style={{ height: 50 }} />{/* Bottom Spacer */}
    </ScrollView>
    // No Modal needed here
  );
}


// --- Styles ---
const getStyles = (colorScheme: 'light' | 'dark') => {
    const colors = colorScheme === 'dark' ? Colors.dark : Colors.light; // Use Colors directly
    return StyleSheet.create({
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
        loadingText: { marginTop: 15, fontSize: 16, color: colors.textSecondary },
        errorText: { color: colors.danger ?? '#dc2626', fontSize: 16, textAlign: 'center' },
        container: { flex: 1, backgroundColor: colors.background },
        contentContainer: { paddingVertical: 20, paddingHorizontal: 15 },
        headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 5 }, // Reduced bottom margin
        headerSubtitle: { fontSize: 15, color: colors.textSecondary ?? '#666', textAlign: 'center', marginBottom: 25 },
        semesterSelector: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 30, alignSelf: 'center' },
        semesterButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
        semesterButtonActive: { backgroundColor: colors.tint, borderColor: colors.tint, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
        semesterButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
        semesterButtonTextActive: { color: colorScheme === 'dark' ? colors.text : '#ffffff' },
        singleSemesterText: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 25, marginTop: 10, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: colors.cardBackground, borderRadius: 10, alignSelf: 'center', borderWidth: 1, borderColor: colors.border },
        moduleList: { marginTop: 10 },
        moduleCard: {
            backgroundColor: colors.cardBackground ?? '#ffffff',
            borderRadius: 10,
            paddingVertical: 12, // Reduced vertical padding
            paddingHorizontal: 16,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 2,
            borderLeftWidth: 5,
            borderLeftColor: colors.tint,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        moduleCardDisabled: {
             opacity: 0.6,
             borderLeftColor: colors.border,
        },
        moduleCardContent: { // Container for title and info, excludes arrow
            flex: 1, // Take available width
            marginRight: 8, // Space before arrow
        },
        moduleTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }, // Reduced margin
        moduleInfoContainer: {}, // Container for info rows
        moduleInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 }, // Reduced gap/margin
        moduleInfoLabel: { fontSize: 12, fontWeight: '500', color: colors.textSecondary ?? '#666', }, // Smaller label
        moduleInfoText: { fontSize: 13, color: colors.text, marginLeft: 4, }, // Smaller text
        iconColor: { color: colors.textSecondary },
        eliminationNote: { color: colors.danger ?? '#dc2626', fontWeight: '600', fontSize: 12, }, // Smaller elim note
        moduleArrowContainer: { // Container for the forward arrow
             paddingLeft: 10,
        },
        chevronColor: { color: colors.textSecondary + '99', }, // Style object for chevron
        noResourceIndicator: { // Text shown when card is disabled
            fontSize: 11,
            color: colors.textSecondary + 'A0',
            fontStyle: 'italic',
        },
        infoText: { textAlign: 'center', color: colors.textSecondary ?? '#777', marginTop: 30, fontSize: 15, paddingHorizontal: 10, },
    });
};
// --- End Styles ---