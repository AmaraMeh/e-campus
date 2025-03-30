// scripts/migrateData.js
const admin = require('firebase-admin');
// --- Import the NEW data structure ---
const { years, specialties } = require('../data/data.cjs'); // Adjust path to your new data.ts
// --- REMOVE old imports/helpers if they were specific to the old structure ---
// const { universiteBejaiaData } = require('../constants/Data'); // REMOVED
// const { generateLinkFromName, getIconForSpecialty, getSemesterIdPart } = require('./helpers'); // REMOVED (IDs/icons are in the new data)

// --- Firebase Admin SDK Initialization (Keep your preferred method) ---
// Option 1: Environment Variable (Recommended)
// export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/firebase-service-account.json"
// admin.initializeApp();

// Option 2: Explicit File Path (Easier for local dev)
const serviceAccount = require('../firebase-service-account.json'); // Adjust path
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
// ---

const db = admin.firestore();
const BATCH_SIZE = 400; // Firestore batch write limit is 500

async function migrateNewData() {
    console.log('Starting Firestore data migration from data/data.ts...');
    let batch = db.batch();
    let operationCount = 0;
    const addedDocIds = new Set(); // Keep track of added docs to avoid duplicates if script runs again

    try {
        // --- Migrate Years ---
        console.log(`\nProcessing ${years.length} Years...`);
        for (const year of years) {
            if (!year || !year.id || !year.name) {
                console.warn(`  Skipping invalid year data:`, year);
                continue;
            }
            if (addedDocIds.has(`years/${year.id}`)) continue; // Skip if already added in this run

            const yearRef = db.collection('years').doc(year.id);
            // Ensure order is a number, provide default if missing
            const order = typeof year.order === 'number' ? year.order : 99;
            batch.set(yearRef, {
                name: year.name,
                order: order
            });
            operationCount++;
            addedDocIds.add(`years/${year.id}`);
            console.log(`  Prepared Year: ${year.name} (ID: ${year.id})`);

            if (operationCount >= BATCH_SIZE) { await commitBatch("Years"); }
        }
        await commitBatch("Years (Final)"); // Commit remaining years

        // --- Migrate Specialties ---
        console.log(`\nProcessing ${specialties.length} Specialties...`);
        for (const specialty of specialties) {
             if (!specialty || !specialty.id || !specialty.name || !specialty.yearId || !specialty.campus || !specialty.icon) {
                console.warn(`  Skipping invalid specialty data:`, specialty);
                continue;
            }
            if (addedDocIds.has(`specialties/${specialty.id}`)) continue;

            const specialtyRef = db.collection('specialties').doc(specialty.id);
            batch.set(specialtyRef, {
                name: specialty.name,
                yearId: specialty.yearId, // Link to year document ID
                campus: specialty.campus,
                icon: specialty.icon
            });
            operationCount++;
            addedDocIds.add(`specialties/${specialty.id}`);
            console.log(`  Prepared Specialty: ${specialty.name} (ID: ${specialty.id})`);

            if (operationCount >= BATCH_SIZE) { await commitBatch("Specialties"); }
        }
        await commitBatch("Specialties (Final)"); // Commit remaining specialties

        // --- !! IMPORTANT !! ---
        // --- Modules & Resources Migration ---
        // This script currently ONLY migrates 'years' and 'specialties' from your new data.ts.
        // It DOES NOT migrate 'modules' or 'resources' because that data is *not* present
        // in the new data.ts file you provided.
        // You will need to either:
        //    A) Add module and resource data to your new data.ts (similar structure to years/specialties arrays).
        //    B) OR Re-run the *previous* migration script (the one using universiteBejaiaData)
        //       *after* this script runs, specifically targeting only the modules and resources parts.
        //       (This would require modifying that old script to skip years/specialties).
        console.warn("\nIMPORTANT: This script only migrated 'years' and 'specialties'.");
        console.warn("Modules and Resources were NOT migrated from the new 'data/data.ts' structure.");

        console.log('\nYear and Specialty migration completed successfully!');

    } catch (error) {
        console.error('\nError during data migration:', error);
    }

    // Helper function to commit batches
    async function commitBatch(batchName = "Operations") {
        if (operationCount > 0) {
            console.log(`\nCommitting batch of ${operationCount} ${batchName}...`);
            await batch.commit();
            console.log('Batch committed.');
            batch = db.batch(); // Start a new batch
            operationCount = 0;
        }
    }
}

// Run the migration
migrateNewData();