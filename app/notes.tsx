import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '../firebaseConfig';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { useAuth } from './contexts/AuthContext';

// --- Interfaces ---
interface Module {
  id: string;
  name: string;
  specialtyId: string;
  yearId: string;
  semesterKey: string;
  evaluations: string[];
  coefficient: number;
  credits: number;
  noteEliminatoire?: number;
}

interface Grade {
  moduleId: string;
  td?: number | null;
  tp?: number | null;
  examen?: number | null;
}

interface ComputedGrade extends Grade {
  average: number | null;
  isEliminated: boolean;
}

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  tint: string;
  border: string;
  danger: string;
  success: string;
  gradientStart: string;
  gradientEnd: string;
}

// --- Constants ---
const GRADE_STORAGE_KEY = '@userGrades';

// --- Helper Functions ---
const getThemeColors = (scheme: 'light' | 'dark'): ThemeColors => ({
  background: scheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
  cardBackground: scheme === 'dark' ? '#2a2a2a' : '#ffffff',
  text: scheme === 'dark' ? '#eee' : '#222',
  textSecondary: scheme === 'dark' ? '#a0a0a0' : '#666',
  tint: scheme === 'dark' ? '#4aa2e5' : '#2f95dc',
  border: scheme === 'dark' ? '#444' : '#ddd',
  danger: scheme === 'dark' ? '#ef4444' : '#dc2626',
  success: scheme === 'dark' ? '#22c55e' : '#16a34a',
  gradientStart: scheme === 'dark' ? '#06b6d4' : '#2dd4bf',
  gradientEnd: scheme === 'dark' ? '#3b82f6' : '#3b82f6',
});

