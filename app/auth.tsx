// File: app/auth.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Switch,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
// --- Adjust these import paths ---
import { auth, db } from '@/firebaseConfig';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { storeUserData, UserData } from '@/utils/storage';
import { universiteBejaiaData } from '@/constants/Data';
// --- ---

// --- Define Colors OUTSIDE the style functions ---
const lightColors = {
    background: '#f0f4f8',
    cardBackground: '#ffffff',
    inputBackground: '#ffffff',
    inputBorder: '#d1d5db',
    text: '#1f2937',
    textSecondary: '#6b7280',
    placeholderText: '#9ca3af',
    tint: Colors.light.tint ?? '#3b82f6', // Fallback tint
    border: '#e5e7eb',
    disabledText: '#9ca3af',
    disabledBackground: '#e5e7eb',
    disabledBorder: '#d1d5db',
    success: Colors.success ?? '#16a34a',
    danger: Colors.danger ?? '#dc2626',
    ...Colors.light // Spread overrides from Colors.light
};
const darkColors = {
    background: '#111827',
    cardBackground: '#1f2937',
    inputBackground: '#374151',
    inputBorder: '#4b5563',
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    placeholderText: '#6b7280',
    tint: Colors.dark.tint ?? '#60a5fa', // Fallback tint
    border: '#374151',
    disabledText: '#6b7280',
    disabledBackground: '#4b5563',
    disabledBorder: '#6b7280',
    success: Colors.success ?? '#22c55e',
    danger: Colors.danger ?? '#ef4444',
    ...Colors.dark // Spread overrides from Colors.dark
};
// --- End Color Definitions ---


