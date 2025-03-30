// File: app/auth.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  ActivityIndicator,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  StyleSheet,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';
import * as Haptics from 'expo-haptics';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';

// Adjust these import paths as needed
import { auth, db } from '../firebaseConfig';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { storeUserData, UserData } from '../utils/storage';

// Default colors (defined at top level)
const baseLightColors = {
  background: '#fff',
  cardBackground: '#f8f8f8',
  text: '#222',
  textSecondary: '#666',
  tint: '#2f95dc',
  border: '#ccc',
  danger: '#dc3545',
  inputBackground: '#fff',
  inputBorder: '#ccc',
  placeholderText: '#999',
  disabledBackground: '#cccccc',
  disabledText: '#aaaaaa',
  success: '#28a745',
};

const baseDarkColors = {
  background: '#121212',
  cardBackground: '#1e1e1e',
  text: '#eee',
  textSecondary: '#bbb',
  tint: '#4aa2e5',
  border: '#333',
  danger: '#e54d5d',
  inputBackground: '#1a1a1a',
  inputBorder: '#333',
  placeholderText: '#888',
  disabledBackground: '#4d4d4d',
  disabledText: '#808080',
  success: '#34c759',
};

const defaultColors = {
  light: { ...baseLightColors },
  dark: { ...baseDarkColors },
};

