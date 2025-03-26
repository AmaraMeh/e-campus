// File: scripts/generateSpecialtyScreens.js
const fs = require('fs');
const path = require('path');

// --- Data (Copy the 'coursesData' object from courses.tsx here) ---
const coursesData = {
  "1ère année": {
    'Campus El-Kseur': [
      { name: "Science et Technologie LMD", icon: "flask", link: "st-lmd" },
      { name: "Informatique LMD", icon: "laptop", link: "info-lmd" },
      { name: "Biologie", icon: "leaf", link: "biologie" },
      { name: "Mathématiques", icon: "calculator", link: "mathematiques" },
      { name: "Science de la matière", icon: "atom", link: "science-matiere" },
      { name: "Science et Technologie Ingénieur", icon: "cogs", link: "st-ing" },
      { name: "Informatique ING", icon: "desktop", link: "info-ing" },
      { name: "Architecture", icon: "building-o", link: "architecture" },
    ],
    'Campus Aboudaou': [
      { name: "Médecine", icon: "stethoscope", link: "medecine" },
      { name: "Pharmacie", icon: "pills", link: "pharmacie" },
      { name: "Droit", icon: "gavel", link: "droit" },
      { name: "SEGC", icon: "balance-scale", link: "segc" },
      { name: "Langue Française", icon: "language", link: "langue-francaise" },
      { name: "Langue Arabe", icon: "language", link: "langue-arabe" },
      { name: "Langue Tamazight", icon: "language", link: "langue-tamazight" },
      { name: "Langue Anglaise", icon: "language", link: "langue-anglaise" },
      { name: "Science Sociale", icon: "users", link: "science-sociale" },
      { name: "Traduction", icon: "exchange", link: "traduction" },
    ],
    'Campus Targa Ouzemour': [],
  },
  "2ème année": {
    'Campus Targa Ouzemour': [
        { name: "Génie des Procédés", icon: "industry", link: "gp-l2" },
        { name: "Automatique", icon: "robot", link: "auto-l2" },
        { name: "Exploitation des mines", icon: "bank", link: "mines-l2" },
        { name: "Génie Civil", icon: "building", link: "gc-l2" },
        { name: "Télécommunications", icon: "wifi", link: "telecom-l2" },
        { name: "Valorisation des ressources minérales", icon: "diamond", link: "vrm-l2" },
        { name: "Électronique", icon: "microchip", link: "electronique-l2" },
        { name: "Électrotechnique", icon: "bolt", link: "electrotech-l2" },
        { name: "Chimie", icon: "flask", link: "chimie-l2" },
        { name: "Physique", icon: "atom", link: "physique-l2" },
        { name: "Mathématiques appliquées", icon: "superscript", link: "maths-app-l2" },
        { name: "Informatique", icon: "laptop", link: "info-l2" },
        { name: "Sciences biologiques", icon: "heartbeat", link: "bio-sc-l2" },
        { name: "Ecologie et environnement", icon: "leaf", link: "eco-env-l2" },
        { name: "Sciences alimentaires", icon: "cutlery", link: "sc-alim-l2" },
        { name: "Biotechnologies", icon: "flask", link: "biotech-l2" },
        { name: "Hydrobiologie marine et continentale", icon: "tint", link: "hydrobio-l2" },
    ],
    'Campus El-Kseur': [],
    'Campus Aboudaou': [
         { name: "Langue et Littérature Française", icon: "language", link: "llf-l2" },
         { name: "Langue et Littérature Anglaise", icon: "language", link: "lla-l2" },
         { name: "Langue et Littérature Arabe", icon: "language", link: "llar-l2" },
         { name: "Économie", icon: "line-chart", link: "eco-l2"},
         { name: "Sciences Commerciales", icon: "shopping-cart", link: "sc-comm-l2"},
         { name: "Sciences de Gestion", icon: "briefcase", link: "sc-gestion-l2"},
    ],
  },
  "3ème année": {
    'Campus Targa Ouzemour': [
        { name: "Génie des Procédés", icon: "industry", link: "gp-l3" },
        { name: "Automatique", icon: "cogs", link: "auto-l3" },
        { name: "Exploitation des mines", icon: "bank", link: "mines-l3" },
        { name: "Génie Civil", icon: "building", link: "gc-l3" },
        { name: "Télécommunications", icon: "wifi", link: "telecom-l3" },
        { name: "Architecture", icon: "building-o", link: "archi-l3" },
        { name: "Électronique", icon: "microchip", link: "electronique-l3" },
        { name: "Électrotechnique", icon: "bolt", link: "electrotech-l3" },
        { name: "Informatique", icon: "laptop", link: "info-l3" },
        { name: "Biochimie", icon: "flask", link: "biochimie-l3" },
        { name: "Microbiologie", icon: "flask", link: "microbio-l3" },
        { name: "Physique Énergétique", icon:"fire", link:"phys-energ-l3"},
        { name: "Chimie Analytique", icon:"flask", link:"chimie-analy-l3"},
    ],
     'Campus Aboudaou': [
          { name: "Sciences Commerciales", icon: "shopping-cart", link: "sc-comm-l3"},
          { name: "Sciences de Gestion", icon: "briefcase", link: "sc-gestion-l3"},
     ],
     'Campus El-Kseur': [],
  },
   "Master 1 & 2": {
        'Campus Targa Ouzemour': [ { name: "Bientôt disponible", icon: "hourglass-half", link: "master-targa-soon"} ],
        'Campus Aboudaou': [ { name: "Bientôt disponible", icon: "hourglass-half", link: "master-aboudaou-soon"} ],
        'Campus El-Kseur': [ { name: "Bientôt disponible", icon: "hourglass-half", link: "master-elkseur-soon"} ],
    },
};
// --- End Data ---

