// File: scripts/populateFirestore.ts
import { db } from '../firebaseConfig'; // Use the @ alias as per tsconfig.json
import { collection, doc, setDoc } from 'firebase/firestore';
import { years, specialties } from '../data/data.cjs'; // Use the @ alias

const populateFirestore = async () => {
  try {
    // Check if db is initialized
    if (!db) {
      throw new Error("Firestore database is not initialized. Check firebaseConfig.ts.");
    }

    // Populate years collection
    console.log('Populating years collection...');
    for (const year of years) {
      await setDoc(doc(db, 'years', year.id), {
        name: year.name,
        order: year.order,
      });
      console.log(`Added year: ${year.id}`);
    }

    // Populate specialities collection
    console.log('Populating specialities collection...');
    for (const specialty of specialties) {
      await setDoc(doc(db, 'specialities', specialty.id), {
        name: specialty.name,
        yearId: specialty.yearId,
        campus: specialty.campus,
        icon: specialty.icon,
      });
      console.log(`Added specialty: ${specialty.id}`);
    }

    console.log('Firestore population completed successfully.');
  } catch (error) {
    console.error('Error populating Firestore:', error);
  }
};

// Run the script
populateFirestore();