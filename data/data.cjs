// File: data/data.cjs (or data.cts)
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.specialties = exports.years = void 0;

// --- Interfaces (Optional but good practice) ---
// interface Year { id: string; name: string; order: number; }
// interface Specialty { id: string; name: string; yearId: string; campus: string; icon: string; }

// --- Array Definitions ---
exports.years = [
    {
        id: '1ere-annee-licence',
        name: '1ère Année Licence',
        order: 1,
    },
    {
        id: '2eme-annee',
        name: '2ème année',
        order: 2,
    },
    {
        id: '3eme-annee',
        name: '3ème année',
        order: 3,
    },
    // { // Keep Master commented out unless you have data
    //   id: 'master-1--2',
    //   name: 'Master 1 & 2',
    //   order: 4,
    // },
];

exports.specialties = [
    // ==========================
    // == 1ère Année Licence ==
    // ==========================
    // --- Campus El-Kseur ---
    { id: 'st-lmd', name: 'Science et Technologie LMD', yearId: '1ere-annee-licence', campus: 'Campus El-Kseur', icon: 'flask' },
    { id: 'info-lmd', name: 'Informatique LMD', yearId: '1ere-annee-licence', campus: 'Campus El-Kseur', icon: 'laptop-code' },
    { id: 'biologie', name: 'Biologie', yearId: '1ere-annee-licence', campus: 'Campus El-Kseur', icon: 'dna' },
    { id: 'mathematiques', name: 'Mathématiques', yearId: '1ere-annee-licence', campus: 'Campus El-Kseur', icon: 'square-root-alt' },
    { id: 'science-matiere', name: 'Science de la matière', yearId: '1ere-annee-licence', campus: 'Campus El-Kseur', icon: 'atom' },
    { id: 'st-ing', name: 'Science et Technologie Ingénieur', yearId: '1ere-annee-licence', campus: 'Campus El-Kseur', icon: 'cogs' },
    { id: 'info-ing', name: 'Informatique ING', yearId: '1ere-annee-licence', campus: 'Campus El-Kseur', icon: 'desktop' },
    { id: 'architecture', name: 'Architecture', yearId: '1ere-annee-licence', campus: 'Campus El-Kseur', icon: 'building' },
    // --- Campus Aboudaou ---
    { id: 'medecine', name: 'Médecine', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'stethoscope' },
    { id: 'pharmacie', name: 'Pharmacie', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'pills' },
    { id: 'droit', name: 'Droit', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'gavel' },
    { id: 'segc', name: 'SEGC', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'balance-scale' },
    { id: 'langue-francaise', name: 'Langue Française', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'language' },
    { id: 'langue-arabe', name: 'Langue Arabe', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'language' },
    { id: 'langue-tamazight', name: 'Langue Tamazight', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'language' },
    { id: 'langue-anglaise', name: 'Langue Anglaise', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'language' },
    { id: 'science-sociale', name: 'Science Sociale', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'users' },
    { id: 'traduction', name: 'Traduction', yearId: '1ere-annee-licence', campus: 'Campus Aboudaou', icon: 'exchange-alt' },

    // ===================
    // == 2ème année ==
    // ===================
    // --- Campus Targa Ouzemour ---
    { id: 'gp-l2', name: 'Génie des Procédés', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'industry' },
    { id: 'auto-l2', name: 'Automatique', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'robot' },
    { id: 'mines-l2', name: 'Exploitation des mines', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'mountain' },
    { id: 'gc-l2', name: 'Génie Civil', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'building' },
    { id: 'telecom-l2', name: 'Télécommunications', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'wifi' },
    { id: 'vrm-l2', name: 'Valorisation des ressources minérales', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'gem' },
    { id: 'electronique-l2', name: 'Électronique', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'microchip' },
    { id: 'gdm-l2', name: 'Génie des matériaux', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'cube' },
    { id: 'mi-l2', name: 'Maintenance industrielle', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'toolbox' },
    { id: 'electromeca-l2', name: 'Électromécanique', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'cog' },
    { id: 'cm-l2', name: 'Construction mécanique', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'wrench' },
    { id: 'electrotech-l2', name: 'Électrotechnique', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'bolt' },
    { id: 'energ-l2', name: 'Énergétique', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'fire' },
    { id: 'chimie-l2', name: 'Chimie', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'flask' },
    { id: 'physique-l2', name: 'Physique', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'atom' },
    { id: 'maths-app-l2', name: 'Mathématiques appliquées', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'square-root-alt' },
    { id: 'info-l2', name: 'Informatique', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'laptop-code' },
    { id: 'bio-sc-l2', name: 'Sciences biologiques', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'dna' },
    { id: 'eco-env-l2', name: 'Ecologie et environnement', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'leaf' },
    { id: 'sc-alim-l2', name: 'Sciences alimentaires', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'apple-alt' },
    { id: 'biotech-l2', name: 'Biotechnologies', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'dna' },
    { id: 'hydrobio-l2', name: 'Hydrobiologie marine et continentale', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'water' },
    { id: 'chimie-fond-l2', name: 'Chimie fondamentale', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'flask' },
    { id: 'physique-fond-l2', name: 'Physique fondamentale', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'atom' },
    { id: 'maths-stats-l2', name: 'Mathématiques Statistiques et traitement informatique des données', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'square-root-alt' },
    { id: 'sys-info-l2', name: 'Systèmes informatiques', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'laptop-code' },
    { id: 'biochimie-l2', name: 'Biochimie', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'dna' },
    { id: 'microbio-l2', name: 'Microbiologie', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'dna' },
    { id: 'bio-physio-anim-l2', name: 'Biologie et physiologie animale', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'dna' },
    { id: 'bio-physio-veg-l2', name: 'Biologie et physiologie végétale', yearId: '2eme-annee', campus: 'Campus Targa Ouzemour', icon: 'dna' },
    // --- Campus Aboudaou ---
    { id: 'llf-l2', name: 'Langue et Littérature Française', yearId: '2eme-annee', campus: 'Campus Aboudaou', icon: 'language' },
    { id: 'lla-l2', name: 'Langue et Littérature Anglaise', yearId: '2eme-annee', campus: 'Campus Aboudaou', icon: 'language' },
    { id: 'llar-l2', name: 'Langue et Littérature Arabe', yearId: '2eme-annee', campus: 'Campus Aboudaou', icon: 'language' },
    { id: 'eco-l2', name: 'Économie', yearId: '2eme-annee', campus: 'Campus Aboudaou', icon: 'line-chart' },
    { id: 'sc-comm-l2', name: 'Sciences Commerciales', yearId: '2eme-annee', campus: 'Campus Aboudaou', icon: 'shopping-cart' },
    { id: 'sc-gestion-l2', name: 'Sciences de Gestion', yearId: '2eme-annee', campus: 'Campus Aboudaou', icon: 'briefcase' },

    // ===================
    // == 3ème année ==
    // ===================
    // --- Campus Targa Ouzemour ---
    { id: 'gp-l3', name: 'Génie des Procédés', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'industry' },
    { id: 'auto-l3', name: 'Automatique', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'robot' },
    { id: 'mines-l3', name: 'Exploitation des mines', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'mountain' },
    { id: 'gc-l3', name: 'Génie Civil', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'building' },
    { id: 'telecom-l3', name: 'Télécommunications', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'wifi' },
    // { id: 'architecture-l3', name: 'Architecture', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'building' }, // Duplicate ID, adjust if needed
    { id: 'electronique-l3', name: 'Électronique', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'microchip' },
    { id: 'electrotech-l3', name: 'Électrotechnique', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'bolt' },
    { id: 'info-l3', name: 'Informatique', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'laptop-code' },
    { id: 'biochimie-l3', name: 'Biochimie', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'dna' },
    { id: 'microbio-l3', name: 'Microbiologie', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'dna' },
    { id: 'phys-energ-l3', name: 'Physique Énergétique', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'fire' },
    { id: 'chimie-analy-l3', name: 'Chimie Analytique', yearId: '3eme-annee', campus: 'Campus Targa Ouzemour', icon: 'flask' },
    // --- Campus Aboudaou ---
    { id: 'sc-comm-l3', name: 'Sciences Commerciales', yearId: '3eme-annee', campus: 'Campus Aboudaou', icon: 'shopping-cart' },
    { id: 'sc-gestion-l3', name: 'Sciences de Gestion', yearId: '3eme-annee', campus: 'Campus Aboudaou', icon: 'briefcase' },
];

// DO NOT ADD module.exports if file ends with .cjs/.cts and has exports.years = ...