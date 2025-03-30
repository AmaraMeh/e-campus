// File: app/(tabs)/calculator.tsx
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
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

import { db } from '../../firebaseConfig'; // Import the Firestore instance from firebaseConfig.ts
import { Colors } from '../../constants/Colors'; // Adjust path to your color constants
import { useColorScheme } from '../../hooks/useColorScheme'; // Adjust path if needed

// --- Interfaces & Types ---
interface YearItem {
  id: string;
  name: string;
  order: number;
}
interface SpecialtyItem {
  id: string;
  name: string;
  yearId: string;
}
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
interface GradeInput {
  td?: string;
  tp?: string;
  examen?: string;
}
interface GradeState {
  [moduleKey: string]: GradeInput;
}
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
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [targetSemesterAverage, setTargetSemesterAverage] = useState<string>('10');

  // --- Fetch Initial Data from Firestore ---
  const fetchInitialData = useCallback(async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      // Fetch Years
      const yearsQuery = query(collection(db, 'years'), orderBy('order', 'asc'));
      const yearsSnapshot = await getDocs(yearsQuery);
      const yearsData = yearsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        order: doc.data().order,
      })) as YearItem[];
      setYears(yearsData);

      // Fetch Specialties
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
      setFetchError('Failed to load years and specialties. Please try again.');
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- Fetch Modules for Selected Specialty ---
  const fetchModules = useCallback(async () => {
    if (!selectedSpecialtyId) {
      setAllModules([]);
      return;
    }
    try {
      const modulesQuery = query(
        collection(db, 'modules'),
        where('specialtyId', '==', selectedSpecialtyId)
      );
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
      setFetchError('Failed to load modules. Please try again.');
    }
  }, [selectedSpecialtyId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  // --- Populate Dropdown Options ---
  useEffect(() => {
    const options = years.map(year => ({ label: year.name, value: year.id }));
    setYearOptions(options);
    if (options.length > 0 && !selectedYearId) setSelectedYearId(options[0].value);
  }, [years]);

  useEffect(() => {
    const filteredSpecialties = specialties.filter(s => s.yearId === selectedYearId);
    const specOptions = filteredSpecialties.map(spec => ({ label: spec.name, value: spec.id }));
    setSpecialiteOptions(specOptions);
    if (specOptions.length > 0 && (!selectedSpecialtyId || !specOptions.some(opt => opt.value === selectedSpecialtyId))) {
      setSelectedSpecialtyId(specOptions[0]?.value ?? '');
    } else if (specOptions.length === 0) {
      setSelectedSpecialtyId('');
    }
  }, [selectedYearId, specialties]);

  useEffect(() => {
    const semesterKeys = Array.from(
      new Set(allModules.map(m => m.semesterKey))
    ).sort();
    const options = semesterKeys.map(key => ({ label: key || 'Unknown Semester', value: key || '' }));
    setSemestreOptions(options);
    if (options.length > 0 && (!selectedSemesterKey || !options.some(opt => opt.value === selectedSemesterKey))) {
      setSelectedSemesterKey(options[0]?.value ?? '');
    } else if (options.length === 0) {
      setSelectedSemesterKey('');
    }
  }, [allModules]);

  // --- Load Current Modules ---
  useEffect(() => {
    if (!selectedSpecialtyId || !selectedSemesterKey) {
      setCurrentModules([]);
      return;
    }
    const modules = allModules.filter(
      m => m.specialtyId === selectedSpecialtyId && m.semesterKey === selectedSemesterKey
    );
    setCurrentModules(modules);
  }, [selectedSpecialtyId, selectedSemesterKey, allModules]);

  // --- Grade Parsing and Validation ---
  const parseAndValidateGrade = useCallback((value: string | undefined) => {
    if (!value || value.trim() === '') return { num: null, valid: false, display: '' };
    let cleaned = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('.'));
    const num = parseFloat(cleaned);
    if (isNaN(num)) return { num: null, valid: false, display: cleaned };
    if (num < 0) return { num: 0, valid: true, display: '0' };
    return { num: Math.min(num, 20), valid: true, display: cleaned };
  }, []);

  // --- Calculate Single Module Average ---
  const calculateSingleModuleAverage = useCallback(
    (module: Module, moduleGrades: GradeInput) => {
      if (!module) return { average: null, isEliminated: false, isValid: false };
      const evaluations = module.evaluations || [];
      let sum = 0,
        weightSum = 0,
        canCalculate = true,
        isEliminated = false;
      const elimNote = module.noteEliminatoire;
      const safeGrades = moduleGrades || {};

      const addGrade = (gradeStr: string | undefined, weight: number) => {
        const gradeInfo = parseAndValidateGrade(gradeStr);
        if (gradeInfo.num === null) canCalculate = false;
        else {
          sum += gradeInfo.num * weight;
          weightSum += weight;
        }
      };

      const hasTD = evaluations.includes('TD');
      const hasTP = evaluations.includes('TP');
      const hasExam = evaluations.includes('Examen');

      if (hasTD && hasTP && hasExam) {
        addGrade(safeGrades.td, 0.2);
        addGrade(safeGrades.tp, 0.2);
        addGrade(safeGrades.examen, 0.6);
      } else if (hasTP && hasExam) {
        addGrade(safeGrades.tp, 0.4);
        addGrade(safeGrades.examen, 0.6);
      } else if (hasTD && hasExam) {
        addGrade(safeGrades.td, 0.4);
        addGrade(safeGrades.examen, 0.6);
      } else if (hasExam) {
        addGrade(safeGrades.examen, 1.0);
      } else if (hasTP) {
        addGrade(safeGrades.tp, 1.0);
      } else if (hasTD) {
        addGrade(safeGrades.td, 1.0);
      } else {
        canCalculate = false;
      }

      const calculatedAverage = canCalculate && weightSum > 0 ? sum / weightSum : null;
      if (typeof elimNote === 'number' && calculatedAverage !== null && calculatedAverage < elimNote) {
        isEliminated = true;
      }
      return { average: calculatedAverage, isEliminated, isValid: canCalculate && weightSum > 0 };
    },
    [parseAndValidateGrade]
  );

  // --- Update Module Averages ---
  useEffect(() => {
    const newAverages: ModuleAverageState = {};
    currentModules.forEach(module => {
      if (!module.id) return;
      const moduleKey = module.id;
      newAverages[moduleKey] = calculateSingleModuleAverage(module, grades[moduleKey] || {});
    });
    setModuleAverages(newAverages);
  }, [grades, currentModules, calculateSingleModuleAverage]);

  // --- Handle Grade Input Changes ---
  const handleGradeChange = (moduleKey: string, type: 'td' | 'tp' | 'examen', value: string) => {
    setGrades(prev => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [type]: value },
    }));
  };

  // --- Storage Functions ---
  const getStorageKey = () => {
    if (!selectedYearId || !selectedSpecialtyId || !selectedSemesterKey) return null;
    return `${GRADE_STORAGE_PREFIX}${selectedYearId}_${selectedSpecialtyId}_${selectedSemesterKey}`;
  };

  const saveGrades = async () => {
    const key = getStorageKey();
    if (!key) {
      Alert.alert('Error', 'Please select all required options.');
      return;
    }
    setIsSavingGrades(true);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(grades));
      Alert.alert('Success', 'Grades saved successfully.');
    } catch (error) {
      console.error('Error saving grades:', error);
      Alert.alert('Error', 'Failed to save grades. Please try again.');
    } finally {
      setIsSavingGrades(false);
    }
  };

  const loadGrades = async () => {
    const key = getStorageKey();
    if (!key) {
      Alert.alert('Error', 'Please select all required options.');
      return;
    }
    setIsLoadingGrades(true);
    try {
      const savedGrades = await AsyncStorage.getItem(key);
      if (savedGrades) {
        setGrades(JSON.parse(savedGrades));
        Alert.alert('Success', 'Grades loaded successfully.');
      } else {
        Alert.alert('Info', 'No saved grades found for this selection.');
      }
    } catch (error) {
      console.error('Error loading grades:', error);
      Alert.alert('Error', 'Failed to load grades. Please try again.');
    } finally {
      setIsLoadingGrades(false);
    }
  };

  const clearGrades = () => {
    Alert.alert(
      'Clear All Grades',
      'Are you sure you want to clear all entered grades?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setGrades({}),
        },
      ]
    );
  };

  // --- "What If" Calculation ---
  const calculateWhatIf = () => {
    const targetAvg = parseFloat(targetSemesterAverage.replace(',', '.'));
    if (isNaN(targetAvg) || targetAvg < 0 || targetAvg > 20) {
      Alert.alert('Error', 'Please enter a valid target average between 0 and 20.');
      return;
    }

    if (currentModules.length === 0) {
      Alert.alert('Error', 'No modules selected to calculate.');
      return;
    }

    let currentWeightedSum = 0,
      totalCoefficientSum = 0,
      totalExamWeightCoefficientSum = 0,
      canCalculate = true;

    currentModules.forEach(module => {
      if (!module?.id || (module.coefficient ?? 0) <= 0) return;
      const moduleKey = module.id;
      const moduleGrades = grades[moduleKey] || {};
      const evaluations = module.evaluations || [];
      const tdInfo = parseAndValidateGrade(moduleGrades.td);
      const tpInfo = parseAndValidateGrade(moduleGrades.tp);

      if (evaluations.includes('TD') && (!tdInfo || tdInfo.num === null)) canCalculate = false;
      if (evaluations.includes('TP') && (!tpInfo || tpInfo.num === null)) canCalculate = false;
      if (!canCalculate) return;

      const tdNum = tdInfo?.num ?? 0;
      const tpNum = tpInfo?.num ?? 0;
      const coeff = module.coefficient ?? 1;
      totalCoefficientSum += coeff;

      let moduleSumWithoutExam = 0,
        examWeight = 0;
      const hasTD = evaluations.includes('TD');
      const hasTP = evaluations.includes('TP');
      const hasExam = evaluations.includes('Examen');

      if (hasTD && hasTP && hasExam) {
        moduleSumWithoutExam = tdNum * 0.2 + tpNum * 0.2;
        examWeight = 0.6;
      } else if (hasTP && hasExam) {
        moduleSumWithoutExam = tpNum * 0.4;
        examWeight = 0.6;
      } else if (hasTD && hasExam) {
        moduleSumWithoutExam = tdNum * 0.4;
        examWeight = 0.6;
      } else if (hasExam) {
        examWeight = 1.0;
      } else if (hasTP) {
        moduleSumWithoutExam = tpNum;
      } else if (hasTD) {
        moduleSumWithoutExam = tdNum;
      }

      currentWeightedSum += moduleSumWithoutExam * coeff;
      if (hasExam && examWeight > 0) totalExamWeightCoefficientSum += examWeight * coeff;
    });

    if (!canCalculate) {
      Alert.alert('Missing Grades', 'Please enter all required TD/TP grades for "What If" calculation.');
      return;
    }
    if (totalExamWeightCoefficientSum <= 0) {
      Alert.alert('Info', 'No modules with weighted exams to calculate.');
      return;
    }

    const targetWeightedSum = targetAvg * totalCoefficientSum;
    const neededExamWeightedSum = targetWeightedSum - currentWeightedSum;
    const averageExamNeeded = neededExamWeightedSum / totalExamWeightCoefficientSum;

    const resultMessage =
      averageExamNeeded <= 0
        ? 'You already reach or exceed the target average.'
        : averageExamNeeded > 20
        ? 'It is impossible to reach this average with the remaining exams.'
        : `You need an average of ${averageExamNeeded.toFixed(2)} / 20 in the remaining exams.`;
    Alert.alert('What If Calculation', resultMessage);
  };

  // --- Minimum Exam Grade Simulation for Each Module ---
  const calculateMinExamGrade = (module: Module) => {
    if (!module.id) return;
    const moduleKey = module.id;
    const moduleGrades = grades[moduleKey] || {};
    const evaluations = module.evaluations || [];
    if (!evaluations.includes('Examen')) {
      Alert.alert('Info', 'This module does not have an exam.');
      return;
    }

    // Ensure all non-exam grades are entered
    const nonExamEvals = evaluations.filter(ev => ev !== 'Examen');
    const allNonExamEntered = nonExamEvals.every(ev => {
      const gradeTypeKey = ev.toLowerCase() as 'td' | 'tp';
      const gradeStr = moduleGrades[gradeTypeKey];
      const gradeInfo = parseAndValidateGrade(gradeStr);
      return gradeInfo.num !== null;
    });

    if (!allNonExamEntered) {
      Alert.alert('Missing Grades', `Please enter all ${nonExamEvals.join(', ')} grades for this module.`);
      return;
    }

    // Assign weights based on evaluation types
    let tdWeight = 0, tpWeight = 0, examWeight = 0;
    if (evaluations.includes('TD') && evaluations.includes('TP') && evaluations.includes('Examen')) {
      tdWeight = 0.2;
      tpWeight = 0.2;
      examWeight = 0.6;
    } else if (evaluations.includes('TP') && evaluations.includes('Examen')) {
      tpWeight = 0.4;
      examWeight = 0.6;
    } else if (evaluations.includes('TD') && evaluations.includes('Examen')) {
      tdWeight = 0.4;
      examWeight = 0.6;
    } else if (evaluations.includes('Examen')) {
      examWeight = 1.0;
    }

    // Get current grades
    const tdNum = evaluations.includes('TD') ? parseAndValidateGrade(moduleGrades.td).num! : 0;
    const tpNum = evaluations.includes('TP') ? parseAndValidateGrade(moduleGrades.tp).num! : 0;

    // Calculate sum without exam
    const currentSum = tdWeight * tdNum + tpWeight * tpNum;

    // Determine passing target (10 or eliminatoire note)
    const target = Math.max(10, module.noteEliminatoire || 0);

    // Calculate required exam grade
    const requiredExamContribution = target - currentSum;
    if (examWeight <= 0) {
      Alert.alert('Error', 'Invalid exam weight configuration.');
      return;
    }
    const requiredExamGrade = requiredExamContribution / examWeight;

    // Provide feedback
    let message;
    if (requiredExamGrade <= 0) {
      message = 'You have already passed this module without the exam.';
    } else if (requiredExamGrade > 20) {
      message = 'It is impossible to pass this module with the current grades.';
    } else {
      message = `You need at least ${requiredExamGrade.toFixed(2)} / 20 in the exam to pass this module.`;
    }
    Alert.alert('Minimum Exam Grade', message);
  };

  // --- General Average Calculation (Requires All Grades) ---
  const handleCalculatePress = () => {
    setIsCalculating(true);
    if (currentModules.length === 0) {
      Alert.alert('Error', 'No modules available to calculate.');
      setIsCalculating(false);
      return;
    }

    // Check if all required grades are entered for all modules
    const allModulesValid = currentModules.every(module => {
      const moduleKey = module.id;
      const { isValid } = moduleAverages[moduleKey] || { isValid: false };
      return isValid;
    });

    if (!allModulesValid) {
      Alert.alert('Missing Grades', 'Please enter all required grades for all modules to calculate the general average.');
      setIsCalculating(false);
      return;
    }

    // Proceed with general average calculation
    let totalWeightedSum = 0,
      totalCoefficientSum = 0,
      totalCreditsAttempted = 0,
      totalCreditsValidated = 0,
      hasEliminations = false;

    currentModules.forEach(module => {
      if (!module.id || (module.coefficient ?? 0) <= 0) return;
      const moduleKey = module.id;
      const { average, isEliminated, isValid } = moduleAverages[moduleKey];
      const credits = module.credits ?? 0;
      const coeff = module.coefficient ?? 1;

      if (isValid && average !== null) {
        totalWeightedSum += average * coeff;
        totalCoefficientSum += coeff;
        totalCreditsAttempted += credits;
        if (average >= 10 && !isEliminated) totalCreditsValidated += credits;
        if (isEliminated) hasEliminations = true;
      }
    });

    const average = totalCoefficientSum > 0 ? totalWeightedSum / totalCoefficientSum : null;
    const isValidated = average !== null && average >= 10 && !hasEliminations;

    setCalculationResult({
      average,
      totalCreditsAttempted,
      totalCreditsValidated,
      isValidated,
      hasEliminations,
    });
    setIsCalculating(false);
  };

  // --- Render Module Card ---
  const renderModuleCard = (module: Module) => {
    if (!module?.id) return null;
    const moduleKey = module.id;
    const { average, isEliminated, isValid } = moduleAverages[moduleKey] || {
      average: null,
      isEliminated: false,
      isValid: false,
    };
    let avgColor = styles.averageTextPending,
      avgText = '--.--';
    if (isValid && average !== null) {
      avgColor = average >= 10 && !isEliminated ? styles.averageTextSuccess : styles.averageTextFail;
      avgText = average.toFixed(2);
    } else if (
      !isValid &&
      Object.values(grades[moduleKey] || {}).some(g => g && g.trim() !== '')
    ) {
      avgColor = styles.averageTextPending;
      avgText = '...';
    }
    const hasExam = (module.evaluations || []).includes('Examen');

    return (
      <View key={moduleKey} style={styles.moduleCard}>
        <View style={styles.moduleHeader}>
          <Text style={styles.moduleTitle}>{module.name}</Text>
          <View style={styles.moduleInfoBadges}>
            <Text style={styles.moduleInfoBadge}>Coef: {module.coefficient}</Text>
            <Text style={styles.moduleInfoBadge}>Credits: {module.credits}</Text>
            {typeof module.noteEliminatoire === 'number' && (
              <Text style={[styles.moduleInfoBadge, styles.eliminationNoteBadge]}>
                Elim: {module.noteEliminatoire}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.gradesInputSection}>
          <View style={styles.inputsGrid}>
            {(module.evaluations || []).map(type => {
              const gradeTypeKey = type.toLowerCase() as 'td' | 'tp' | 'examen';
              const gradeValue = grades[moduleKey]?.[gradeTypeKey] ?? '';
              const gradeInfo = parseAndValidateGrade(gradeValue);
              const isInvalidRange =
                gradeInfo.num !== null &&
                (gradeInfo.num < 0 || parseFloat(gradeInfo.display) > 20);
              const displayValue = gradeInfo.display;

              return (
                <View key={type} style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>{type}</Text>
                  <TextInput
                    style={[styles.gradeInput, isInvalidRange && styles.inputError]}
                    placeholder="--"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="decimal-pad"
                    value={displayValue}
                    onChangeText={value => handleGradeChange(moduleKey, gradeTypeKey, value)}
                    maxLength={5}
                    textAlign="center"
                  />
                </View>
              );
            })}
          </View>
        </View>
        <View style={styles.moduleFooter}>
          <View style={styles.moduleAverageDisplay}>
            {isValid && average !== null && (
              <Ionicons
                name={average >= 10 && !isEliminated ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={average >= 10 && !isEliminated ? colors.success : colors.danger}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.moduleAverageValue, avgColor]}>
              {avgText}
              {isEliminated ? ' (Elim)' : ''}
            </Text>
          </View>
          {hasExam && (
            <TouchableOpacity
              style={styles.minExamButton}
              onPress={() => calculateMinExamGrade(module)}
            >
              <Text style={styles.minExamButtonText}>Min Exam</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // --- Render Module Inputs Section ---
  const renderModuleInputs = () => {
    if (currentModules.length === 0 && !isLoadingData && selectedSemesterKey) {
      return <Text style={styles.infoText}>No modules found for this semester.</Text>;
    }
    return currentModules.map(renderModuleCard);
  };

  // --- Main Render Function ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Ionicons name="calculator-outline" size={32} color={colors.tint} />
          <Text style={styles.title}>Grade Calculator</Text>
          <Text style={styles.subtitle}>Calculate your semester average</Text>
        </View>

        {/* Loading or Error Display */}
        {isLoadingData && (
          <View style={styles.centeredMessageContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        )}
        {!isLoadingData && fetchError && (
          <View style={styles.centeredMessageContainer}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.danger} />
            <Text style={[styles.infoText, { color: colors.danger }]}>{fetchError}</Text>
            <TouchableOpacity onPress={fetchInitialData} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Content */}
        {!isLoadingData && !fetchError && (
          <>
            {/* Selection Card */}
            <View style={styles.selectionCard}>
              <Text style={styles.cardTitle}>Select Your Path</Text>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>
                  <Ionicons name="school-outline" size={14} color={colors.textSecondary} />
                  Year
                </Text>
                <RNPickerSelect
                  onValueChange={value => setSelectedYearId(value)}
                  items={yearOptions}
                  style={pickerSelectStyles}
                  value={selectedYearId}
                  placeholder={{ label: 'Select a year', value: '' }}
                  useNativeAndroidPickerStyle={false}
                  Icon={() => (
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  )}
                />
              </View>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>
                  <Ionicons name="book-outline" size={14} color={colors.textSecondary} />
                  Specialty
                </Text>
                <RNPickerSelect
                  onValueChange={value => setSelectedSpecialtyId(value)}
                  items={specialiteOptions}
                  style={pickerSelectStyles}
                  value={selectedSpecialtyId}
                  placeholder={{ label: 'Select a specialty', value: '' }}
                  useNativeAndroidPickerStyle={false}
                  Icon={() => (
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  )}
                />
              </View>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  Semester
                </Text>
                <RNPickerSelect
                  onValueChange={value => setSelectedSemesterKey(value)}
                  items={semestreOptions}
                  style={pickerSelectStyles}
                  value={selectedSemesterKey}
                  placeholder={{ label: 'Select a semester', value: '' }}
                  useNativeAndroidPickerStyle={false}
                  Icon={() => (
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  )}
                />
              </View>
            </View>

            {/* Storage Buttons */}
            <View style={styles.storageButtonContainer}>
              <TouchableOpacity
                style={styles.storageButton}
                onPress={saveGrades}
                disabled={isSavingGrades}
              >
                {isSavingGrades ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <Ionicons name="save-outline" size={18} color={colors.tint} />
                )}
                <Text style={styles.storageButtonText}>
                  {isSavingGrades ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.storageButton}
                onPress={loadGrades}
                disabled={isLoadingGrades}
              >
                {isLoadingGrades ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={colors.tint} />
                )}
                <Text style={styles.storageButtonText}>
                  {isLoadingGrades ? 'Loading...' : 'Load'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.storageButton, { borderColor: colors.danger }]}
                onPress={clearGrades}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.storageButtonText, { color: colors.danger }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>

            {/* Module Inputs */}
            <View style={styles.modulesSection}>
              {currentModules.length > 0 && (
                <Text style={styles.sectionTitle}>Enter Module Grades</Text>
              )}
              {renderModuleInputs()}
              {currentModules.length === 0 && selectedSemesterKey && (
                <Text style={styles.infoText}>No modules found for {selectedSemesterKey}.</Text>
              )}
              {!selectedSemesterKey && selectedSpecialtyId && (
                <Text style={styles.infoText}>Please select a semester.</Text>
              )}
              {!selectedSpecialtyId && (
                <Text style={styles.infoText}>Please select a specialty.</Text>
              )}
            </View>

            {/* "What If" Section */}
            <View style={styles.whatIfCard}>
              <Text style={styles.cardTitle}>What If...?</Text>
              <Text style={styles.whatIfDescription}>
                Enter a target average to see the required exam grades.
              </Text>
              <View style={styles.whatIfInputRow}>
                <TextInput
                  style={styles.whatIfInput}
                  placeholder="Target average (e.g., 12)"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="decimal-pad"
                  value={targetSemesterAverage}
                  onChangeText={setTargetSemesterAverage}
                  maxLength={5}
                />
                <TouchableOpacity style={styles.whatIfButton} onPress={calculateWhatIf}>
                  <FontAwesome name="question-circle" size={16} color={colors.tint} />
                  <Text style={styles.whatIfButtonText}>Calculate</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Calculate Button */}
            {currentModules.length > 0 && (
              <TouchableOpacity
                style={[styles.calculateButton, isCalculating && styles.buttonDisabled]}
                onPress={handleCalculatePress}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <ActivityIndicator size="small" color="#fff" style={styles.buttonActivityIndicator} />
                ) : (
                  <FontAwesome name="calculator" size={20} color="white" />
                )}
                <Text style={styles.calculateButtonText}>
                  {isCalculating ? 'Calculating...' : 'Calculate Average'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Results Display */}
            {calculationResult && (
              <View style={styles.resultsCard}>
                <View
                  style={[
                    styles.averageDisplayBox,
                    calculationResult.isValidated
                      ? styles.averageBoxSuccess
                      : styles.averageBoxFail,
                  ]}
                >
                  <Ionicons
                    name={calculationResult.isValidated ? 'checkmark-circle' : 'close-circle'}
                    size={32}
                    color={calculationResult.isValidated ? colors.success : colors.danger}
                    style={styles.validationIcon}
                  />
                  <Text style={styles.averageLabel}>General Average</Text>
                  <Text
                    style={[
                      styles.generalAverageValue,
                      calculationResult.isValidated
                        ? styles.averageStatusSuccess
                        : styles.averageStatusFail,
                    ]}
                  >
                    {calculationResult.average !== null
                      ? calculationResult.average.toFixed(2)
                      : '--.--'}
                  </Text>
                  <Text
                    style={[
                      styles.validationStatus,
                      calculationResult.isValidated
                        ? styles.averageStatusSuccess
                        : styles.averageStatusFail,
                    ]}
                  >
                    {calculationResult.isValidated
                      ? 'Validated'
                      : calculationResult.hasEliminations
                      ? 'Not Validated (Eliminations)'
                      : 'Not Validated'}
                  </Text>
                </View>
                <View style={styles.creditsSummaryBox}>
                  <View style={styles.creditItem}>
                    <Text style={styles.creditsLabel}>Credits Attempted</Text>
                    <Text style={styles.creditsValue}>
                      {calculationResult.totalCreditsAttempted}
                    </Text>
                  </View>
                  <View style={styles.creditItem}>
                    <Text style={styles.creditsLabel}>Credits Validated</Text>
                    <Text style={styles.creditsValue}>
                      {calculationResult.totalCreditsValidated}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Styles ---
const getStyles = (colorScheme: 'light' | 'dark', colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    keyboardAvoidingView: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { paddingHorizontal: 15, paddingVertical: 20, paddingBottom: 60 },
    headerSection: { alignItems: 'center', marginBottom: 25 },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
      marginTop: 5,
    },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    centeredMessageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      minHeight: 200,
    },
    loadingText: { marginTop: 10, fontSize: 14, color: colors.textSecondary },
    retryButton: {
      marginTop: 20,
      backgroundColor: colors.tint,
      paddingVertical: 10,
      paddingHorizontal: 25,
      borderRadius: 8,
    },
    retryButtonText: { color: '#fff', fontWeight: 'bold' },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '80',
      textAlign: 'left',
      paddingLeft: 5,
    },
    selectionCard: {
      marginBottom: 25,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    pickerWrapper: { marginVertical: 9 },
    pickerLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginLeft: 2,
    },
    storageButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      marginBottom: 25,
    },
    storageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 16,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    storageButtonText: { marginLeft: 8, fontSize: 13, color: colors.tint, fontWeight: '500' },
    infoText: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: 30,
      fontSize: 15,
      paddingHorizontal: 10,
    },
    modulesSection: { marginBottom: 20 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
      marginTop: 10,
      paddingLeft: 5,
    },
    moduleCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      overflow: 'hidden',
    },
    moduleHeader: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 8 },
    moduleTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
    moduleInfoBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    moduleInfoBadge: {
      fontSize: 10,
      color: colors.textSecondary,
      backgroundColor: colors.inputBackground,
      paddingVertical: 3,
      paddingHorizontal: 7,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    eliminationNoteBadge: {
      color: colors.danger,
      borderColor: colors.danger + '80',
      backgroundColor: colors.danger + '15',
    },
    gradesInputSection: {
      backgroundColor: colors.background + '50',
      paddingHorizontal: 10,
      paddingVertical: 15,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border + '80',
    },
    inputsGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
    inputWrapper: { alignItems: 'center', flex: 1, marginHorizontal: 3, maxWidth: 90 },
    inputLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 5,
      textTransform: 'uppercase',
    },
    gradeInput: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      borderWidth: 1.5,
      borderRadius: 8,
      width: '95%',
      paddingHorizontal: 5,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
      minHeight: 42,
    },
    inputError: { borderColor: colors.danger, borderWidth: 1.5, backgroundColor: colors.danger + '10' },
    moduleFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 10,
    },
    moduleAverageDisplay: { flexDirection: 'row', alignItems: 'center' },
    moduleAverageValue: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
    averageTextPending: { color: colors.textSecondary + 'A0' },
    averageTextSuccess: { color: colors.success },
    averageTextFail: { color: colors.danger },
    minExamButton: {
      backgroundColor: colors.tint,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
    },
    minExamButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '500',
    },
    whatIfCard: {
      marginTop: 15,
      padding: 15,
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    whatIfDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    whatIfInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    whatIfInput: {
      flex: 1,
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    whatIfButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint + '1A',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint + '50',
    },
    whatIfButtonText: { marginLeft: 6, color: colors.tint, fontWeight: '500', fontSize: 13 },
    calculateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.tint,
      paddingVertical: 15,
      borderRadius: 12,
      marginTop: 30,
      marginHorizontal: 5,
      shadowColor: colors.tint,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 4,
      minHeight: 52,
    },
    buttonDisabled: {
      backgroundColor: colors.disabledBackground ?? '#9ca3af',
      shadowOpacity: 0.1,
      elevation: 1,
      opacity: 0.7,
    },
    buttonActivityIndicator: { marginRight: 10 },
    calculateButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    resultsCard: {
      marginTop: 30,
      backgroundColor: colors.cardBackground,
      borderRadius: 15,
      paddingHorizontal: 0,
      paddingBottom: 0,
      paddingTop: 15,
      marginHorizontal: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    averageDisplayBox: {
      paddingVertical: 20,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '80',
    },
    averageBoxSuccess: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(22, 163, 74, 0.1)' : '#f0fdf4',
    },
    averageBoxFail: {
      backgroundColor: colorScheme === 'dark' ? 'rgba(220, 38, 38, 0.1)' : '#fff1f2',
    },
    validationIcon: { marginBottom: 8 },
    averageLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
    generalAverageValue: { fontSize: 36, fontWeight: 'bold', marginBottom: 4 },
    validationStatus: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
    averageStatusSuccess: { color: colors.success },
    averageStatusFail: { color: colors.danger },
    creditsSummaryBox: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 15,
      backgroundColor: colors.inputBackground,
    },
    creditItem: { alignItems: 'center' },
    creditsLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
    creditsValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  });

const getPickerStyles = (
  colorScheme: 'light' | 'dark',
  colors: typeof Colors.light | typeof Colors.dark
) =>
  StyleSheet.create({
    inputIOS: {
      fontSize: 15,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 0,
      color: colors.text,
      paddingRight: 25,
    },
    inputAndroid: {
      fontSize: 15,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 0,
      color: colors.text,
      paddingRight: 25,
    },
    placeholder: {
      color: colors.placeholderText,
    },
    iconContainer: {
      top: 15,
      right: 10,
    },
  });