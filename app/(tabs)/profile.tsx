// File: app/(tabs)/profile.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  RefreshControl,
  Share,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { Picker } from '@react-native-picker/picker';

// Adjust Paths
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { getUserData, clearUserData, UserData } from '../../utils/storage';
import { auth } from '../../firebaseConfig';
import AuthGuard from '../auth-guard';

// Language Options
const languages = [
  { label: 'Français', value: 'fr' },
  { label: 'English', value: 'en' },
  { label: 'العربية', value: 'ar' },
];

// Color Definitions
const baseLightColors = {
  background: '#f5f7fa',
  cardBackground: '#ffffff',
  inputBackground: '#ffffff',
  inputBorder: '#e5e7eb',
  text: '#1f2937',
  textSecondary: '#6b7280',
  placeholderText: '#9ca3af',
  tint: Colors.light.tint ?? '#3b82f6',
  border: '#e5e7eb',
  disabledText: '#9ca3af',
  disabledBackground: '#e5e7eb',
  disabledBorder: '#d1d5db',
  success: Colors.success ?? '#16a34a',
  danger: Colors.danger ?? '#dc2626',
  headerBackground: '#3b82f6',
};
const baseDarkColors = {
  background: '#0f172a',
  cardBackground: '#1e293b',
  inputBackground: '#374151',
  inputBorder: '#4b5563',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  placeholderText: '#6b7280',
  tint: Colors.dark.tint ?? '#60a5fa',
  border: '#374151',
  disabledText: '#6b7280',
  disabledBackground: '#4b5563',
  disabledBorder: '#6b7280',
  success: Colors.success ?? '#22c55e',
  danger: Colors.danger ?? '#f87171',
  headerBackground: '#60a5fa',
};
const lightColors = { ...baseLightColors, ...Colors.light };
const darkColors = { ...baseDarkColors, ...Colors.dark };

// Reusable Row Components
interface InfoRowProps {
  icon: keyof typeof FontAwesome.glyphMap;
  label: string;
  value: string | null | undefined;
  colors: typeof lightColors | typeof darkColors;
}
const InfoRow: React.FC<InfoRowProps> = React.memo(({ icon, label, value, colors }) => {
  const styles = getProfileStyles(colors === darkColors ? 'dark' : 'light', colors);
  return (
    <View style={styles.infoItem}>
      <FontAwesome name={icon} size={20} style={[styles.infoIcon, { color: colors.textSecondary }]} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? 'N/A'}</Text>
    </View>
  );
});

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress: () => void;
  colors: typeof lightColors | typeof darkColors;
}
const SettingRow: React.FC<SettingRowProps> = React.memo(({ icon, text, onPress, colors }) => {
  const styles = getProfileStyles(colors === darkColors ? 'dark' : 'light', colors);
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon} size={24} style={[styles.settingIcon, { color: colors.textSecondary }]} />
      <Text style={styles.settingText}>{text}</Text>
      <Ionicons name="chevron-forward" size={22} color={styles.chevronColor.color} />
    </TouchableOpacity>
  );
});

