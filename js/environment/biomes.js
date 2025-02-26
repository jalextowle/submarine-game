// Ocean floor biome system for varied terrain features
import * as THREE from 'three';
import perlinNoise from '../utils/perlinNoise.js';

// Biome types
export const BIOME_TYPES = {
    FLAT_SANDY: 'flatSandy',
    CONTINENTAL_SHELF: 'continentalShelf',
    TRENCH: 'trench'
};

// Biome distribution scale - controls the size of biome regions
// Lower values = larger biomes, higher values = smaller biomes
export const BIOME_DISTRIBUTION_SCALES = {
    SMALL: 0.0005,  // Small number of large biomes (significantly larger)
    MEDIUM: 0.001,  // Medium number and size of biomes
    LARGE: 0.002    // Large number of small biomes
};

// Default biome scale
let currentBiomeScale = BIOME_DISTRIBUTION_SCALES.MEDIUM;

// Biome-specific terrain parameters
export const BIOME_PARAMS = {
    [BIOME_TYPES.FLAT_SANDY]: {
        heightScale: 0.6,    // Reduced for flatter ocean floor
        heightOffset: -80,   // More negative for deeper ocean floor
        noiseScale: 0.7,     // Reduced for smoother/flatter terrain
        noiseOctaves: 3,     // Fewer octaves for less detail (flatter)
        noisePersistence: 0.5 // Lower persistence for gentler variations
    },
    [BIOME_TYPES.CONTINENTAL_SHELF]: {
        heightScale: 2.5,    // Reduced for flatter shelf
        heightOffset: 60,    // Reduced for shallower shelf
        noiseScale: 0.6,     // Reduced for smoother surface
        noiseOctaves: 4,     // Slightly reduced detail
        noisePersistence: 0.6 // Slightly reduced persistence for smoother terrain
    },
    [BIOME_TYPES.TRENCH]: {
        heightScale: 8.0,     // Significantly increased for deeper variation
        heightOffset: -800,   // Much lower to create deep trenches (up to ~1000 depth)
        noiseScale: 1.5,      // Increased for more jagged terrain
        noiseOctaves: 7,      // More octaves for more detailed jaggedness
        noisePersistence: 0.8 // Higher persistence for sharper, more pronounced features
    }
};

// Transition width as percentage of biome size (0.0-0.5)
// Higher values mean wider, smoother transitions
const TRANSITION_WIDTH = 0.4;

// Set the biome distribution scale
export function setBiomeDistributionScale(scaleType) {
    if (BIOME_DISTRIBUTION_SCALES[scaleType]) {
        currentBiomeScale = BIOME_DISTRIBUTION_SCALES[scaleType];
        return true;
    }
    return false;
}

// Get the current biome scale
export function getBiomeDistributionScale() {
    return currentBiomeScale;
}

// Get raw biome noise value at position (used for consistent transitions)
function getBiomeNoiseAtPosition(x, z) {
    // Use a different seed for biome distribution than for terrain
    return perlinNoise.octaveNoise2D(
        x * currentBiomeScale,
        z * currentBiomeScale,
        2, // Fewer octaves for smoother transitions
        0.5 // Lower persistence for gentler variation
    );
}

