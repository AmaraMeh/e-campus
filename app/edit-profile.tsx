// File: app/edit-profile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// --- Adjust Paths ---
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { getUserData, storeUserData, UserData } from '../utils/storage';
import { auth, db, storage } from '../firebaseConfig'; // Import storage
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // Storage functions
import AuthGuard from '../app/auth-guard'; // Import AuthGuard
// --- ---

// Define colors outside
const baseLightColors = { background: '#f8fafc', cardBackground: '#ffffff', inputBackground: '#ffffff', inputBorder: '#e5e7eb', text: '#1f2937', textSecondary: '#6b7280', placeholderText: '#9ca3af', tint: Colors.light.tint ?? '#3b82f6', border: '#e5e7eb', disabledText: '#9ca3af', disabledBackground: '#e5e7eb', disabledBorder: '#d1d5db', success: Colors.success ?? '#16a34a', danger: Colors.danger ?? '#dc2626' };
const baseDarkColors = { background: '#111827', cardBackground: '#1f2937', inputBackground: '#374151', inputBorder: '#4b5563', text: '#f9fafb', textSecondary: '#9ca3af', placeholderText: '#6b7280', tint: Colors.dark.tint ?? '#60a5fa', border: '#374151', disabledText: '#6b7280', disabledBackground: '#4b5563', disabledBorder: '#6b7280', success: Colors.success ?? '#22c55e', danger: Colors.danger ?? '#f87171' };
const lightColors = { ...baseLightColors, ...Colors.light };
const darkColors = { ...baseDarkColors, ...Colors.dark };

