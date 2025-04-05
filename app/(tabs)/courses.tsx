import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Platform, LayoutAnimation, ActivityIndicator, Dimensions, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '../../firebaseConfig';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Screen dimensions for iPhone 14 Pro Max
const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;

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
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title, children, iconName, titleColor, bgColor, borderColor, level = 0, startExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(startExpanded);
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);

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
  const titleStyle = [styles.collapsibleTitle, { color: titleColor ?? styles.collapsibleTitle.color }, level === 1 && styles.nestedCollapsibleTitle];

  return (
    <View style={containerStyle}>
      <TouchableOpacity onPress={toggleExpand} style={headerStyle} activeOpacity={0.7}>
        <View style={styles.collapsibleTitleContainer}>
          {iconName && <MaterialCommunityIcons name={iconName} size={level === 0 ? 24 : 20} color={titleColor ?? styles.collapsibleTitle.color} />}
          <Text style={titleStyle} numberOfLines={1}>{title}</Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={titleColor ?? styles.collapsibleTitle.color} />
      </TouchableOpacity>
      {isExpanded && <View style={[styles.collapsibleContent, level === 1 && styles.nestedCollapsibleContent]}>{children}</View>}
    </View>
  );
};

// --- Main Courses Screen ---
export default function CoursesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const colors = Colors[colorScheme];
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [years, setYears] = useState<YearItem[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  // --- Styling Helpers ---
  const getCampusStyling = (campusName: string) => {
    const cardBg = colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#444444' : '#E5E7EB';
    switch (campusName) {
      case 'Campus El-Kseur': return { icon: 'school', color: colorScheme === 'dark' ? '#93C5FD' : '#1D4ED8', bgColor: colorScheme === 'dark' ? '#1E293B' : '#EFF6FF', borderColor: colorScheme === 'dark' ? '#93C5FD' : '#BFDBFE' };
      case 'Campus Aboudaou': return { icon: 'hospital-building', color: colorScheme === 'dark' ? '#6EE7B7' : '#047857', bgColor: colorScheme === 'dark' ? '#1F2E28' : '#F0FDF4', borderColor: colorScheme === 'dark' ? '#6EE7B7' : '#A7F3D0' };
      case 'Campus Targa Ouzemour': return { icon: 'factory', color: colorScheme === 'dark' ? '#C4B5FD' : '#7C3AED', bgColor: colorScheme === 'dark' ? '#2A263B' : '#F5F3FF', borderColor: colorScheme === 'dark' ? '#C4B5FD' : '#DDD6FE' };
      default: return { icon: 'domain', color: colors.textSecondary ?? '#666666', bgColor: cardBg, borderColor: border };
    }
  };

  const getYearStyling = (yearName: string) => {
    const tint = colorScheme === 'dark' ? '#60A5FA' : '#0A7EA4';
    const cardBg = colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#444444' : '#E5E7EB';
    if (yearName.includes("1ère")) return { icon: 'numeric-1-box-outline', color: tint, bgColor: cardBg, borderColor: border };
    if (yearName.includes("2ème")) return { icon: 'numeric-2-box-outline', color: tint, bgColor: cardBg, borderColor: border };
    if (yearName.includes("3ème")) return { icon: 'numeric-3-box-outline', color: tint, bgColor: cardBg, borderColor: border };
    if (yearName.includes("Master")) return { icon: 'school-outline', color: colors.textSecondary ?? '#666666', bgColor: cardBg, borderColor: border };
    return { icon: 'calendar-blank-outline', color: colors.textSecondary ?? '#666666', bgColor: cardBg, borderColor: border };
  };

  // --- Render ---
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.infoText}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Espace Cours</Text>
          <Text style={styles.subtitle}>Parcourir les spécialités et modules</Text>
        </View>

        {/* Offline Indicator */}
        {isOffline && (
          <View style={styles.offlineContainer}>
            <Ionicons name="cloud-offline" size={20} color={colors.danger} />
            <Text style={styles.offlineText}>Mode hors ligne</Text>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={styles.searchIcon.color} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher spécialité/module..."
            placeholderTextColor={styles.searchInput.placeholderTextColor}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearIconContainer}>
              <Ionicons name="close-circle" size={20} color={styles.searchIcon.color} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Main Content */}
        {fetchError && !isOffline && <Text style={styles.errorText}>{fetchError}</Text>}
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
                    >
                      {campusSpecialties.map((spec) => (
                        <View key={spec.id}>
                          <TouchableOpacity
                            style={styles.specialtyItem}
                            onPress={() => handleSpecialtyPress(spec.id, spec.name)}
                            activeOpacity={0.7}
                          >
                            <FontAwesome name={(spec.icon || 'book') as any} size={18} color={campusStyling.color} style={styles.specialtyIcon} />
                            <Text style={styles.specialtyText}>{spec.name}</Text>
                            <Ionicons name="chevron-forward" size={20} color={styles.specialtyArrow.color} />
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
                                    <MaterialCommunityIcons name="file-document-outline" size={16} color={campusStyling.color} style={styles.moduleIcon} />
                                    <Text style={styles.moduleText}>{mod.name}</Text>
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
          <Text style={styles.infoText}>
            {searchTerm ? `Aucune spécialité/module pour "${searchTerm}"` : "Aucune donnée disponible."}
          </Text>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const getStyles = (colorScheme: 'light' | 'dark') => {
  const colors = Colors[colorScheme];
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colorScheme === 'dark' ? '#121212' : '#F7F7F7' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#121212' : '#F7F7F7' },
    container: { flex: 1 },
    contentContainer: { paddingHorizontal: isSmallScreen ? 15 : 20, paddingVertical: 25 },
    headerContainer: { marginBottom: 20, alignItems: 'center' },
    title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: 0.5 },
    subtitle: { fontSize: 16, color: colorScheme === 'dark' ? '#A3A3A3' : '#6B7280', marginTop: 5 },
    offlineContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, backgroundColor: colorScheme === 'dark' ? '#3F2A2A' : '#FEE2E2', padding: 8, borderRadius: 8 },
    offlineText: { color: colors.danger ?? '#DC2626', marginLeft: 8, fontSize: 14, fontWeight: '500' },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#2D2D2D' : '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#4B5563' : '#E5E7EB',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    searchIcon: { marginRight: 10, color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280' },
    searchInput: {
      flex: 1,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 16,
      color: colors.text,
      placeholderTextColor: colorScheme === 'dark' ? '#6B7280' : '#9CA3AF',
    },
    clearIconContainer: { padding: 5 },
    collapsibleContainer: {
      borderRadius: 12,
      marginBottom: 15,
      borderWidth: 1,
      backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    nestedCollapsibleContainer: { marginHorizontal: 10, marginBottom: 10, borderRadius: 10, borderWidth: 1 },
    collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15 },
    nestedCollapsibleHeader: { paddingVertical: 10, paddingHorizontal: 12 },
    collapsibleTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    collapsibleTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
    nestedCollapsibleTitle: { fontSize: 16, fontWeight: '600' },
    collapsibleContent: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 5 },
    nestedCollapsibleContent: { paddingHorizontal: 10, paddingBottom: 8, paddingTop: 5, borderTopWidth: 1, borderTopColor: colorScheme === 'dark' ? '#4B5563' : '#E5E7EB' },
    specialtyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 15,
      backgroundColor: colorScheme === 'dark' ? '#3A3A3A' : '#F9FAFB',
      borderRadius: 10,
      marginBottom: 6,
    },
    specialtyIcon: { marginRight: 12, width: 20, textAlign: 'center' },
    specialtyText: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '500' },
    specialtyArrow: { color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280' },
    modulesContainer: { paddingLeft: 25, marginBottom: 8 },
    moduleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colorScheme === 'dark' ? '#404040' : '#F1F5F9',
      borderRadius: 8,
      marginBottom: 4,
    },
    moduleIcon: { marginRight: 10 },
    moduleText: { fontSize: 14, color: colors.text, fontWeight: '400' },
    infoText: { textAlign: 'center', color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280', fontSize: 16, marginTop: 25 },
    errorText: { color: colors.danger ?? '#DC2626', textAlign: 'center', fontSize: 14, marginVertical: 15 },
  });
};