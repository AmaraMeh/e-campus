import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Platform, LayoutAnimation, UIManager, ActivityIndicator, Switch, Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider'; // Updated import
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '../../firebaseConfig';
import { Colors } from '../../constants/Colors';
import { useColorScheme, setColorScheme } from '../../hooks/useColorScheme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Screen dimensions for responsive design
const { width } = Dimensions.get('window');
const isSmallScreen = width < 375; // e.g., iPhone SE

// --- Interfaces ---
interface YearItem {
  id: string;
  name: string;
  order: number;
}
interface SpecialtyItem {
  id: string;
  name: string;
  yearId: string;
  icon?: string;
  campus?: string;
  modules?: ModuleItem[];
}
interface ModuleItem {
  id: string;
  name: string;
  specialtyId: string;
}

// --- CollapsibleSection Component ---
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  titleColor?: string;
  bgColor?: string;
  borderColor?: string;
  level?: number;
  startExpanded?: boolean;
  fontSize: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title, children, iconName, titleColor, bgColor, borderColor, level = 0, startExpanded = false, fontSize,
}) => {
  const [isExpanded, setIsExpanded] = useState(startExpanded);
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme, fontSize);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const containerStyle = [
    styles.collapsibleContainer,
    { backgroundColor: bgColor ?? styles.collapsibleContainer.backgroundColor, borderColor: borderColor ?? styles.collapsibleContainer.borderColor },
    level === 1 && styles.nestedCollapsibleContainer,
  ];
  const headerStyle = [styles.collapsibleHeader, level === 1 && styles.nestedCollapsibleHeader];
  const titleStyle = [styles.collapsibleTitle, { color: titleColor ?? styles.collapsibleTitle.color, fontSize }, level === 1 && styles.nestedCollapsibleTitle];

  return (
    <View style={containerStyle}>
      <TouchableOpacity onPress={toggleExpand} style={headerStyle} activeOpacity={0.7}>
        <View style={styles.collapsibleTitleContainer}>
          {iconName && <MaterialCommunityIcons name={iconName} size={level === 0 ? fontSize + 8 : fontSize + 4} color={titleColor ?? styles.collapsibleTitle.color} />}
          <Text style={titleStyle} numberOfLines={1}>{title}</Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={fontSize + 6} color={titleColor ?? styles.collapsibleTitle.color} />
      </TouchableOpacity>
      {isExpanded && <View style={[styles.collapsibleContent, level === 1 && styles.nestedCollapsibleContent]}>{children}</View>}
    </View>
  );
};