// --- Template Content (Same as app/specialty/[specialtyId].tsx) ---
const templateContent = `
// File: app/specialty/[specialtyId].tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { universiteBejaiaData, Module } from '@/constants/Data'; // Adjust path
import { Colors } from '@/constants/Colors'; // Adjust path
import { useColorScheme } from '@/hooks/useColorScheme'; // Adjust path

// Helper function to find specialty details
const findSpecialtyDetails = (id: string | undefined | string[]) => {
    if (!id || typeof id !== 'string') return null;
    const yearKey = "1ere Année Licence"; // Adjust this if script generates for other years
    const yearData = universiteBejaiaData[yearKey];
    if (!yearData) return null;
    for (const specialtyName in yearData) {
        const linkId = specialtyName.toLowerCase().replace(/ /g, '-').replace(/[èéê]/g, 'e').replace(/[^a-z0-9-]/g, '');
         if (linkId === id.toLowerCase() || specialtyName.toLowerCase() === id.toLowerCase()) {
            return { name: specialtyName, semesters: yearData[specialtyName] || {} };
         }
    }
     // Add more sophisticated lookup across all years if needed
    return null;
};

export default function SpecialtyDetailScreen() {
  const { specialtyId } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const router = useRouter();
  const [specialtyName, setSpecialtyName] = useState<string>('Chargement...');
  const [semesters, setSemesters] = useState<Record<string, Module[]>>({});
  const [availableSemesterKeys, setAvailableSemesterKeys] = useState<string[]>([]);
  const [selectedSemesterKey, setSelectedSemesterKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const details = findSpecialtyDetails(specialtyId);
    if (details) {
      setSpecialtyName(details.name);
      setSemesters(details.semesters);
      const semesterKeys = Object.keys(details.semesters);
      setAvailableSemesterKeys(semesterKeys);
      if (semesterKeys.length > 0) setSelectedSemesterKey(semesterKeys[0]);
       else setSelectedSemesterKey(null);
    } else {
      setSpecialtyName('Spécialité Introuvable');
      setSemesters({});
      setAvailableSemesterKeys([]);
      setSelectedSemesterKey(null);
      Alert.alert("Erreur", "Détails de la spécialité non trouvés.");
      // router.back();
    }
    setIsLoading(false);
  }, [specialtyId]);

  const currentModules = useMemo(() => {
    return (selectedSemesterKey && semesters[selectedSemesterKey]) ? semesters[selectedSemesterKey] : [];
  }, [selectedSemesterKey, semesters]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const renderModuleCard = (module: Module, index: number) => (
     <View key={`${module.matiere}-${index}`} style={styles.moduleCard}>
         <Text style={styles.moduleTitle}>{module.matiere}</Text>
         <View style={styles.moduleInfoRow}>
             <Text style={styles.moduleInfoText}>Coef: {module.coefficient}</Text>
             <Text style={styles.moduleInfoText}>Crédits: {module.credits}</Text>
         </View>
         <View style={styles.moduleInfoRow}>
             <Text style={styles.moduleInfoLabel}>Évaluations:</Text>
             <Text style={styles.moduleInfoText}>{module.evaluations.join(', ')}</Text>
         </View>
         {module.noteEliminatoire && (
             <View style={styles.moduleInfoRow}>
                <Text style={[styles.moduleInfoLabel, styles.eliminationNote]}>Note Éliminatoire:</Text>
                <Text style={[styles.moduleInfoText, styles.eliminationNote]}>{module.noteEliminatoire}</Text>
             </View>
         )}
     </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: specialtyName }} />
      <Text style={styles.headerTitle}>{specialtyName}</Text>
      <Text style={styles.headerSubtitle}>Modules du Semestre</Text>

      {availableSemesterKeys.length > 1 && (
        <View style={styles.semesterSelector}>
          {availableSemesterKeys.map((semKey) => (
            <TouchableOpacity
              key={semKey}
              style={[styles.semesterButton, selectedSemesterKey === semKey && styles.semesterButtonActive]}
              onPress={() => setSelectedSemesterKey(semKey)}
            >
              <Text style={[styles.semesterButtonText, selectedSemesterKey === semKey && styles.semesterButtonTextActive]}>
                {semKey}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {availableSemesterKeys.length === 1 && selectedSemesterKey && (
            <Text style={styles.singleSemesterText}>{selectedSemesterKey}</Text>
        )}

      <View style={styles.moduleList}>
        {currentModules.length > 0 ? (
          currentModules.map(renderModuleCard)
        ) : selectedSemesterKey ? (
          <Text style={styles.infoText}>Aucun module trouvé pour {selectedSemesterKey}.</Text>
        ) : (
           <Text style={styles.infoText}>Sélectionnez un semestre.</Text>
        )}
      </View>
       <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// --- Styles --- (Copy the getStyles function from the template file here)
const getStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors[colorScheme].background },
    loadingText: { marginTop: 10, color: Colors[colorScheme].text },
    container: { flex: 1, backgroundColor: Colors[colorScheme].background },
    contentContainer: { padding: 20 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors[colorScheme].text, textAlign: 'center', marginBottom: 5 },
    headerSubtitle: { fontSize: 16, color: Colors[colorScheme].textSecondary ?? '#666', textAlign: 'center', marginBottom: 25 },
    semesterSelector: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30, backgroundColor: Colors[colorScheme].cardBackground ?? '#f0f0f0', borderRadius: 10, padding: 5, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    semesterButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginHorizontal: 5 },
    semesterButtonActive: { backgroundColor: Colors[colorScheme].tint, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
    semesterButtonText: { fontSize: 15, fontWeight: '600', color: Colors[colorScheme].textSecondary ?? '#555' },
    semesterButtonTextActive: { color: '#ffffff' },
    singleSemesterText: { fontSize: 18, fontWeight: '600', color: Colors[colorScheme].text, textAlign: 'center', marginBottom: 25, marginTop: 10 },
    moduleList: {},
    moduleCard: { backgroundColor: Colors[colorScheme].cardBackground ?? '#ffffff', borderRadius: 12, padding: 18, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2, borderLeftWidth: 4, borderLeftColor: Colors[colorScheme].tint },
    moduleTitle: { fontSize: 17, fontWeight: '600', color: Colors[colorScheme].text, marginBottom: 10 },
    moduleInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
    moduleInfoLabel: { fontSize: 13, fontWeight: '500', color: Colors[colorScheme].textSecondary ?? '#666', minWidth: 80 },
    moduleInfoText: { fontSize: 14, color: Colors[colorScheme].text, flexShrink: 1 },
    eliminationNote: { color: '#dc2626', fontWeight: '600' },
    infoText: { textAlign: 'center', color: Colors[colorScheme].textSecondary ?? '#777', marginTop: 30, fontSize: 15 },
});
`;
// --- End Template Content ---

