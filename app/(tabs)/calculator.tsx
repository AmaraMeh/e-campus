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
import { universiteBejaiaData, Module } from '../../constants/Data'; // Adjust path
import { Colors } from '../../constants/Colors'; // Adjust path
import { useColorScheme } from '../../hooks/useColorScheme'; // Adjust path
import { FontAwesome } from '@expo/vector-icons';

// Type for grades state: Key is module matiere, value has optional td, tp, examen strings
interface GradeState {
  [moduleKey: string]: {
    td?: string;
    tp?: string;
    examen?: string;
  };
}

// Type for module average state: Key is module matiere, value has calculated average and elimination status
interface ModuleAverageState {
  [moduleKey: string]: {
    average: number | null;
    isEliminated: boolean;
  };
}

export default function CalculatorScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const pickerSelectStyles = getPickerStyles(colorScheme);

  // --- State ---
  const [selectedYear, setSelectedYear] = useState<string | null>('1ere Année Licence');
  const [selectedSpecialite, setSelectedSpecialite] = useState<string | null>(null);
  const [selectedSemestre, setSelectedSemestre] = useState<string | null>(null);

  const [specialiteOptions, setSpecialiteOptions] = useState<{ label: string; value: string }[]>([]);
  const [semestreOptions, setSemestreOptions] = useState<{ label: string; value: string }[]>([]);
  const [currentModules, setCurrentModules] = useState<Module[]>([]);

  const [grades, setGrades] = useState<GradeState>({});
  const [moduleAverages, setModuleAverages] = useState<ModuleAverageState>({});
  const [generalAverage, setGeneralAverage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const yearOptions = Object.keys(universiteBejaiaData).map(year => ({
    label: year,
    value: year,
  }));

  // --- Effects for Dynamic Dropdowns and Module Loading ---
  useEffect(() => {
    // Update Specialties when Year changes
    let specs: string[] = [];
    if (selectedYear && universiteBejaiaData[selectedYear]) {
      specs = Object.keys(universiteBejaiaData[selectedYear]);
    }
    setSpecialiteOptions(specs.map(spec => ({ label: spec, value: spec })));
    setSelectedSpecialite(null);
    setSelectedSemestre(null);
    setCurrentModules([]);
    setGrades({});
    setModuleAverages({});
    setGeneralAverage(null);
  }, [selectedYear]);

  useEffect(() => {
    // Update Semesters when Specialty changes
    let sems: string[] = [];
    if (selectedYear && selectedSpecialite && universiteBejaiaData[selectedYear]?.[selectedSpecialite]) {
      sems = Object.keys(universiteBejaiaData[selectedYear][selectedSpecialite]);
    }
    setSemestreOptions(sems.map(sem => ({ label: sem, value: sem })));
    setSelectedSemestre(null);
    setCurrentModules([]);
    setGrades({});
    setModuleAverages({});
    setGeneralAverage(null);
  }, [selectedSpecialite, selectedYear]);

  useEffect(() => {
    // Load Modules when Semester changes
    let mods: Module[] = [];
    if (selectedYear && selectedSpecialite && selectedSemestre && universiteBejaiaData[selectedYear]?.[selectedSpecialite]?.[selectedSemestre]) {
      mods = universiteBejaiaData[selectedYear][selectedSpecialite][selectedSemestre];
    }
    setCurrentModules(mods);

    // Initialize/Reset state for the loaded modules
    const initialGrades: GradeState = {};
    const initialAverages: ModuleAverageState = {};
    mods.forEach(m => {
        initialGrades[m.matiere] = {}; // Use matiere as the key
        initialAverages[m.matiere] = { average: null, isEliminated: false };
    });
    setGrades(initialGrades);
    setModuleAverages(initialAverages);
    setGeneralAverage(null); // Reset general average when modules change
  }, [selectedSemestre, selectedSpecialite, selectedYear]);

  // --- Grade Input Handling ---
  const handleGradeChange = (moduleKey: string, type: 'td' | 'tp' | 'examen', value: string) => {
    let cleanedValue = value.replace(/[^0-9.]/g, '');
    if ((cleanedValue.match(/\./g) || []).length > 1) {
       cleanedValue = cleanedValue.substring(0, cleanedValue.lastIndexOf('.'));
    }

    const numericValue = parseFloat(cleanedValue);
    let finalValue = cleanedValue;

    if (!isNaN(numericValue)) {
      if (numericValue < 0) finalValue = '0';
      // Allow values slightly above 20 temporarily for input flexibility, but cap calculation later
      // if (numericValue > 20) finalValue = '20'; // Cap input directly if preferred
    }

    setGrades(prev => ({
      ...prev,
      [moduleKey]: { ...(prev[moduleKey] || {}), [type]: finalValue } // Ensure prev[moduleKey] exists
    }));
  };

  // --- Calculation Logic ---
  const calculateSingleModuleAverage = useCallback((module: Module): { average: number | null; isEliminated: boolean } => {
    const moduleKey = module.matiere;
    const moduleGrades = grades[moduleKey] || {};

    const safeParseFloat = (val: string | undefined): number => {
      if (val === undefined || val === null || val.trim() === '') return NaN;
      const num = parseFloat(val);
      // CAP the value used in calculation at 20, even if input allowed more temporarily
      if (!isNaN(num) && num >= 0 && num <= 20) return num;
      if (!isNaN(num) && num > 20) return 20; // Cap at 20 for calculation
      return NaN;
    };

    const noteTD = safeParseFloat(moduleGrades.td);
    const noteTP = safeParseFloat(moduleGrades.tp);
    const noteExamen = safeParseFloat(moduleGrades.examen);

    let calculatedAverage: number | null = null;
    const evaluations = module.evaluations;

    let allRequiredValid = true;
    if (evaluations.includes("TD") && isNaN(noteTD)) allRequiredValid = false;
    if (evaluations.includes("TP") && isNaN(noteTP)) allRequiredValid = false;
    if (evaluations.includes("Examen") && isNaN(noteExamen)) allRequiredValid = false;

    if (allRequiredValid) {
        // Apply weighting logic based on the presence of evaluation types
        if (evaluations.includes("TD") && evaluations.includes("TP") && evaluations.includes("Examen")) {
            calculatedAverage = (noteTD * 0.2) + (noteTP * 0.2) + (noteExamen * 0.6);
        } else if (evaluations.includes("TP") && evaluations.includes("Examen")) {
            calculatedAverage = (noteTP * 0.4) + (noteExamen * 0.6);
        } else if (evaluations.includes("TD") && evaluations.includes("Examen")) {
            calculatedAverage = (noteTD * 0.4) + (noteExamen * 0.6);
        } else if (evaluations.includes("Examen")) {
            calculatedAverage = noteExamen;
        } else if (evaluations.includes("TP")) {
             calculatedAverage = noteTP;
        } else if (evaluations.includes("TD")) {
             calculatedAverage = noteTD;
        }
    }

    const isEliminated = module.noteEliminatoire !== undefined &&
                         calculatedAverage !== null &&
                         calculatedAverage < module.noteEliminatoire;

    return { average: calculatedAverage, isEliminated };
  }, [grades]); // Depends only on the grades state

  // --- Trigger Calculation ---
  const handleCalculatePress = () => {
    setIsLoading(true);
    setTimeout(() => {
      let totalWeightedSum = 0;
      let totalCoefficientSum = 0;
      const newModuleAverages: ModuleAverageState = {};
      let allModulesCalculated = true;
      let anyModuleEliminated = false;

      if (currentModules.length === 0) {
          Alert.alert("Erreur", "Aucun module n'est chargé pour la sélection actuelle.");
          setIsLoading(false);
          return;
      }

      currentModules.forEach(module => {
        const { average, isEliminated } = calculateSingleModuleAverage(module);
        newModuleAverages[module.matiere] = { average, isEliminated };

        if (average === null) {
          allModulesCalculated = false;
        } else {
          totalWeightedSum += average * module.coefficient;
          totalCoefficientSum += module.coefficient;
        }
        if (isEliminated) {
            anyModuleEliminated = true;
        }
      });

      setModuleAverages(newModuleAverages); // Update module averages state

      if (totalCoefficientSum > 0 && allModulesCalculated) {
        setGeneralAverage(totalWeightedSum / totalCoefficientSum);
        if (anyModuleEliminated) {
             // Optionally show a persistent warning instead of just console/alert
            console.warn("Un ou plusieurs modules sont éliminatoires.");
        }
      } else {
        setGeneralAverage(null);
        if (!allModulesCalculated) {
            Alert.alert("Information", "Veuillez remplir toutes les notes requises (0-20) pour tous les modules afin de calculer la moyenne générale.");
        }
      }
      setIsLoading(false);
    }, 50);
  };

  // --- Render Functions ---
  const renderModuleInputs = () => {
    if (!selectedYear || !selectedSpecialite || !selectedSemestre) {
        return <Text style={styles.infoText}>Veuillez sélectionner l'année, la spécialité et le semestre.</Text>;
    }
     if (currentModules.length === 0) {
       return <Text style={styles.infoText}>Chargement des modules ou aucun module défini...</Text>;
     }

    return currentModules.map((module) => {
      const moduleKey = module.matiere;
      const moduleAvgData = moduleAverages[moduleKey] ?? { average: null, isEliminated: false };
      const moduleAvg = moduleAvgData.average;
      const isEliminated = moduleAvgData.isEliminated;
      let avgColor = styles.averageTextPending;
      if (moduleAvg !== null) {
         avgColor = (moduleAvg >= 10 && !isEliminated) ? styles.averageTextSuccess : styles.averageTextFail;
      }

      return (
        <View key={moduleKey} style={styles.moduleCard}>
          <Text style={styles.moduleTitle}>{module.matiere}</Text>
          <View style={styles.moduleInfo}>
              <Text style={styles.infoTextSmall}>Coeff: {module.coefficient}</Text>
              <Text style={styles.infoTextSmall}>Crédits: {module.credits}</Text>
              {module.noteEliminatoire !== undefined && <Text style={[styles.infoTextSmall, styles.eliminationNote]}>Élim: {module.noteEliminatoire}</Text>}
          </View>

          <View style={styles.inputsGrid}>
            {module.evaluations.map((type) => {
              const gradeTypeKey = type.toLowerCase() as 'td' | 'tp' | 'examen';
              return (
                <View key={type} style={styles.inputContainer}>
                  <Text style={styles.label}>{type}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Note"
                    keyboardType="numeric"
                    value={grades[moduleKey]?.[gradeTypeKey] ?? ''}
                    onChangeText={(value) => handleGradeChange(moduleKey, gradeTypeKey, value)}
                    maxLength={5} // Allows "20.00" or "12.5" etc.
                    selectTextOnFocus={true}
                  />
                </View>
              );
            })}
          </View>

           <View style={styles.moduleAverageContainer}>
               <Text style={styles.moduleAverageLabel}>Moyenne Module:</Text>
               <Text style={[styles.moduleAverageValue, avgColor]}>
                   {moduleAvg !== null ? moduleAvg.toFixed(2) : '--.--'}
                   {isEliminated ? ' (Éliminé)' : ''}
                </Text>
           </View>
        </View>
      );
    });
  };

  // --- Main Render ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // Adjust offset if header/tabs are taller
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Calculateur de Moyenne</Text>
        <Text style={styles.subtitle}>Université de Bejaia</Text>

        {/* --- Selection Pickers --- */}
        <View style={styles.pickerContainer}>
           {/* Year Picker - Kept simple as it's top-level */}
           <View style={styles.pickerWrapper}>
             <Text style={styles.pickerLabel}>Année</Text>
             <RNPickerSelect
                placeholder={{ label: "Sélectionnez l'année...", value: null }}
                items={yearOptions}
                onValueChange={(value) => setSelectedYear(value)}
                style={pickerSelectStyles}
                value={selectedYear}
                useNativeAndroidPickerStyle={false}
                Icon={() => <FontAwesome name="caret-down" size={18} color="gray" style={styles.pickerIcon} />}
              />
           </View>

           {/* Specialty Picker */}
           <View style={styles.pickerWrapper}>
            <Text style={styles.pickerLabel}>Spécialité</Text>
             <RNPickerSelect
                placeholder={{ label: specialiteOptions.length > 0 ? "Sélectionnez la spécialité..." : "Sélectionnez d'abord l'année", value: null }}
                items={specialiteOptions}
                onValueChange={(value) => setSelectedSpecialite(value)}
                style={pickerSelectStyles}
                value={selectedSpecialite}
                disabled={!selectedYear || specialiteOptions.length === 0}
                useNativeAndroidPickerStyle={false}
                 Icon={() => <FontAwesome name="caret-down" size={18} color={!selectedYear || specialiteOptions.length === 0 ? '#ccc' : 'gray'} style={styles.pickerIcon} />}
              />
            </View>

            {/* Semester Picker */}
            <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Semestre</Text>
                <RNPickerSelect
                    placeholder={{ label: semestreOptions.length > 0 ? "Sélectionnez le semestre..." : "Sélectionnez d'abord la spécialité", value: null }}
                    items={semestreOptions}
                    onValueChange={(value) => setSelectedSemestre(value)}
                    style={pickerSelectStyles}
                    value={selectedSemestre}
                    disabled={!selectedSpecialite || semestreOptions.length === 0}
                    useNativeAndroidPickerStyle={false}
                     Icon={() => <FontAwesome name="caret-down" size={18} color={!selectedSpecialite || semestreOptions.length === 0 ? '#ccc' : 'gray'} style={styles.pickerIcon} />}
                />
             </View>
        </View>

        {/* --- Module Inputs --- */}
        <View style={styles.modulesSection}>
          {renderModuleInputs()}
        </View>

        {/* --- Calculate Button --- */}
        {currentModules.length > 0 && (
           <TouchableOpacity
              style={[styles.calculateButton, isLoading && styles.buttonDisabled]} // Add disabled style
              onPress={handleCalculatePress}
              disabled={isLoading}
            >
             {isLoading ? (
                 <ActivityIndicator size="small" color="white" style={styles.buttonActivityIndicator}/>
             ) : (
                 <FontAwesome name="calculator" size={20} color="white" />
             )}
             <Text style={styles.calculateButtonText}>
               {isLoading ? 'Calcul en cours...' : 'Calculer Moyenne Générale'}
             </Text>
           </TouchableOpacity>
        )}


        {/* --- Results Display --- */}
         {generalAverage !== null && (
           <View style={styles.resultsContainer}>
             <Text style={styles.resultsTitle}>Résultat du Semestre</Text>
             <View style={[
                 styles.averageBox,
                 (generalAverage >= 10 && !Object.values(moduleAverages).some(m => m.isEliminated)) ? styles.averageBoxSuccess : styles.averageBoxFail
                ]}>
               <Text style={styles.averageLabel}>Moyenne Générale</Text>
               <Text style={[
                   styles.averageValue,
                   (generalAverage >= 10 && !Object.values(moduleAverages).some(m => m.isEliminated)) ? styles.averageStatusSuccess : styles.averageStatusFail // Apply color to value too
               ]}>{generalAverage.toFixed(2)}</Text>
               <Text style={[
                   styles.averageStatus,
                   (generalAverage >= 10 && !Object.values(moduleAverages).some(m => m.isEliminated)) ? styles.averageStatusSuccess : styles.averageStatusFail
                   ]}>
                  {(generalAverage >= 10 && !Object.values(moduleAverages).some(m => m.isEliminated)) ? 'Semestre Validé' : 'Semestre Non Validé'}
                  {Object.values(moduleAverages).some(m => m.isEliminated) && generalAverage >= 10 && ' (avec élimination)'}
                </Text>
             </View>
           </View>
         )}
         {/* Spacer View for bottom padding */}
         <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Styles --- (Assuming Colors, useColorScheme are correctly set up)
const getStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
    keyboardAvoidingView: {
         flex: 1,
         backgroundColor: Colors[colorScheme].background,
    },
    container: {
        flex: 1,
        backgroundColor: Colors[colorScheme].background,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 50,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: Colors[colorScheme].text,
        textAlign: 'center',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: Colors[colorScheme].textSecondary ?? '#666',
        textAlign: 'center',
        marginBottom: 25,
    },
    pickerContainer: {
        marginBottom: 25,
        backgroundColor: Colors[colorScheme].cardBackground ?? '#fff',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    pickerWrapper: {
        marginVertical: 8,
    },
    pickerLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors[colorScheme].textSecondary ?? '#555',
        marginBottom: 5,
    },
    pickerIcon: {
        // Positioned via pickerSelectStyles
    },
    infoText: {
        textAlign: 'center',
        color: Colors[colorScheme].textSecondary ?? '#555',
        marginTop: 20,
        fontSize: 15,
        paddingHorizontal: 10,
    },
    infoTextSmall: {
        fontSize: 12,
        color: Colors[colorScheme].textSecondary ?? '#666',
    },
    eliminationNote: {
        color: '#e11d48',
        fontWeight: '600',
    },
    modulesSection: {
        marginTop: 10,
    },
    moduleCard: {
        backgroundColor: Colors[colorScheme].cardBackground ?? '#ffffff',
        borderRadius: 12,
        padding: 18,
        marginBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    moduleTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors[colorScheme].text,
        marginBottom: 8,
    },
    moduleInfo: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
    },
    inputsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 15,
    },
    inputContainer: {
        flexGrow: 1,
        flexBasis: 80,
        paddingHorizontal: 6,
        marginBottom: 10,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors[colorScheme].textSecondary ?? '#555',
        marginBottom: 6,
    },
    input: {
        backgroundColor: Colors[colorScheme].inputBackground ?? '#f8f9fa',
        borderColor: Colors[colorScheme].inputBorder ?? '#dee2e6',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        fontSize: 15,
        color: Colors[colorScheme].text,
    },
    moduleAverageContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: Colors[colorScheme].inputBorder ?? '#eee',
    },
    moduleAverageLabel: {
        fontSize: 14,
        color: Colors[colorScheme].textSecondary ?? '#555',
        marginRight: 8,
    },
    moduleAverageValue: {
        fontSize: 16,
        fontWeight: 'bold',
        minWidth: 50,
        textAlign: 'right',
    },
    averageTextPending: {
        color: Colors[colorScheme].textSecondary ?? '#777',
    },
    averageTextSuccess: {
         color: '#16a34a',
    },
    averageTextFail: {
         color: '#dc2626',
    },
    calculateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.tint, // Adjust for dark mode if needed
        paddingVertical: 14,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginTop: 20,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 4,
        minHeight: 50, // Ensure button has height even when loading
    },
     buttonDisabled: { // Style for disabled button
         backgroundColor: '#9ca3af', // Gray
         opacity: 0.7,
     },
     buttonActivityIndicator: {
         marginRight: 10, // Space between indicator and text if needed
     },
    calculateButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    resultsContainer: {
        marginTop: 30,
        backgroundColor: Colors[colorScheme].cardBackground ?? '#fff',
        borderRadius: 15,
        padding: 20,
        marginHorizontal: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors[colorScheme].text,
        textAlign: 'center',
        marginBottom: 20,
    },
    averageBox: {
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
    },
    averageBoxSuccess: {
         backgroundColor: '#f0fdf4',
         borderColor: '#86efac',
    },
    averageBoxFail: {
         backgroundColor: '#fff1f2',
         borderColor: '#fda4af',
    },
    averageLabel: {
        fontSize: 15,
        color: Colors[colorScheme].textSecondary ?? '#555',
        marginBottom: 5,
    },
    averageValue: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 8,
        // color set by status style below
    },
    averageStatus: {
         fontSize: 16,
         fontWeight: '600',
         textAlign: 'center',
    },
    averageStatusSuccess: {
         color: '#15803d',
    },
    averageStatusFail: {
         color: '#b91c1c',
    },
});

const getPickerStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: Colors[colorScheme].inputBorder ?? '#ccc',
        borderRadius: 8,
        color: Colors[colorScheme].text,
        paddingRight: 30,
        backgroundColor: Colors[colorScheme].inputBackground ?? '#fff',
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: Colors[colorScheme].inputBorder ?? '#ccc',
        borderRadius: 8,
        color: Colors[colorScheme].text,
        paddingRight: 30,
        backgroundColor: Colors[colorScheme].inputBackground ?? '#fff',
    },
     iconContainer: {
         top: Platform.OS === 'ios' ? 12 : 18,
         right: 15,
     },
     placeholder: {
         color: Colors[colorScheme].placeholderText ?? '#9ca3af',
         fontSize: 16,
     },
     disabled: { // RNPickerSelect uses nested styles for disabled state
         // You might need to conditionally apply styles based on the `disabled` prop
         // directly in the main style object or use a different approach if RNPS doesn't support this well.
         // Example (conceptual):
         // opacity: 0.5, // General faded look
     }
});