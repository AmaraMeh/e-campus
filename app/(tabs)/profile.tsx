// File: app/(tabs)/profile.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  RefreshControl,
  Share,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { Picker } from '@react-native-picker/picker';

// Adjust Paths
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { getUserData, clearUserData, UserData } from '../../utils/storage';
import { auth } from '../../firebaseConfig';
import AuthGuard from '../auth-guard';

// Language Context
const LanguageContext = React.createContext<{
  language: string;
  setLanguage: (lang: string) => void;
}>({ language: 'fr', setLanguage: () => {} });

// Language Options and Translations
const languages = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];
const translations = {
  fr: {
    profile: 'Profil Étudiant',
    welcome: 'Bienvenue',
    academic: 'Infos Académiques',
    matricule: 'Matricule',
    year: 'Année',
    speciality: 'Spécialité',
    group: 'Groupe',
    contact: 'Contact',
    email: 'Email',
    phone: 'Téléphone',
    settings: 'Réglages',
    password: 'Mot de Passe',
    notifications: 'Notifications',
    language: 'Langue',
    theme: 'Thème Sombre',
    actions: 'Actions Rapides',
    favorites: 'Mes Favoris',
    share: 'Partager',
    help: 'Aide',
    logout: 'Déconnexion',
    loading: 'Chargement...',
    error: 'Erreur. Réessayez.',
    edit: 'Modifier Profil',
    selectLanguage: 'Choisir la Langue',
    confirm: 'Confirmer',
    cancel: 'Annuler',
  },
  en: {
    profile: 'Student Profile',
    welcome: 'Welcome',
    academic: 'Academic Info',
    matricule: 'Student ID',
    year: 'Year',
    speciality: 'Major',
    group: 'Group',
    contact: 'Contact',
    email: 'Email',
    phone: 'Phone',
    settings: 'Settings',
    password: 'Password',
    notifications: 'Notifications',
    language: 'Language',
    theme: 'Dark Theme',
    actions: 'Quick Actions',
    favorites: 'My Favorites',
    share: 'Share',
    help: 'Help',
    logout: 'Logout',
    loading: 'Loading...',
    error: 'Error. Try again.',
    edit: 'Edit Profile',
    selectLanguage: 'Select Language',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
  ar: {
    profile: 'الملف الطلابي',
    welcome: 'مرحبًا',
    academic: 'معلومات أكاديمية',
    matricule: 'رقم الطالب',
    year: 'السنة',
    speciality: 'التخصص',
    group: 'المجموعة',
    contact: 'الاتصال',
    email: 'البريد',
    phone: 'الهاتف',
    settings: 'الإعدادات',
    password: 'كلمة المرور',
    notifications: 'الإشعارات',
    language: 'اللغة',
    theme: 'الوضع الداكن',
    actions: 'إجراءات سريعة',
    favorites: 'مفضلاتي',
    share: 'مشاركة',
    help: 'مساعدة',
    logout: 'تسجيل الخروج',
    loading: 'جار التحميل...',
    error: 'خطأ. حاول مجددًا.',
    edit: 'تعديل الملف',
    selectLanguage: 'اختر اللغة',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
  },
};

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

// Utility to format names
const formatName = (name: string | undefined) => {
  if (!name) return 'Étudiant';
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

// Reusable Components
const InfoItem = React.memo(({ icon, label, value, colors }: any) => (
  <View style={[styles.infoItem, { backgroundColor: colors.card }]}>
    <Ionicons name={icon} size={20} color={colors.secondary} style={styles.icon} />
    <Text style={[styles.label, { color: colors.secondary }]}>{label}</Text>
    <Text style={[styles.value, { color: colors.text }]}>{value || '-'}</Text>
  </View>
));

const ActionItem = React.memo(({ icon, text, onPress, colors, danger, isLast }: any) => (
  <TouchableOpacity
    style={[
      styles.actionItem,
      { backgroundColor: colors.card, borderBottomColor: isLast ? 'transparent' : colors.border },
      danger && { borderColor: colors.danger },
    ]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={24} color={danger ? colors.danger : colors.accent} style={styles.actionIcon} />
    <Text style={[styles.actionText, { color: danger ? colors.danger : colors.text }]}>{text}</Text>
    <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
  </TouchableOpacity>
));

// Main Component
function ProfileScreenContent() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const router = useRouter();
  const [language, setLanguage] = useState('fr');
  const [tempLanguage, setTempLanguage] = useState('fr');
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const t = translations[language];

  // State
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserData();
      setUserData(data);
    } catch (e) {
      Alert.alert('Erreur', t.error);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleLogout = useCallback(() => {
    Alert.alert(t.logout, 'Voulez-vous vous déconnecter ?', [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.logout,
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            await clearUserData();
            router.replace('/auth');
          } catch (e) {
            Alert.alert('Erreur', 'Échec de la déconnexion');
          }
        },
      },
    ]);
  }, [router, t]);

  const shareApp = useCallback(async () => {
    try {
      await Share.share({ message: "Découvrez CampusElkseur ! [Lien App]" });
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  }, []);

  const handleLanguageChange = () => {
    setLanguage(tempLanguage);
    setLanguageModalVisible(false);
  };

  const academicInfo = useMemo(() => [
    { icon: 'card-outline', label: t.matricule, value: userData?.matricule, id: 'matricule' },
    { icon: 'calendar-outline', label: t.year, value: userData?.year, id: 'year' },
    { icon: 'school-outline', label: t.speciality, value: userData?.speciality, id: 'speciality' },
    ...(userData?.group ? [{ icon: 'people-outline', label: t.group, value: userData.group, id: 'group' }] : []),
  ], [userData, t]);

  const contactInfo = useMemo(() => [
    { icon: 'mail-outline', label: t.email, value: userData?.email, id: 'email' },
    { icon: 'call-outline', label: t.phone, value: userData?.phoneNumber, id: 'phone' },
  ], [userData, t]);

  const actions = useMemo(() => [
    { icon: 'star-outline', text: t.favorites, onPress: () => router.push('/favorites'), id: 'favorites' },
    { icon: 'share-outline', text: t.share, onPress: shareApp, id: 'share' },
    { icon: 'help-circle-outline', text: t.help, onPress: () => router.push('../help'), id: 'help' },
    { icon: 'log-out-outline', text: t.logout, onPress: handleLogout, danger: true, id: 'logout' },
  ], [router, shareApp, handleLogout, t]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.text, { color: colors.text }]}>{t.loading}</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.danger }]}>{t.error}</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.danger }]} onPress={handleLogout}>
          <Text style={styles.buttonText}>{t.logout}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerTitle: t.profile,
            headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { color: colors.text, fontSize: 22, fontWeight: '600' },
            headerTintColor: colors.accent,
          }}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.welcome, { color: colors.secondary }]}>{t.welcome},</Text>
            <Text style={[styles.name, { color: colors.text }]}>{formatName(userData.fullName)}</Text>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/edit-profile')}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.background} />
              <Text style={styles.editButtonText}>{t.edit}</Text>
            </TouchableOpacity>
          </View>

          {/* Academic Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.academic}</Text>
            {academicInfo.map((item) => (
              <InfoItem key={item.id} {...item} colors={colors} />
            ))}
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.contact}</Text>
            {contactInfo.map((item) => (
              <InfoItem key={item.id} {...item} colors={colors} />
            ))}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings}</Text>
            <ActionItem
              icon="lock-closed-outline"
              text={t.password}
              onPress={() => router.push('../change-password')}
              colors={colors}
            />
            <ActionItem
              icon="notifications-outline"
              text={t.notifications}
              onPress={() => router.push('../notifications')}
              colors={colors}
            />
            <ActionItem
              icon="language-outline"
              text={t.language}
              onPress={() => setLanguageModalVisible(true)}
              colors={colors}
            />
            <View style={[styles.actionItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Ionicons name={isDarkMode ? 'moon-outline' : 'sunny-outline'} size={24} color={colors.accent} style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: colors.text }]}>{t.theme}</Text>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={isDarkMode ? colors.accent : colors.card}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.actions}</Text>
            <View style={styles.actionList}>
              {actions.map((item, index) => (
                <ActionItem
                  key={item.id}
                  {...item}
                  colors={colors}
                  isLast={index === actions.length - 1}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Language Selection Modal */}
        <Modal
          visible={isLanguageModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setLanguageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t.selectLanguage}</Text>
              <Picker
                selectedValue={tempLanguage}
                onValueChange={setTempLanguage}
                style={[styles.modalPicker, { color: colors.text }]}
              >
                {languages.map((lang) => (
                  <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
                ))}
              </Picker>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.secondary }]}
                  onPress={() => setLanguageModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.accent }]}
                  onPress={handleLanguageChange}
                >
                  <Text style={styles.modalButtonText}>{t.confirm}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </LanguageContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  header: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  welcome: { fontSize: 18, fontWeight: '400', letterSpacing: 0.5 },
  name: { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, letterSpacing: 0.3 },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  icon: { width: 32 },
  label: { width: 100, fontSize: 15, fontWeight: '500' },
  value: { flex: 1, fontSize: 15, fontWeight: '400' },
  actionList: { borderRadius: 12, overflow: 'hidden' },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  actionIcon: { width: 32 },
  actionText: { flex: 1, fontSize: 16, fontWeight: '500' },
  button: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  text: { fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  modalPicker: { width: '100%', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

export default AuthGuard(ProfileScreenContent);