// --- Main Courses Screen ---
export default function CoursesScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme() ?? 'light';
  const [userColorScheme, setUserColorScheme] = useState<'light' | 'dark'>(systemColorScheme);
  const colorScheme = userColorScheme;
  const [fontSize, setFontSize] = useState(16); // Default font size
  const styles = getStyles(colorScheme, fontSize);
  const colors = Colors[colorScheme];
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [years, setYears] = useState<YearItem[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --- Dark Mode Toggle ---
  const toggleDarkMode = async () => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    setUserColorScheme(newScheme);
    setColorScheme(newScheme);
    await AsyncStorage.setItem('colorScheme', newScheme);
  };

  // --- Load Preferences ---
  useEffect(() => {
    AsyncStorage.multiGet(['colorScheme', 'fontSize']).then(([colorPair, fontPair]) => {
      if (colorPair[1]) setUserColorScheme(colorPair[1] as 'light' | 'dark');
      if (fontPair[1]) setFontSize(parseInt(fontPair[1], 10));
    });
  }, []);

  // --- Fetch Data with Offline Support ---
  const fetchData = useCallback(async () => {
    if (!db) {
      setFetchError("Database service not available.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const yearsQuery = query(collection(db, "years"), orderBy("order", "asc"));
      const specialtiesQuery = query(collection(db, "specialties"));
      const modulesQuery = query(collection(db, "modules"));

      const [yearsSnapshot, specialtiesSnapshot, modulesSnapshot] = await Promise.all([
        getDocs(yearsQuery),
        getDocs(specialtiesQuery),
        getDocs(modulesQuery),
      ]);

      const fetchedYears: YearItem[] = yearsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YearItem));
      const fetchedModules: ModuleItem[] = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModuleItem));
      const fetchedSpecialties: SpecialtyItem[] = specialtiesSnapshot.docs.map(doc => {
        const specData = doc.data();
        const specModules = fetchedModules.filter(mod => mod.specialtyId === doc.id);
        return { id: doc.id, ...specData, modules: specModules } as SpecialtyItem;
      });

      setYears(fetchedYears);
      setSpecialties(fetchedSpecialties);
      await AsyncStorage.setItem('cachedYears', JSON.stringify(fetchedYears));
      await AsyncStorage.setItem('cachedSpecialties', JSON.stringify(fetchedSpecialties));
      setIsOffline(false);
    } catch (error) {
      console.error("CoursesScreen: Error fetching data:", error);
      setFetchError("Failed to load data. Using cached data if available.");
      const cachedYears = await AsyncStorage.getItem('cachedYears');
      const cachedSpecialties = await AsyncStorage.getItem('cachedSpecialties');
      if (cachedYears && cachedSpecialties) {
        setYears(JSON.parse(cachedYears));
        setSpecialties(JSON.parse(cachedSpecialties));
        setIsOffline(true);
      } else {
        setYears([]);
        setSpecialties([]);
        setIsOffline(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Filter & Group Data ---
  const groupedAndFilteredData = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase().trim();
    const filteredSpecialties = lowerCaseSearch
      ? specialties.filter(spec =>
          spec.name.toLowerCase().includes(lowerCaseSearch) ||
          (spec.modules && spec.modules.some(mod => mod.name.toLowerCase().includes(lowerCaseSearch)))
        )
      : specialties;

    const specialtiesByYear: { [yearId: string]: SpecialtyItem[] } = {};
    filteredSpecialties.forEach(spec => {
      if (!specialtiesByYear[spec.yearId]) specialtiesByYear[spec.yearId] = [];
      specialtiesByYear[spec.yearId].push(spec);
    });

    const finalGroupedData: { year: YearItem; campuses: { campusName: string; specialties: SpecialtyItem[] }[] }[] = [];
    years.forEach(year => {
      const yearSpecialties = specialtiesByYear[year.id];
      if (yearSpecialties && yearSpecialties.length > 0) {
        const campusesMap: { [campusName: string]: SpecialtyItem[] } = {};
        yearSpecialties.forEach(spec => {
          const campusName = spec.campus || 'Campus Non Spécifié';
          if (!campusesMap[campusName]) campusesMap[campusName] = [];
          campusesMap[campusName].push(spec);
        });

        const campusesArray = Object.entries(campusesMap)
          .map(([campusName, specialties]) => ({ campusName, specialties }))
          .sort((a, b) => a.campusName.localeCompare(b.campusName));

        if (campusesArray.length > 0) {
          finalGroupedData.push({ year, campuses: campusesArray });
        }
      }
    });
    return finalGroupedData;
  }, [searchTerm, years, specialties]);

  // --- Handlers ---
  const handleSpecialtyPress = (specialtyId: string, specialtyName: string) => {
    router.push(`/specialty/${specialtyId}`);
  };

  const handleModulePress = (moduleId: string, moduleName: string) => {
    router.push(`/module/${moduleId}`);
  };

  const handleFontSizeChange = async (value: number) => {
    setFontSize(value);
    await AsyncStorage.setItem('fontSize', value.toString());
  };

  // --- Styling Helpers ---
  const getCampusStyling = (campusName: string) => {
    const tint = colorScheme === 'dark' ? '#4b728f' : '#0a7ea4'; // Muted in dark mode
    const cardBg = colorScheme === 'dark' ? '#2a2a2a' : '#fff';
    const border = colorScheme === 'dark' ? '#444' : '#e0e0e0';
    switch (campusName) {
      case 'Campus El-Kseur': return { icon: 'school', color: colorScheme === 'dark' ? '#5a7bb5' : '#1d4ed8', bgColor: colorScheme === 'dark' ? '#2e3440' : '#eff6ff', borderColor: colorScheme === 'dark' ? '#5a7bb5' : '#bfdbfe' };
      case 'Campus Aboudaou': return { icon: 'hospital-building', color: colorScheme === 'dark' ? '#3d6b5b' : '#047857', bgColor: colorScheme === 'dark' ? '#2d3e36' : '#f0fdf4', borderColor: colorScheme === 'dark' ? '#3d6b5b' : '#a7f3d0' };
      case 'Campus Targa Ouzemour': return { icon: 'factory', color: colorScheme === 'dark' ? '#6b5ca8' : '#7c3aed', bgColor: colorScheme === 'dark' ? '#2f2a40' : '#f5f3ff', borderColor: colorScheme === 'dark' ? '#6b5ca8' : '#ddd6fe' };
      default: return { icon: 'domain', color: colors.textSecondary ?? '#666', bgColor: cardBg, borderColor: border };
    }
  };

  const getYearStyling = (yearName: string) => {
    const tint = colorScheme === 'dark' ? '#4b728f' : '#0a7ea4';
    const cardBg = colorScheme === 'dark' ? '#2a2a2a' : '#fff';
    const border = colorScheme === 'dark' ? '#444' : '#e0e0e0';
    if (yearName.includes("1ère")) return { icon: 'numeric-1-box-outline', color: tint, bgColor: cardBg, borderColor: border };
    if (yearName.includes("2ème")) return { icon: 'numeric-2-box-outline', color: tint, bgColor: cardBg, borderColor: border };
    if (yearName.includes("3ème")) return { icon: 'numeric-3-box-outline', color: tint, bgColor: cardBg, borderColor: border };
    if (yearName.includes("Master")) return { icon: 'school-outline', color: colors.textSecondary ?? '#666', bgColor: cardBg, borderColor: border };
    return { icon: 'calendar-blank-outline', color: colors.textSecondary ?? '#666', bgColor: cardBg, borderColor: border };
  };

  // --- Render ---
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.infoText, { fontSize }]}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { fontSize: fontSize + 8 }]}>Espace Cours</Text>
        <View style={styles.toggleContainer}>
          <Text style={[styles.toggleLabel, { fontSize }]}>Dark Mode</Text>
          <Switch
            value={colorScheme === 'dark'}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor={colorScheme === 'dark' ? '#d1d5db' : '#f4f3f4'}
          />
        </View>
      </View>
      <Text style={[styles.subtitle, { fontSize }]}>Parcourir les spécialités et modules</Text>

      {/* Offline Indicator */}
      {isOffline && (
        <View style={styles.offlineContainer}>
          <Ionicons name="cloud-offline" size={fontSize + 2} color={colors.danger} />
          <Text style={[styles.offlineText, { fontSize }]}>Mode hors ligne</Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={fontSize + 4} color={styles.searchIcon.color} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { fontSize }]}
          placeholder="Rechercher spécialité/module..."
          placeholderTextColor={styles.searchInput.placeholderTextColor}
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearIconContainer}>
            <Ionicons name="close-circle" size={fontSize + 4} color={styles.searchIcon.color} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Font Size Adjustment */}
      <View style={styles.fontSizeContainer}>
        <Text style={[styles.fontSizeLabel, { fontSize }]}>Taille du texte: {fontSize}px</Text>
        <Slider
          style={styles.fontSizeSlider}
          minimumValue={12}
          maximumValue={20}
          step={1}
          value={fontSize}
          onValueChange={handleFontSizeChange}
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.tint}
        />
      </View>

      {/* Main Content */}
      {fetchError && !isOffline && <Text style={[styles.errorText, { fontSize }]}>{fetchError}</Text>}
      {groupedAndFilteredData.length > 0 ? (
        groupedAndFilteredData.map(({ year, campuses }) => {
          const yearStyling = getYearStyling(year.name);
          return (
            <CollapsibleSection
              key={year.id}
              title={year.name}
              iconName={yearStyling.icon}
              titleColor={yearStyling.color}
              bgColor={yearStyling.bgColor}
              borderColor={yearStyling.borderColor}
              level={0}
              startExpanded={true}
              fontSize={fontSize}
            >
              {campuses.map(({ campusName, specialties: campusSpecialties }) => {
                const campusStyling = getCampusStyling(campusName);
                return (
                  <CollapsibleSection
                    key={`${year.id}-${campusName}`}
                    title={campusName}
                    iconName={campusStyling.icon}
                    titleColor={campusStyling.color}
                    bgColor={campusStyling.bgColor}
                    borderColor={campusStyling.borderColor}
                    level={1}
                    startExpanded={!!searchTerm}
                    fontSize={fontSize}
                  >
                    {campusSpecialties.map((spec) => (
                      <View key={spec.id}>
                        <TouchableOpacity
                          style={styles.specialtyItem}
                          onPress={() => handleSpecialtyPress(spec.id, spec.name)}
                          activeOpacity={0.7}
                        >
                          <FontAwesome name={(spec.icon || 'book') as any} size={fontSize + 2} color={campusStyling.color} style={styles.specialtyIcon} />
                          <Text style={[styles.specialtyText, { fontSize }]}>{spec.name}</Text>
                          <Ionicons name="chevron-forward" size={fontSize + 4} color={styles.specialtyArrow.color} />
                        </TouchableOpacity>
                        {spec.modules && spec.modules.length > 0 && searchTerm && (
                          <View style={styles.modulesContainer}>
                            {spec.modules
                              .filter(mod => mod.name.toLowerCase().includes(searchTerm.toLowerCase()))
                              .map(mod => (
                                <TouchableOpacity
                                  key={mod.id}
                                  style={styles.moduleItem}
                                  onPress={() => handleModulePress(mod.id, mod.name)}
                                  activeOpacity={0.7}
                                >
                                  <MaterialCommunityIcons name="file-document-outline" size={fontSize} color={campusStyling.color} style={styles.moduleIcon} />
                                  <Text style={[styles.moduleText, { fontSize: fontSize - 2 }]}>{mod.name}</Text>
                                </TouchableOpacity>
                              ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </CollapsibleSection>
                );
              })}
            </CollapsibleSection>
          );
        })
      ) : (
        <Text style={[styles.infoText, { fontSize }]}>
          {searchTerm ? `Aucune spécialité/module pour "${searchTerm}"` : "Aucune donnée disponible."}
        </Text>
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// --- Styles ---
const getStyles = (colorScheme: 'light' | 'dark', fontSize: number) => {
  const colors = Colors[colorScheme];
  return StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    errorText: { color: colors.danger ?? '#dc2626', textAlign: 'center', marginVertical: 10 },
    container: { flex: 1, backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : colors.background },
    contentContainer: { paddingHorizontal: isSmallScreen ? 10 : 15, paddingVertical: 20 },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
    title: { fontWeight: 'bold', color: colors.text, textAlign: 'left' },
    toggleContainer: { flexDirection: 'row', alignItems: 'center' },
    toggleLabel: { color: colors.text, marginRight: 8 },
    subtitle: { color: colorScheme === 'dark' ? '#a0a0a0' : '#666', textAlign: 'center', marginBottom: 15 },
    offlineContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    offlineText: { color: colors.danger ?? '#dc2626', marginLeft: 5 },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
      borderRadius: 12,
      paddingHorizontal: 10,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    searchIcon: { marginRight: 8, color: colorScheme === 'dark' ? '#888' : '#888' },
    clearIconContainer: { padding: 5 },
    searchInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 12 : 10, color: colors.text, placeholderTextColor: colorScheme === 'dark' ? '#777' : '#999' },
    fontSizeContainer: { marginBottom: 20 },
    fontSizeLabel: { color: colors.text, marginBottom: 5 },
    fontSizeSlider: { width: '100%', height: 40 },
    collapsibleContainer: {
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fff',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    nestedCollapsibleContainer: { marginLeft: 0, marginBottom: 8, borderRadius: 10, borderWidth: 1 },
    collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
    nestedCollapsibleHeader: { paddingVertical: 8, paddingHorizontal: 10 },
    collapsibleTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    collapsibleTitle: { fontWeight: 'bold', flexShrink: 1 },
    nestedCollapsibleTitle: { fontWeight: '600' },
    collapsibleContent: { paddingHorizontal: 0, paddingBottom: 5, paddingTop: 2 },
    nestedCollapsibleContent: { paddingHorizontal: 8, paddingBottom: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: colorScheme === 'dark' ? '#444' : '#eee' },
    specialtyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
    specialtyIcon: { marginRight: 10, width: 20, textAlign: 'center', opacity: 0.9 },
    specialtyText: { flex: 1, color: colors.text },
    specialtyArrow: { color: colorScheme === 'dark' ? '#888' : '#bbb' },
    modulesContainer: { paddingLeft: 20, marginBottom: 6 },
    moduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: colorScheme === 'dark' ? '#333' : '#f9f9f9', borderRadius: 6, marginBottom: 4 },
    moduleIcon: { marginRight: 8, opacity: 0.8 },
    moduleText: { color: colors.text },
    infoText: { textAlign: 'center', color: colorScheme === 'dark' ? '#a0a0a0' : '#555', marginTop: 20 },
  });
};