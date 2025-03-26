// File: constants/Data.ts

export interface Resource {
    id: string; // Unique ID across all resources (e.g., 'info-lmd_s2_algebra-2_td_1')
    title: string; // Display name (e.g., "TD 1", "Chapitre 2", "Examen 2024")
    url: string; // The Google Drive link (or other URL)
    source?: 'bejaia' | 'autres'; // Optional: Origin
    isRecommended?: boolean; // Optional: Mark as recommended
  }
  
  // Make resource types optional within the resources object
  export interface Resources {
    cours?: Resource[];
    td?: Resource[];
    tp?: Resource[];
    examen?: Resource[];
  }
  
  export interface Module {
    matiere: string;
    module?: string; // Grouping like UEF 1.1
    coefficient: number;
    credits: number;
    evaluations: Array<"TD" | "TP" | "Examen">;
    noteEliminatoire?: number;
    resources?: Resources; // Use the updated Resources type
  }
  
  export interface Semester {
    [semesterName: string]: Module[];
  }
  
  export interface Specialty {
    [specialtyName: string]: Semester;
  }
  
  export interface YearData {
    [yearName: string]: Specialty;
  }
  
  // --- Data Object ---
  // NOTE: Added EXAMPLE resource data ONLY for Informatique LMD - Semestre 2.
  // You MUST populate the 'resources' property for all other modules manually.
  const universiteBejaiaData: YearData = {
    "1ere Année Licence": {
      // --- Science et Technologie LMD ---
      "Science et Technologie LMD": {
        "Semestre 1": [
            { matiere: "Mathématique 1", module: "UEF 1.1", coefficient: 3, credits: 6, evaluations: ["TD", "Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "Physique 1", module: "UEF 1.1", coefficient: 3, credits: 6, evaluations: ["TD", "Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "Chimie 1", module: "UEF 1.1", coefficient: 3, credits: 6, evaluations: ["TD", "Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "Informatique 1", module: "UEM 1.1", coefficient: 2, credits: 4, evaluations: ["TD", "Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "TP Physique 1", module: "UEM 1.1", coefficient: 1, credits: 2, evaluations: ["TP"], resources: { /* TODO: Add resources */ } },
            { matiere: "TP Chimie 1", module: "UEM 1.1", coefficient: 1, credits: 2, evaluations: ["TP"], resources: { /* TODO: Add resources */ } },
            { matiere: "MST", module: "UED 1.1", coefficient: 1, credits: 1, evaluations: ["Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "Langue Anglaise", module: "UET 1.1", coefficient: 1, credits: 1, evaluations: ["Examen"], resources: { /* TODO: Add resources */ } },
        ],
        "Semestre 2": [
            { matiere: "Mathématique 2", module: "UEF 1.2", coefficient: 3, credits: 6, evaluations: ["TD", "Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "Physique 2", module: "UEF 1.2", coefficient: 3, credits: 6, evaluations: ["TD", "Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "Thermodynamique", module: "UEF 1.2", coefficient: 3, credits: 6, evaluations: ["TD", "Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "Informatique 2", module: "UEM 1.2", coefficient: 2, credits: 4, evaluations: ["TD", "Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "TP Physique 2", module: "UEM 1.2", coefficient: 1, credits: 2, evaluations: ["TP"], resources: { /* TODO: Add resources */ } },
            { matiere: "TP Chimie 2", module: "UEM 1.2", coefficient: 1, credits: 2, evaluations: ["TP"], resources: { /* TODO: Add resources */ } },
            { matiere: "Méthodologie de la présentation", module: "UED 1.2", coefficient: 1, credits: 1, evaluations: ["Examen"], resources: { /* TODO: Add resources */ } },
            { matiere: "Langue étrangère 2 (français et/ou anglais)", module: "UET 1.2", coefficient: 2, credits: 2, evaluations: ["Examen"], resources: { /* TODO: Add resources */ } }
        ]
      }, // <-- Added comma
  
      // --- Informatique LMD ---
      "Informatique LMD": {
        "Semestre 1": [
          { matiere: "Analyse 1", module: "UE Fondamentale 1", coefficient: 4, credits: 6, evaluations: ['TD', 'Examen'], resources: { /* TODO: Add resources */ } },
          { matiere: "Algèbre 1", module: "UE Fondamentale 1", coefficient: 3, credits: 5, evaluations: ['TD', 'Examen'], resources: { /* TODO: Add resources */ } },
          { matiere: "Algorithmes et Structure de Données 1", module: "UE Fondamentale 2", coefficient: 4, credits: 6, evaluations: ['TD', 'TP', 'Examen'], resources: { /* TODO: Add resources */ } },
          { matiere: "Structure Machine 1", module: "UE Fondamentale 2", coefficient: 3, credits: 5, evaluations: ['TD', 'Examen'], resources: { /* TODO: Add resources */ } },
          { matiere: "Terminologie Scientifique et expression écrite", module: "UE Méthodologie", coefficient: 1, credits: 2, evaluations: ['Examen'], resources: { /* TODO: Add resources */ } },
          { matiere: "Langue étrangère 1", module: "UE Méthodologie", coefficient: 1, credits: 2, evaluations: ['Examen'], resources: { /* TODO: Add resources */ } },
        ],
        "Semestre 2": [
          { // --- Analyse 2 ---
            matiere: "Analyse 2", coefficient: 4, credits: 6, evaluations: ['TD', 'Examen'],
            resources: {
              cours: [ { id: 'info-lmd_s2_analyse-2_c_1', title: 'Tous les cours', url: 'https://drive.google.com/file/d/15xe6R8dT1mYnzgLZif_upE1aiTtP02hw/view?usp=drive_link', source: 'bejaia' } ],
              td: [
                { id: 'info-lmd_s2_analyse-2_td_1', title: 'TD 1', url: 'https://drive.google.com/file/d/19PwWxjou6rIpheyfUGp6Tiqz6iXAkFyS/view?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_td_2', title: 'TD 2', url: 'https://drive.google.com/file/d/1ZnewSF4VvezkCUj2IX2QBDM89QusjaA-/view?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_td_1c', title: 'Corrigé TD 1', url: 'https://drive.google.com/drive/folders/19h2iPu5JGaeVb_pRlwC-LkD2aYiSfkpH?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_td_2c', title: 'Corrigé TD 2', url: 'https://drive.google.com/drive/folders/1suA0BbVbW_4tvA1Gj1H5AZKhlMnx_Yx-?usp=drive_link', source: 'bejaia' },
              ],
              examen: [
                { id: 'info-lmd_s2_analyse-2_ex_1', title: 'Examen 2012', url: 'https://drive.google.com/file/d/1IJ1JjvEAzGSy9QD8PLZ5r2AOa-YqqbUM/view?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_ex_2', title: 'Examen 2015', url: 'https://drive.google.com/file/d/1BGELjBjVWJqTGSshKweUvOVzOLd36g4z/view?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_ex_3', title: 'Examen 2017', url: 'https://drive.google.com/file/d/1_CU03uUEee6j5EMML2vGvTfARP55Rj7U/view?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_ex_4', title: 'Examen 2018', url: 'https://drive.google.com/file/d/1vIrRPGw06vs9LoYGX1hKM2GVHeP7maPB/view?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_ex_5', title: 'Examen 2019', url: 'https://drive.google.com/file/d/1xkV_tf1GAgIFgFh43L_SfSsMZEshPfsZ/view?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_ex_6', title: 'Examen 2021', url: 'https://drive.google.com/file/d/1TBJPefPCUHYdsjzuB6OYEa5B7eKNVK5h/view?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_ex_7', title: 'Examen 2023', url: 'https://drive.google.com/file/d/1YCNLgcNcwSKR4pE0ZX3ZpYNEAVqdNEgV/view?usp=drive_link', source: 'bejaia' },
                { id: 'info-lmd_s2_analyse-2_ex_8', title: 'Examen 2024', url: 'https://drive.google.com/file/d/1n8gw7a-qz_Jk2cOkKsfEqE1UjJYjdYMA/view?usp=drive_link', source: 'bejaia' },
              ],
            }
          }, // <-- Added comma
  
          { // --- Algèbre 2 ---
            matiere: "Algèbre 2", coefficient: 3, credits: 5, evaluations: ["TD", "Examen"],
            resources: {
              cours: [ { id: 'info-lmd_s2_algebre-2_c_1', title: "Chapitre 1", url: "https://drive.google.com/file/d/1ZMrIavkD56-l9I9fymkzr10ngIalKr4t/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_algebre-2_c_2', title: "Chapitre 2", url: "https://drive.google.com/file/d/1msQ9Aks8oeUZKHWh4lZpe9UMAysJotBU/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_algebre-2_c_3', title: "Chapitre 3", url: "https://drive.google.com/file/d/15RWypRogyfurlE3URSVBWrSuExyBqVEK/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_algebre-2_c_4', title: "Chapitre 4", url: "https://drive.google.com/file/d/1JMQjgnqnPCAgbksZW3jR_vNgLGp9UgtX/view?usp=drive_link", source: 'bejaia'} ],
              td: [ { id: 'info-lmd_s2_algebre-2_td_1', title: "TD 1", url: "https://drive.google.com/file/d/1aj7zmLWtUeiJ-qi-CKe7Vim8Um8EK2zk/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_algebre-2_td_2', title: "TD 2", url: "https://drive.google.com/file/d/1hjRrls_f0iAbxXmrsGNfaGeeO6965yAh/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_algebre-2_td_3', title: "TD 3", url: "https://drive.google.com/file/d/18dcdxpk1mySymkSLK5nSh8Yz2Y_Iu_c9/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_algebre-2_td_1c', title: "Corrigé TD 1", url: "https://drive.google.com/drive/folders/1zPs6eWPC7WntXctVm5DTBrSNo4gYsmyX?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_algebre-2_td_2c', title: "Corrigé TD 2", url: "https://drive.google.com/drive/folders/1ccLVrWtYrNBgPjsOSQqBwsONYf4oCJb2?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_algebre-2_td_3c', title: "Corrigé TD 3", url: "https://drive.google.com/drive/folders/11hgi_jlD_YAuAXCkKcrNgRWBLU9TFPho?usp=drive_link", source: 'bejaia'} ],
              examen: [ { id: 'info-lmd_s2_algebre-2_ex_1', title: "Examen 2022+2019 + corrigé", url: "https://drive.google.com/file/d/16wRZ6sNzm_bEd2H4diyDgicxPXn6kJ02/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_algebre-2_ex_2', title: "Examen 2024 avec corrigé", url: "https://drive.google.com/file/d/1FILlMsmVEFVUvFcY0U5kBKmvYvl_lml1/view?usp=drive_link", source: 'bejaia'} ]
            }
          }, // <-- Added comma
  
          { // --- Algorithmique et Structure de Données 2 ---
            matiere: "Algorithmique et Structure de Données 2", coefficient: 4, credits: 6, evaluations: ["TD", "TP", "Examen"],
            resources: {
               cours: [ { id: 'info-lmd_s2_asd2-c5', title: "Chapitre 5", url: "https://drive.google.com/file/d/1T4UJNVt5dIa71sUB03G9gR3KSXaa4Oix/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-c6', title: "Chapitre 6", url: "https://drive.google.com/file/d/1QxJykkxdMJjTxWxGDrVcFhaUUUdNupbE/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-c7', title: "Chapitre 7", url: "https://drive.google.com/file/d/1jhHgkDiJfw3Uki_KU212emWKbor1B3wN/view?usp=drive_link", source: 'bejaia'} ],
               td: [ { id: 'info-lmd_s2_asd2-td5', title: "TD 5", url: "https://drive.google.com/file/d/1RNIAzcsNDGdDBdO1paxEBkr-aLpQLAOw/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-td5c', title: "Corrigé TD 5", url: "https://drive.google.com/file/d/1JlRh5P1WWSh_iAyTMPDNVBFsmIP2epuK/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-td6', title: "TD 6", url: "https://drive.google.com/file/d/1-mTk2OP74NTGDYGvTlW8PbzlsoO0uCeL/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-td6c', title: "Corrigé TD 6", url: "https://drive.google.com/file/d/1XnX7XPaJ7s12c_Xdo66sqJ8bR5_6ygwU/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-td7', title: "TD 7", url: "https://drive.google.com/file/d/1b5IwEaU2fpMzaksmN-M4ygatQLwGUy8j/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-td7c', title: "Corrigé TD 7", url: "https://drive.google.com/file/d/1m0S8FSEUh3kHxii2OJHJ2YUzK7wD3lnY/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-interro', title: "Interro (TD)", url: "https://drive.google.com/file/d/1NU1Yc7nSFnv-HaXBg70AI9k4mTrzNoUT/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-interroc', title: "Corrigé Interro", url: "https://drive.google.com/file/d/1iUaUtuSMImCRopwWuxXoePMogcMraZZl/view?usp=drive_link", source: 'bejaia'} ],
               tp: [ { id: 'info-lmd_s2_asd2-tp5', title: "TP 5", url: "https://drive.google.com/file/d/1KKKvf8PXAEwj8hQ4oPM3PcMOjggYNJ88/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-tp6', title: "TP 6", url: "https://drive.google.com/file/d/1tZjYh4QCd_-_TQhlCUTx04alr7eVoor_/view?usp=drive_link", source: 'bejaia'} ],
               examen: [ { id: 'info-lmd_s2_asd2-ex1', title: "Examen 2016 part 1", url: "https://drive.google.com/file/d/1jJMoN3IonMMewZVI5VKWTUAVe70g4XbF/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-ex2', title: "Examen 2016 part 2", url: "https://drive.google.com/file/d/15_oYRdvcdeYJHRTtETv-q1_msiw1i6RW/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-ex1c', title: "Corrigé 2016", url: "https://drive.google.com/file/d/1VCM_WVRHpx7OSuS6bJoO0yYURaz3amvh/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_asd2-ex3', title: "Examen 2017", url: "https://drive.google.com/file/d/1CAv5Sad1HqRm5-Lhlrs1BH8ydNO8ZP0c/view?usp=drive_link", source: 'bejaia'} ]
             }
          }, // <-- Added comma
  
          { // --- Probabilités et Statistiques ---
              matiere: "Probabilités et Statistiques", coefficient: 2, credits: 4, evaluations: ["TD", "Examen"],
               resources: {
                   cours: [ { id: 'info-lmd_s2_proba-c1', title: "Cours 1+2+3", url: "https://drive.google.com/file/d/1DSdzzrXNQh2fiqU9nOrt5x42em2je_2C/view?usp=drive_link", source: 'bejaia'} ],
                   td: [ { id: 'info-lmd_s2_proba-td3', title: "TD 3", url: "https://drive.google.com/file/d/1-jRgyHwS7CjQmGDVSugFLTt4hnq6DdxJ/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_proba-td4', title: "TD 4", url: "https://drive.google.com/file/d/1PvrUjxffY9-te9dmhtpsLxewt5yb4_Km/view?usp=drive_link", source: 'bejaia'} ],
                   examen: [ { id: 'info-lmd_s2_proba-ex1c', title: "Examen 2018 + corriger", url: "https://drive.google.com/file/d/1QH2pv0ZxTwota8Gb7awCoo1mOoWrge4T/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_proba-ex2', title: "Examen 2023", url: "https://drive.google.com/file/d/1GWu4351k8zWUBuFaysPkmIDk-29xACih/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_proba-ex3', title: "Examen 2024", url: "https://drive.google.com/file/d/14zneFVZoWuJ_0Xq95OeIJEN5eRmj5yvb/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_proba-int1c', title: "Intero 1 + corriger", url: "https://drive.google.com/file/d/1SnWzm7JVqU2DWrO5kfohmwLN9yKfhNqm/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_proba-int2', title: "Intero 2", url: "https://drive.google.com/file/d/1dCDHKa_AHPLRSAiR-5iNM89MOfIZjeCL/view?usp=drive_link", source: 'bejaia'} ]
               }
          }, // <-- Added comma
  
          { // --- Structure Machine 2 ---
              matiere: "Structure Machine 2", coefficient: 3, credits: 5, evaluations: ["TD", "Examen"],
              resources: {
                  cours: [ { id: 'info-lmd_s2_sm2-c1', title: "Cours complet", url: "https://drive.google.com/file/d/1UjYu7gH_BGJ_R28X_DTRvw1UzjrnnrrJ/view?usp=drive_link", source: 'bejaia'} ],
                  td: [ { id: 'info-lmd_s2_sm2-td1', title: "TD 1", url: "https://drive.google.com/file/d/1wk7sZehHG7FHJimeNROKKJPOkZlAdkZv/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_sm2-td2', title: "TD 2", url: "https://drive.google.com/file/d/11r6qWOmJlQe10bMeBgP_nOj3W7JbjYR-/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_sm2-td1c', title: "Corriger TD 1", url: "https://drive.google.com/drive/folders/1KJM5UXMKBEwwiIBaLBS19ywJtP1u6nYw?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_sm2-td2c', title: "Corriger TD 2", url: "https://drive.google.com/drive/folders/1NuVa_P15XSM0RT2ztONCguX8DFEVsKkG?usp=drive_link", source: 'bejaia'} ],
                  examen: [ { id: 'info-lmd_s2_sm2-ex1c', title: "Examen 2023 + corriger", url: "https://drive.google.com/file/d/1l1NMvWkOOks9NfNnJ3uyjDZbBjy7tLcX/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_sm2-ex2c', title: "Examen 2024 + corriger", url: "https://drive.google.com/file/d/1SWAXs0LFRTS1BMbuL9qZUTPuder3GaPy/view?usp=drive_link", source: 'bejaia'} ]
              }
          }, // <-- Added comma
  
           { // --- Electricité ---
               matiere: "Électricité", coefficient: 0, credits: 0, evaluations: [], // Placeholder
               resources: {
                   cours: [ { id: 'info-lmd_s2_elec-c1', title: "Résumé 1", url: "https://drive.google.com/file/d/1Oco7rjdO0WcN3R8bRZM34nDYPmYAr_EY/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-c2', title: "Résumé 2", url: "https://drive.google.com/file/d/1GE2rdXjAz8DXYk2hVP53fCC39_FcNZgF/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-c3', title: "Chapitre 1", url: "https://drive.google.com/file/d/1P8_xutz_REgenhv0G-RfvbbRC-V5eGKE/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-c4', title: "Chapitre 2", url: "https://drive.google.com/file/d/1KxmE_k_fL_LuCMsErRv51wJCTIMp5WQy/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-c5', title: "Chapitre 3", url: "https://drive.google.com/file/d/1kWx4fTQ6HI3RcVPKUdDtLdWwbBq6mPIl/view?usp=drive_link", source: 'bejaia'} ],
                   td: [ { id: 'info-lmd_s2_elec-td1', title: "TD 1", url: "https://drive.google.com/file/d/1pqkjdvJ2Eoho76kmwKbyNw6k1hPHnVc7/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-td1c', title: "Corriger TD 1", url: "https://drive.google.com/drive/folders/1wgcBT5MmsVrz12U6odiPuBWSn1GCuNn4?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-td2', title: "TD 2", url: "https://drive.google.com/file/d/1pf5Au8iKg6vVKtmk6sZO_HcPnjElDIh2/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-td2c', title: "Corriger TD 2", url: "https://drive.google.com/drive/folders/1wsPZ7iKogfpoK1LrXIwDycnQDFZJlVQF?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-td3', title: "TD 3", url: "https://drive.google.com/file/d/1lpcb11dXF2PLacsq9vZJPZ_Zk-rDC1jD/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-td3c', title: "Corriger TD 3", url: "https://drive.google.com/drive/folders/1vl7ZXqaf4PjMxj70HH5NG_cLyxqBhABc?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-td4', title: "TD 4", url: "https://drive.google.com/file/d/18mbB5-9H4r8B6kyoFQGRN_NIyIFed8KW/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_elec-td4c', title: "Corriger TD 4", url: "https://drive.google.com/drive/folders/1FUDRl_wZ1CPccqUuQptZ1V2I_guSkU2o?usp=drive_link", source: 'bejaia'} ],
               }
           }, // <-- Added comma
  
           { // --- MATLAB ---
               matiere: "MATLAB", coefficient: 0, credits: 0, evaluations: [], // Placeholder
               resources: {
                   cours: [ { id: 'info-lmd_s2_matlab-c1', title: "Tous les cours", url: "https://drive.google.com/file/d/1f-qnkDXLvFturme2BxPZQsL5IoI9NE7C/view?usp=drive_link", source: 'bejaia'} ],
                   tp: [ { id: 'info-lmd_s2_matlab-tp1', title: "TP 1", url: "https://drive.google.com/file/d/1yjzKGM-6t1pQd2ixwgV2I6qaGTDOy6Lj/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-tp2', title: "TP 2", url: "https://drive.google.com/file/d/1Pd5z6pSrHc4GxcA42VovOwyzW-OHFVZ2/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-tp2c', title: "Corrigé TP 2", url: "https://drive.google.com/drive/folders/1qhB--5muDT04pMGQHlQoL2_f4P7qEYHs?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-tp3', title: "TP 3", url: "https://drive.google.com/file/d/1A-zJSVc4XxHyZSMXCs0x8ccye_VMguTS/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-tp3c', title: "Corrigé TP 3", url: "https://drive.google.com/drive/folders/14e6z0mg2mwMzFk8bkO_oyCHPNPYGI-Gc?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-tp4', title: "TP 4", url: "https://drive.google.com/file/d/1tdL8jNmMEeZFFdfE4B0FMiYXDxqP3QYq/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-tp4c', title: "Corrigé TP 4", url: "https://drive.google.com/drive/folders/18RwjVcU8ar_lDyZgJyqYDuNl7Owt76th?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-tp5', title: "TP 5", url: "https://drive.google.com/file/d/15ObeR545Sydtq6nZkCSWWXy68ok32WaH/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-tp5c', title: "Corrigé TP 5", url: "https://drive.google.com/drive/folders/1MOysR2whFuu_MUVTREdUjtwIr6xjtqcR?usp=drive_link", source: 'bejaia'} ],
                   examen: [ { id: 'info-lmd_s2_matlab-test1', title: "Test 1 (TD)", url: "https://drive.google.com/file/d/1_UXjKippa9PRPWtzYFc0jyek7y_BeGyw/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-test2', title: "Test 2", url: "https://drive.google.com/file/d/16_cHHElg551Wq199UzZ4m-U8Q4X4gyyW/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-test3', title: "Test 3", url: "https://drive.google.com/file/d/1Be0sXqrITCos2T2xRmO3oYbw7Gy_1g7O/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-test4', title: "Test 4", url: "https://drive.google.com/file/d/1s8vgQoPijherofCi8BzYX9TEjq-9Xi13/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-test5', title: "Test 5", url: "https://drive.google.com/file/d/1Ltq3JvTF3dJQz7xzmzlF31MSNrh1A88R/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-test6', title: "Test 6", url: "https://drive.google.com/file/d/1_v5fSXvD9q7Grg_pWvI6Lh2g63AoqorZ/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-testc', title: "Corrigés tests 1-6", url: "https://drive.google.com/drive/folders/1IBLGECQzQccrl8SsOqNuYt2SiYU8uLZx?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-ex1c', title: "Examen 2023 + corrigé", url: "https://drive.google.com/file/d/1hG79hC8Yg51nIya8KTCDMB8sQQac1jOt/view?usp=drive_link", source: 'bejaia'}, { id: 'info-lmd_s2_matlab-ex2c', title: "Examen 2024 + corrigé", url: "https://drive.google.com/file/d/1XQi2llgaz5ZUtUcoDXPiNx6OKq6RS-ue/view?usp=drive_link", source: 'bejaia'} ]
               }
           }, // <-- Added comma
  
           { matiere: "Logique Mathématique", coefficient: 2, credits: 4, evaluations: ["TD", "Examen"], resources: { /* TODO: Add resources */ } }, // <-- Added comma
           { matiere: "Technologie Web 1", coefficient: 1, credits: 2, evaluations: ["TP"], resources: { /* TODO: Add resources */ } }, // <-- Added comma
           { matiere: "Langue étrangère 2", coefficient: 1, credits: 2, evaluations: ["Examen"], resources: { /* TODO: Add resources */ } } // No comma needed
        ] // End Semestre 2 Array
      }, // <-- Comma needed before next specialty
  
      "Mathématiques": {
          "Semestre 1": [ /* TODO: Add modules + resources */ ],
          "Semestre 2": [ /* TODO: Add modules + resources */ ]
      }, // <-- Comma needed
      "Science de la matière": {
          "Semestre 1": [ /* TODO: Add modules + resources */ ],
          "Semestre 2": [ /* TODO: Add modules + resources */ ]
      }, // <-- Comma needed
      "Biologie": {
          "Semestre 1": [ /* TODO: Add modules + resources */ ],
          "Semestre 2": [ /* TODO: Add modules + resources */ ]
      }, // <-- Comma needed
      "Architecture": {
          "Semestre 1": [ /* TODO: Add modules + resources */ ],
          "Semestre 2": [ /* TODO: Add modules + resources */ ]
      }, // <-- Comma needed
      "Science et Technologie Ingénieur": {
          "Semestre 1": [ /* TODO: Add modules + resources */ ],
          "Semestre 2": [ /* TODO: Add modules + resources */ ]
      }, // <-- Comma needed
      "Informatique ING": {
          "Semestre 1": [ /* TODO: Add modules + resources */ ],
          "Semestre 2": [ /* TODO: Add modules + resources */ ]
      } // <-- No comma needed (last specialty in this year)
    }, // <-- Comma needed before next year
  
    "2ème année": {
        // TODO: Add ALL Specialties, Semesters, Modules with resources for 2nd year
    }, // <-- Comma needed
    "3ème année": {
        // TODO: Add ALL Specialties, Semesters, Modules with resources for 3rd year
    }, // <-- Comma needed
    "Master 1 & 2": {
        // TODO: Add ALL Specialties, Semesters, Modules with resources for Master
    } // <-- No comma needed (last year in main object)
  }; // End of universiteBejaiaData object
  
  export { universiteBejaiaData };
  export type { Module, Resource, Resources, Semester, Specialty, YearData };