// --- Main AuthScreen Component ---
export default function AuthScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  // Generate styles using the colors defined above
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const styles = getAuthStyles(colorScheme, colors); // Pass colors object
  const pickerStyles = getPickerStyles(colorScheme, colors); // Pass colors object
  const router = useRouter();
  const params = useLocalSearchParams();

  // ... (Rest of the state variables remain the same) ...
  const [activeTab, setActiveTab] = useState<'login' | 'register'>( (params.tab === 'register' ? 'register' : 'login'));
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regMatricule, setRegMatricule] = useState('');
  const [regYear, setRegYear] = useState<string | null>(null);
  const [regSpecialty, setRegSpecialty] = useState<string | null>(null);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGroup, setRegGroup] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSpecialtyOptions, setRegSpecialtyOptions] = useState<{ label: string; value: string }[]>([]);


  // --- Dropdown Options ---
  const yearOptions = React.useMemo(() => Object.keys(universiteBejaiaData).map(year => ({ label: year, value: year })), []);

  useEffect(() => {
    let specs: string[] = [];
    if (regYear && universiteBejaiaData[regYear]) {
      specs = Object.keys(universiteBejaiaData[regYear]);
    }
    setRegSpecialtyOptions(specs.map(s => ({ label: s, value: s })));
    if (regSpecialty && !specs.includes(regSpecialty)) {
         setRegSpecialty(null);
    }
  }, [regYear]);

  // --- Authentication Functions (handleLogin, handleRegister remain the same) ---
    const handleLogin = async () => {
        if (!loginEmail.trim() || !loginPassword.trim()) {
        Alert.alert('Erreur', 'Veuillez entrer l\'email et le mot de passe.');
        return;
        }
        setLoginLoading(true);
        try {
        const userCredential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
        const user = userCredential.user;
        console.log('Login successful:', user.uid);

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userDataToStore: UserData;

        if (userDocSnap.exists()) {
            const firestoreData = userDocSnap.data();
            userDataToStore = {
            uid: user.uid,
            email: user.email,
            fullName: firestoreData.fullName || 'Utilisateur', // Ensure fallback
            matricule: firestoreData.matricule,
            year: firestoreData.year,
            speciality: firestoreData.speciality,
            phoneNumber: firestoreData.phoneNumber,
            group: firestoreData.group,
            profilePicUrl: firestoreData.profilePicUrl || user.photoURL || undefined,
            };
        } else {
            console.warn("Firestore document not found for user:", user.uid);
            userDataToStore = {
            uid: user.uid,
            email: user.email,
            fullName: user.displayName || user.email?.split('@')[0] || 'Utilisateur', // Robust fallback
            };
        }

        await storeUserData(userDataToStore);
        router.replace('/(tabs)/'); // Go to home tabs

        } catch (error: any) {
        console.error('Login error:', error.code, error.message);
        let errorMessage = 'Email ou mot de passe incorrect.';
        if (error.code === 'auth/invalid-email') errorMessage = 'Format de l\'email invalide.';
        if (error.code === 'auth/too-many-requests') errorMessage = "Trop de tentatives. Réessayez plus tard.";
        if (error.code === 'auth/network-request-failed') errorMessage = "Erreur réseau. Vérifiez votre connexion.";
        Alert.alert('Erreur de Connexion', errorMessage);
        } finally {
        setLoginLoading(false);
        }
    };

    const handleRegister = async () => {
        const trimmedFullName = regFullName.trim();
        const trimmedMatricule = regMatricule.trim();
        const trimmedEmail = regEmail.trim();
        const trimmedPassword = regPassword.trim();
        const trimmedPhone = regPhone.trim();
        const trimmedGroup = regGroup.trim();

        if (!trimmedFullName || !trimmedMatricule || !regYear || !regSpecialty || !trimmedEmail || !trimmedPassword || !trimmedPhone) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (*).');
        return;
        }
        if (trimmedPassword.length < 6) {
            Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        if (!/^\d{12}$/.test(trimmedMatricule)) {
            Alert.alert('Erreur', 'Le numéro d\'immatriculation doit contenir 12 chiffres.');
            return;
        }
        if (!/^0[5-7]\d{8}$/.test(trimmedPhone)) {
            Alert.alert('Erreur', 'Format du numéro de téléphone invalide (Ex: 0XXXXXXXXX).');
            return;
        }

        setRegLoading(true);
        try {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        const user = userCredential.user;
        console.log('Registration successful:', user.uid);

        const userDataForFirestore = {
            uid: user.uid, fullName: trimmedFullName, matricule: trimmedMatricule, year: regYear, speciality: regSpecialty, email: trimmedEmail.toLowerCase(), phoneNumber: trimmedPhone, group: trimmedGroup || null, createdAt: serverTimestamp(), profilePicUrl: null,
        };

        await setDoc(doc(db, "users", user.uid), userDataForFirestore);
        console.log('User data saved to Firestore');

        Alert.alert('Inscription Réussie', 'Votre compte a été créé. Vous pouvez maintenant vous connecter.', [
            { text: 'OK', onPress: () => setActiveTab('login') }
        ]);
        setRegFullName(''); setRegMatricule(''); setRegYear(null); setRegSpecialty(null);
        setRegEmail(''); setRegPassword(''); setRegPhone(''); setRegGroup('');

        } catch (error: any) {
        console.error('Registration error:', error.code, error.message);
        let errorMessage = 'Une erreur est survenue lors de l\'inscription.';
        if (error.code === 'auth/email-already-in-use') errorMessage = 'Cet email est déjà utilisé.';
        if (error.code === 'auth/invalid-email') errorMessage = 'Format de l\'email invalide.';
        if (error.code === 'auth/weak-password') errorMessage = 'Le mot de passe est trop faible (minimum 6 caractères).';
        if (error.code === 'auth/network-request-failed') errorMessage = "Erreur réseau. Vérifiez votre connexion.";
        Alert.alert('Erreur d\'Inscription', errorMessage);
        } finally {
        setRegLoading(false);
        }
    };

  // --- Theme Toggle (Visual Only) ---
    const [isDarkVisual, setIsDarkVisual] = useState(colorScheme === 'dark');
    const toggleThemeSwitch = () => {
        setIsDarkVisual(previousState => !previousState);
        Alert.alert("Thème", `Toggle visuel ${!isDarkVisual ? 'Sombre' : 'Clair'}. Nécessite un Context Thème.`);
        // Real logic: context.setTheme(colorScheme === 'light' ? 'dark' : 'light');
    };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ headerShown: false }} />

         {/* Back Button */}
         {router.canGoBack() && (
             <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                 <Ionicons name="arrow-back" size={26} color={colors.tint} />
             </TouchableOpacity>
         )}

         {/* Theme Toggle */}
          <View style={styles.themeToggleContainer}>
               <Ionicons name={isDarkVisual ? 'moon' : 'sunny'} size={18} color={colors.textSecondary} style={{marginRight: 5}}/>
               <Switch
                   trackColor={{ false: '#767577', true: colors.tint + '80' }}
                   thumbColor={isDarkVisual ? colors.tint : '#f4f3f4'}
                   ios_backgroundColor="#3e3e3e"
                   onValueChange={toggleThemeSwitch}
                   value={isDarkVisual}
               />
           </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
            <Image source={require('@/assets/images/LOGO.png')} style={styles.logo} resizeMode='contain'/>
        </View>

        {/* Card */}
        <View style={styles.authCard}>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'login' && styles.tabButtonActive]}
              onPress={() => setActiveTab('login')}
              disabled={activeTab === 'login' || regLoading || loginLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, activeTab === 'login' && styles.tabButtonTextActive]}>
                Connexion
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'register' && styles.tabButtonActive]}
              onPress={() => setActiveTab('register')}
              disabled={activeTab === 'register' || regLoading || loginLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, activeTab === 'register' && styles.tabButtonTextActive]}>
                Inscription
              </Text>
            </TouchableOpacity>
          </View>

          {/* Forms Container */}
          <View style={styles.formContainer}>
            {activeTab === 'login' ? (
              // --- Login Form ---
              <View style={styles.formInnerContainer}>
                <Text style={styles.formTitle}>Connexion</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput style={styles.input} placeholder="Votre adresse email" placeholderTextColor={colors.placeholderText} keyboardType="email-address" autoCapitalize="none" value={loginEmail} onChangeText={setLoginEmail} textContentType="emailAddress" autoComplete="email" />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput style={styles.input} placeholder="Votre mot de passe" placeholderTextColor={colors.placeholderText} secureTextEntry value={loginPassword} onChangeText={setLoginPassword} textContentType="password" autoComplete="password" />
                </View>
                <TouchableOpacity style={[styles.submitButton, loginLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={loginLoading} activeOpacity={0.7}>
                  {loginLoading ? <ActivityIndicator color="#fff" /> : (<><FontAwesome name="sign-in" size={20} color="#fff" /><Text style={styles.submitButtonText}>Se connecter</Text></>)}
                </TouchableOpacity>
              </View>
            ) : (
              // --- Register Form ---
              <View style={styles.formInnerContainer}>
                <Text style={styles.formTitle}>Inscription</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nom complet *</Text>
                  <TextInput style={styles.input} placeholder="Votre nom et prénom" value={regFullName} onChangeText={setRegFullName} placeholderTextColor={colors.placeholderText}/>
                </View>
                 <View style={styles.inputGroup}>
                   <Text style={styles.label}>N° Immatriculation *</Text>
                   <TextInput style={styles.input} placeholder="12 chiffres exacts" keyboardType="numeric" maxLength={12} value={regMatricule} onChangeText={setRegMatricule} placeholderTextColor={colors.placeholderText}/>
                 </View>
                 <View style={styles.inputGroup}>
                    <Text style={styles.label}>Année d'étude *</Text>
                    <View style={styles.pickerWrapper}>
                      <RNPickerSelect placeholder={{ label: "Sélectionner année...", value: null }} items={yearOptions} onValueChange={(value) => setRegYear(value)} style={pickerStyles} value={regYear} useNativeAndroidPickerStyle={false} Icon={() => <FontAwesome name="caret-down" size={20} color={colors.placeholderText} style={styles.pickerIcon} />}/>
                     </View>
                 </View>
                 <View style={styles.inputGroup}>
                    <Text style={styles.label}>Spécialité *</Text>
                    <View style={styles.pickerWrapper}>
                      <RNPickerSelect placeholder={{ label: regYear ? "Sélectionner spécialité..." : "Sélectionner l'année d'abord", value: null }} items={regSpecialtyOptions} onValueChange={(value) => setRegSpecialty(value)} style={pickerStyles} value={regSpecialty} disabled={!regYear || regSpecialtyOptions.length === 0} useNativeAndroidPickerStyle={false} Icon={() => <FontAwesome name="caret-down" size={20} color={!regYear || regSpecialtyOptions.length === 0 ? '#ccc' : colors.placeholderText} style={styles.pickerIcon} />}/>
                    </View>
                 </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput style={styles.input} placeholder="email@example.com" keyboardType="email-address" autoCapitalize='none' value={regEmail} onChangeText={setRegEmail} placeholderTextColor={colors.placeholderText}/>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mot de passe *</Text>
                  <TextInput style={styles.input} placeholder="Min. 6 caractères" secureTextEntry value={regPassword} onChangeText={setRegPassword} placeholderTextColor={colors.placeholderText}/>
                </View>
                <View style={styles.inputGroup}>
                   <Text style={styles.label}>N° Téléphone *</Text>
                   <TextInput style={styles.input} placeholder="0XXXXXXXXX" keyboardType="phone-pad" value={regPhone} onChangeText={setRegPhone} placeholderTextColor={colors.placeholderText}/>
                </View>
                 <View style={styles.inputGroup}>
                   <Text style={styles.label}>Groupe (Facultatif)</Text>
                   <TextInput style={styles.input} placeholder="Ex: 1, 12..." value={regGroup} onChangeText={setRegGroup} placeholderTextColor={colors.placeholderText}/>
                 </View>
                <TouchableOpacity style={[styles.submitButton, styles.registerButton, regLoading && styles.buttonDisabled]} onPress={handleRegister} disabled={regLoading} activeOpacity={0.7}>
                  {regLoading ? <ActivityIndicator color="#fff" /> : (<><FontAwesome name="user-plus" size={18} color="#fff" /><Text style={styles.submitButtonText}>Créer un compte</Text></>)}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
         {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Styles ---
// Moved color definitions outside
const getAuthStyles = (colorScheme: 'light' | 'dark', colors: typeof lightColors | typeof darkColors) => {
    const screenWidth = Dimensions.get('window').width;
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background, // Use passed colors
        },
        scrollContentContainer: {
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingVertical: 40,
        },
        backButton: {
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 40,
            left: 15,
            zIndex: 10,
            padding: 8,
        },
        themeToggleContainer: {
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 40,
            right: 15,
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
        },
        logoContainer: {
            alignItems: 'center',
            marginBottom: 25,
            marginTop: 40,
        },
        logo: {
            width: screenWidth * 0.35,
            height: screenWidth * 0.35,
            maxWidth: 160,
            maxHeight: 160,
        },
        authCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 18,
            padding: 25,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: colorScheme === 'light' ? 0.15 : 0.25,
            shadowRadius: 15,
            elevation: 8,
            borderWidth: colorScheme === 'light' ? 1 : 0,
            borderColor: colors.border,
        },
        tabsContainer: {
            flexDirection: 'row',
            marginBottom: 30,
            backgroundColor: colors.inputBackground,
            borderRadius: 10,
            padding: 4,
            borderWidth: 1,
            borderColor: colors.border,
        },
        tabButton: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginHorizontal: 2,
        },
        tabButtonActive: {
            backgroundColor: colors.tint,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
        },
        tabButtonText: {
            color: colors.textSecondary,
            fontWeight: '600',
            fontSize: 15,
        },
        tabButtonTextActive: {
            color: '#fff',
        },
        formContainer: {},
        formInnerContainer: {
             paddingTop: 10,
        },
        formTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 30,
        },
        inputGroup: {
            marginBottom: 18,
        },
        label: {
            fontSize: 13,
            fontWeight: '500',
            color: colors.textSecondary,
            marginBottom: 6,
            marginLeft: 4,
        },
        input: {
            backgroundColor: colors.inputBackground,
            borderWidth: 1.5,
            borderColor: colors.inputBorder,
            borderRadius: 10,
            paddingHorizontal: 15,
            paddingVertical: Platform.OS === 'ios' ? 15 : 13,
            fontSize: 16,
            color: colors.text,
        },
        pickerWrapper: { // Wrapper for picker styling
            borderWidth: 1.5,
            borderColor: colors.inputBorder,
            borderRadius: 10,
            backgroundColor: colors.inputBackground,
            justifyContent: 'center', // Center picker content vertically
             position: 'relative', // For icon positioning
        },
        pickerIcon: {
             position: 'absolute',
             right: 15,
             // top: Platform.OS === 'ios' ? 14 : 17, // Adjust if needed
             zIndex: 1,
             pointerEvents: 'none',
        },
        submitButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.tint,
            paddingVertical: 16,
            borderRadius: 12,
            marginTop: 25,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 4,
        },
        registerButton: {
            backgroundColor: colors.success,
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        submitButtonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
            marginLeft: 10,
        },
        forgotPasswordText: {
              marginTop: 15,
              textAlign: 'center',
              color: colors.tint,
              fontSize: 14,
         },
        // Styles needed for props/components used within this file
        tintColor: { color: colors.tint },
        textSecondary: { color: colors.textSecondary },
        placeholderText: { color: colors.placeholderText },
    });
}

