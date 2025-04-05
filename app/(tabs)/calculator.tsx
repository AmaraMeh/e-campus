import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, orderBy, where, doc, setDoc, getDoc } from 'firebase/firestore';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { db, auth } from '../../firebaseConfig';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

// --- Interfaces & Types ---
interface YearItem { id: string; name: string; order: number; }
interface SpecialtyItem { id: string; name: string; yearId: string; }
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
interface GradeInput { td?: string; tp?: string; examen?: string; }
interface GradeState { [moduleKey: string]: GradeInput; }
interface ModuleAverageState {
  [moduleKey: string]: { average: number | null; isEliminated: boolean; isValid: boolean };
}
interface CalculationResult {
  average: number | null;
  totalCreditsAttempted: number;
  totalCreditsValidated: number;
  isValidated: boolean;
  hasEliminations: boolean;
}

const GRADE_STORAGE_PREFIX = '@calculatorGrades_';

export default function CalculatorScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = getStyles(colorScheme, colors);
  const pickerSelectStyles = getPickerStyles(colorScheme, colors);

  // --- State Declarations ---
  const [years, setYears] = useState<YearItem[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('');
  const [selectedSemesterKey, setSelectedSemesterKey] = useState<string>('');
  const [yearOptions, setYearOptions] = useState<{ label: string; value: string }[]>([]);
  const [specialiteOptions, setSpecialiteOptions] = useState<{ label: string; value: string }[]>([]);
  const [semestreOptions, setSemestreOptions] = useState<{ label: string; value: string }[]>([]);
  const [currentModules, setCurrentModules] = useState<Module[]>([]);
  const [grades, setGrades] = useState<GradeState>({});
  const [moduleAverages, setModuleAverages] = useState<ModuleAverageState>({});
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [targetSemesterAverage, setTargetSemesterAverage] = useState<string>('10');

  // Animation Values
  const scale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  // --- Fetch Initial Data from Firestore ---
  const fetchInitialData = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const yearsQuery = query(collection(db, 'years'), orderBy('order', 'asc'));
      const yearsSnapshot = await getDocs(yearsQuery);
      const yearsData = yearsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        order: doc.data().order,
      })) as YearItem[];
      setYears(yearsData);

      const specialtiesQuery = query(collection(db, 'specialties'));
      const specialtiesSnapshot = await getDocs(specialtiesQuery);
      const specialtiesData = specialtiesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        yearId: doc.data().yearId,
      })) as SpecialtyItem[];
      setSpecialties(specialtiesData);

      setIsLoadingData(false);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setFetchError('Failed to load data. Please try again.');
      setIsLoadingData(false);
    }
  }, []);

  // --- Load Theme from Firestore ---
  const loadThemeFromFirestore = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().theme) {
        // Assuming useColorScheme can accept a setter
        // This might need adjustment based on your hook implementation
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  }, []);

  // --- Save Theme to Firestore ---
  const saveThemeToFirestore = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDocRef, { theme: colorScheme }, { merge: true });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [colorScheme]);

  useEffect(() => {
    fetchInitialData();
    loadThemeFromFirestore();
    saveThemeToFirestore();
  }, [fetchInitialData, loadThemeFromFirestore, saveThemeToFirestore]);

  // --- Fetch Modules ---
  const fetchModules = useCallback(async () => {
    if (!selectedSpecialtyId) {
      setAllModules([]);
      return;
    }
    try {
      const modulesQuery = query(collection(db, 'modules'), where('specialtyId', '==', selectedSpecialtyId));
      const modulesSnapshot = await getDocs(modulesQuery);
      const modulesData = modulesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        specialtyId: doc.data().specialtyId,
        yearId: doc.data().yearId,
        semesterKey: doc.data().semesterKey,
        evaluations: doc.data().evaluations || [],
        coefficient: doc.data().coefficient || 1,
        credits: doc.data().credits || 0,
        noteEliminatoire: doc.data().noteEliminatoire,
      })) as Module[];
      setAllModules(modulesData);
    } catch (error) {
      console.error('Error fetching modules:', error);
      setFetchError('Failed to load modules.');
    }
  }, [selectedSpecialtyId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  // --- Populate Dropdowns ---
  useEffect(() => {
    setYearOptions(years.map(year => ({ label: year.name, value: year.id })));
    setSelectedYearId(years[0]?.id ?? '');
  }, [years]);

  useEffect(() => {
    const filtered = specialties.filter(s => s.yearId === selectedYearId);
    setSpecialiteOptions(filtered.map(spec => ({ label: spec.name, value: spec.id })));
    setSelectedSpecialtyId(filtered[0]?.id ?? '');
  }, [selectedYearId, specialties]);

  useEffect(() => {
    const semesterKeys = Array.from(new Set(allModules.map(m => m.semesterKey))).sort();
    setSemestreOptions(semesterKeys.map(key => ({ label: key || 'Unknown', value: key || '' })));
    setSelectedSemesterKey(semesterKeys[0] ?? '');
  }, [allModules]);

  useEffect(() => {
    if (!selectedSpecialtyId || !selectedSemesterKey) {
      setCurrentModules([]);
      return;
    }
    setCurrentModules(
      allModules.filter(m => m.specialtyId === selectedSpecialtyId && m.semesterKey === selectedSemesterKey)
    );
  }, [selectedSpecialtyId, selectedSemesterKey, allModules]);

  // --- Grade Parsing ---
  const parseGrade = useCallback((value: string | undefined) => {
    if (!value || value.trim() === '') return { num: null, valid: false, display: '' };
    const cleaned = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? { num: null, valid: false, display: cleaned } : { num: Math.min(Math.max(num, 0), 20), valid: true, display: cleaned };
  }, []);

  // --- Calculate Module Average ---
  const calculateModuleAverage = useCallback((module: Module, moduleGrades: GradeInput) => {
    const evals = module.evaluations || [];
    let sum = 0, weightSum = 0, canCalculate = true, isEliminated = false;
    const elimNote = module.noteEliminatoire;

    const addGrade = (gradeStr: string | undefined, weight: number) => {
      const gradeInfo = parseGrade(gradeStr);
      if (gradeInfo.num === null) canCalculate = false;
      else {
        sum += gradeInfo.num * weight;
        weightSum += weight;
      }
    };

    const hasTD = evals.includes('TD'), hasTP = evals.includes('TP'), hasExam = evals.includes('Examen');
    if (hasTD && hasTP && hasExam) {
      addGrade(moduleGrades.td, 0.2);
      addGrade(moduleGrades.tp, 0.2);
      addGrade(moduleGrades.examen, 0.6);
    } else if (hasTP && hasExam) {
      addGrade(moduleGrades.tp, 0.4);
      addGrade(moduleGrades.examen, 0.6);
    } else if (hasTD && hasExam) {
      addGrade(moduleGrades.td, 0.4);
      addGrade(moduleGrades.examen, 0.6);
    } else if (hasExam) addGrade(moduleGrades.examen, 1.0);
    else if (hasTP) addGrade(moduleGrades.tp, 1.0);
    else if (hasTD) addGrade(moduleGrades.td, 1.0);
    else canCalculate = false;

    const average = canCalculate && weightSum > 0 ? sum / weightSum : null;
    if (elimNote && average !== null && average < elimNote) isEliminated = true;
    return { average, isEliminated, isValid: canCalculate && weightSum > 0 };
  }, [parseGrade]);

  // --- Live Calculation ---
  useEffect(() => {
    const newAverages: ModuleAverageState = {};
    let totalWeightedSum = 0, totalCoeff = 0, totalCreditsAttempted = 0, totalCreditsValidated = 0, hasEliminations = false;

    currentModules.forEach(module => {
      const moduleKey = module.id;
      const result = calculateModuleAverage(module, grades[moduleKey] || {});
      newAverages[moduleKey] = result;

      if (result.isValid && result.average !== null) {
        const coeff = module.coefficient || 1;
        totalWeightedSum += result.average * coeff;
        totalCoeff += coeff;
        totalCreditsAttempted += module.credits || 0;
        if (result.average >= 10 && !result.isEliminated) totalCreditsValidated += module.credits || 0;
        if (result.isEliminated) hasEliminations = true;
      }
    });

    setModuleAverages(newAverages);
    const average = totalCoeff > 0 ? totalWeightedSum / totalCoeff : null;
    setCalculationResult({
      average,
      totalCreditsAttempted,
      totalCreditsValidated,
      isValidated: average !== null && average >= 10 && !hasEliminations,
      hasEliminations,
    });
  }, [grades, currentModules, calculateModuleAverage]);

  // --- Handle Grade Input ---
  const handleGradeChange = (moduleKey: string, type: 'td' | 'tp' | 'examen', value: string) => {
    setGrades(prev => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [type]: value },
    }));
  };

  // --- Storage Functions ---
  const getStorageKey = () => `${GRADE_STORAGE_PREFIX}${selectedYearId}_${selectedSpecialtyId}_${selectedSemesterKey}`;
  const saveGrades = async () => {
    const key = getStorageKey();
    if (!key) return Alert.alert('Error', 'Select all options.');
    setIsSavingGrades(true);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(grades));
      Alert.alert('Success', 'Grades saved.');
    } catch (error) {
      console.error('Error saving grades:', error);
      Alert.alert('Error', 'Failed to save grades.');
    } finally {
      setIsSavingGrades(false);
    }
  };

  const loadGrades = async () => {
    const key = getStorageKey();
    if (!key) return Alert.alert('Error', 'Select all options.');
    setIsLoadingGrades(true);
    try {
      const saved = await AsyncStorage.getItem(key);
      if (saved) {
        setGrades(JSON.parse(saved));
        Alert.alert('Success', 'Grades loaded.');
      } else {
        Alert.alert('Info', 'No saved grades found.');
      }
    } catch (error) {
      console.error('Error loading grades:', error);
      Alert.alert('Error', 'Failed to load grades.');
    } finally {
      setIsLoadingGrades(false);
    }
  };

  const clearGrades = () => {
    Alert.alert('Clear Grades', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setGrades({}) },
    ]);
  };

  // --- What If Calculation ---
  const calculateWhatIf = () => {
    const targetAvg = parseFloat(targetSemesterAverage.replace(',', '.'));
    if (isNaN(targetAvg) || targetAvg < 0 || targetAvg > 20) return Alert.alert('Error', 'Invalid target average (0-20).');

    let weightedSum = 0, totalCoeff = 0, examWeightCoeff = 0, canCalculate = true;
    currentModules.forEach(module => {
      const moduleGrades = grades[module.id] || {};
      const evals = module.evaluations || [];
      const tdInfo = parseGrade(moduleGrades.td);
      const tpInfo = parseGrade(moduleGrades.tp);
      if (evals.includes('TD') && tdInfo.num === null) canCalculate = false;
      if (evals.includes('TP') && tpInfo.num === null) canCalculate = false;
      if (!canCalculate) return;

      const coeff = module.coefficient || 1;
      totalCoeff += coeff;
      let sumWithoutExam = 0, examWeight = 0;
      if (evals.includes('TD') && evals.includes('TP') && evals.includes('Examen')) {
        sumWithoutExam = (tdInfo.num || 0) * 0.2 + (tpInfo.num || 0) * 0.2;
        examWeight = 0.6;
      } else if (evals.includes('TP') && evals.includes('Examen')) {
        sumWithoutExam = (tpInfo.num || 0) * 0.4;
        examWeight = 0.6;
      } else if (evals.includes('TD') && evals.includes('Examen')) {
        sumWithoutExam = (tdInfo.num || 0) * 0.4;
        examWeight = 0.6;
      } else if (evals.includes('Examen')) examWeight = 1.0;

      weightedSum += sumWithoutExam * coeff;
      if (examWeight > 0) examWeightCoeff += examWeight * coeff;
    });

    if (!canCalculate) return Alert.alert('Missing Grades', 'Enter all TD/TP grades.');
    if (examWeightCoeff <= 0) return Alert.alert('Info', 'No exams to calculate.');
    const neededExamAvg = (targetAvg * totalCoeff - weightedSum) / examWeightCoeff;
    const message = neededExamAvg <= 0 ? 'Target already reached.' : neededExamAvg > 20 ? 'Impossible to reach.' : `Need ${neededExamAvg.toFixed(2)}/20 in exams.`;
    Alert.alert('What If', message);
  };

  // --- Render Module Card ---
  const renderModuleCard = (module: Module) => {
    const moduleKey = module.id;
    const { average, isEliminated, isValid } = moduleAverages[moduleKey] || {};
    const avgText = isValid && average !== null ? average.toFixed(2) : '--.--';
    const avgColor = isValid && average !== null ? (average >= 10 && !isEliminated ? colors.success : colors.danger) : colors.textSecondary;

    return (
      <Animated.View entering={FadeInUp.delay(100)} style={styles.moduleCard}>
        <Text style={styles.moduleTitle}>{module.name}</Text>
        <View style={styles.moduleInfo}>
          <Text style={styles.badge}>C: {module.coefficient}</Text>
          <Text style={styles.badge}>Cr: {module.credits}</Text>
          {module.noteEliminatoire && <Text style={[styles.badge, styles.elimBadge]}>Elim: {module.noteEliminatoire}</Text>}
        </View>
        <View style={styles.gradesContainer}>
          {(module.evaluations || []).map(type => {
            const key = type.toLowerCase() as 'td' | 'tp' | 'examen';
            const value = grades[moduleKey]?.[key] ?? '';
            return (
              <View key={type} style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{type}</Text>
                <TextInput
                  style={styles.gradeInput}
                  placeholder="--"
                  keyboardType="decimal-pad"
                  value={value}
                  onChangeText={val => handleGradeChange(moduleKey, key, val)}
                  maxLength={5}
                  textAlign="center"
                />
              </View>
            );
          })}
        </View>
        <View style={styles.moduleFooter}>
          <Text style={[styles.avgText, { color: avgColor }]}>{avgText}{isEliminated ? ' (Elim)' : ''}</Text>
          {module.evaluations.includes('Examen') && (
            <TouchableOpacity style={styles.minExamBtn} onPress={() => calculateMinExamGrade(module)}>
              <Text style={styles.minExamText}>Min Exam</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  // --- Minimum Exam Grade ---
  const calculateMinExamGrade = (module: Module) => {
    const moduleGrades = grades[module.id] || {};
    const evals = module.evaluations || [];
    if (!evals.includes('Examen')) return Alert.alert('Info', 'No exam for this module.');

    const nonExamEvals = evals.filter(ev => ev !== 'Examen');
    const allEntered = nonExamEvals.every(ev => parseGrade(moduleGrades[ev.toLowerCase() as 'td' | 'tp'])?.num !== null);
    if (!allEntered) return Alert.alert('Missing Grades', `Enter all ${nonExamEvals.join(', ')} grades.`);

    let tdWeight = 0, tpWeight = 0, examWeight = 0;
    if (evals.includes('TD') && evals.includes('TP') && evals.includes('Examen')) {
      tdWeight = 0.2; tpWeight = 0.2; examWeight = 0.6;
    } else if (evals.includes('TP') && evals.includes('Examen')) {
      tpWeight = 0.4; examWeight = 0.6;
    } else if (evals.includes('TD') && evals.includes('Examen')) {
      tdWeight = 0.4; examWeight = 0.6;
    } else examWeight = 1.0;

    const tdNum = parseGrade(moduleGrades.td)?.num || 0;
    const tpNum = parseGrade(moduleGrades.tp)?.num || 0;
    const currentSum = tdWeight * tdNum + tpWeight * tpNum;
    const target = Math.max(10, module.noteEliminatoire || 0);
    const examGrade = (target - currentSum) / examWeight;

    const message = examGrade <= 0 ? 'Already passed.' : examGrade > 20 ? 'Impossible to pass.' : `Need ${examGrade.toFixed(2)}/20.`;
    Alert.alert('Min Exam Grade', message);
  };

  // --- Main Render ---
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Animated.View entering={FadeIn} style={styles.header}>
          <Ionicons name="calculator" size={36} color={colors.tint} />
          <Text style={styles.title}>Grade Calculator</Text>
          <Text style={styles.subtitle}>Track Your Semester Progress</Text>
        </Animated.View>

        {isLoadingData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : fetchError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={40} color={colors.danger} />
            <Text style={styles.errorText}>{fetchError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchInitialData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInUp.delay(200)} style={styles.selectionCard}>
              <Text style={styles.cardTitle}>Your Path</Text>
              <RNPickerSelect
                onValueChange={setSelectedYearId}
                items={yearOptions}
                style={pickerSelectStyles}
                value={selectedYearId}
                placeholder={{}}
                Icon={() => <Ionicons name="chevron-down" size={20} color={colors.text} />}
              />
              <RNPickerSelect
                onValueChange={setSelectedSpecialtyId}
                items={specialiteOptions}
                style={pickerSelectStyles}
                value={selectedSpecialtyId}
                placeholder={{}}
                Icon={() => <Ionicons name="chevron-down" size={20} color={colors.text} />}
              />
              <RNPickerSelect
                onValueChange={setSelectedSemesterKey}
                items={semestreOptions}
                style={pickerSelectStyles}
                value={selectedSemesterKey}
                placeholder={{}}
                Icon={() => <Ionicons name="chevron-down" size={20} color={colors.text} />}
              />
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(300)} style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={saveGrades} disabled={isSavingGrades}>
                <Ionicons name="save" size={20} color={colors.tint} />
                <Text style={styles.btnText}>{isSavingGrades ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={loadGrades} disabled={isLoadingGrades}>
                <Ionicons name="download" size={20} color={colors.tint} />
                <Text style={styles.btnText}>{isLoadingGrades ? 'Loading...' : 'Load'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.clearBtn]} onPress={clearGrades}>
                <Ionicons name="trash" size={20} color={colors.danger} />
                <Text style={[styles.btnText, { color: colors.danger }]}>Clear</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.modulesSection}>
              {currentModules.map(renderModuleCard)}
              {currentModules.length === 0 && selectedSemesterKey && (
                <Text style={styles.infoText}>No modules found.</Text>
              )}
            </View>

            <Animated.View entering={FadeInUp.delay(400)} style={styles.whatIfCard}>
              <Text style={styles.cardTitle}>What If?</Text>
              <View style={styles.whatIfRow}>
                <TextInput
                  style={styles.whatIfInput}
                  placeholder="Target Avg"
                  keyboardType="decimal-pad"
                  value={targetSemesterAverage}
                  onChangeText={setTargetSemesterAverage}
                />
                <TouchableOpacity style={styles.whatIfBtn} onPress={calculateWhatIf}>
                  <Text style={styles.whatIfText}>Calculate</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {calculationResult && (
              <Animated.View entering={FadeInUp.delay(500)} style={styles.resultsCard}>
                <Text style={styles.resultsTitle}>Semester Results</Text>
                <Text style={[styles.resultsAvg, { color: calculationResult.isValidated ? colors.success : colors.danger }]}>
                  {calculationResult.average?.toFixed(2) ?? '--.--'}
                </Text>
                <Text style={styles.resultsStatus}>
                  {calculationResult.isValidated ? 'Validated' : 'Not Validated'}
                </Text>
                <View style={styles.creditsRow}>
                  <Text style={styles.creditsText}>Attempted: {calculationResult.totalCreditsAttempted}</Text>
                  <Text style={styles.creditsText}>Validated: {calculationResult.totalCreditsValidated}</Text>
                </View>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Styles ---
const getStyles = (colorScheme: 'light' | 'dark', colors: any) => StyleSheet.create({
  keyboardAvoidingView: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 100 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginTop: 10 },
  subtitle: { fontSize: 16, color: colors.textSecondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 10, color: colors.textSecondary },
  errorContainer: { alignItems: 'center', marginTop: 50 },
  errorText: { color: colors.danger, marginVertical: 10 },
  retryBtn: { backgroundColor: colors.tint, padding: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: 'bold' },
  selectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  clearBtn: { borderWidth: 1, borderColor: colors.danger },
  btnText: { marginLeft: 8, fontSize: 16, color: colors.tint },
  modulesSection: { marginBottom: 20 },
  moduleCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  moduleTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  moduleInfo: { flexDirection: 'row', marginVertical: 8 },
  badge: { backgroundColor: colors.inputBackground, padding: 5, borderRadius: 5, marginRight: 8, fontSize: 12 },
  elimBadge: { backgroundColor: colors.danger + '20', color: colors.danger },
  gradesContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  inputWrapper: { alignItems: 'center', flex: 1 },
  inputLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 5 },
  gradeInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 10,
    width: 60,
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
  },
  moduleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  avgText: { fontSize: 16, fontWeight: 'bold' },
  minExamBtn: { backgroundColor: colors.tint, padding: 8, borderRadius: 8 },
  minExamText: { color: '#fff', fontSize: 12 },
  whatIfCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  whatIfRow: { flexDirection: 'row', alignItems: 'center' },
  whatIfInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    color: colors.text,
  },
  whatIfBtn: { backgroundColor: colors.tint, padding: 12, borderRadius: 10 },
  whatIfText: { color: '#fff', fontWeight: 'bold' },
  resultsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  resultsTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  resultsAvg: { fontSize: 36, fontWeight: 'bold', textAlign: 'center' },
  resultsStatus: { fontSize: 16, textAlign: 'center', color: colors.textSecondary, marginVertical: 5 },
  creditsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  creditsText: { fontSize: 14, color: colors.text },
  infoText: { textAlign: 'center', color: colors.textSecondary, fontSize: 16, marginVertical: 20 },
});

const getPickerStyles = (_colorScheme: 'light' | 'dark', colors: any) => StyleSheet.create({
  inputIOS: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    marginVertical: 5,
    color: colors.text,
    fontSize: 16,
  },
  inputAndroid: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    marginVertical: 5,
    color: colors.text,
    fontSize: 16,
  },
  iconContainer: { top: 18, right: 10 },
});