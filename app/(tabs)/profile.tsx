// File: app/(tabs)/profile.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Switch, Platform, Share, Dimensions
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import RNPickerSelect from 'react-native-picker-select';
import * as ImagePicker from 'expo-image-picker';
// --- Adjust Paths ---
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserData, clearUserData, UserData, storeUserData } from '@/utils/storage';
import { auth, db, storage } from '@/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import AuthGuard from '@/app/auth-guard';
// --- ---

// --- Language Options ---
const languages = [ { label: 'Français', value: 'fr' }, { label: 'English', value: 'en' }, { label: 'العربية', value: 'ar' }, ];
// --- ---

// --- Color Definitions ---
const baseLightColors = { background: '#f8fafc', cardBackground: '#ffffff', inputBackground: '#ffffff', inputBorder: '#e5e7eb', text: '#1f2937', textSecondary: '#6b7280', placeholderText: '#9ca3af', tint: Colors.light.tint ?? '#3b82f6', border: '#e5e7eb', disabledText: '#9ca3af', disabledBackground: '#e5e7eb', disabledBorder: '#d1d5db', success: Colors.success ?? '#16a34a', danger: Colors.danger ?? '#dc2626' };
const baseDarkColors = { background: '#111827', cardBackground: '#1f2937', inputBackground: '#374151', inputBorder: '#4b5563', text: '#f9fafb', textSecondary: '#9ca3af', placeholderText: '#6b7280', tint: Colors.dark.tint ?? '#60a5fa', border: '#374151', disabledText: '#6b7280', disabledBackground: '#4b5563', disabledBorder: '#6b7280', success: Colors.success ?? '#22c55e', danger: Colors.danger ?? '#f87171' };
const lightColors = { ...baseLightColors, ...Colors.light };
const darkColors = { ...baseDarkColors, ...Colors.dark };
// --- End Color Definitions ---

// --- Reusable Row Components ---
interface InfoRowProps { icon: keyof typeof FontAwesome.glyphMap; label: string; value: string | null | undefined; colors: typeof lightColors | typeof darkColors; }
const InfoRow: React.FC<InfoRowProps> = React.memo(({ icon, label, value, colors }) => { const styles = getProfileStyles(colors === darkColors ? 'dark' : 'light', colors); return ( <View style={styles.infoItem}> <FontAwesome name={icon} size={18} style={[styles.infoIcon, {color: colors.textSecondary}]} /> <Text style={styles.infoLabel}>{label}</Text> <Text style={styles.infoValue}>{value ?? 'N/A'}</Text> </View> ); });
interface SettingRowProps { icon: keyof typeof Ionicons.glyphMap; text: string; onPress: () => void; colors: typeof lightColors | typeof darkColors; }
const SettingRow: React.FC<SettingRowProps> = React.memo(({ icon, text, onPress, colors }) => { const styles = getProfileStyles(colors === darkColors ? 'dark' : 'light', colors); return ( <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.6}> <Ionicons name={icon} size={22} style={[styles.settingIcon, {color: colors.textSecondary}]} /> <Text style={styles.settingText}>{text}</Text> <Ionicons name="chevron-forward" size={20} color={styles.chevronColor.color} /> </TouchableOpacity> ); });
// --- End Reusable Row Components ---


