// File: app/(tabs)/courses.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  LayoutAnimation,
  UIManager,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
// Correct the paths if your folders are different (e.g., '../constants/Data')
import { universiteBejaiaData } from '@/constants/Data';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// --- Data Definitions & Helpers ---
interface SpecialtyItem {
  name: string;
  icon: keyof typeof FontAwesome.glyphMap;
  link: string; // URL-safe ID used for navigation parameter
}
interface CampusData {
  [campusName: string]: SpecialtyItem[];
}
interface YearCoursesData {
  [yearName: string]: CampusData;
}

// Helper to create URL-safe link (MUST match lookup logic in [specialtyId].tsx)
const generateLinkFromName = (name: string): string => {
    // Added check for null/undefined input
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

// Base structure listing ONLY the names as they appear as keys in universiteBejaiaData
const baseCoursesStructure = {
  "1ère année": {
    'Campus El-Kseur': ["Science et Technologie LMD", "Informatique LMD", "Biologie", "Mathématiques", "Science de la matière", "Science et Technologie Ingénieur", "Informatique ING", "Architecture"],
    'Campus Aboudaou': ["Médecine", "Pharmacie", "Droit", "SEGC", "Langue Française", "Langue Arabe", "Langue Tamazight", "Langue Anglaise", "Science Sociale", "Traduction"],
    'Campus Targa Ouzemour': []
  },
  "2ème année": {
    'Campus Targa Ouzemour': ["Génie des Procédés", "Automatique", "Exploitation des mines", "Génie Civil", "Télécommunications", "Valorisation des ressources minérales", "Électronique", "Électrotechnique", "Chimie", "Physique", "Mathématiques appliquées", "Informatique", "Sciences biologiques", "Ecologie et environnement", "Sciences alimentaires", "Biotechnologies", "Hydrobiologie marine et continentale"],
    'Campus Aboudaou': ["Langue et Littérature Française", "Langue et Littérature Anglaise", "Langue et Littérature Arabe", "Économie", "Sciences Commerciales", "Sciences de Gestion"],
    'Campus El-Kseur': [],
   },
   "3ème année": {
    'Campus Targa Ouzemour': ["Génie des Procédés", "Automatique", "Exploitation des mines", "Génie Civil", "Télécommunications", "Architecture", "Électronique", "Électrotechnique", "Informatique", "Biochimie", "Microbiologie", "Physique Énergétique", "Chimie Analytique"],
    'Campus Aboudaou': ["Sciences Commerciales", "Sciences de Gestion"],
    'Campus El-Kseur': [],
   },
   "Master 1 & 2": { // Placeholder names MUST be unique if used as keys
    'Campus Targa Ouzemour': ["Master Targa Placeholder"],
    'Campus Aboudaou': ["Master Aboudaou Placeholder"],
    'Campus El-Kseur': ["Master El Kseur Placeholder"],
   }
};

// Icon mapping (using FontAwesome 4/5 Free icons)
const iconMap: Record<string, keyof typeof FontAwesome.glyphMap> = {
    "default": "book", "technologie": "flask", "st lmd": "flask", "st ing": "cogs", "informatique": "laptop", "info ing": "desktop", "biologie": "leaf", "biologiques": "heartbeat", "biotechnologies": "flask", "biochimie": "flask", "microbiologie": "flask", "hydrobiologie": "tint", "mathématiques": "calculator", "maths-app": "superscript", "matière": "atom", "architecture": "building-o", "médecine": "stethoscope", "pharmacie": "pills", "droit": "gavel", "segc": "balance-scale", "économie": "line-chart", "commerciales": "shopping-cart", "gestion": "briefcase", "langue": "language", "sociale": "users", "traduction": "exchange", "procédés": "industry", "automatique": "cogs", "mines": "bank", "civil": "building", "télécommunications": "wifi", "minérales": "diamond", "électronique": "microchip", "électrotechnique": "bolt", "chimie": "flask", "physique": "atom", "énergétique": "fire", "ecologie": "leaf", "alimentaires": "cutlery", "master": "hourglass-half",
};

const getIconForSpecialty = (name: string): keyof typeof FontAwesome.glyphMap => {
    const lowerName = name?.toLowerCase() || ''; // Handle potential undefined name
    for (const keyword in iconMap) {
        if (lowerName.includes(keyword)) {
            return iconMap[keyword];
        }
    }
    return iconMap["default"];
};

// Generate the final data structure used by the component
const generateCoursesData = (): YearCoursesData => {
    const data: YearCoursesData = {};
    try { // Add error handling around data generation
        for (const year in baseCoursesStructure) {
            data[year] = {};
            const campuses = baseCoursesStructure[year as keyof typeof baseCoursesStructure];
            for (const campus in campuses) {
                data[year][campus] = [];
                const specialtyNames = campuses[campus as keyof typeof campuses];
                specialtyNames.forEach(name => {
                    const isPlaceholder = name.includes("Placeholder");
                    const link = isPlaceholder ? generateLinkFromName(name.replace(" Placeholder", "-soon")) : generateLinkFromName(name);
                    const displayName = isPlaceholder ? name.replace(" Placeholder", " Bientôt disponible") : name;
                    const icon = getIconForSpecialty(name);

                    data[year][campus].push({ name: displayName, icon: icon, link: link });
                });
            }
        }
    } catch (error) {
        console.error("Error generating courses data:", error);
        // Return empty or partial data to prevent crashing the app
        return {};
    }
    return data;
};

// Generate the data ONCE when the module loads
const coursesData: YearCoursesData = generateCoursesData();
// --- End Data Definitions & Helpers ---


// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Helper Component: CollapsibleSection ---
interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
    titleColor?: string;
    bgColor?: string;
    borderColor?: string;
    level?: number;
    startExpanded?: boolean; // Control initial state
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title, children, iconName, titleColor, bgColor, borderColor, level = 0, startExpanded = false
}) => {
    const [isExpanded, setIsExpanded] = useState(startExpanded); // Use prop for initial state
    const colorScheme = useColorScheme() ?? 'light';
    const styles = getStyles(colorScheme); // Get styles inside component

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

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
            {/* Conditionally render children wrapped in a View for animation */}
            {isExpanded && (
                <View style={[styles.collapsibleContent, level === 1 && styles.nestedCollapsibleContent]}>
                    {children}
                </View>
            )}
        </View>
    );
};


