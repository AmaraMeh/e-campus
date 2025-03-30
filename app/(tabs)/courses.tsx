// File: app/(tabs)/courses.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Platform, LayoutAnimation, UIManager, Alert, ActivityIndicator, // Added ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore'; // Import Firestore functions

import { db } from '../../firebaseConfig'; // Adjust path
import { Colors } from '../../constants/Colors'; // Adjust path
import { useColorScheme } from '../../hooks/useColorScheme'; // Adjust path
// Removed import of universiteBejaiaData
// Import helper if you moved generateLinkFromName, otherwise define it here if needed
// import { generateLinkFromName } from '@/utils/helpers';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Interfaces (Consider moving to a central types file) ---
interface YearItem {
    id: string; // Firestore document ID
    name: string;
    order: number;
}
interface SpecialtyItem {
    id: string; // Firestore document ID
    name: string;
    yearId: string;
    icon?: string; // FontAwesome name
    campus?: string; // Campus name string
}
// ---

// --- Helper Component: CollapsibleSection ---
interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
    titleColor?: string;
    bgColor?: string;
    borderColor?: string;
    level?: number;
    startExpanded?: boolean;
}

// Define CollapsibleSection component here (copy from previous response or your file)
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title, children, iconName, titleColor, bgColor, borderColor, level = 0, startExpanded = false
}) => {
    const [isExpanded, setIsExpanded] = useState(startExpanded);
    const colorScheme = useColorScheme() ?? 'light';
    // Use getStyles defined later in this file
    const styles = getStyles(colorScheme); // Pass colorScheme

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    // Styles logic using styles from getStyles
    const containerStyle = [
        styles.collapsibleContainer,
        { backgroundColor: bgColor ?? styles.collapsibleContainer.backgroundColor,
          borderColor: borderColor ?? styles.collapsibleContainer.borderColor },
        level === 1 && styles.nestedCollapsibleContainer,
    ];
     const headerStyle = [
         styles.collapsibleHeader,
         level === 1 && styles.nestedCollapsibleHeader,
     ];
     const titleStyle = [
         styles.collapsibleTitle,
         { color: titleColor ?? styles.collapsibleTitle.color },
         level === 1 && styles.nestedCollapsibleTitle,
     ];

    return (
        <View style={containerStyle}>
            <TouchableOpacity onPress={toggleExpand} style={headerStyle} activeOpacity={0.7}>
                <View style={styles.collapsibleTitleContainer}>
                     {iconName && <MaterialCommunityIcons name={iconName} size={level === 0 ? 26 : 22} color={titleColor ?? styles.collapsibleTitle.color} />}
                     <Text style={titleStyle}>{title}</Text>
                </View>
                <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={titleColor ?? styles.collapsibleTitle.color}
                />
            </TouchableOpacity>
            {isExpanded && (
                <View style={[styles.collapsibleContent, level === 1 && styles.nestedCollapsibleContent]}>
                    {children}
                </View>
            )}
        </View>
    );
};
// --- End CollapsibleSection ---