// --- Main Profile Screen Content Component ---
function ProfileScreenContent() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const styles = getProfileStyles(colorScheme, colors);
  const pickerStyles = getPickerStyles(colorScheme, colors);
  const router = useRouter();

  // --- State ---
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('fr');
  const [isDarkSwitchOn, setIsDarkSwitchOn] = useState(colorScheme === 'dark');
  const [profilePicUri, setProfilePicUri] = useState<string | null | undefined>(null);

  // --- Effects ---
  useEffect(() => { setIsDarkSwitchOn(colorScheme === 'dark'); }, [colorScheme]);
  useEffect(() => { let isMounted = true; const loadData = async () => { setIsLoading(true); const data = await getUserData(); if (isMounted) { setUserData(data); if (data) { setProfilePicUri(data.profilePicUrl); /* Load other initial states if needed */ } setIsLoading(false); } }; loadData(); return () => { isMounted = false; }; }, []);

  // --- Handlers ---
  const handleLogout = useCallback(async () => { Alert.alert( "Déconnexion", "...", [ { text: "Annuler" }, { text: "Déconnecter", onPress: async () => { try { await signOut(auth); await clearUserData(); setUserData(null); if (router.canDismiss()) router.dismissAll(); router.replace('/auth'); } catch (e) { Alert.alert("Erreur logout"); } }} ] ); }, [router]);
  const handleThemeSwitchChange = () => { setIsDarkSwitchOn(p => !p); Alert.alert("Thème", `Toggle visuel. Context requis.`); /* TODO: context.setTheme(...) */ };
  const pickImage = async () => { const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (status !== 'granted') { Alert.alert('Permission Refusée', "Accès galerie nécessaire."); return; } try { let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, }); if (!result.canceled && result.assets && result.assets.length > 0) { const uri = result.assets[0].uri; setProfilePicUri(uri); Alert.alert("Image Sélectionnée", "Sauvegardez via 'Modifier Profil'."); } } catch (e) { Alert.alert("Erreur", "Impossible d'ouvrir galerie."); } };
  const shareApp = useCallback(async () => { try { await Share.share({ message: "Découvrez CampusElkseur! [Lien App]" }); } catch (error: any) { Alert.alert("Erreur", error.message); } }, []);
  const handleLanguageChange = (langValue: string | null) => { if (langValue && langValue !== currentLanguage) { setCurrentLanguage(langValue); Alert.alert("Langue", `Changement vers ${languages.find(l=>l.value===langValue)?.label}. (i18n requis)`); /* TODO: Save pref & trigger i18n */ } };

  // --- Loading / Error States ---
  if (isLoading) { return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>; }
  if (!userData) { return ( <View style={styles.loadingContainer}><Text style={styles.errorText}>Données utilisateur non trouvées.</Text><TouchableOpacity style={[styles.logoutButton, {width: '60%'}]} onPress={handleLogout} activeOpacity={0.7}><Text style={styles.logoutButtonText}>Se déconnecter</Text></TouchableOpacity></View> ); }

  // --- Profile Render ---
  const displayPicUri = profilePicUri ?? userData.profilePicUrl; // Use state URI first, then stored URL
  const profilePictureSource = displayPicUri ? { uri: displayPicUri } : require('@/assets/images/icon.png');

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Header Configured in _layout.tsx */}

            {/* Profile Header */}
            <View style={styles.profileHeader}>
                <TouchableOpacity onPress={pickImage} disabled={isUploading} activeOpacity={0.7} style={styles.avatarContainer}>
                    <Image source={profilePictureSource} style={styles.avatar} onError={(e)=>console.log("Img Load Error:", e.nativeEvent.error)}/>
                    <View style={styles.editIconContainer}>
                        {isUploading ? <ActivityIndicator size="small" color="#fff"/> : <FontAwesome name="camera" size={14} color="#fff" />}
                    </View>
                </TouchableOpacity>
                <Text style={styles.userName}>{userData.fullName}</Text>
                <Text style={styles.userEmail}>{userData.email ?? 'N/A'}</Text>
                 <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push('/edit-profile')}>
                     <FontAwesome name="edit" size={16} color={colors.tint} />
                     <Text style={[styles.editProfileButtonText, { color: colors.tint }]}>Modifier le Profil</Text>
                </TouchableOpacity>
            </View>

            {/* Information Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Informations Académiques</Text>
                <InfoRow icon="id-card-o" label="Matricule:" value={userData.matricule} colors={colors} />
                <InfoRow icon="calendar" label="Année:" value={userData.year} colors={colors} />
                <InfoRow icon="graduation-cap" label="Spécialité:" value={userData.speciality} colors={colors} />
                <View style={[styles.infoItem, styles.infoItem_last]}>
                     {userData.group && <InfoRow icon="users" label="Groupe:" value={userData.group} colors={colors} />}
                     {!userData.group && <View style={{height: 10}}/>} {/* Add placeholder if group is last and empty */}
                </View>
            </View>

            {/* Contact Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact</Text>
                 <InfoRow icon="envelope-o" label="Email:" value={userData.email} colors={colors} />
                 <View style={styles.infoItem_last}>
                     <InfoRow icon="phone" label="Téléphone:" value={userData.phoneNumber} colors={colors} />
                 </View>
            </View>

            {/* App Settings Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Paramètres</Text>
                <SettingRow icon="lock-closed-outline" text="Changer Mot de Passe" onPress={() => Alert.alert("Navigation", "Écran 'Changer Mot de Passe'")} colors={colors}/>
                <SettingRow icon="notifications-outline" text="Notifications" onPress={() => Alert.alert("Navigation", "Écran 'Notifications'")} colors={colors}/>
                <View style={[styles.settingItem, { paddingVertical: 8 }]}>
                    <Ionicons name="language-outline" size={22} style={[styles.settingIcon, {color: colors.textSecondary}]} />
                    <Text style={styles.settingText}>Langue</Text>
                    <View style={styles.languagePickerWrapper}>
                         <RNPickerSelect placeholder={{}} items={languages} onValueChange={handleLanguageChange} style={pickerStyles} value={currentLanguage} useNativeAndroidPickerStyle={false} Icon={() => <FontAwesome name="caret-down" size={16} color={colors.textSecondary} style={styles.pickerIcon} />}/>
                    </View>
                </View>
                <View style={[styles.settingItem, styles.settingItem_last]}>
                     <View style={{ flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name={isDarkSwitchOn ? 'moon-outline' : 'sunny-outline'} size={22} style={[styles.settingIcon, {color: colors.textSecondary}]} />
                        <Text style={styles.settingText}>Thème Sombre</Text>
                     </View>
                     <Switch trackColor={{ false: '#767577', true: colors.tint + '80' }} thumbColor={isDarkSwitchOn ? colors.tint : '#f4f3f4'} ios_backgroundColor="#3e3e3e" onValueChange={handleThemeSwitchChange} value={isDarkSwitchOn}/>
                </View>
            </View>

             {/* Other Actions Section */}
            <View style={styles.section}>
                 <Text style={styles.sectionTitle}>Autres</Text>
                 <SettingRow icon="star-outline" text="Favoris & Téléchargements" onPress={() => router.push('/(tabs)/favorites')} colors={colors}/>
                 <SettingRow icon="share-social-outline" text="Partager l'Application" onPress={shareApp} colors={colors}/>
                 <View style={styles.settingItem_last}>
                     <SettingRow icon="help-circle-outline" text="Aide et Support" onPress={() => Alert.alert("Navigation", "Écran 'Aide/FAQ'")} colors={colors}/>
                 </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
                <Ionicons name="log-out-outline" size={22} color={styles.logoutButtonText.color} />
                <Text style={styles.logoutButtonText}>Se déconnecter</Text>
            </TouchableOpacity>

            <View style={{ height: 50 }} />
      </ScrollView>
    </>
  );
}