export default function AuthScreen() {
  // Ensure colorScheme is always 'light' or 'dark'
  const rawColorScheme = useColorScheme();
  const colorScheme = (rawColorScheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';

  // Get theme colors with fallback to defaultColors
  const themeColors = Colors[colorScheme] ?? defaultColors[colorScheme];

  // Define colors with fallback logic
  const colors = {
    background: themeColors.background ?? defaultColors[colorScheme].background,
    cardBackground: themeColors.cardBackground ?? defaultColors[colorScheme].cardBackground,
    text: themeColors.text ?? defaultColors[colorScheme].text,
    textSecondary: themeColors.textSecondary ?? defaultColors[colorScheme].textSecondary,
    tint: themeColors.tint ?? defaultColors[colorScheme].tint,
    border: themeColors.border ?? defaultColors[colorScheme].border,
    danger: themeColors.danger ?? defaultColors[colorScheme].danger,
    success: themeColors.success ?? defaultColors[colorScheme].success,
    inputBackground: themeColors.inputBackground ?? defaultColors[colorScheme].inputBackground,
    inputBorder: themeColors.inputBorder ?? defaultColors[colorScheme].inputBorder,
    placeholderText: themeColors.placeholderText ?? defaultColors[colorScheme].placeholderText,
    disabledBackground: themeColors.disabledBackground ?? defaultColors[colorScheme].disabledBackground,
    disabledText: themeColors.disabledText ?? defaultColors[colorScheme].disabledText,
  };

  const styles = getAuthStyles(colorScheme, colors);
  const pickerStyles = getPickerStyles(colorScheme, colors);
  const router = useRouter();
  const params = useLocalSearchParams();

  // State
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    params.tab === 'register' ? 'register' : 'login'
  );
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regMatricule, setRegMatricule] = useState('');
  const [regYear, setRegYear] = useState<string>(''); // Changed from null to empty string
  const [regSpecialty, setRegSpecialty] = useState<string>(''); // Changed from null to empty string
  const [regSection, setRegSection] = useState<string>(''); // Changed from null to empty string
  const [regGroup, setRegGroup] = useState<string>(''); // Changed from null to empty string
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [yearOptions, setYearOptions] = useState<{ label: string; value: string }[]>([]);
  const [regSpecialtyOptions, setRegSpecialtyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [isDarkVisual, setIsDarkVisual] = useState(colorScheme === 'dark');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [yearsError, setYearsError] = useState<string | null>(null);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(false);
  const [specialtiesError, setSpecialtiesError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Check Firebase Initialization
  useEffect(() => {
    if (!auth || !db) {
      const errorMsg =
        "Service d'authentification indisponible. Vérifiez la configuration Firebase.";
      console.error('Firebase services (auth or db) not initialized!');
      setFirebaseError(errorMsg);
    }
  }, []);

  // Fetch Years from the `years` Collection
  useEffect(() => {
    const fetchYears = async () => {
      if (!db) {
        setYearsError('Base de données non initialisée.');
        setYearsLoading(false);
        return;
      }
      try {
        setYearsLoading(true);
        setYearsError(null);
        const yearsRef = collection(db, 'years');
        const yearsSnapshot = await getDocs(yearsRef);
        const yearsList: { label: string; value: string; order: number }[] = [];
        yearsSnapshot.forEach(doc => {
          const data = doc.data();
          yearsList.push({
            label: data.name || doc.id,
            value: doc.id,
            order: data.order || 0,
          });
        });
        yearsList.sort((a, b) => a.order - b.order);
        console.log('Fetched years:', yearsList);
        if (yearsList.length === 0) {
          setYearsError('Aucune année trouvée dans la base de données.');
        }
        setYearOptions(yearsList.map(year => ({
          label: year.label,
          value: year.value,
        })));
      } catch (error: any) {
        console.error('Error fetching years from Firestore:', error);
        setYearsError('Impossible de charger les années. Vérifiez votre connexion.');
      } finally {
        setYearsLoading(false);
      }
    };
    fetchYears();
  }, []);

  // Fetch Specialties based on selected year using a `where` clause
  useEffect(() => {
    const fetchSpecialties = async () => {
      if (!regYear || !db) {
        setRegSpecialtyOptions([]);
        setSpecialtiesError(null);
        setSpecialtiesLoading(false);
        return;
      }
      try {
        setSpecialtiesLoading(true);
        setSpecialtiesError(null);
        // Corrected collection name from 'specialities' to 'specialties'
        const specialtiesRef = collection(db, 'specialties');
        const q = query(specialtiesRef, where('yearId', '==', regYear));
        const specialtiesSnapshot = await getDocs(q);
        console.log(`Total specialties found for year ${regYear}: ${specialtiesSnapshot.size}`);

        const specialties: { label: string; value: string }[] = [];
        specialtiesSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`Specialty ${doc.id} data:`, data);
          const label = (data.name || doc.id).replace(/-/g, ' ');
          specialties.push({
            label: label,
            value: doc.id,
          });
        });
        console.log('Fetched specialties for year', regYear, ':', specialties);
        if (specialties.length === 0) {
          setSpecialtiesError('Aucune spécialité trouvée pour cette année. Vérifiez les données dans Firestore.');
        }
        setRegSpecialtyOptions(specialties);
        if (regSpecialty && !specialties.some(s => s.value === regSpecialty)) {
          setRegSpecialty('');
        }
      } catch (error: any) {
        console.error('Error fetching specialties from Firestore:', error);
        setSpecialtiesError('Impossible de charger les spécialités. Vérifiez votre connexion.');
      } finally {
        setSpecialtiesLoading(false);
      }
    };
    fetchSpecialties();
  }, [regYear]);

  // Section and Group Options
  const sectionOptions = useMemo(
    () =>
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(s => ({
        label: `Section ${s}`,
        value: `SECTION_${s}`,
      })),
    []
  );

  const groupOptions = useMemo(() => {
    if (!regSection) return [];
    const sectionLetter = regSection.split('_')[1];
    if (!sectionLetter) return [];
    return Array.from({ length: 8 }, (_, i) => {
      const groupNum = i + 1;
      const groupVal = `${sectionLetter}${groupNum}`;
      return { label: `Groupe ${groupVal}`, value: groupVal };
    });
  }, [regSection]);

  useEffect(() => {
    setRegGroup(''); // Reset group when section changes
  }, [regSection]);

  // Form Validation
  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    const tFN = regFullName.trim();
    const tM = regMatricule.trim();
    const tE = regEmail.trim();
    const tP = regPassword.trim();
    const tPh = regPhone.trim();

    if (!tFN) errors.fullName = 'Nom complet requis.';
    if (!tM) errors.matricule = 'Numéro d’immatriculation requis.';
    else if (!/^\d{12}$/.test(tM)) errors.matricule = 'Doit contenir exactement 12 chiffres.';
    if (!regYear) errors.year = 'Année requise.';
    if (!regSpecialty) errors.specialty = 'Spécialité requise.';
    if (!regSection) errors.section = 'Section requise.';
    if (!regGroup) errors.group = 'Groupe requis.';
    if (!tE) errors.email = 'Email requis.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tE)) errors.email = 'Email invalide.';
    if (!tP) errors.password = 'Mot de passe requis.';
    else if (tP.length < 6) errors.password = 'Minimum 6 caractères.';
    if (!tPh) errors.phone = 'Numéro de téléphone requis.';
    else if (!/^0[5-7]\d{8}$/.test(tPh)) errors.phone = 'Format invalide (ex: 06XXXXXXXX).';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Authentication Functions
  const handleLogin = async () => {
    if (firebaseError || !auth || !db) {
      Alert.alert('Erreur Service', firebaseError || 'Service indisponible.');
      return;
    }
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('Champs Requis', 'Veuillez entrer votre email et mot de passe.');
      return;
    }
    setLoginLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail.trim(),
        loginPassword
      );
      const user = userCredential?.user;
      if (!user) throw new Error('Connexion réussie mais données utilisateur non trouvées.');

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let userDataToStore: UserData;
      const defaultName = user.email?.split('@')[0] || 'Utilisateur';

      if (userDocSnap.exists()) {
        const d = userDocSnap.data();
        userDataToStore = {
          uid: user.uid,
          email: user.email ?? null,
          fullName: d?.fullName || user.displayName || defaultName,
          matricule: d?.matricule || null,
          year: d?.year || null,
          speciality: d?.speciality || null,
          phoneNumber: d?.phoneNumber || null,
          section: d?.section || null,
          group: d?.group || null,
          profilePicUrl: d?.profilePicUrl || user.photoURL || null,
        };
        console.log('Login: Found Firestore data for user:', user.uid);
      } else {
        console.warn(`Login: No Firestore document found for user: ${user.uid}. Using basic info.`);
        userDataToStore = {
          uid: user.uid,
          email: user.email ?? null,
          fullName: user.displayName || defaultName,
          matricule: null,
          year: null,
          speciality: null,
          phoneNumber: null,
          section: null,
          group: null,
          profilePicUrl: user.photoURL || null,
        };
      }
      await storeUserData(userDataToStore);
      console.log('Login successful, user data stored.');

      const redirectPath = params?.redirect as string | undefined;
      router.replace(redirectPath && !redirectPath.includes('/auth') ? redirectPath : '/(tabs)/');
    } catch (error: any) {
      console.error('Login Error:', error);
      let msg = 'Erreur de connexion. Veuillez réessayer.';
      switch (error.code) {
        case 'auth/invalid-email':
          msg = "Format d'email invalide.";
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          msg = 'Email ou mot de passe incorrect.';
          break;
        case 'auth/too-many-requests':
          msg = 'Trop de tentatives. Compte bloqué temporairement.';
          break;
        case 'auth/network-request-failed':
          msg = 'Erreur réseau. Vérifiez votre connexion internet.';
          break;
        default:
          if (error.message) msg = error.message;
      }
      Alert.alert('Erreur Connexion', msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (firebaseError || !auth || !db) {
      Alert.alert('Erreur Service', firebaseError || 'Service indisponible.');
      return;
    }
    if (!validateForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les champs invalides.');
      return;
    }

    setRegLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword.trim());
      const user = userCredential?.user;

      if (!user) throw new Error('La création du compte a échoué, utilisateur non retourné.');

      const userDataForFirestore = {
        uid: user.uid,
        fullName: regFullName.trim(),
        matricule: regMatricule.trim(),
        year: regYear,
        speciality: regSpecialty,
        email: regEmail.trim().toLowerCase(),
        phoneNumber: regPhone.trim(),
        section: regSection,
        group: regGroup,
        createdAt: serverTimestamp(),
        profilePicUrl: null,
      };

      await setDoc(doc(db, 'users', user.uid), userDataForFirestore);
      console.log('Registration successful, Firestore doc created.');

      Alert.alert('Inscription Réussie', 'Votre compte a été créé. Vous pouvez maintenant vous connecter.', [
        { text: 'OK', onPress: () => setActiveTab('login') },
      ]);
      setRegFullName('');
      setRegMatricule('');
      setRegYear('');
      setRegSpecialty('');
      setRegSection('');
      setRegGroup('');
      setRegEmail('');
      setRegPassword('');
      setRegPhone('');
      setFormErrors({});
    } catch (error: any) {
      console.error('Registration Error:', error);
      let msg = 'Erreur lors de l’inscription.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          msg = 'Cette adresse email est déjà utilisée par un autre compte.';
          break;
        case 'auth/invalid-email':
          msg = "Format d'email invalide.";
          break;
        case 'auth/weak-password':
          msg = 'Mot de passe trop faible.';
          break;
        case 'auth/network-request-failed':
          msg = 'Erreur réseau. Vérifiez votre connexion internet.';
          break;
        default:
          if (error.message) msg = error.message;
      }
      Alert.alert('Erreur Inscription', msg);
    } finally {
      setRegLoading(false);
    }
  };

  // Theme Toggle (Placeholder)
  const toggleThemeSwitch = () => {
    setIsDarkVisual(p => !p);
    Alert.alert('Thème', 'Fonctionnalité non implémentée.');
  };

  // Render Error State for Firebase Initialization
  if (firebaseError && (!auth || !db)) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color={colors.danger} />
        <Text style={styles.errorText}>{firebaseError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.replace('/auth')}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main Render
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} // Adjusted for better iOS visibility
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header with Back Button and Theme Toggle */}
        <View style={styles.headerContainer}>
          {router.canGoBack() && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.tint} />
            </TouchableOpacity>
          )}
          {router.canGoBack() && <View style={{ flex: 1 }} />}
          <View style={styles.themeToggleContainer}>
            <Switch
              value={isDarkVisual}
              onValueChange={toggleThemeSwitch}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor={isDarkVisual ? colors.background : colors.textSecondary}
            />
          </View>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Auth Card */}
        <View style={styles.authCard}>
          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'login' && styles.tabButtonActive]}
              onPress={() => setActiveTab('login')}
              disabled={loginLoading || regLoading}
            >
              <Text
                style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}
              >
                Connexion
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'register' && styles.tabButtonActive]}
              onPress={() => setActiveTab('register')}
              disabled={loginLoading || regLoading}
            >
              <Text
                style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}
              >
                Inscription
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {activeTab === 'login' ? (
              <View style={styles.formInnerContainer}>
                <Text style={styles.formTitle}>Accéder à votre compte</Text>
                <TextInput
                  style={[styles.input, formErrors.loginEmail && styles.inputError]}
                  placeholder="Email *"
                  placeholderTextColor={colors.placeholderText}
                  value={loginEmail}
                  onChangeText={text => {
                    setLoginEmail(text);
                    setFormErrors(prev => ({ ...prev, loginEmail: '' }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loginLoading}
                />
                {formErrors.loginEmail && (
                  <Text style={styles.errorText}>{formErrors.loginEmail}</Text>
                )}
                <TextInput
                  style={[styles.input, formErrors.loginPassword && styles.inputError]}
                  placeholder="Mot de passe *"
                  placeholderTextColor={colors.placeholderText}
                  value={loginPassword}
                  onChangeText={text => {
                    setLoginPassword(text);
                    setFormErrors(prev => ({ ...prev, loginPassword: '' }));
                  }}
                  secureTextEntry
                  editable={!loginLoading}
                />
                {formErrors.loginPassword && (
                  <Text style={styles.errorText}>{formErrors.loginPassword}</Text>
                )}
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => Alert.alert('Mot de Passe Oublié', 'Fonctionnalité à venir.')}
                >
                  <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.authButton, loginLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.authButtonText}>Se Connecter</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formInnerContainer}>
                <Text style={styles.formTitle}>Créer un nouveau compte</Text>
                <TextInput
                  style={[styles.input, formErrors.fullName && styles.inputError]}
                  placeholder="Nom complet *"
                  placeholderTextColor={colors.placeholderText}
                  value={regFullName}
                  onChangeText={text => {
                    setRegFullName(text);
                    setFormErrors(prev => ({ ...prev, fullName: '' }));
                  }}
                  editable={!regLoading}
                />
                {formErrors.fullName && (
                  <Text style={styles.errorText}>{formErrors.fullName}</Text>
                )}
                <TextInput
                  style={[styles.input, formErrors.matricule && styles.inputError]}
                  placeholder="N° Matricule (12 chiffres) *"
                  placeholderTextColor={colors.placeholderText}
                  value={regMatricule}
                  onChangeText={text => {
                    setRegMatricule(text);
                    setFormErrors(prev => ({ ...prev, matricule: '' }));
                  }}
                  keyboardType="numeric"
                  maxLength={12}
                  editable={!regLoading}
                />
                {formErrors.matricule && (
                  <Text style={styles.errorText}>{formErrors.matricule}</Text>
                )}
                {/* Year Picker */}
                <View style={styles.pickerWrapper}>
                  {yearsLoading ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                  ) : yearsError ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{yearsError}</Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                          setYearsLoading(true);
                          setYearsError(null);
                          const fetchYears = async () => {
                            try {
                              const yearsRef = collection(db, 'years');
                              const yearsSnapshot = await getDocs(yearsRef);
                              const yearsList: { label: string; value: string; order: number }[] = [];
                              yearsSnapshot.forEach(doc => {
                                const data = doc.data();
                                yearsList.push({
                                  label: data.name || doc.id,
                                  value: doc.id,
                                  order: data.order || 0,
                                });
                              });
                              yearsList.sort((a, b) => a.order - b.order);
                              console.log('Fetched years (retry):', yearsList);
                              if (yearsList.length === 0) {
                                setYearsError('Aucune année trouvée dans la base de données.');
                              }
                              setYearOptions(yearsList.map(year => ({
                                label: year.label,
                                value: year.value,
                              })));
                            } catch (error: any) {
                              console.error('Retry fetch years failed:', error);
                              setYearsError('Échec de la récupération des années. Réessayez.');
                            } finally {
                              setYearsLoading(false);
                            }
                          };
                          fetchYears();
                        }}
                      >
                        <Text style={styles.retryButtonText}>Réessayer</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <RNPickerSelect
                      onValueChange={value => {
                        setRegYear(value);
                        setFormErrors(prev => ({ ...prev, year: '' }));
                        if (Platform.OS === 'ios') {
                          Haptics.selectionAsync();
                        }
                      }}
                      items={yearOptions || []}
                      style={pickerStyles}
                      value={regYear}
                      placeholder={{ label: 'Sélectionnez une année *', value: '' }}
                      Icon={() => <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />}
                      useNativeAndroidPickerStyle={false}
                      disabled={regLoading || yearsLoading || !!yearsError}
                    />
                  )}
                </View>
                {formErrors.year && (
                  <Text style={styles.errorText}>{formErrors.year}</Text>
                )}
                {/* Specialty Picker */}
                <View style={styles.pickerWrapper}>
                  {specialtiesLoading ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                  ) : specialtiesError ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{specialtiesError}</Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                          setSpecialtiesError(null);
                          setSpecialtiesLoading(true);
                          const fetchSpecialties = async () => {
                            if (!regYear || !db) {
                              setRegSpecialtyOptions([]);
                              setSpecialtiesLoading(false);
                              return;
                            }
                            try {
                              const specialtiesRef = collection(db, 'specialties');
                              const q = query(specialtiesRef, where('yearId', '==', regYear));
                              const specialtiesSnapshot = await getDocs(q);
                              console.log(`Total specialties found for year ${regYear} (retry): ${specialtiesSnapshot.size}`);
                              const specialties: { label: string; value: string }[] = [];
                              specialtiesSnapshot.forEach(doc => {
                                const data = doc.data();
                                console.log(`Specialty ${doc.id} data (retry):`, data);
                                const label = (data.name || doc.id).replace(/-/g, ' ');
                                specialties.push({
                                  label: label,
                                  value: doc.id,
                                });
                              });
                              console.log('Fetched specialties for year (retry)', regYear, ':', specialties);
                              if (specialties.length === 0) {
                                setSpecialtiesError('Aucune spécialité trouvée pour cette année. Vérifiez les données dans Firestore.');
                              }
                              setRegSpecialtyOptions(specialties);
                              if (regSpecialty && !specialties.some(s => s.value === regSpecialty)) {
                                setRegSpecialty('');
                              }
                            } catch (error: any) {
                              console.error('Retry fetch specialties failed:', error);
                              setSpecialtiesError('Échec de la récupération des spécialités. Réessayez.');
                            } finally {
                              setSpecialtiesLoading(false);
                            }
                          };
                          fetchSpecialties();
                        }}
                      >
                        <Text style={styles.retryButtonText}>Réessayer</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <RNPickerSelect
                      onValueChange={value => {
                        setRegSpecialty(value);
                        setFormErrors(prev => ({ ...prev, specialty: '' }));
                        if (Platform.OS === 'ios') {
                          Haptics.selectionAsync();
                        }
                      }}
                      items={regSpecialtyOptions || []}
                      style={pickerStyles}
                      value={regSpecialty}
                      placeholder={{ label: 'Sélectionnez une spécialité *', value: '' }}
                      disabled={!regYear || regLoading || yearsLoading || !!yearsError || specialtiesLoading}
                      Icon={() => <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />}
                      useNativeAndroidPickerStyle={false}
                    />
                  )}
                </View>
                {formErrors.specialty && (
                  <Text style={styles.errorText}>{formErrors.specialty}</Text>
                )}
                {/* Section Picker */}
                <View style={styles.pickerWrapper}>
                  <RNPickerSelect
                    onValueChange={value => {
                      setRegSection(value);
                      setFormErrors(prev => ({ ...prev, section: '' }));
                      if (Platform.OS === 'ios') {
                        Haptics.selectionAsync();
                      }
                    }}
                    items={sectionOptions || []}
                    style={pickerStyles}
                    value={regSection}
                    placeholder={{ label: 'Sélectionnez une section *', value: '' }}
                    disabled={regLoading}
                    Icon={() => <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
                {formErrors.section && (
                  <Text style={styles.errorText}>{formErrors.section}</Text>
                )}
                {/* Group Picker */}
                <View style={styles.pickerWrapper}>
                  <RNPickerSelect
                    onValueChange={value => {
                      setRegGroup(value);
                      setFormErrors(prev => ({ ...prev, group: '' }));
                      if (Platform.OS === 'ios') {
                        Haptics.selectionAsync();
                      }
                    }}
                    items={groupOptions || []}
                    style={pickerStyles}
                    value={regGroup}
                    placeholder={{ label: 'Sélectionnez un groupe *', value: '' }}
                    disabled={!regSection || regLoading}
                    Icon={() => <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
                {formErrors.group && (
                  <Text style={styles.errorText}>{formErrors.group}</Text>
                )}
                <TextInput
                  style={[styles.input, formErrors.email && styles.inputError]}
                  placeholder="Email *"
                  placeholderTextColor={colors.placeholderText}
                  value={regEmail}
                  onChangeText={text => {
                    setRegEmail(text);
                    setFormErrors(prev => ({ ...prev, email: '' }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!regLoading}
                />
                {formErrors.email && (
                  <Text style={styles.errorText}>{formErrors.email}</Text>
                )}
                <TextInput
                  style={[styles.input, formErrors.password && styles.inputError]}
                  placeholder="Mot de passe (min 6 caractères) *"
                  placeholderTextColor={colors.placeholderText}
                  value={regPassword}
                  onChangeText={text => {
                    setRegPassword(text);
                    setFormErrors(prev => ({ ...prev, password: '' }));
                  }}
                  secureTextEntry
                  editable={!regLoading}
                />
                {formErrors.password && (
                  <Text style={styles.errorText}>{formErrors.password}</Text>
                )}
                <TextInput
                  style={[styles.input, formErrors.phone && styles.inputError]}
                  placeholder="N° Téléphone (ex: 06XXXXXXXX) *"
                  placeholderTextColor={colors.placeholderText}
                  value={regPhone}
                  onChangeText={text => {
                    setRegPhone(text);
                    setFormErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!regLoading}
                />
                {formErrors.phone && (
                  <Text style={styles.errorText}>{formErrors.phone}</Text>
                )}
                <TouchableOpacity
                  style={[styles.authButton, regLoading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={regLoading}
                >
                  {regLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.authButtonText}>S’Inscrire</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
      {(loginLoading || regLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// --- Styles ---
const getAuthStyles = (colorScheme: 'light' | 'dark', colors: Record<string, any>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { paddingHorizontal: 20, paddingVertical: 30, flexGrow: 1, justifyContent: 'center' },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 30,
      left: 10,
      right: 10,
      zIndex: 1,
    },
    backButton: { padding: 10 },
    themeToggleContainer: { flexDirection: 'row', alignItems: 'center' },
    logoContainer: { alignItems: 'center', marginBottom: 25, marginTop: 60 },
    logo: { width: Dimensions.get('window').width * 0.4, height: 120, alignSelf: 'center', marginBottom: 30 },
    authCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 0,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 4,
      overflow: 'hidden',
    },
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.inputBackground + '80',
    },
    tabButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: { borderBottomColor: colors.tint },
    tabText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
    tabTextActive: { color: colors.tint, fontWeight: 'bold' },
    formContainer: { paddingHorizontal: 20, paddingVertical: 25 },
    formInnerContainer: { gap: 12 }, // Reduced gap for better spacing on smaller screens
    formTitle: { fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 10 },
    input: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 15,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      fontSize: 16,
      color: colors.text,
    },
    inputError: {
      borderColor: colors.danger,
      backgroundColor: colors.danger + '10',
    },
    pickerWrapper: { marginVertical: 0 },
    authButton: {
      backgroundColor: colors.tint,
      paddingVertical: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 15,
    },
    buttonDisabled: { backgroundColor: colors.disabledBackground ?? '#cccccc', opacity: 0.7 },
    authButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    errorContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 10,
    },
    errorText: { fontSize: 14, color: colors.danger, textAlign: 'center', marginVertical: 5 },
    retryButton: { backgroundColor: colors.tint, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
    retryButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    placeholderText: { color: colors.placeholderText },
    forgotPasswordButton: { alignItems: 'flex-end', marginTop: 5 },
    forgotPasswordText: { color: colors.tint, fontSize: 14, fontWeight: '500' },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background + '80',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

const getPickerStyles = (colorScheme: 'light' | 'dark', colors: Record<string, any>) =>
  StyleSheet.create({
    inputIOS: {
      fontSize: 16,
      paddingVertical: 14,
      paddingHorizontal: 15,
      borderWidth: 0,
      color: colors.text,
      paddingRight: 30,
      borderRadius: 10,
    },
    inputAndroid: {
      fontSize: 16,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 0,
      color: colors.text,
      paddingRight: 30,
      minHeight: 50,
    },
    iconContainer: { top: Platform.OS === 'ios' ? 16 : 18, right: 12 },
    placeholder: { color: colors.placeholderText, fontSize: 16 },
    viewContainer: {
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      justifyContent: 'center',
      minHeight: Platform.OS === 'ios' ? 50 : 52,
      paddingVertical: 0,
    },
    disabled: { opacity: 0.5, backgroundColor: colors.disabledBackground ?? '#e9ecef' },
  });