const outputDir = path.join(__dirname, '..', 'app', 'specialty'); // Assumes script is in 'scripts' folder
const generatedFiles = new Set(); // To avoid duplicates if a link appears multiple times

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  console.log(`Creating directory: ${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
} else {
   console.log(`Output directory exists: ${outputDir}`);
}

console.log("Starting screen generation...");

// Iterate through the data
Object.keys(coursesData).forEach(year => {
  const campuses = coursesData[year];
  Object.keys(campuses).forEach(campus => {
    const specialties = campuses[campus];
    specialties.forEach(specialty => {
      const link = specialty.link;
      // Skip placeholder links
      if (!link || link.includes('-soon')) {
        console.log(`Skipping placeholder: ${specialty.name}`);
        return;
      }

      // Sanitize link to create a valid filename (though it should be simple already)
      const filename = `${link}.tsx`;
      const filePath = path.join(outputDir, filename);

      // Check if already generated
      if (generatedFiles.has(filename)) {
        return;
      }

      try {
        console.log(`Generating: ${filePath}`);
        fs.writeFileSync(filePath, templateContent, 'utf8');
        generatedFiles.add(filename);
      } catch (err) {
        console.error(`Error writing file ${filePath}:`, err);
      }
    });
  });
});

console.log(`\nFinished generating ${generatedFiles.size} specialty screen files in ${outputDir}.`);
console.log("Please check the generated files and adjust the data fetching logic inside the template if necessary (especially if supporting years other than 1st).");