// --- Styles ---
const getProfileStyles = (colorScheme: 'light' | 'dark', colors: typeof lightColors | typeof darkColors) => {
    return StyleSheet.create({
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
        errorText: { color: colors.danger, fontSize: 16, textAlign: 'center', marginBottom: 20 },
        container: { flex: 1, backgroundColor: colors.background },
        contentContainer: { paddingVertical: 20, paddingHorizontal: 15 },
        profileHeader: { alignItems: 'center', marginBottom: 30, paddingVertical: 25, backgroundColor: colors.cardBackground, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: colorScheme === 'dark' ? 0.2 : 0.1, shadowRadius: 6, elevation: 5, borderWidth: 1, borderColor: colors.border },
        avatarContainer: { position: 'relative', marginBottom: 15 },
        avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: colors.tint, backgroundColor: colors.border },
        editIconContainer: { position: 'absolute', bottom: 5, right: 5, backgroundColor: colors.tint, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.cardBackground },
        userName: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4, textAlign: 'center' },
        userEmail: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 15 },
        editProfileButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: colors.tint + '1A', borderWidth: 1, borderColor: colors.tint + '50' },
        editProfileButtonText: { /* color set dynamically */ marginLeft: 8, fontWeight: '500', fontSize: 14 },
        section: { backgroundColor: colors.cardBackground, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2, borderWidth: 1, borderColor: colors.border },
        sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
        infoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '80' },
        infoItem_last: { borderBottomWidth: 0 },
        infoIcon: { width: 25, textAlign: 'center', marginRight: 18 },
        infoLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', width: 95 },
        infoValue: { fontSize: 14, color: colors.text, flexShrink: 1, fontWeight: '500', textAlign: 'left' },
        actionButton: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingVertical: 10, paddingHorizontal: 5, borderRadius: 8 },
        actionButtonText: { marginLeft: 8, fontWeight: '600', fontSize: 14 },
        settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border + '80' },
        settingItem_last: { borderBottomWidth: 0 },
        settingIcon: { width: 25, textAlign: 'center', marginRight: 18 },
        settingText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
        languagePickerWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1, marginLeft: 10 }, // Align picker to the right
        chevronColor: { color: colors.textSecondary + '99' },
        pickerIcon: { marginLeft: 5 },
        logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger + '1A', paddingVertical: 14, borderRadius: 10, marginTop: 25, borderWidth: 1, borderColor: colors.danger + '50' },
        logoutButtonText: { color: colors.danger ?? '#dc2626', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
        eliminationNote: { color: colors.danger ?? '#dc2626', },
        iconColor: { color: colors.textSecondary },
    });
};

const getPickerStyles = (colorScheme: 'light' | 'dark', colors: typeof lightColors | typeof darkColors) => { return StyleSheet.create({ inputIOS: { fontSize: 15, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 0, color: colors.text, backgroundColor: 'transparent' }, inputAndroid: { fontSize: 15, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0, color: colors.text, backgroundColor: 'transparent', minHeight: 30 }, placeholder: { color: colors.placeholderText, fontSize: 15 }, iconContainer: { top: Platform.OS === 'ios' ? 5 : 8, right: 0 }, disabled: { color: colors.disabledText } }); };

// --- Wrap with Guard ---
export default AuthGuard(ProfileScreenContent);