// Main Profile Screen Content Component
function ProfileScreenContent() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const styles = getProfileStyles(colorScheme, colors);
  const pickerStyles = getPickerStyles(colorScheme, colors);
  const router = useRouter();

  // State
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('fr');
  const [isDarkSwitchOn, setIsDarkSwitchOn] = useState(colorScheme === 'dark');

  // Effects
  useEffect(() => {
    setIsDarkSwitchOn(colorScheme === 'dark');
  }, [colorScheme]);

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserData();
      console.log('ProfileScreen: Loaded data from storage:', data);
      setUserData(data);
    } catch (e) {
      console.error('Error loading user data:', e);
      Alert.alert('Erreur', 'Impossible de charger les données utilisateur.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleLogout = useCallback(async () => {
    Alert.alert('Déconnexion', 'Sûr ?', [
      { text: 'Annuler' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            await clearUserData();
            setUserData(null);
            if (router.canDismiss()) router.dismissAll();
            router.replace('/auth');
          } catch (e) {
            Alert.alert('Erreur logout');
          }
        },
      },
    ]);
  }, [router]);

  const handleThemeSwitchChange = () => {
    setIsDarkSwitchOn((p) => !p);
    Alert.alert('Thème', 'Context requis.');
    /* TODO: context.setTheme(...) */
  };

  const handleLanguageChange = (langValue: string) => {
    if (langValue && langValue !== currentLanguage) {
      setCurrentLanguage(langValue);
      Alert.alert(
        'Langue',
        `Changement vers ${languages.find((l) => l.value === langValue)?.label}. (i18n requis)`
      );
      /* TODO: Save pref & trigger i18n */
    }
  };

  const shareApp = useCallback(async () => {
    try {
      await Share.share({ message: "Découvrez CampusElkseur! [Lien App]" });
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }, []);

  // Data for FlatList
  const sections = useMemo(() => {
    if (!userData) return [];

    return [
      { type: 'header', title: 'Informations Académiques', id: 'academic' },
      { type: 'info', icon: 'id-card-o', label: 'Matricule:', value: userData.matricule, id: 'matricule' },
      { type: 'info', icon: 'calendar', label: 'Année:', value: userData.year, id: 'year' },
      { type: 'info', icon: 'graduation-cap', label: 'Spécialité:', value: userData.speciality, id: 'speciality' },
      ...(userData.group
        ? [{ type: 'info', icon: 'users', label: 'Groupe:', value: userData.group, id: 'group' }]
        : []),
      { type: 'divider', id: 'divider1' },
      { type: 'header', title: 'Contact', id: 'contact' },
      { type: 'info', icon: 'envelope-o', label: 'Email:', value: userData.email, id: 'email' },
      { type: 'info', icon: 'phone', label: 'Téléphone:', value: userData.phoneNumber, id: 'phone' },
      { type: 'divider', id: 'divider2' },
      { type: 'header', title: 'Paramètres', id: 'settings' },
      {
        type: 'setting',
        icon: 'lock-closed-outline',
        text: 'Changer Mot de Passe',
        onPress: () => Alert.alert('Navigation', "Écran 'Changer Mot de Passe'"),
        id: 'change-password',
      },
      {
        type: 'setting',
        icon: 'notifications-outline',
        text: 'Notifications',
        onPress: () => Alert.alert('Navigation', "Écran 'Notifications'"),
        id: 'notifications',
      },
      { type: 'language', id: 'language' },
      { type: 'theme', id: 'theme' },
      { type: 'divider', id: 'divider3' },
      { type: 'header', title: 'Autres', id: 'other' },
      {
        type: 'setting',
        icon: 'star-outline',
        text: 'Favoris & Téléchargements',
        onPress: () => router.push('/(tabs)/favorites'),
        id: 'favorites',
      },
      {
        type: 'setting',
        icon: 'share-social-outline',
        text: "Partager l'Application",
        onPress: shareApp,
        id: 'share',
      },
      {
        type: 'setting',
        icon: 'help-circle-outline',
        text: 'Aide et Support',
        onPress: () => Alert.alert('Navigation', "Écran 'Aide/FAQ'"),
        id: 'help',
      },
    ];
  }, [userData, router, shareApp]);

  // Loading / Error States
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Données utilisateur non trouvées. Veuillez vous reconnecter.</Text>
        <TouchableOpacity style={[styles.logoutButton, { width: '60%' }]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render Item for FlatList
  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
        </View>
      );
    } else if (item.type === 'info') {
      return <InfoRow icon={item.icon} label={item.label} value={item.value} colors={colors} />;
    } else if (item.type === 'setting') {
      return <SettingRow icon={item.icon} text={item.text} onPress={item.onPress} colors={colors} />;
    } else if (item.type === 'language') {
      return (
        <View style={[styles.settingItem, { paddingVertical: 10 }]}>
          <Ionicons
            name="language-outline"
            size={24}
            style={[styles.settingIcon, { color: colors.textSecondary }]}
          />
          <Text style={styles.settingText}>Langue</Text>
          <View style={styles.languagePickerWrapper}>
            <Picker
              selectedValue={currentLanguage}
              onValueChange={(itemValue) => handleLanguageChange(itemValue)}
              style={pickerStyles.input}
            >
              {languages.map((lang) => (
                <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
              ))}
            </Picker>
          </View>
        </View>
      );
    } else if (item.type === 'theme') {
      return (
        <View style={[styles.settingItem, styles.settingItem_last]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name={isDarkSwitchOn ? 'moon-outline' : 'sunny-outline'}
              size={24}
              style={[styles.settingIcon, { color: colors.textSecondary }]}
            />
            <Text style={styles.settingText}>Thème Sombre</Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: colors.tint + '80' }}
            thumbColor={isDarkSwitchOn ? colors.tint : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleThemeSwitchChange}
            value={isDarkSwitchOn}
          />
        </View>
      );
    } else if (item.type === 'divider') {
      return <View style={styles.sectionDivider} />;
    }
    return null;
  };

  // User Initials for Header
  const userInitials = userData.fullName
    ? userData.fullName
        .split(' ')
        .map((name) => name.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'UN';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Profil',
          headerStyle: { backgroundColor: colors.cardBackground },
          headerTitleStyle: { color: colors.text, fontWeight: 'bold', fontSize: 20 },
          headerTintColor: colors.tint,
        }}
      />
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={[styles.profileHeader, { backgroundColor: colors.headerBackground }]}>
            <View style={styles.headerWave}>
              <View style={styles.initialsContainer}>
                <Text style={styles.initialsText}>{userInitials}</Text>
              </View>
              <Text style={styles.userName}>{userData.fullName}</Text>
              <Text style={styles.userEmail}>{userData.email ?? 'N/A'}</Text>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => router.push('/edit-profile')}
              >
                <FontAwesome name="edit" size={18} color={colors.background} />
                <Text style={[styles.editProfileButtonText, { color: colors.background }]}>
                  Modifier le Profil
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListFooterComponent={
          <View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color={colors.danger} />
              <Text style={styles.logoutButtonText}>Se déconnecter</Text>
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </View>
        }
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
      />
    </View>
  );
}

