import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '../../firebaseConfig';
import { useColorScheme } from '../../hooks/useColorScheme';

// Color Scheme
const lightColors = {
  background: '#ffffff',
  card: '#f8f8f8',
  text: '#1a1a1a',
  secondary: '#757575',
  accent: '#007aff',
  border: '#e0e0e0',
  danger: '#ff3b30',
  success: '#34c759',
};
const darkColors = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  secondary: '#a0a0a0',
  accent: '#0a84ff',
  border: '#333333',
  danger: '#ff453a',
  success: '#30d158',
};

// Interfaces
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

// CollapsibleSection Component
const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  iconName?: string;
  level?: number;
  startExpanded?: boolean;
  colors: any;
}> = ({ title, children, iconName, level = 0, startExpanded = false, colors }) => {
  const [isExpanded, setIsExpanded] = useState(startExpanded);

  const toggleExpand = () => setIsExpanded(prev => !prev);

  return (
    <View style={[styles.collapsibleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity onPress={toggleExpand} style={styles.collapsibleHeader}>
        <View style={styles.headerContent}>
          {iconName && <MaterialCommunityIcons name={iconName} size={level === 0 ? 22 : 20} color={colors.secondary} />}
          <Text style={[styles.headerTitle, { color: colors.text }, level === 1 && styles.nestedHeaderTitle]}>{title}</Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.secondary} />
      </TouchableOpacity>
      {isExpanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );
};

// Main Courses Screen
export default function CoursesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [years, setYears] = useState<YearItem[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch Data with Offline Support
  const fetchData = useCallback(async () => {
    if (!db) {
      setFetchError('Database service unavailable.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const yearsQuery = query(collection(db, 'years'), orderBy('order', 'asc'));
      const specialtiesQuery = query(collection(db, 'specialties'));
      const modulesQuery = query(collection(db, 'modules'));

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
      console.error('CoursesScreen: Fetch error:', error);
      setFetchError('Failed to load data. Using cached data if available.');
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Filter & Group Data
  const groupedData = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase().trim();
    const filteredSpecialties = lowerCaseSearch
      ? specialties.filter(
          spec =>
            spec.name.toLowerCase().includes(lowerCaseSearch) ||
            (spec.modules && spec.modules.some(mod => mod.name.toLowerCase().includes(lowerCaseSearch))),
        )
      : specialties;

    const specialtiesByYear: { [yearId: string]: SpecialtyItem[] } = {};
    filteredSpecialties.forEach(spec => {
      if (!specialtiesByYear[spec.yearId]) specialtiesByYear[spec.yearId] = [];
      specialtiesByYear[spec.yearId].push(spec);
    });

    return years
      .map(year => {
        const yearSpecialties = specialtiesByYear[year.id] || [];
        if (!yearSpecialties.length) return null;

        const campusesMap: { [campusName: string]: SpecialtyItem[] } = {};
        yearSpecialties.forEach(spec => {
          const campusName = spec.campus || 'Unspecified Campus';
          if (!campusesMap[campusName]) campusesMap[campusName] = [];
          campusesMap[campusName].push(spec);
        });

        const campuses = Object.entries(campusesMap)
          .map(([campusName, specialties]) => ({ campusName, specialties }))
          .sort((a, b) => a.campusName.localeCompare(b.campusName));

        return { year, campuses };
      })
      .filter(Boolean) as { year: YearItem; campuses: { campusName: string; specialties: SpecialtyItem[] }[] }[];
  }, [searchTerm, years, specialties]);

  // Handlers
  const handleSpecialtyPress = (specialtyId: string) => router.push(`/specialty/${specialtyId}`);
  const handleModulePress = (moduleId: string) => router.push(`/module/${moduleId}`);

  // Styling Helpers
  const getYearIcon = (yearName: string) => {
    if (yearName.includes('1ère')) return 'numeric-1-box-outline';
    if (yearName.includes('2ème')) return 'numeric-2-box-outline';
    if (yearName.includes('3ème')) return 'numeric-3-box-outline';
    if (yearName.includes('Master')) return 'school-outline';
    return 'calendar-blank-outline';
  };

  const getCampusIcon = (campusName: string) => {
    switch (campusName) {
      case 'Campus El-Kseur':
        return 'school';
      case 'Campus Aboudaou':
        return 'hospital-building';
      case 'Campus Targa Ouzemour':
        return 'factory';
      default:
        return 'domain';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.infoText, { color: colors.secondary }]}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Courses</Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>Browse specialties and modules</Text>
        </View>

        {/* Offline Indicator */}
        {isOffline && (
          <View style={styles.offlineContainer}>
            <Ionicons name="cloud-offline" size={18} color={colors.danger} />
            <Text style={[styles.offlineText, { color: colors.danger }]}>Offline Mode</Text>
          </View>
        )}

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.secondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search specialty/module..."
            placeholderTextColor={colors.secondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchTerm && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {fetchError && !isOffline && <Text style={[styles.errorText, { color: colors.danger }]}>{fetchError}</Text>}
        {groupedData.length > 0 ? (
          groupedData.map(({ year, campuses }) => (
            <CollapsibleSection
              key={year.id}
              title={year.name}
              iconName={getYearIcon(year.name)}
              colors={colors}
              startExpanded={true}
            >
              {campuses.map(({ campusName, specialties }) => (
                <CollapsibleSection
                  key={`${year.id}-${campusName}`}
                  title={campusName}
                  iconName={getCampusIcon(campusName)}
                  level={1}
                  colors={colors}
                  startExpanded={!!searchTerm}
                >
                  {specialties.map(spec => (
                    <View key={spec.id}>
                      <TouchableOpacity
                        style={[styles.item, { backgroundColor: colors.card }]}
                        onPress={() => handleSpecialtyPress(spec.id)}
                      >
                        <MaterialCommunityIcons name={spec.icon || 'book'} size={20} color={colors.accent} />
                        <Text style={[styles.itemText, { color: colors.text }]}>{spec.name}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
                      </TouchableOpacity>
                      {searchTerm && spec.modules && spec.modules.length > 0 && (
                        <View style={styles.modulesContainer}>
                          {spec.modules
                            .filter(mod => mod.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(mod => (
                              <TouchableOpacity
                                key={mod.id}
                                style={[styles.moduleItem, { backgroundColor: colors.card }]}
                                onPress={() => handleModulePress(mod.id)}
                              >
                                <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.accent} />
                                <Text style={[styles.moduleText, { color: colors.text }]}>{mod.name}</Text>
                              </TouchableOpacity>
                            ))}
                        </View>
                      )}
                    </View>
                  ))}
                </CollapsibleSection>
              ))}
            </CollapsibleSection>
          ))
        ) : (
          <Text style={[styles.infoText, { color: colors.secondary }]}>
            {searchTerm ? `No results for "${searchTerm}"` : 'No data available.'}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 20 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: 0.2 },
  subtitle: { fontSize: 16, fontWeight: '400', marginTop: 6 },
  offlineContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  offlineText: { fontSize: 14, fontWeight: '500', marginLeft: 6 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  collapsibleContainer: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', flexShrink: 1 },
  nestedHeaderTitle: { fontSize: 16, fontWeight: '500' },
  collapsibleContent: { padding: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 6,
    gap: 12,
  },
  itemText: { flex: 1, fontSize: 16, fontWeight: '500' },
  modulesContainer: { paddingLeft: 20, marginBottom: 6 },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 10,
  },
  moduleText: { fontSize: 14, fontWeight: '400' },
  infoText: { fontSize: 16, textAlign: 'center', marginTop: 20 },
  errorText: { fontSize: 14, textAlign: 'center', marginBottom: 12 },
});