// Determine biome type and blend factors at a specific world position
export function getBiomeAtPosition(x, z) {
    const biomeNoise = getBiomeNoiseAtPosition(x, z);
    
    // Thresholds for biome transitions
    const trenchThreshold = -0.3;
    const shelfThreshold = 0.3;
    
    // Transition zones (based on TRANSITION_WIDTH)
    const trenchTransitionStart = trenchThreshold - TRANSITION_WIDTH;
    const trenchTransitionEnd = trenchThreshold + TRANSITION_WIDTH;
    const shelfTransitionStart = shelfThreshold - TRANSITION_WIDTH;
    const shelfTransitionEnd = shelfThreshold + TRANSITION_WIDTH;
    
    let dominantBiome;
    let blendFactors = {
        [BIOME_TYPES.TRENCH]: 0,
        [BIOME_TYPES.FLAT_SANDY]: 0,
        [BIOME_TYPES.CONTINENTAL_SHELF]: 0
    };
    
    // Determine the dominant biome
    if (biomeNoise < trenchThreshold) {
        dominantBiome = BIOME_TYPES.TRENCH;
        blendFactors[BIOME_TYPES.TRENCH] = 1.0;
    } else if (biomeNoise > shelfThreshold) {
        dominantBiome = BIOME_TYPES.CONTINENTAL_SHELF;
        blendFactors[BIOME_TYPES.CONTINENTAL_SHELF] = 1.0;
    } else {
        dominantBiome = BIOME_TYPES.FLAT_SANDY;
        blendFactors[BIOME_TYPES.FLAT_SANDY] = 1.0;
    }
    
    // Apply smooth transitions if in transition zones
    if (biomeNoise >= trenchTransitionStart && biomeNoise <= trenchTransitionEnd) {
        // Transition between trench and flat
        const t = smoothStep((biomeNoise - trenchTransitionStart) / (trenchTransitionEnd - trenchTransitionStart));
        blendFactors[BIOME_TYPES.TRENCH] = 1.0 - t;
        blendFactors[BIOME_TYPES.FLAT_SANDY] = t;
        // Recalculate dominant biome
        dominantBiome = blendFactors[BIOME_TYPES.TRENCH] > blendFactors[BIOME_TYPES.FLAT_SANDY] 
            ? BIOME_TYPES.TRENCH : BIOME_TYPES.FLAT_SANDY;
    } else if (biomeNoise >= shelfTransitionStart && biomeNoise <= shelfTransitionEnd) {
        // Transition between flat and shelf
        const t = smoothStep((biomeNoise - shelfTransitionStart) / (shelfTransitionEnd - shelfTransitionStart));
        blendFactors[BIOME_TYPES.FLAT_SANDY] = 1.0 - t;
        blendFactors[BIOME_TYPES.CONTINENTAL_SHELF] = t;
        // Recalculate dominant biome
        dominantBiome = blendFactors[BIOME_TYPES.FLAT_SANDY] > blendFactors[BIOME_TYPES.CONTINENTAL_SHELF] 
            ? BIOME_TYPES.FLAT_SANDY : BIOME_TYPES.CONTINENTAL_SHELF;
    }
    
    return { dominantBiome, blendFactors };
}

// SmoothStep function for smoother transitions
function smoothStep(t) {
    // Clamp input to 0-1 range
    t = Math.max(0, Math.min(1, t));
    // Apply smoothstep formula: 3t² - 2t³
    return t * t * (3 - 2 * t);
}

// Get terrain height parameters for a specific world position
export function getTerrainParametersAtPosition(x, z) {
    const { blendFactors } = getBiomeAtPosition(x, z);
    
    // Initialize result parameters
    const blendedParams = {
        heightScale: 0,
        heightOffset: 0,
        noiseScale: 0,
        noiseOctaves: 0,
        noisePersistence: 0
    };
    
    // Blend parameters from each biome based on blend factors
    let totalFactor = 0;
    for (const [biomeType, factor] of Object.entries(blendFactors)) {
        if (factor > 0) {
            totalFactor += factor;
            const params = BIOME_PARAMS[biomeType];
            blendedParams.heightScale += params.heightScale * factor;
            blendedParams.heightOffset += params.heightOffset * factor;
            blendedParams.noiseScale += params.noiseScale * factor;
            blendedParams.noiseOctaves += params.noiseOctaves * factor;
            blendedParams.noisePersistence += params.noisePersistence * factor;
        }
    }
    
    // Normalize if needed
    if (totalFactor > 0 && totalFactor !== 1.0) {
        blendedParams.heightScale /= totalFactor;
        blendedParams.heightOffset /= totalFactor;
        blendedParams.noiseScale /= totalFactor;
        blendedParams.noiseOctaves /= totalFactor;
        blendedParams.noisePersistence /= totalFactor;
    }
    
    // Round octaves to nearest integer as it must be a whole number
    blendedParams.noiseOctaves = Math.round(blendedParams.noiseOctaves);
    
    return blendedParams;
}

// Debug function to visualize biome distribution
export function createBiomeDebugTexture(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Range to visualize
    const range = 2000;
    
    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            // Convert pixel coordinates to world coordinates
            const worldX = (x / size) * range - range/2;
            const worldZ = (z / size) * range - range/2;
            
            const { dominantBiome, blendFactors } = getBiomeAtPosition(worldX, worldZ);
            
            // Extract blend factors
            const trenchFactor = blendFactors[BIOME_TYPES.TRENCH];
            const flatFactor = blendFactors[BIOME_TYPES.FLAT_SANDY];
            const shelfFactor = blendFactors[BIOME_TYPES.CONTINENTAL_SHELF];
            
            // Color based on blended biome types using RGB channels
            const r = Math.floor(shelfFactor * 160); 
            const g = Math.floor(flatFactor * 240);
            const b = Math.floor(trenchFactor * 200);
            
            // Mix the colors based on blend factors for visualization
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, z, 1, 1);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return { texture, canvas };
} 