// Picker styles
const getPickerStyles = (colorScheme: 'light' | 'dark', colors: typeof lightColors | typeof darkColors) => { // Pass colors
     return StyleSheet.create({
        inputIOS: {
            fontSize: 16,
            paddingVertical: 15, // Match input padding
            paddingHorizontal: 15,
            borderWidth: 0, // Border handled by wrapper
            color: colors.text,
            paddingRight: 35,
            backgroundColor: 'transparent', // BG handled by wrapper
        },
        inputAndroid: {
            fontSize: 16,
            paddingHorizontal: 15,
            paddingVertical: 13, // Match input padding
            borderWidth: 0, // Border handled by wrapper
            color: colors.text,
            paddingRight: 35,
            backgroundColor: 'transparent', // BG handled by wrapper
            // Fix for Android sometimes cutting off text:
            minHeight: 50, // Ensure minimum height
        },
         iconContainer: { // This might not be needed if using pickerIcon style directly
             // top: Platform.OS === 'ios' ? 16 : 19,
             // right: 15,
         },
         placeholder: {
             color: colors.placeholderText,
             fontSize: 16,
         },
         // No viewContainer needed if using pickerWrapper in main styles
         // viewContainer: { ... },
         disabled: {
              color: colors.disabledText,
              backgroundColor: colors.disabledBackground, // Apply to wrapper conditionally?
           }
    });
}