// Renamed content component
function EditProfileScreenContent() {
    const colorScheme = useColorScheme() ?? 'light';
    // Get colors based on theme
    const colors = colorScheme === 'dark' ? darkColors : lightColors;
    const styles = getEditProfileStyles(colorScheme, colors); // Pass colors
    const router = useRouter();

    // Use initialUserData to store the data loaded initially
    const [initialUserData, setInitialUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Form state - Initialize with empty strings
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [group, setGroup] = useState('');
    const [profilePicUri, setProfilePicUri] = useState<string | null | undefined>(null);

    // Load current data
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            setIsLoading(true);
            const data = await getUserData();
            if (isMounted) {
                if (data) {
                    setInitialUserData(data); // Store original data
                    setFullName(data.fullName || '');
                    setPhoneNumber(data.phoneNumber || '');
                    setGroup(data.group || '');
                    setProfilePicUri(data.profilePicUrl); // Init preview URI
                } else {
                    Alert.alert("Erreur", "Données utilisateur non trouvées.", [{ text: "OK", onPress: () => router.back() }]);
                }
                setIsLoading(false);
            }
        };
        load();
        return () => { isMounted = false; }; // Cleanup
    }, []);

     // --- Image Picker ---
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Refusée', "Accès galerie nécessaire."); return; }
        try {
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.6 });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setProfilePicUri(result.assets[0].uri); // Set local URI for preview
            }
        } catch (e) { console.error("Image Picker Error:", e); Alert.alert("Erreur", "Impossible d'ouvrir galerie."); }
    };

    // --- Image Upload (Actual Implementation) ---
    const uploadImage = async (uri: string): Promise<string | null> => {
        if (!auth.currentUser || !storage) { Alert.alert("Erreur", "Non connecté ou Storage indisponible."); return null; }
        setIsUploading(true);
        try {
            const response = await fetch(uri); const blob = await response.blob();
            const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `pp_${auth.currentUser.uid}_${Date.now()}.${fileExtension}`;
            const storageRef = ref(storage, `profile_pictures/${fileName}`);
            console.log("Uploading:", fileName);
            const uploadTask = uploadBytesResumable(storageRef, blob);
            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed', (snapshot) => { console.log('Upload:', (snapshot.bytesTransferred / snapshot.totalBytes) * 100, '%'); },
                    (error) => { console.error("Upload fail:", error); reject(error); },
                    async () => { try { const url = await getDownloadURL(uploadTask.snapshot.ref); resolve(url); } catch (e) { reject(e); } }
                );
            });
        } catch (error) { console.error("Img Prep fail:", error); return null; }
        finally { setIsUploading(false); } // Ensure uploading stops even on error
    };
    // --- End Image Upload ---

    // --- Save Changes ---
    const handleSaveChanges = async () => {
        // Use initialUserData for checks, not the potentially outdated userData state
        if (!initialUserData || !auth.currentUser || !db) { Alert.alert("Erreur", "Données ou services indisponibles."); return; }

        const trimmedFullName = fullName.trim();
        const trimmedPhone = phoneNumber.trim();
        const trimmedGroup = group.trim();

        if (!trimmedFullName) { Alert.alert("Erreur", "Nom complet requis."); return; }
        if (trimmedPhone && !/^0[5-7]\d{8}$/.test(trimmedPhone)) { Alert.alert('Erreur', 'Format téléphone invalide.'); return; }

        setIsSaving(true); // Combined saving indicator
        let finalProfilePicUrl = initialUserData.profilePicUrl; // Start with original URL

        try {
            // 1. Upload if local URI exists and is different from initial stored URL
            if (profilePicUri && profilePicUri !== initialUserData.profilePicUrl && !profilePicUri.startsWith('http')) {
                 console.log("New local image detected, starting upload...");
                 const uploadedUrl = await uploadImage(profilePicUri); // This now sets isUploading
                 if (uploadedUrl) {
                     finalProfilePicUrl = uploadedUrl;
                 } else {
                      // Handle upload failure - maybe don't proceed?
                      throw new Error("Échec de l'upload de l'image.");
                 }
            } else if (profilePicUri === null && initialUserData.profilePicUrl !== null) {
                // If user explicitly removed the picture (set URI to null)
                finalProfilePicUrl = null;
                console.log("Profile picture removal requested.");
            }
            // If profilePicUri starts with http or matches initial, no upload needed

            // 2. Prepare data for update
            const dataToUpdate: Partial<UserData> = {
                fullName: trimmedFullName,
                phoneNumber: trimmedPhone || '', // Store empty string or null based on preference
                group: trimmedGroup || null,
                profilePicUrl: finalProfilePicUrl ?? null, // Ensure null if undefined
            };

            // 3. Update Firestore
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userDocRef, dataToUpdate);
            console.log("Firestore profile updated");

            // 4. Update local storage with the final merged data
            const finalUserData: UserData = {
                ...initialUserData, // Start with initial non-editable data (uid, email, etc.)
                ...dataToUpdate,    // Apply the changes
            };
            await storeUserData(finalUserData);
            console.log("Local storage updated");

            Alert.alert("Succès", "Profil mis à jour !", [{ text: "OK", onPress: () => router.back() }]);

        } catch (error: any) {
            console.error("Error saving profile:", error);
            Alert.alert("Erreur", `Sauvegarde échouée.\n${error.message}`);
        } finally {
            setIsSaving(false); // Stop saving indicator
            // isUploading is handled within uploadImage now
        }
    };

    // --- Loading State ---
    if (isLoading) { return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>; }

    // If initial data failed to load
     if (!initialUserData) {
         return <View style={styles.loadingContainer}><Text style={styles.errorText}>Impossible de charger les données initiales.</Text></View>;
     }

    // Determine picture source for preview
    const currentProfilePicSource = profilePicUri ? { uri: profilePicUri } : require('../assets/images/icon.png');

    return (
        // Removed KeyboardAvoidingView, use ScrollView padding
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
            <Stack.Screen options={{ headerTitle: "Modifier le Profil", headerStyle:{backgroundColor: colors.cardBackground}, headerTitleStyle:{color: colors.text}, headerTintColor: colors.tint }} />

            {/* Avatar Section */}
            <View style={styles.avatarSection}>
                <Image source={currentProfilePicSource} style={styles.avatar} />
                <TouchableOpacity style={styles.changePicButton} onPress={pickImage} disabled={isUploading || isSaving}>
                     {isUploading ? <ActivityIndicator color={colors.tint}/> : <FontAwesome name="camera" size={16} color={colors.tint}/>}
                    <Text style={styles.changePicButtonText}>Changer Photo</Text>
                </TouchableOpacity>
                 {/* Button to remove picture (sets URI to null) */}
                 {profilePicUri && (
                     <TouchableOpacity onPress={() => setProfilePicUri(null)} style={styles.removePicButton}>
                         <Ionicons name="trash-bin-outline" size={16} color={colors.danger}/>
                     </TouchableOpacity>
                  )}
            </View>

            {/* Form Section */}
            <View style={styles.form}>
                 <Text style={styles.formSectionTitle}>Informations Personnelles</Text>
                 {/* Display non-editable info */}
                 <View style={styles.infoRow}><Text style={styles.infoLabel}>Email:</Text><Text style={styles.infoValue}>{initialUserData.email ?? 'N/A'}</Text></View>
                 <View style={styles.infoRow}><Text style={styles.infoLabel}>Matricule:</Text><Text style={styles.infoValue}>{initialUserData.matricule ?? 'N/A'}</Text></View>
                 <View style={styles.infoRow}><Text style={styles.infoLabel}>Année:</Text><Text style={styles.infoValue}>{initialUserData.year ?? 'N/A'}</Text></View>
                 <View style={[styles.infoRow, {borderBottomWidth: 0, marginBottom: 20}]}><Text style={styles.infoLabel}>Spécialité:</Text><Text style={styles.infoValue}>{initialUserData.speciality ?? 'N/A'}</Text></View>

                 {/* Editable fields */}
                 <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nom complet *</Text>
                    <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Nom et Prénom" placeholderTextColor={colors.placeholderText}/>
                 </View>
                 <View style={styles.inputGroup}>
                    <Text style={styles.label}>Téléphone</Text>
                    <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="0XXXXXXXXX" placeholderTextColor={colors.placeholderText}/>
                 </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Groupe</Text>
                    <TextInput style={styles.input} value={group} onChangeText={setGroup} placeholder="Ex: A1, B3..." placeholderTextColor={colors.placeholderText}/>
                 </View>

                 {/* Save Button */}
                 <TouchableOpacity style={[styles.saveButton, (isSaving || isUploading) && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={isSaving || isUploading}>
                    {(isSaving || isUploading) ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
                 </TouchableOpacity>
            </View>
             <View style={{ height: 40 }} />
        </ScrollView>
    );
}

// --- Styles ---
const getEditProfileStyles = (colorScheme: 'light' | 'dark', colors: typeof Colors.light | typeof Colors.dark) => {
  return StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { padding: 20, paddingBottom: 60 }, // Added padding bottom
    avatarSection: { alignItems: 'center', marginBottom: 25, position: 'relative' },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: colors.tint, backgroundColor: colors.border, marginBottom: 8 },
    changePicButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    changePicButtonText: { color: colors.tint, marginLeft: 8, fontWeight: '500' },
    removePicButton: { position: 'absolute', top: 0, right: '20%', backgroundColor: colors.cardBackground, borderRadius: 15, padding: 6, shadowColor:'#000', shadowOpacity: 0.2, elevation: 2 },
    form: { backgroundColor: colors.cardBackground, borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, borderWidth: 1, borderColor: colors.border },
    formSectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoRow: { flexDirection: 'row', paddingVertical: 8, marginBottom: 8, alignItems: 'center'},
    infoLabel: { width: 80, color: colors.textSecondary, fontWeight: '500', fontSize: 14},
    infoValue: { flex: 1, color: colors.text, fontWeight: '500', fontSize: 14 },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 6, marginLeft: 4 },
    input: { backgroundColor: colors.inputBackground, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 15, color: colors.text },
    saveButton: { backgroundColor: colors.success ?? '#16a34a', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    buttonDisabled: { opacity: 0.6 },
    placeholderText: { color: colors.placeholderText }, // Add placeholder color access
    errorText: { color: colors.danger, fontSize: 16, textAlign: 'center'}, // For error display
  });
};
// Picker styles not needed in this file anymore
// const getPickerStyles = ...

// --- Wrap with Guard ---
export default AuthGuard(EditProfileScreenContent);