// --- Main Courses Screen Component ---
// Ensure this is the default export
export default function CoursesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered data based on search term
  const filteredData = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase().trim();
    // Use the globally generated coursesData
    if (!lowerCaseSearch) {
      return coursesData;
    }

    const result: YearCoursesData = {};

    for (const year in coursesData) {
      if (Object.prototype.hasOwnProperty.call(coursesData, year)) {
        const campuses = coursesData[year];
        const filteredCampuses: CampusData = {};
        let yearHasMatch = false;

        for (const campus in campuses) {
          if (Object.prototype.hasOwnProperty.call(campuses, campus)) {
            const specialties = campuses[campus];
            // Ensure specialties is an array before filtering
            if (Array.isArray(specialties)) {
                const filteredSpecialties = specialties.filter(spec =>
                    spec.name?.toLowerCase().includes(lowerCaseSearch) // Add safe access check
                );

                if (filteredSpecialties.length > 0) {
                    filteredCampuses[campus] = filteredSpecialties;
                    yearHasMatch = true;
                }
            }
          }
        }

        if (yearHasMatch) {
          result[year] = filteredCampuses;
        }
      }
    }
    return result;
  }, [searchTerm]); // Only depends on searchTerm

  // Handle navigation
  const handleSpecialtyPress = (specialtyLink: string, specialtyName: string) => {
      if (!specialtyLink || specialtyLink.includes('-soon')) {
          Alert.alert("Bientôt disponible", `Les cours pour ${specialtyName} seront ajoutés prochainement.`);
          return;
      }
      // Navigate using the generated link which acts as the ID
      console.log(`Navigating to /specialty/${specialtyLink}`); // Debug log
      router.push(`/specialty/${specialtyLink}`);
  };

  // --- Get Campus Styling ---
   const getCampusStyling = (campusName: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap, color: string, bgColor: string, borderColor: string } => {
       const tint = Colors[colorScheme].tint ?? '#0a7ea4';
       const cardBg = Colors[colorScheme].cardBackground ?? '#fff';
       const border = Colors[colorScheme].border ?? '#e0e0e0';

       switch (campusName) {
           case 'Campus El-Kseur':
               return { icon: 'school', color: Colors[colorScheme].tint ?? '#1d4ed8', bgColor: colorScheme === 'dark' ? '#1e293b' : '#eff6ff', borderColor: colorScheme === 'dark' ? '#3b82f6' : '#bfdbfe' };
           case 'Campus Aboudaou':
               return { icon: 'hospital-building', color: '#047857', bgColor: colorScheme === 'dark' ? '#064e3b' : '#f0fdf4', borderColor: colorScheme === 'dark' ? '#10b981' : '#a7f3d0' };
           case 'Campus Targa Ouzemour':
               return { icon: 'factory', color: '#7c3aed', bgColor: colorScheme === 'dark' ? '#3b0764' : '#f5f3ff', borderColor: colorScheme === 'dark' ? '#a78bfa' : '#ddd6fe' };
           default:
               return { icon: 'domain', color: Colors[colorScheme].textSecondary ?? '#666', bgColor: cardBg, borderColor: border };
       }
   };

   // --- Get Year Styling ---
    const getYearStyling = (yearName: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap, color: string, bgColor: string, borderColor: string } => {
         const tint = Colors[colorScheme].tint ?? '#0a7ea4';
         const cardBg = Colors[colorScheme].cardBackground ?? '#fff';
         const border = Colors[colorScheme].border ?? '#e0e0e0';

         if (yearName.includes("1ère")) return { icon: 'numeric-1-box-outline', color: tint, bgColor: cardBg, borderColor: border };
         if (yearName.includes("2ème")) return { icon: 'numeric-2-box-outline', color: tint, bgColor: cardBg, borderColor: border };
         if (yearName.includes("3ème")) return { icon: 'numeric-3-box-outline', color: tint, bgColor: cardBg, borderColor: border };
         if (yearName.includes("Master")) return { icon: 'school-outline', color: Colors[colorScheme].textSecondary ?? '#666', bgColor: cardBg, borderColor: border };
         return { icon: 'calendar-blank-outline', color: Colors[colorScheme].textSecondary ?? '#666', bgColor: cardBg, borderColor: border };
    };

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
          clearButtonMode='while-editing'
        />
         {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearIconContainer}>
                  <Ionicons name="close-circle" size={20} color={styles.searchIcon.color} />
              </TouchableOpacity>
          ) : null}
      </View>

      {/* Main Content Area */}
      {Object.keys(filteredData).length > 0 ? (
         Object.entries(filteredData).map(([year, campuses]) => {
             const yearStyling = getYearStyling(year);
             const hasCampusesWithSpecialties = Object.values(campuses).some(specs => Array.isArray(specs) && specs.length > 0);

             if (!hasCampusesWithSpecialties) return null;

             return (
                 <CollapsibleSection
                     key={year}
                     title={year}
                     iconName={yearStyling.icon}
                     titleColor={yearStyling.color}
                     level={0}
                     startExpanded={true} // Keep years expanded
                 >
                    {Object.entries(campuses).map(([campus, specialties]) => {
                        if (!Array.isArray(specialties) || specialties.length === 0) return null;

                        const campusStyling = getCampusStyling(campus);
                        return (
                            <CollapsibleSection
                                key={`${year}-${campus}`}
                                title={campus}
                                iconName={campusStyling.icon}
                                titleColor={campusStyling.color}
                                bgColor={campusStyling.bgColor}
                                borderColor={campusStyling.borderColor}
                                level={1}
                                startExpanded={false} // Keep campuses collapsed by default
                             >
                                {specialties.map((spec) => (
                                <TouchableOpacity
                                    key={spec.link}
                                    style={styles.specialtyItem}
                                    onPress={() => handleSpecialtyPress(spec.link, spec.name)}
                                    activeOpacity={0.7} // Feedback on press
                                >
                                    <FontAwesome name={spec.icon || 'book'} size={18} color={campusStyling.color} style={styles.specialtyIcon} />
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
                : "Chargement des données ou aucune donnée disponible."}
            </Text>
       )}

    {/* Spacer View for bottom padding */}
     <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// --- Styles ---
const getStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  contentContainer: {
    padding: 15,
    paddingBottom: 30, // Ensure space at the bottom
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors[colorScheme].text,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors[colorScheme].textSecondary ?? '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors[colorScheme].cardBackground ?? '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border ?? '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
    color: Colors[colorScheme].textSecondary ?? '#888',
  },
  clearIconContainer: {
       padding: 5, // Make clear icon easier to tap
   },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: Colors[colorScheme].text,
    placeholderTextColor: Colors[colorScheme].placeholderText ?? '#999',
  },
  collapsibleContainer: {
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border ?? '#e0e0e0',
    backgroundColor: Colors[colorScheme].background, // Match page background for top level (year)
    overflow: 'hidden',
  },
  nestedCollapsibleContainer: { // Campus level
      marginLeft: 0, // Remove left margin for full width
      marginBottom: 10,
      backgroundColor: Colors[colorScheme].cardBackground ?? '#fff', // Use card background for campus
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      borderRadius: 8, // Slightly less rounded
      borderWidth: 1,
      // borderColor set via prop
  },
  collapsibleHeader: { // Year and Campus Header
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
   nestedCollapsibleHeader: { // Campus Header specific padding
       paddingVertical: 10,
       paddingHorizontal: 12,
   },
  collapsibleTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1, // Prevent title from pushing icon out
  },
  collapsibleTitle: { // Year Title
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors[colorScheme].text,
    flexShrink: 1,
  },
  nestedCollapsibleTitle: { // Campus Title
      fontSize: 16,
      fontWeight: '600',
  },
  collapsibleContent: { // Container for children (Year level)
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0, // No padding needed if children have margin
  },
   nestedCollapsibleContent: { // Container for specialties (Campus level)
       paddingHorizontal: 8, // Add some padding for specialty items
       paddingBottom: 8,
       paddingTop: 4,
       borderTopWidth: 1,
       borderTopColor: 'rgba(128, 128, 128, 0.15)', // Lighter separator
   },
  specialtyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    backgroundColor: 'transparent', // Transparent inside campus card
    borderRadius: 6,
    marginBottom: 4, // Less space between items
  },
  specialtyIcon: {
      marginRight: 12,
      width: 20,
      textAlign: 'center',
      opacity: 0.9,
  },
  specialtyText: {
    flex: 1,
    fontSize: 14,
    color: Colors[colorScheme].text,
  },
  specialtyArrow: {
    color: Colors[colorScheme].textSecondary ?? '#bbb',
  },
  infoText: {
    textAlign: 'center',
    color: Colors[colorScheme].textSecondary ?? '#555',
    marginTop: 25,
    fontSize: 15,
    paddingHorizontal: 15,
  },
});