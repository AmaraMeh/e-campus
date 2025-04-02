// File: app/report-found.tsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native'; // Added KAV
import { Stack, useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// --- Adjust Paths ---
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { auth, db, storage } from '../firebaseConfig';
import { getUserData } from '../utils/storage';
import AuthGuard from '../app/auth-guard'; // <--- Import Guard ---
// --- ---

// --- Renamed Content Component ---
function ReportFoundScreenContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
    const styles = getReportStyles(colorScheme, colors);
    const router = useRouter();

    // --- State (Keep as is) ---
    const [itemName, setItemName] = useState('');
    const [description, setDescription] = useState('');
    const [locationFound, setLocationFound] = useState('');
    // const [contactInfo, setContactInfo] = useState(''); // Removed if not needed
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0); // For progress indicator

    const user = auth.currentUser; // Get user directly

    // --- Image Picker (Keep as is) ---
    const pickImage = async () => { /* ... */ };

    // --- Image Upload (Keep as is) ---
    const uploadImageAndGetURL = async (uri: string): Promise<string | null> => { /* ... */ };

    // --- Handle Submission (Keep as is, relies on user object) ---
    const handleSubmit = async () => {
        const localUserData = await getUserData();
        if (!user || !localUserData) { Alert.alert("Erreur", "Connectez-vous pour signaler."); return; }
        if (!itemName.trim() || !description.trim() || !locationFound.trim()) { Alert.alert("Erreur", "Nom, description, lieu requis."); return; }
        if (!db || !storage) { Alert.alert("Erreur", "Service indisponible."); return; }

        setIsSubmitting(true); setUploadProgress(0);
        let uploadedImageUrl: string | undefined = undefined;

        try {
            if (imageUri) {
                 uploadedImageUrl = await uploadImageAndGetURL(imageUri) ?? undefined; // Use undefined if null
                 if (!uploadedImageUrl && imageUri) throw new Error("Upload image échoué.");
            }
            const foundItemData = {
                itemName: itemName.trim(), description: description.trim(), locationFound: locationFound.trim(),
                // contactInfo: contactInfo.trim() || null, // Removed contact info field
                imageUrl: uploadedImageUrl ?? null, // Store URL or null
                userId: user.uid, reporterEmail: user.email, userFullName: localUserData.fullName || 'Anonyme',
                dateFound: serverTimestamp(), createdAt: serverTimestamp(), status: 'available',
            };
            const docRef = await addDoc(collection(db, "foundItems"), foundItemData);
            Alert.alert("Succès", "Objet signalé !", [{ text: "OK", onPress: () => router.back() }]);
             setItemName(''); setDescription(''); setLocationFound(''); setImageUri(null);
        } catch (error: any) { console.error("Report error:", error); Alert.alert("Erreur", `Signalement échoué.\n${error.message}`); }
        finally { setIsSubmitting(false); setUploadProgress(0); }
    };

    // --- Main Render ---
    return (
        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
                <Stack.Screen options={{ headerTitle: 'Signaler Objet Trouvé' }} />

                <View style={styles.formCard}>
                    <Text style={styles.title}>Décrivez l'objet trouvé</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nom de l'objet *</Text>
                        <TextInput style={styles.input} value={itemName} onChangeText={setItemName} placeholder="Ex: Clés USB, Carte étudiant..." placeholderTextColor={colors.placeholderText}/>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Couleur, marque, détails..." multiline numberOfLines={4} placeholderTextColor={colors.placeholderText}/>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Lieu où trouvé *</Text>
                        <TextInput style={styles.input} value={locationFound} onChangeText={setLocationFound} placeholder="Ex: Bibliothèque, Amphi B..." placeholderTextColor={colors.placeholderText}/>
                    </View>
                    {/* Removed Contact Info Field */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Photo (Optionnel)</Text>
                        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                           <Ionicons name="camera" size={20} color={colors.tint}/>
                           <Text style={styles.imagePickerText}>Choisir une image</Text>
                        </TouchableOpacity>
                        {imageUri && (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                                <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImageButton}>
                                     <Ionicons name="close-circle" size={24} color={colors.danger}/>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                   {/* Upload Progress */}
                   {isSubmitting && uploadProgress > 0 && uploadProgress < 1 && ( // Show only during actual upload
                       <View style={styles.progressContainer}>
                           <Text style={styles.progressText}>Upload: {(uploadProgress * 100).toFixed(0)}%</Text>
                           <View style={styles.progressBarBackground}><View style={[styles.progressBarFill, { width: `${uploadProgress * 100}%` }]} /></View>
                       </View>
                   )}
                   <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color="#fff"/> : <Text style={styles.submitButtonText}>Signaler l'Objet</Text>}
                   </TouchableOpacity>
                </View>
                 <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// --- Styles (getReportStyles - Keep as is, ensure colors passed) ---
const getReportStyles = (colorScheme: 'light' | 'dark', colors: typeof Colors.light | typeof Colors.dark) => { return StyleSheet.create({ container:{flex:1,backgroundColor:colors.background}, contentContainer:{padding:20}, title:{fontSize:24,fontWeight:'bold',color:colors.text,textAlign:'center',marginBottom:8}, subtitle:{fontSize:15,color:colors.textSecondary,textAlign:'center',marginBottom:30}, formCard:{backgroundColor:colors.cardBackground,borderRadius:12,padding:20,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.1,shadowRadius:5,elevation:3}, inputGroup:{marginBottom:18}, label:{fontSize:14,fontWeight:'500',color:colors.textSecondary,marginBottom:8,marginLeft:4}, input:{backgroundColor:colors.inputBackground,borderWidth:1.5,borderColor:colors.inputBorder,borderRadius:10,paddingHorizontal:15,paddingVertical:Platform.OS==='ios'?14:12,fontSize:16,color:colors.text}, textArea:{height:100,textAlignVertical:'top'}, noteText:{fontSize:12,color:colors.textSecondary+'A0',marginTop:5,marginLeft:4}, imagePickerButton:{flexDirection:'row',alignItems:'center',backgroundColor:colors.tint+'15',paddingVertical:12,paddingHorizontal:15,borderRadius:10,borderWidth:1,borderColor:colors.tint+'50'}, imagePickerText:{color:colors.tint,marginLeft:10,fontWeight:'500'}, imagePreviewContainer:{marginTop:15,alignItems:'center',position:'relative'}, imagePreview:{width:150,height:150,borderRadius:10,borderWidth:1,borderColor:colors.border}, removeImageButton:{position:'absolute',top:-10,right: Platform.OS==='ios'?'30%':'25%',backgroundColor:colors.cardBackground,borderRadius:15,padding:2}, progressContainer:{marginTop:10,marginBottom:5}, progressText:{fontSize:12,color:colors.textSecondary,textAlign:'center',marginBottom:3}, progressBarBackground:{height:6,backgroundColor:colors.border,borderRadius:3,overflow:'hidden'}, progressBarFill:{height:'100%',backgroundColor:colors.success,borderRadius:3}, submitButton:{backgroundColor:colors.success??'#16a34a',paddingVertical:16,borderRadius:12,alignItems:'center',marginTop:25}, submitButtonText:{color:'#fff',fontSize:16,fontWeight:'bold'}, buttonDisabled:{opacity:0.6}, placeholderText:{color:colors.placeholderText}, }); };

// --- Wrap with Guard ---
export default AuthGuard(ReportFoundScreenContent);