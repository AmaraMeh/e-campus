// File: scripts/helpers.js

// Icon mapping (using FontAwesome 4/5 Free icons) - Add more as needed!
const iconMap = {
    "default": "book", "technologie": "flask", "st lmd": "flask", "st ing": "cogs",
    "informatique": "laptop", "info ing": "desktop", "biologie": "leaf",
    "biologiques": "heartbeat", "biotechnologies": "flask", "biochimie": "flask",
    "microbiologie": "flask", "hydrobiologie": "tint", "mathématiques": "calculator",
    "maths-app": "superscript", "matière": "atom", "architecture": "building-o",
    "médecine": "stethoscope", "pharmacie": "pills", "droit": "gavel", "segc": "balance-scale",
    "économie": "line-chart", "commerciales": "shopping-cart", "gestion": "briefcase",
    "langue": "language", "sociale": "users", "traduction": "exchange",
    "procédés": "industry", "automatique": "cogs", "mines": "bank", "civil": "building",
    "télécommunications": "wifi", "minérales": "diamond", "électronique": "microchip",
    "électrotechnique": "bolt", "chimie": "flask", "physique": "atom",
    "énergétique": "fire", "ecologie": "leaf", "alimentaires": "cutlery",
    "master": "hourglass-half",
    // Add any missing keywords based on your full specialty list
};

/**
 * Gets a FontAwesome icon name based on keywords in the specialty name.
 * @param {string | undefined} name - The name of the specialty.
 * @returns {string} A FontAwesome icon name (e.g., 'book', 'flask').
 */
const getIconForSpecialty = (name) => {
    const lowerName = name?.toLowerCase() || '';
    for (const keyword in iconMap) {
        if (lowerName.includes(keyword)) {
            return iconMap[keyword];
        }
    }
    return iconMap["default"];
};

/**
 * Generates a URL-safe string (slug) from a name.
 * @param {string | undefined} name - The input string (e.g., specialty name, year name).
 * @returns {string} A URL-safe string.
 */
const generateLinkFromName = (name) => {
    if (!name) return 'invalid-name-' + Date.now(); // Avoid collisions for invalid names
    return name.toLowerCase()
               .replace(/ /g, '-')
               .replace(/[èéêë]/g, 'e')
               .replace(/[àâä]/g, 'a')
               .replace(/[ùûü]/g, 'u')
               .replace(/[îï]/g, 'i')
               .replace(/[ôö]/g, 'o')
               .replace(/ç/g, 'c')
               .replace(/[^\w-]+/g, '') // Keep word chars, digits, and hyphens
               .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
};

/**
 * Generates a short ID part for a semester (e.g., "s1", "s2").
 * @param {string | undefined} semesterKey - The full semester name (e.g., "Semestre 1").
 * @returns {string} A short ID part (e.g., "s1").
 */
const getSemesterIdPart = (semesterKey) => {
    if (!semesterKey) return 'unk';
    const match = semesterKey.match(/\d+/); // Find the first number
    return match ? `s${match[0]}` : semesterKey.toLowerCase().replace(/[^a-z0-9]/g,'');
}

// Export the functions using CommonJS syntax for the Node.js script
module.exports = {
    generateLinkFromName,
    getIconForSpecialty,
    getSemesterIdPart
};