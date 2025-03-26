// File: app/edit-profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView // Use KeyboardAvoidingView
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// --- Adjust Paths ---
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getUserData, storeUserData, UserData } from '@/utils/storage';
import { auth, db, storage } from '@/firebaseConfig'; // Import auth, db, storage
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import AuthGuard from '@/app/auth-guard'; // Import AuthGuard
// --- ---

// Renamed component content
function EditProfileScreenContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
    const styles = getEditProfileStyles(colorScheme, colors);
    const router = useRouter();

    const [initialUserData, setInitialUserData] = useState<UserData | null>(null); // Store original data
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Form state
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [group, setGroup] = useState('');
    const [profilePicUri, setProfilePicUri] = useState<string | null | undefined>(null); // Local URI or existing URL or undefined

    // Load current data
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            setIsLoading(true);
            const data = await getUserData();
            if (isMounted) {
                 if (data) {
                    setInitialUserData(data); // Store initial data
                    setFullName(data.fullName || '');
                    setPhoneNumber(data.phoneNumber || '');
                    setGroup(data.group || '');
                    setProfilePicUri(data.profilePicUrl);
                } else {
                    Alert.alert("Erreur", "Données utilisateur non trouvées.", [{ text: "OK", onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile') }]);
                }
                setIsLoading(false);
            }
        };
        load();
        return () => { isMounted = false; }; // Cleanup
    }, []); // Load once

     // --- Image Picker ---
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Refusée', "Accès galerie nécessaire."); return; }
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.6, // Compress more for profile pics
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setProfilePicUri(result.assets[0].uri); // Set local URI for preview and upload trigger
            }
        } catch (e) { console.error("Image Picker Error:", e); Alert.alert("Erreur", "Impossible d'ouvrir la galerie."); }
    };

    // --- Image Upload (Actual Implementation) ---
    const uploadImage = async (uri: string): Promise<string | null> => {
        // Ensure user is still authenticated and storage is initialized
        if (!auth.currentUser || !storage) { Alert.alert("Erreur", "Non connecté ou Storage indisponible."); return null; }

        setIsUploading(true); // Indicate upload start
        try {
            const response = await fetch(uri); // Fetch the image data from local URI
            const blob = await response.blob(); // Convert to blob
            const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
            // Create a unique filename using UID and timestamp
            const fileName = `profile_${auth.currentUser.uid}_${Date.now()}.${fileExtension}`;
            // Define the storage path
            const storageRef = ref(storage, `profile_pictures/${fileName}`);

            console.log("Uploading to Firebase Storage:", fileName);
            const uploadTask = uploadBytesResumable(storageRef, blob);

            // Return a promise that resolves with the download URL or rejects on error
            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => { /* Optional progress tracking */ const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100; console.log('Upload: ' + progress + '%'); },
                    (error) => { console.error("Upload failed:", error); setIsUploading(false); reject(error); }, // Reject promise on error
                    async () => { // On success
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            console.log('Upload successful! URL:', downloadURL);
                            setIsUploading(false);
                            resolve(downloadURL); // Resolve promise with URL
                        } catch (getUrlError) { console.error("Get URL failed:", getUrlError); setIsUploading(false); reject(getUrlError); } // Reject if URL fetch fails
                    }
                );
            });
        } catch (error) {
            console.error("Error preparing image for upload:", error);
            setIsUploading(false);
            return null; // Return null on preparation error
        }
    };
    // --- End Image Upload ---

    // --- Save Changes ---
    const handleSaveChanges = async () => {
        if (!initialUserData || !auth.currentUser || !db) return;

        const trimmedFullName = fullName.trim();
        const trimmedPhone = phoneNumber.trim();
        const trimmedGroup = group.trim();

        if (!trimmedFullName) { Alert.alert("Erreur", "Nom complet requis."); return; }
        if (trimmedPhone && !/^0[5-7]\d{8}$/.test(trimmedPhone)) { Alert.alert('Erreur', 'Format téléphone invalide.'); return; }

        setIsSaving(true);
        let finalProfilePicUrl = initialUserData.profilePicUrl; // Start with the initial URL

        try {
            // 1. Upload NEW image ONLY if profilePicUri is a local file path (doesn't start with http)
            if (profilePicUri && !profilePicUri.startsWith('http')) {
                const uploadedUrl = await uploadImage(profilePicUri);
                if (uploadedUrl) {
                    finalProfilePicUrl = uploadedUrl; // Update URL if upload succeeds
                } else {
                     // If upload failed, keep the original URL but warn the user
                    Alert.alert("Attention", "La nouvelle photo n'a pas pu être envoyée, les autres informations seront sauvegardées.");
                    finalProfilePicUrl = initialUserData.profilePicUrl; // Revert to original
                    // Or you could choose to stop the entire save process:
                    // throw new Error("Échec de l'upload de l'image.");
                }
            } else if (profilePicUri === null) {
                // If user cleared the image (set uri to null), update the URL to null
                finalProfilePicUrl = null;
            }
             // If profilePicUri starts with http, it means it's the existing URL, no re-upload needed

            // 2. Prepare updated data for Firestore and local storage
            const dataToUpdate: Partial<UserData> = {
                fullName: trimmedFullName,
                phoneNumber: trimmedPhone || '', // Use empty string instead of null if preferred
                group: trimmedGroup || null,
                profilePicUrl: finalProfilePicUrl ?? null, // Ensure null if undefined
            };

            // 3. Update Firestore
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userDocRef, dataToUpdate);
            console.log("Firestore profile updated");

            // 4. Update local state and AsyncStorage
            const finalUserData: UserData = { ...initialUserData, ...dataToUpdate } as UserData;
            setUserData(finalUserData); // Update local state immediately (reflects changes)
            await storeUserData(finalUserData); // Update storage
            console.log("Local profile updated");

            Alert.alert("Succès", "Profil mis à jour.", [{ text: "OK", onPress: () => router.back() }]);

        } catch (error: any) {
            console.error("Error saving profile:", error);
            Alert.alert("Erreur", `Impossible de sauvegarder.\n${error.message}`);
        } finally {
            setIsSaving(false);
             setIsUploading(false); // Ensure upload indicator stops regardless of success/failure
        }
    };

    // --- Loading State ---
    if (isLoading || !initialUserData) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>;
    }

    const currentProfilePicSource = profilePicUri ? { uri: profilePicUri } : require('@/assets/images/icon.png');

    return (
        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
                <Stack.Screen options={{ headerTitle: 'Modifier le Profil' }} />

                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <Image source={currentProfilePicSource} style={styles.avatar} />
                    <TouchableOpacity style={styles.changePicButton} onPress={pickImage} disabled={isUploading || isSaving}>
                        {isUploading ? <ActivityIndicator size="small" color={colors.tint}/> : <FontAwesome name="camera" size={16} color={colors.tint}/>}
                        <Text style={styles.changePicButtonText}>Changer Photo</Text>
                    </TouchableOpacity>
                     {/* Optional: Button to remove picture */}
                     {profilePicUri && (
                         <TouchableOpacity onPress={() => setProfilePicUri(null)} style={styles.removePicButton}>
                             <Ionicons name="trash-bin-outline" size={16} color={colors.danger}/>
                         </TouchableOpacity>
                      )}
                </View>

                {/* Form Section */}
                <View style={styles.form}>
                    <Text style={styles.formSectionTitle}>Informations Personnelles</Text>
                    {/* Non-Editable */}
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Email:</Text><Text style={styles.infoValue}>{initialUserData.email ?? 'N/A'}</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Matricule:</Text><Text style={styles.infoValue}>{initialUserData.matricule ?? 'N/A'}</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Année:</Text><Text style={styles.infoValue}>{initialUserData.year ?? 'N/A'}</Text></View>
                    <View style={[styles.infoRow, {borderBottomWidth: 0, marginBottom: 20}]}><Text style={styles.infoLabel}>Spécialité:</Text><Text style={styles.infoValue}>{initialUserData.speciality ?? 'N/A'}</Text></View>

                    {/* Editable */}
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
                        <TextInput style={styles.input} value={group} onChangeText={setGroup} placeholder="Ex: G1, G12..." placeholderTextColor={colors.placeholderText}/>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity style={[styles.saveButton, (isSaving || isUploading) && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={isSaving || isUploading}>
                        {(isSaving || isUploading) ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
                    </TouchableOpacity>
                </View>
                <View style={{ height: 40 }} />{/* Spacer */}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// --- Styles ---
const getEditProfileStyles = (colorScheme: 'light' | 'dark', colors: typeof Colors.light | typeof Colors.dark) => {
  return StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { padding: 20 },
    avatarSection: { alignItems: 'center', marginBottom: 30, position: 'relative' }, // Added relative positioning
    avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: colors.tint, backgroundColor: colors.border, marginBottom: 10 },
    changePicButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    changePicButtonText: { color: colors.tint, marginLeft: 8, fontWeight: '500' },
    removePicButton: { // Style for remove button
        position: 'absolute',
        top: 0, // Position near the avatar
        right: '25%', // Adjust as needed
        backgroundColor: colors.cardBackground,
        borderRadius: 15,
        padding: 5,
        shadowColor: '#000', shadowOffset:{width:0, height:1}, shadowOpacity: 0.2, elevation: 2,
    },
    form: { backgroundColor: colors.cardBackground, borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, borderWidth: 1, borderColor: colors.border },
    formSectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoRow: { flexDirection: 'row', paddingVertical: 8, marginBottom: 8, alignItems: 'center' }, // Simplified non-editable rows
    infoLabel: { width: 90, color: colors.textSecondary, fontWeight: '500', fontSize: 14 },
    infoValue: { flex: 1, color: colors.text, fontWeight: '500', fontSize: 14 },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 6, marginLeft: 4 },
    input: { backgroundColor: colors.inputBackground, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 16, color: colors.text },
    saveButton: { backgroundColor: colors.success ?? '#16a34a', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 15 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    buttonDisabled: { opacity: 0.6 },
    placeholderText: { color: colors.placeholderText },
  });
};

// --- Wrap with Guard ---
export default AuthGuard(EditProfileScreenContent); // Export the guarded component