// --- Main Courses Screen ---
export default function CoursesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  // Use getStyles defined later in this file
  const styles = getStyles(colorScheme); // Pass colorScheme
  const colors = Colors[colorScheme]; // Get colors based on scheme
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [years, setYears] = useState<YearItem[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    if (!db) {
        setFetchError("Database service not available.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
        console.log("CoursesScreen: Fetching data from Firestore...");
        const yearsQuery = query(collection(db, "years"), orderBy("order", "asc"));
        // Fetch all specialties, filtering/grouping will happen client-side
        const specialtiesQuery = query(collection(db, "specialties"));

        const [yearsSnapshot, specialtiesSnapshot] = await Promise.all([
            getDocs(yearsQuery),
            getDocs(specialtiesQuery)
        ]);

        const fetchedYears: YearItem[] = [];
        yearsSnapshot.forEach(doc => {
            fetchedYears.push({ id: doc.id, ...doc.data() } as YearItem);
        });
        console.log(`CoursesScreen: Fetched ${fetchedYears.length} years.`);

        const fetchedSpecialties: SpecialtyItem[] = [];
        specialtiesSnapshot.forEach(doc => {
            fetchedSpecialties.push({ id: doc.id, ...doc.data() } as SpecialtyItem);
        });
         console.log(`CoursesScreen: Fetched ${fetchedSpecialties.length} specialties.`);

        setYears(fetchedYears);
        setSpecialties(fetchedSpecialties);

    } catch (error) {
        console.error("CoursesScreen: Error fetching data:", error);
        setFetchError("Failed to load academic data.");
        setYears([]);
        setSpecialties([]);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Fetch on mount

  // --- Filter & Group Data ---
  const groupedAndFilteredData = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase().trim();

    // Filter specialties first
    const filteredSpecialties = lowerCaseSearch
        ? specialties.filter(spec => spec.name.toLowerCase().includes(lowerCaseSearch))
        : specialties;

    // Group filtered specialties by Year ID
    const specialtiesByYear: { [yearId: string]: SpecialtyItem[] } = {};
    filteredSpecialties.forEach(spec => {
        if (!specialtiesByYear[spec.yearId]) {
            specialtiesByYear[spec.yearId] = [];
        }
        specialtiesByYear[spec.yearId].push(spec);
    });

    // Group specialties within each year by Campus
    const finalGroupedData: {
        year: YearItem;
        campuses: { campusName: string; specialties: SpecialtyItem[] }[];
    }[] = [];

    years.forEach(year => {
        const yearSpecialties = specialtiesByYear[year.id];
        if (yearSpecialties && yearSpecialties.length > 0) {
            const campusesMap: { [campusName: string]: SpecialtyItem[] } = {};
            yearSpecialties.forEach(spec => {
                const campusName = spec.campus || 'Campus Non Spécifié'; // Default if campus field missing
                if (!campusesMap[campusName]) {
                    campusesMap[campusName] = [];
                }
                campusesMap[campusName].push(spec);
            });

            const campusesArray = Object.entries(campusesMap).map(([campusName, specialties]) => ({
                campusName,
                specialties
            })).sort((a, b) => a.campusName.localeCompare(b.campusName)); // Sort campuses alphabetically

            if (campusesArray.length > 0) {
                finalGroupedData.push({ year, campuses: campusesArray });
            }
        }
    });

    return finalGroupedData;

  }, [searchTerm, years, specialties]);


  // --- Handlers ---
  const handleSpecialtyPress = (specialtyId: string, specialtyName: string) => {
    // Specialty ID from Firestore is now the link ID
    console.log(`Navigating to /specialty/${specialtyId}`);
    router.push(`/specialty/${specialtyId}`);
  };

    // --- Styling Helpers ---
    // Copy getCampusStyling and getYearStyling functions here from previous response
    const getCampusStyling = (campusName: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap, color: string, bgColor: string, borderColor: string } => {
        // ... implementation ...
       const tint = Colors[colorScheme].tint ?? '#0a7ea4';
       const cardBg = Colors[colorScheme].cardBackground ?? '#fff';
       const border = Colors[colorScheme].border ?? '#e0e0e0';

       switch (campusName) {
           case 'Campus El-Kseur': return { icon: 'school', color: colors.tint ?? '#1d4ed8', bgColor: colorScheme === 'dark' ? '#1e293b' : '#eff6ff', borderColor: colorScheme === 'dark' ? '#3b82f6' : '#bfdbfe' };
           case 'Campus Aboudaou': return { icon: 'hospital-building', color: '#047857', bgColor: colorScheme === 'dark' ? '#064e3b' : '#f0fdf4', borderColor: colorScheme === 'dark' ? '#10b981' : '#a7f3d0' };
           case 'Campus Targa Ouzemour': return { icon: 'factory', color: '#7c3aed', bgColor: colorScheme === 'dark' ? '#3b0764' : '#f5f3ff', borderColor: colorScheme === 'dark' ? '#a78bfa' : '#ddd6fe' };
           default: return { icon: 'domain', color: colors.textSecondary ?? '#666', bgColor: cardBg, borderColor: border };
       }
   };
    const getYearStyling = (yearName: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap, color: string, bgColor: string, borderColor: string } => {
        // ... implementation ...
         const tint = Colors[colorScheme].tint ?? '#0a7ea4';
         const cardBg = Colors[colorScheme].cardBackground ?? '#fff';
         const border = Colors[colorScheme].border ?? '#e0e0e0';

         if (yearName.includes("1ère")) return { icon: 'numeric-1-box-outline', color: tint, bgColor: cardBg, borderColor: border };
         if (yearName.includes("2ème")) return { icon: 'numeric-2-box-outline', color: tint, bgColor: cardBg, borderColor: border };
         if (yearName.includes("3ème")) return { icon: 'numeric-3-box-outline', color: tint, bgColor: cardBg, borderColor: border };
         if (yearName.includes("Master")) return { icon: 'school-outline', color: colors.textSecondary ?? '#666', bgColor: cardBg, borderColor: border };
         return { icon: 'calendar-blank-outline', color: colors.textSecondary ?? '#666', bgColor: cardBg, borderColor: border };
    };
    // ---

  // --- Render Logic ---
  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>;
  }
  if (fetchError) {
     return <View style={styles.loadingContainer}><Text style={styles.errorText}>{fetchError}</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Espace Cours</Text>
      <Text style={styles.subtitle}>Parcourir les spécialités par année et campus</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={styles.searchIcon.color} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une spécialité..."
          placeholderTextColor={styles.searchInput.placeholderTextColor}
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
          clearButtonMode='while-editing' // iOS only
        />
         {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearIconContainer}>
                  <Ionicons name="close-circle" size={20} color={styles.searchIcon.color} />
              </TouchableOpacity>
          ) : null}
      </View>

      {/* Main Content Area */}
      {groupedAndFilteredData.length > 0 ? (
         groupedAndFilteredData.map(({ year, campuses }) => {
             const yearStyling = getYearStyling(year.name);
             return (
                 <CollapsibleSection
                     key={year.id} // Use Firestore ID
                     title={year.name}
                     iconName={yearStyling.icon}
                     titleColor={yearStyling.color}
                     bgColor={yearStyling.bgColor} // Use year specific style
                     borderColor={yearStyling.borderColor}
                     level={0}
                     startExpanded={true} // Keep years expanded
                 >
                    {campuses.map(({ campusName, specialties: campusSpecialties }) => {
                        const campusStyling = getCampusStyling(campusName);
                        return (
                            <CollapsibleSection
                                key={`${year.id}-${campusName}`} // Unique key for campus within year
                                title={campusName}
                                iconName={campusStyling.icon}
                                titleColor={campusStyling.color}
                                bgColor={campusStyling.bgColor}
                                borderColor={campusStyling.borderColor}
                                level={1}
                                startExpanded={!!searchTerm} // Expand campus if searching
                             >
                                {campusSpecialties.map((spec) => (
                                <TouchableOpacity
                                    key={spec.id} // Use Firestore ID
                                    style={styles.specialtyItem}
                                    onPress={() => handleSpecialtyPress(spec.id, spec.name)}
                                    activeOpacity={0.7}
                                >
                                    {/* Use icon from Firestore data or fallback */}
                                    <FontAwesome name={(spec.icon || 'book') as any} size={18} color={campusStyling.color} style={styles.specialtyIcon} />
                                    <Text style={styles.specialtyText}>{spec.name}</Text>
                                    <Ionicons name="chevron-forward" size={20} color={styles.specialtyArrow.color} />
                                </TouchableOpacity>
                                ))}
                            </CollapsibleSection>
                        );
                    })}
                 </CollapsibleSection>
             );
         })
       ) : (
           <Text style={styles.infoText}>
               {searchTerm
                ? `Aucune spécialité trouvée pour "${searchTerm}"`
                : "Aucune donnée de cours disponible."}
            </Text>
       )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// --- Styles ---
// Define getStyles function here (copy from previous response or your file)
const getStyles = (colorScheme: 'light' | 'dark') => {
    const colors = Colors[colorScheme];
    return StyleSheet.create({
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
        errorText: { color: colors.danger ?? '#dc2626', fontSize: 16, textAlign: 'center' },
        container: { flex: 1, backgroundColor: colors.background },
        contentContainer: { padding: 15, paddingBottom: 30 },
        title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 5 },
        subtitle: { fontSize: 15, color: colors.textSecondary ?? '#666', textAlign: 'center', marginBottom: 20 },
        searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground ?? '#fff', borderRadius: 10, paddingHorizontal: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.border ?? '#e0e0e0', /* ...shadows... */ },
        searchIcon: { marginRight: 8, color: colors.textSecondary ?? '#888' },
        clearIconContainer: { padding: 5 },
        searchInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 15, color: colors.text, placeholderTextColor: colors.placeholderText ?? '#999' },
        collapsibleContainer: { borderRadius: 10, marginBottom: 15, borderWidth: 1, /* borderColor set by prop */ backgroundColor: colors.background, /* bgColor set by prop */ overflow: 'hidden' },
        nestedCollapsibleContainer: { marginLeft: 0, marginBottom: 10, /* bgColor set by prop */ /* ...shadows... */ borderRadius: 8, borderWidth: 1 /* borderColor set by prop */ },
        collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15 },
        nestedCollapsibleHeader: { paddingVertical: 10, paddingHorizontal: 12 },
        collapsibleTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
        collapsibleTitle: { fontSize: 18, fontWeight: 'bold', /* color set by prop */ flexShrink: 1 },
        nestedCollapsibleTitle: { fontSize: 16, fontWeight: '600' },
        collapsibleContent: { paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0 },
        nestedCollapsibleContent: { paddingHorizontal: 8, paddingBottom: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border + '50' },
        specialtyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 8, backgroundColor: 'transparent', borderRadius: 6, marginBottom: 4 },
        specialtyIcon: { marginRight: 12, width: 20, textAlign: 'center', opacity: 0.9 },
        specialtyText: { flex: 1, fontSize: 14, color: colors.text },
        specialtyArrow: { color: colors.textSecondary ?? '#bbb' },
        infoText: { textAlign: 'center', color: colors.textSecondary ?? '#555', marginTop: 25, fontSize: 15, paddingHorizontal: 15 },
        // Added missing placeholderTextColor and placeholderText styles potentially used by TextInput
        searchInputPlaceholder: { color: colors.placeholderText ?? '#999' },
        placeholderText: { color: colors.placeholderText ?? '#999' }, // Generic placeholder color if needed elsewhere
        // Added potential missing styles from CollapsibleSection usage
        collapsibleTitleColor: { color: colors.text }, // Default title color
        chevronColor: { color: colors.textSecondary ?? '#bbb'}, // Default chevron color
    });
};