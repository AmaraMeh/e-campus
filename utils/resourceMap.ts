// File: utils/resourceMap.ts
import { universiteBejaiaData, Resource, Module, YearData, Specialty, Semester } from '@/constants/Data'; // Adjust path if Data.ts is elsewhere

export interface ResourceMapEntry {
    resource: Resource;
    module: Module;
    specialty: string;
    year: string;
}

export const allResourcesMap = new Map<string, ResourceMapEntry>();

export const populateResourceMap = () => {
    if (allResourcesMap.size > 0) return;
    console.log("Populating resource map...");
    try {
        for (const yearKey in universiteBejaiaData) {
            const yearData = universiteBejaiaData[yearKey as keyof YearData];
            if (!yearData) continue;

            for (const specKey in yearData) {
                const specData = yearData[specKey as keyof Specialty];
                if (!specData) continue;

                for (const semKey in specData) {
                    const semesterData = specData[semKey as keyof Semester];
                    if (Array.isArray(semesterData)) {
                         semesterData.forEach((module: Module) => {
                            if (module.resources) {
                                 Object.values(module.resources).forEach(resourceArray => {
                                    if (Array.isArray(resourceArray)) {
                                         resourceArray.forEach((resource: Resource) => {
                                            if (resource && resource.id) {
                                                if (allResourcesMap.has(resource.id)) {
                                                    console.warn(`Duplicate resource ID: ${resource.id}`);
                                                }
                                                allResourcesMap.set(resource.id, {
                                                    resource, module, specialty: specKey, year: yearKey,
                                                });
                                            } else {
                                                console.warn("Resource missing ID/invalid:", resource?.title, "in", module.matiere);
                                            }
                                         });
                                    }
                                 });
                            }
                         });
                    }
                }
            }
        }
    } catch (error) { console.error("Error populating resource map:", error); }
    console.log(`Finished populating resource map: ${allResourcesMap.size} items.`);
};

// Populate map when this module is imported
populateResourceMap();