// --- Reusable Components ---
const ModuleCard: React.FC<{
  module: Module;
  computedGrade: ComputedGrade | undefined;
  colors: ThemeColors;
  styles: ReturnType<typeof getStyles>;
  onPress: () => void;
}> = ({ module, computedGrade, colors, styles, onPress }) => {
  const evaluations = module.evaluations || [];
  const hasTD = evaluations.includes('TD');
  const hasTP = evaluations.includes('TP');
  const hasExam = evaluations.includes('Examen');
  const average = computedGrade?.average ?? null;
  const isEliminated = computedGrade?.isEliminated ?? false;

  const getGradeColor = (value: number | null | undefined) => {
    if (value === null || value === undefined) return colors.textSecondary;
    return value >= 10 && !isEliminated ? colors.success : colors.danger;
  };

  return (
    <TouchableOpacity style={styles.moduleCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[colors.gradientStart + '20', colors.gradientEnd + '20']}
        style={styles.moduleCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.moduleHeader}>
          <Text style={styles.moduleTitle} numberOfLines={2}>{module.name}</Text>
          <View style={styles.moduleBadges}>
            <Text style={styles.badge}>Coef: {module.coefficient}</Text>
            <Text style={styles.badge}>Crédits: {module.credits}</Text>
            {module.noteEliminatoire && (
              <Text style={[styles.badge, styles.elimBadge]}>
                Élim: {module.noteEliminatoire}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.moduleGrades}>
          {hasTD && (
            <View style={styles.gradeItem}>
              <Text style={styles.gradeLabel}>TD:</Text>
              <Text style={[styles.gradeValue, { color: getGradeColor(computedGrade?.td) }]}>
                {computedGrade?.td !== undefined && computedGrade?.td !== null ? computedGrade.td.toFixed(2) : '--'}
              </Text>
            </View>
          )}
          {hasTP && (
            <View style={styles.gradeItem}>
              <Text style={styles.gradeLabel}>TP:</Text>
              <Text style={[styles.gradeValue, { color: getGradeColor(computedGrade?.tp) }]}>
                {computedGrade?.tp !== undefined && computedGrade?.tp !== null ? computedGrade.tp.toFixed(2) : '--'}
              </Text>
            </View>
          )}
          {hasExam && (
            <View style={styles.gradeItem}>
              <Text style={styles.gradeLabel}>Examen:</Text>
              <Text style={[styles.gradeValue, { color: getGradeColor(computedGrade?.examen) }]}>
                {computedGrade?.examen !== undefined && computedGrade?.examen !== null ? computedGrade.examen.toFixed(2) : '--'}
              </Text>
            </View>
          )}
          <View style={styles.gradeItem}>
            <Text style={styles.gradeLabel}>Moyenne:</Text>
            <Text style={[styles.gradeValue, { color: getGradeColor(average) }]}>
              {average !== null ? average.toFixed(2) : '--'} {isEliminated ? '(Élim)' : ''}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// --- Main Notes Screen ---
export default function NotesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useMemo(() => getThemeColors(colorScheme), [colorScheme]);
  const screenWidth = Dimensions.get('window').width;
  const styles = useMemo(() => getStyles(colorScheme, colors, screenWidth), [colorScheme, screenWidth]);
  const router = useRouter();
  const { currentUser, userData, isLoadingAuth, isLoadingData } = useAuth();

  const [modules, setModules] = useState<Module[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Modules ---
  const fetchModules = useCallback(async () => {
    if (!db || !userData?.speciality) {
      setError('Données utilisateur ou base de données non disponibles.');
      return;
    }
    setIsLoadingModules(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'modules'),
        where('specialtyId', '==', userData.speciality)
      );
      const snapshot = await getDocs(q);
      const modulesData: Module[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        specialtyId: doc.data().specialtyId,
        yearId: doc.data().yearId,
        semesterKey: doc.data().semesterKey,
        evaluations: doc.data().evaluations || [],
        coefficient: doc.data().coefficient || 1,
        credits: doc.data().credits || 0,
        noteEliminatoire: doc.data().noteEliminatoire,
      }));
      setModules(modulesData);
      if (modulesData.length === 0) {
        setError('Aucun module trouvé pour votre spécialité.');
      }
    } catch (e) {
      console.error('Error fetching modules:', e);
      setError('Erreur lors du chargement des modules.');
    } finally {
      setIsLoadingModules(false);
    }
  }, [userData?.speciality]);

  // --- Load Grades from AsyncStorage ---
  const loadGrades = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingGrades(true);
    try {
      const storedGrades = await AsyncStorage.getItem(`${GRADE_STORAGE_KEY}_${currentUser.uid}`);
      if (storedGrades) {
        setGrades(JSON.parse(storedGrades));
      }
    } catch (e) {
      console.error('Error loading grades:', e);
      setError('Erreur lors du chargement des notes.');
    } finally {
      setIsLoadingGrades(false);
    }
  }, [currentUser]);

  // --- Calculate Module Average ---
  const calculateModuleAverage = useCallback((module: Module, grade: Grade | undefined): ComputedGrade => {
    const evaluations = module.evaluations || [];
    const hasTD = evaluations.includes('TD');
    const hasTP = evaluations.includes('TP');
    const hasExam = evaluations.includes('Examen');

    let sum = 0;
    let weightSum = 0;
    let canCalculate = true;

    const addGrade = (gradeValue: number | null | undefined, weight: number) => {
      if (gradeValue === null || gradeValue === undefined) {
        canCalculate = false;
        return;
      }
      sum += gradeValue * weight;
      weightSum += weight;
    };

    if (hasTD && hasTP && hasExam) {
      addGrade(grade?.td, 0.2);
      addGrade(grade?.tp, 0.2);
      addGrade(grade?.examen, 0.6);
    } else if (hasTP && hasExam) {
      addGrade(grade?.tp, 0.4);
      addGrade(grade?.examen, 0.6);
    } else if (hasTD && hasExam) {
      addGrade(grade?.td, 0.4);
      addGrade(grade?.examen, 0.6);
    } else if (hasExam) {
      addGrade(grade?.examen, 1.0);
    } else if (hasTP) {
      addGrade(grade?.tp, 1.0);
    } else if (hasTD) {
      addGrade(grade?.td, 1.0);
    } else {
      canCalculate = false;
    }

    const average = canCalculate && weightSum > 0 ? sum / weightSum : null;
    const isEliminated = average !== null && module.noteEliminatoire && average < module.noteEliminatoire;

    return { ...grade, moduleId: module.id, average, isEliminated } as ComputedGrade;
  }, []);

  // --- Compute Grades with Averages ---
  const computedGrades = useMemo(() => {
    return modules.map(module => {
      const grade = grades.find(g => g.moduleId === module.id) || { moduleId: module.id };
      return calculateModuleAverage(module, grade);
    });
  }, [modules, grades, calculateModuleAverage]);

  // --- Initial Data Fetch ---
  useEffect(() => {
    if (currentUser && userData && !isLoadingData) {
      fetchModules();
      loadGrades();
    }
  }, [currentUser, userData, isLoadingData, fetchModules, loadGrades]);

  // --- Handlers ---
  const handleModulePress = (module: Module) => {
    Alert.alert('Détails', `Module: ${module.name}\nÉvaluations: ${module.evaluations.join(', ')}`);
  };

  // --- Render ---
  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.authPromptContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.authPromptTitle}>Connexion Requise</Text>
        <Text style={styles.authPromptSubtitle}>Veuillez vous connecter pour accéder à vos notes.</Text>
        <TouchableOpacity style={styles.authButton} onPress={() => router.replace('/auth')}>
          <Text style={styles.authButtonText}>Se Connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Mes Notes',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
          headerShadowVisible: false,
        }}
      />

      {/* Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Ionicons name="school" size={40} color="#fff" />
          <Text style={styles.headerTitle}>Vos Notes</Text>
          <Text style={styles.headerSubtitle}>
            Spécialité: {userData?.speciality || 'Non spécifiée'}
          </Text>
        </View>
      </LinearGradient>

      {/* Modules List */}
      <View style={styles.modulesContainer}>
        {(isLoadingModules || isLoadingGrades) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={styles.loadingText}>Chargement des notes...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={32} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchModules}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoadingModules && !isLoadingGrades && !error && modules.length === 0 && (
          <Text style={styles.noDataText}>Aucun module disponible pour votre spécialité.</Text>
        )}

        {!isLoadingModules &&
          !isLoadingGrades &&
          !error &&
          modules.map(module => (
            <ModuleCard
              key={module.id}
              module={module}
              computedGrade={computedGrades.find(g => g.moduleId === module.id)}
              colors={colors}
              styles={styles}
              onPress={() => handleModulePress(module)}
            />
          ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// --- Styles ---
const getStyles = (colorScheme: 'light' | 'dark', colors: ThemeColors, screenWidth: number) => {
  const basePadding = screenWidth / 20;
  const isSmallScreen = screenWidth < 375;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { paddingHorizontal: isSmallScreen ? basePadding / 2 : basePadding, paddingBottom: 60 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    loadingText: { color: colors.textSecondary, marginTop: 10, fontSize: 16 },
    authPromptContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: basePadding * 2, backgroundColor: colors.background },
    logo: { width: screenWidth * 0.35, height: screenWidth * 0.35, marginBottom: basePadding },
    authPromptTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: basePadding / 2 },
    authPromptSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: basePadding * 2 },
    authButton: {
      backgroundColor: colors.tint,
      paddingVertical: basePadding / 2,
      paddingHorizontal: basePadding * 2,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    authButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    headerGradient: { padding: basePadding, borderRadius: 16, marginBottom: basePadding * 1.5 },
    headerContent: { alignItems: 'center' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: basePadding / 2 },
    headerSubtitle: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 5 },
    modulesContainer: { flex: 1 },
    moduleCard: {
      borderRadius: 12,
      marginBottom: basePadding,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      elevation: 4,
    },
    moduleCardGradient: { padding: basePadding },
    moduleHeader: { marginBottom: basePadding / 2 },
    moduleTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
    moduleBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: {
      fontSize: 11,
      color: colors.textSecondary,
      backgroundColor: colors.cardBackground,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    elimBadge: {
      color: colors.danger,
      borderColor: colors.danger + '80',
      backgroundColor: colors.danger + '15',
    },
    moduleGrades: { flexDirection: 'row', flexWrap: 'wrap', gap: basePadding, justifyContent: 'space-between' },
    gradeItem: { flexDirection: 'row', alignItems: 'center', minWidth: '40%' },
    gradeLabel: { fontSize: 14, color: colors.textSecondary, marginRight: 5, fontWeight: '500' },
    gradeValue: { fontSize: 16, fontWeight: 'bold' },
    loadingOverlay: { alignItems: 'center', padding: basePadding * 2 },
    errorContainer: { alignItems: 'center', padding: basePadding * 2 },
    errorText: { color: colors.danger, fontSize: 16, textAlign: 'center', marginVertical: 10 },
    retryButton: {
      backgroundColor: colors.tint,
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    retryButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    noDataText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', padding: basePadding * 2 },
  });
};