// Styles
const getProfileStyles = (
  colorScheme: 'light' | 'dark',
  colors: typeof lightColors | typeof darkColors
) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 18,
      color: colors.text,
      fontWeight: '500',
    },
    errorText: {
      color: colors.danger,
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 24,
      fontWeight: '500',
    },
    profileHeader: {
      alignItems: 'center',
      paddingTop: 40,
      paddingBottom: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    },
    headerWave: {
      width: '100%',
      alignItems: 'center',
      paddingBottom: 30,
      borderBottomLeftRadius: 50,
      borderBottomRightRadius: 50,
      backgroundColor: colors.headerBackground,
    },
    initialsContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 4,
      borderColor: colors.tint,
      shadowColor: colors.tint,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 5,
    },
    initialsText: {
      fontSize: 40,
      fontWeight: 'bold',
      color: colors.tint,
    },
    userName: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.background,
      marginBottom: 8,
      textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    },
    userEmail: {
      fontSize: 16,
      color: colors.background,
      textAlign: 'center',
      marginBottom: 20,
      opacity: 0.9,
      fontWeight: '400',
    },
    editProfileButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 30,
      backgroundColor: colors.tint,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 4,
    },
    editProfileButtonText: {
      marginLeft: 10,
      fontWeight: '600',
      fontSize: 16,
    },
    sectionHeader: {
      backgroundColor: colors.cardBackground,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: colors.tint,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 20,
      opacity: 0.5,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    infoIcon: {
      width: 30,
      textAlign: 'center',
      marginRight: 15,
    },
    infoLabel: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '500',
      width: 100,
    },
    infoValue: {
      fontSize: 16,
      color: colors.text,
      flexShrink: 1,
      fontWeight: '500',
      textAlign: 'left',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    settingItem_last: {
      marginBottom: 20,
    },
    settingIcon: {
      width: 30,
      textAlign: 'center',
      marginRight: 15,
    },
    settingText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    languagePickerWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flex: 1,
      marginLeft: 10,
    },
    chevronColor: {
      color: colors.textSecondary + '99',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.danger,
      paddingVertical: 16,
      borderRadius: 12,
      marginHorizontal: 20,
      marginTop: 30,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 4,
    },
    logoutButtonText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 12,
    },
  });
};

const getPickerStyles = (
  colorScheme: 'light' | 'dark',
  colors: typeof lightColors | typeof darkColors
) => {
  return StyleSheet.create({
    input: {
      fontSize: 16,
      color: colors.text,
      backgroundColor: 'transparent',
      width: 120,
    },
  });
};

// Wrap with Guard
export default AuthGuard(ProfileScreenContent);