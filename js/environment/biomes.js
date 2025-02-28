// Ocean floor biome system for varied terrain features
import * as THREE from 'three';
import perlinNoise from '../utils/perlinNoise.js';

// Biome types
export const BIOME_TYPES = {
    FLAT_SANDY: 'flatSandy',
    CONTINENTAL_SHELF: 'continentalShelf',
    TRENCH: 'trench',
    ISLAND: 'island'
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

// Variable to control biome size variation across the map
// Higher values = more pronounced size variation, lower values = more uniform sizes
let BIOME_SIZE_VARIATION = 0.7; // 0.0 = no variation, 1.0 = maximum variation
// How quickly biome sizes change across the map (lower = more gradual transitions)
let BIOME_SIZE_VARIATION_SCALE = 0.00015;

// Biome-specific terrain parameters
export const BIOME_PARAMS = {
    [BIOME_TYPES.FLAT_SANDY]: {
        heightScale: 0.6,    // Reduced for flatter ocean floor
        heightOffset: -80,   // More negative for deeper ocean floor
        noiseScale: 0.7,     // Reduced for smoother/flatter terrain
        noiseOctaves: 3,     // Fewer octaves for less detail (flatter)
        noisePersistence: 0.5, // Lower persistence for gentler variations
        color: '#4d8c6f'     // Light green-blue color
    },
    [BIOME_TYPES.CONTINENTAL_SHELF]: {
        heightScale: 2.5,    // Reduced for flatter shelf
        heightOffset: 60,    // Reduced for shallower shelf
        noiseScale: 0.6,     // Reduced for smoother surface
        noiseOctaves: 4,     // Slightly reduced detail
        noisePersistence: 0.6, // Slightly reduced persistence for smoother terrain
        color: '#7ab38c'     // Lighter green-blue for shallower areas
    },
    [BIOME_TYPES.TRENCH]: {
        heightScale: 8.0,     // Significantly increased for deeper variation
        heightOffset: -3000,   // Much lower to create deep trenches (up to ~1000 depth)
        noiseScale: 0.6,      // Increased for more jagged terrain
        noiseOctaves: 3,      // More octaves for more detailed jaggedness
        noisePersistence: 0.8, // Higher persistence for sharper, more pronounced features
        color: '#194769'      // Dark blue for deep trenches
    },
    [BIOME_TYPES.ISLAND]: {
        heightScale: 7.0,     // Very high scale for islands that break the surface
        heightOffset: 700,    // Large positive offset to create peaks above water
        noiseScale: 0.4,      // Reduced noise scale for more defined island shapes
        noiseOctaves: 5,      // High octaves for detailed shorelines and island terrain
        noisePersistence: 0.65, // Medium persistence for natural-looking island terrain
        color: '#5a9678'      // Green-tinted color for islands
    }
};

// Biome-specific amplitude variation ranges
// These determine how much the heightScale and heightOffset can vary within each biome
export const BIOME_AMPLITUDE_RANGES = {
    [BIOME_TYPES.FLAT_SANDY]: {
        scaleRange: [0.9, 1.1],      // 10% variation in flat areas
        offsetRange: [0.95, 1.05]    // 5% variation in base height
    },
    [BIOME_TYPES.CONTINENTAL_SHELF]: {
        scaleRange: [0.8, 1.2],      // 20% variation in continental shelf
        offsetRange: [0.9, 1.1]      // 10% variation in base height
    },
    [BIOME_TYPES.TRENCH]: {
        scaleRange: [0.5, 2.0],      // Extreme range for trench depth variation (50% to 200%)
        offsetRange: [0.7, 1.8]      // Some trenches much deeper (up to 80% deeper)
    },
    [BIOME_TYPES.ISLAND]: {
        scaleRange: [0.3, 2.5],      // Dramatic variation (30% to 250%) - some are just seamounts, others tall islands
        offsetRange: [0.6, 2.0]      // Some islands twice as tall as normal, creating dramatic peaks
    }
};

// Transition width as percentage of noise range (0.0-0.3)
// Higher values mean wider, smoother transitions
// Lower values mean more distinct biome boundaries
const TRANSITION_WIDTH = 0.1;

// Set the biome distribution scale
export function setBiomeDistributionScale(scaleType) {
    if (BIOME_DISTRIBUTION_SCALES[scaleType]) {
        currentBiomeScale = BIOME_DISTRIBUTION_SCALES[scaleType];
        return true;
    }
    return false;
}

// Set the amount of biome size variation across the map
export function setBiomeSizeVariation(variationAmount, variationScale) {
    // Clamp values to sensible ranges
    BIOME_SIZE_VARIATION = Math.max(0, Math.min(1, variationAmount));
    
    if (variationScale !== undefined) {
        // Prevent scale from being too extreme in either direction
        BIOME_SIZE_VARIATION_SCALE = Math.max(0.00005, Math.min(0.0005, variationScale));
    }
    
    return {
        variationAmount: BIOME_SIZE_VARIATION,
        variationScale: BIOME_SIZE_VARIATION_SCALE
    };
}

// Get current biome variation settings
export function getBiomeVariationSettings() {
    return {
        variationAmount: BIOME_SIZE_VARIATION,
        variationScale: BIOME_SIZE_VARIATION_SCALE
    };
}

// Get the current biome scale
export function getBiomeDistributionScale() {
    return currentBiomeScale;
}

// Calculate amplitude variation multiplier based on world position
// This uses a much lower frequency noise to create gradual changes across large areas
function getAmplitudeVariation(x, z, biomeType) {
    // Use a very low frequency (0.00025) to get smooth, gradual changes across large areas
    // This is about 4x lower frequency than the smallest biome distribution
    const scale = 0.00025;
    
    // Use a different seed offset for scale vs offset variations
    const scaleNoiseValue = perlinNoise.noise2D(x * scale, z * scale);
    const offsetNoiseValue = perlinNoise.noise2D(x * scale + 100, z * scale + 100); // Different offset for variety
    
    // Get the variation ranges for this biome type
    const ranges = BIOME_AMPLITUDE_RANGES[biomeType];
    
    // Map 0-1 noise values to the biome-specific ranges
    const scaleMultiplier = mapRange(scaleNoiseValue, 0, 1, ranges.scaleRange[0], ranges.scaleRange[1]);
    const offsetMultiplier = mapRange(offsetNoiseValue, 0, 1, ranges.offsetRange[0], ranges.offsetRange[1]);
    
    return { scaleMultiplier, offsetMultiplier };
}

// Helper function to map a value from one range to another
function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// Get raw biome noise value at position (used for consistent transitions)
function getBiomeNoiseAtPosition(x, z) {
    // Use a much lower frequency noise to determine biome size in this region
    const regionSizeVariation = perlinNoise.octaveNoise2D(
        x * BIOME_SIZE_VARIATION_SCALE,
        z * BIOME_SIZE_VARIATION_SCALE,
        1, // Single octave for smoother variation
        0.5 // Low persistence
    );
    
    // Calculate dynamic biome scale
    // Map the noise from 0-1 to a blend between small and large biome scales 
    // based on the BIOME_SIZE_VARIATION intensity
    const minScale = BIOME_DISTRIBUTION_SCALES.SMALL;
    const maxScale = BIOME_DISTRIBUTION_SCALES.LARGE;
    const variableScale = minScale + (maxScale - minScale) * 
                          (regionSizeVariation * BIOME_SIZE_VARIATION + 
                           (1 - BIOME_SIZE_VARIATION) * 0.5);
    
    // Use a different seed for biome distribution than for terrain
    return perlinNoise.octaveNoise2D(
        x * variableScale,
        z * variableScale,
        2, // Fewer octaves for smoother transitions
        0.5 // Lower persistence for gentler variation
    );
}

// Determine biome type and blend factors at a specific world position
export function getBiomeAtPosition(x, z) {
    const biomeNoise = getBiomeNoiseAtPosition(x, z);
    
    // Thresholds for biome transitions - updated with seamount removed
    const trenchThreshold = 0.25;     // 0-0.25 for trenches (25%)
    const flatSandyThreshold = 0.6;   // 0.25-0.6 for flat sandy (35%) - increased range
    const shelfThreshold = 0.8;      // 0.6-0.8 for continental shelf (20%) - increased range
    const islandThreshold = 1.0;     // 0.8-1.0 for islands (20%) - increased range
    
    // Transition zones - scale based on total range of noise
    const trenchTransitionStart = Math.max(0, trenchThreshold - TRANSITION_WIDTH);
    const trenchTransitionEnd = Math.min(1, trenchThreshold + TRANSITION_WIDTH);
    const flatSandyTransitionStart = Math.max(0, flatSandyThreshold - TRANSITION_WIDTH);
    const flatSandyTransitionEnd = Math.min(1, flatSandyThreshold + TRANSITION_WIDTH);
    const shelfTransitionStart = Math.max(0, shelfThreshold - TRANSITION_WIDTH);
    const shelfTransitionEnd = Math.min(1, shelfThreshold + TRANSITION_WIDTH);
    
    let dominantBiome;
    let blendFactors = {
        [BIOME_TYPES.TRENCH]: 0,
        [BIOME_TYPES.FLAT_SANDY]: 0,
        [BIOME_TYPES.CONTINENTAL_SHELF]: 0,
        [BIOME_TYPES.ISLAND]: 0
    };
    
    // Determine biome and apply transitions
    if (biomeNoise < trenchTransitionStart) {
        // Pure trench biome
        dominantBiome = BIOME_TYPES.TRENCH;
        blendFactors[BIOME_TYPES.TRENCH] = 1.0;
    } else if (biomeNoise >= trenchTransitionEnd && biomeNoise < flatSandyTransitionStart) {
        // Pure flat sandy biome
        dominantBiome = BIOME_TYPES.FLAT_SANDY;
        blendFactors[BIOME_TYPES.FLAT_SANDY] = 1.0;
    } else if (biomeNoise >= flatSandyTransitionEnd && biomeNoise < shelfTransitionStart) {
        // Pure continental shelf biome
        dominantBiome = BIOME_TYPES.CONTINENTAL_SHELF;
        blendFactors[BIOME_TYPES.CONTINENTAL_SHELF] = 1.0;
    } else if (biomeNoise >= shelfTransitionEnd) {
        // Pure island biome
        dominantBiome = BIOME_TYPES.ISLAND;
        blendFactors[BIOME_TYPES.ISLAND] = 1.0;
    } else if (biomeNoise >= trenchTransitionStart && biomeNoise < trenchTransitionEnd) {
        // Transition between trench and flat sandy
        const t = smoothStep((biomeNoise - trenchTransitionStart) / (trenchTransitionEnd - trenchTransitionStart));
        blendFactors[BIOME_TYPES.TRENCH] = 1.0 - t;
        blendFactors[BIOME_TYPES.FLAT_SANDY] = t;
        dominantBiome = blendFactors[BIOME_TYPES.TRENCH] > blendFactors[BIOME_TYPES.FLAT_SANDY] 
            ? BIOME_TYPES.TRENCH : BIOME_TYPES.FLAT_SANDY;
    } else if (biomeNoise >= flatSandyTransitionStart && biomeNoise < flatSandyTransitionEnd) {
        // Transition between flat sandy and continental shelf
        const t = smoothStep((biomeNoise - flatSandyTransitionStart) / (flatSandyTransitionEnd - flatSandyTransitionStart));
        blendFactors[BIOME_TYPES.FLAT_SANDY] = 1.0 - t;
        blendFactors[BIOME_TYPES.CONTINENTAL_SHELF] = t;
        dominantBiome = blendFactors[BIOME_TYPES.FLAT_SANDY] > blendFactors[BIOME_TYPES.CONTINENTAL_SHELF] 
            ? BIOME_TYPES.FLAT_SANDY : BIOME_TYPES.CONTINENTAL_SHELF;
    } else if (biomeNoise >= shelfTransitionStart && biomeNoise < shelfTransitionEnd) {
        // Transition between continental shelf and island
        const t = smoothStep((biomeNoise - shelfTransitionStart) / (shelfTransitionEnd - shelfTransitionStart));
        blendFactors[BIOME_TYPES.CONTINENTAL_SHELF] = 1.0 - t;
        blendFactors[BIOME_TYPES.ISLAND] = t;
        dominantBiome = blendFactors[BIOME_TYPES.CONTINENTAL_SHELF] > blendFactors[BIOME_TYPES.ISLAND] 
            ? BIOME_TYPES.CONTINENTAL_SHELF : BIOME_TYPES.ISLAND;
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
    const { blendFactors, dominantBiome } = getBiomeAtPosition(x, z);
    
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
    
    // Track the amplitude variations per biome for blending
    const biomeAmplitudeVariations = {};
    
    // Calculate and store amplitude variations for each biome present
    for (const [biomeType, factor] of Object.entries(blendFactors)) {
        if (factor > 0) {
            biomeAmplitudeVariations[biomeType] = getAmplitudeVariation(x, z, biomeType);
        }
    }
    
    // Blend parameters from each biome based on blend factors
    for (const [biomeType, factor] of Object.entries(blendFactors)) {
        if (factor > 0) {
            totalFactor += factor;
            const params = BIOME_PARAMS[biomeType];
            const variation = biomeAmplitudeVariations[biomeType];
            
            // Apply amplitude variations to height scale and offset
            const variedHeightScale = params.heightScale * variation.scaleMultiplier;
            const variedHeightOffset = params.heightOffset * variation.offsetMultiplier;
            
            blendedParams.heightScale += variedHeightScale * factor;
            blendedParams.heightOffset += variedHeightOffset * factor;
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
            const islandFactor = blendFactors[BIOME_TYPES.ISLAND];
            
            // Use the exact colors from BIOME_PARAMS to blend
            const trenchColor = hexToRgb(BIOME_PARAMS[BIOME_TYPES.TRENCH].color);
            const flatColor = hexToRgb(BIOME_PARAMS[BIOME_TYPES.FLAT_SANDY].color);
            const shelfColor = hexToRgb(BIOME_PARAMS[BIOME_TYPES.CONTINENTAL_SHELF].color);
            const islandColor = hexToRgb(BIOME_PARAMS[BIOME_TYPES.ISLAND].color);
            
            // Blend the colors based on factors
            const r = Math.floor(
                (trenchColor.r * trenchFactor) +
                (flatColor.r * flatFactor) +
                (shelfColor.r * shelfFactor) +
                (islandColor.r * islandFactor)
            );
            const g = Math.floor(
                (trenchColor.g * trenchFactor) +
                (flatColor.g * flatFactor) +
                (shelfColor.g * shelfFactor) +
                (islandColor.g * islandFactor)
            );
            const b = Math.floor(
                (trenchColor.b * trenchFactor) +
                (flatColor.b * flatFactor) +
                (shelfColor.b * shelfFactor) +
                (islandColor.b * islandFactor)
            );
            
            // Mix the colors based on blend factors for visualization
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, z, 1, 1);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return { texture, canvas };
}

// Enhanced biome map visualization with more features and controls
export function createEnhancedBiomeMap(size = 512, range = 2000, playerX = 0, playerZ = 0) {
    // Create container div for the map and controls
    const container = document.createElement('div');
    container.id = 'enhanced-biome-map';
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.backgroundColor = '#222';
    container.style.padding = '15px';
    container.style.borderRadius = '5px';
    container.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.7)';
    container.style.zIndex = '10000';
    container.style.color = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.userSelect = 'none';
    
    // Create header with title and close button
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '10px';
    
    const title = document.createElement('h2');
    title.textContent = 'Biome Distribution Map';
    title.style.margin = '0';
    title.style.fontSize = '20px';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0 5px';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(container);
    });
    
    header.appendChild(title);
    header.appendChild(closeButton);
    container.appendChild(header);
    
    // Create canvas for biome map
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.style.border = '2px solid #444';
    canvas.style.borderRadius = '3px';
    container.appendChild(canvas);
    
    // Add biome scale info and controls
    const controls = document.createElement('div');
    controls.style.marginTop = '10px';
    controls.style.display = 'flex';
    controls.style.flexDirection = 'column';
    controls.style.gap = '10px';
    
    // Scale controls
    const scaleControls = document.createElement('div');
    scaleControls.style.display = 'flex';
    scaleControls.style.gap = '10px';
    scaleControls.style.alignItems = 'center';
    
    const scaleLabel = document.createElement('span');
    scaleLabel.textContent = 'Biome Scale:';
    scaleControls.appendChild(scaleLabel);
    
    const scaleTypes = ['SMALL', 'MEDIUM', 'LARGE'];
    scaleTypes.forEach((scale, index) => {
        const button = document.createElement('button');
        button.textContent = scale;
        button.style.padding = '5px 10px';
        button.style.background = currentBiomeScale === BIOME_DISTRIBUTION_SCALES[scale] ? '#4a6fa5' : '#333';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '3px';
        button.style.cursor = 'pointer';
        
        button.addEventListener('click', () => {
            setBiomeDistributionScale(scale);
            updateMap();
            
            // Update button styles
            scaleControls.querySelectorAll('button').forEach(btn => {
                btn.style.background = '#333';
            });
            button.style.background = '#4a6fa5';
        });
        
        scaleControls.appendChild(button);
    });
    
    controls.appendChild(scaleControls);
    
    // Range controls
    const rangeControls = document.createElement('div');
    rangeControls.style.display = 'flex';
    rangeControls.style.gap = '10px';
    rangeControls.style.alignItems = 'center';
    
    const rangeLabel = document.createElement('span');
    rangeLabel.textContent = 'Map Range:';
    rangeControls.appendChild(rangeLabel);
    
    const rangeInput = document.createElement('input');
    rangeInput.type = 'range';
    rangeInput.min = '1000';
    rangeInput.max = '10000';
    rangeInput.step = '1000';
    rangeInput.value = range.toString();
    rangeInput.style.flexGrow = '1';
    
    const rangeValue = document.createElement('span');
    rangeValue.textContent = `${range}m`;
    rangeValue.style.minWidth = '50px';
    
    rangeInput.addEventListener('input', () => {
        range = parseInt(rangeInput.value, 10);
        rangeValue.textContent = `${range}m`;
        updateMap();
    });
    
    rangeControls.appendChild(rangeInput);
    rangeControls.appendChild(rangeValue);
    controls.appendChild(rangeControls);
    
    // Add player position display and controls
    const positionControls = document.createElement('div');
    positionControls.style.display = 'flex';
    positionControls.style.gap = '10px';
    positionControls.style.alignItems = 'center';
    
    const positionLabel = document.createElement('span');
    positionLabel.textContent = 'Center Position:';
    
    const positionValue = document.createElement('span');
    positionValue.textContent = `X: ${playerX.toFixed(0)}, Z: ${playerZ.toFixed(0)}`;
    positionValue.style.flexGrow = '1';
    
    const resetPositionButton = document.createElement('button');
    resetPositionButton.textContent = 'Center on Player';
    resetPositionButton.style.padding = '5px 10px';
    resetPositionButton.style.background = '#333';
    resetPositionButton.style.color = 'white';
    resetPositionButton.style.border = 'none';
    resetPositionButton.style.borderRadius = '3px';
    resetPositionButton.style.cursor = 'pointer';
    
    resetPositionButton.addEventListener('click', () => {
        // Get current submarine position from game state
        if (window.gameState && window.gameState.submarine) {
            playerX = window.gameState.submarine.position.x;
            playerZ = window.gameState.submarine.position.z;
            positionValue.textContent = `X: ${playerX.toFixed(0)}, Z: ${playerZ.toFixed(0)}`;
            updateMap();
        }
    });
    
    positionControls.appendChild(positionLabel);
    positionControls.appendChild(positionValue);
    positionControls.appendChild(resetPositionButton);
    controls.appendChild(positionControls);
    
    // Add legend
    const legend = document.createElement('div');
    legend.style.marginTop = '10px';
    legend.style.display = 'flex';
    legend.style.justifyContent = 'space-between';
    
    Object.entries(BIOME_TYPES).forEach(([key, value]) => {
        const legendItem = document.createElement('div');
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.gap = '5px';
        
        const colorBox = document.createElement('div');
        colorBox.style.width = '20px';
        colorBox.style.height = '20px';
        colorBox.style.backgroundColor = BIOME_PARAMS[value].color;
        colorBox.style.border = '1px solid #444';
        
        const name = document.createElement('span');
        name.textContent = key.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(name);
        legend.appendChild(legendItem);
    });
    
    controls.appendChild(legend);
    
    // Add a section for biome size variation controls
    function createBiomeSizeVariationControls() {
        const variationSection = document.createElement('div');
        variationSection.style.marginTop = '15px';
        variationSection.style.padding = '10px';
        variationSection.style.borderTop = '1px solid #444';
        
        const variationTitle = document.createElement('h3');
        variationTitle.textContent = 'Biome Size Variation';
        variationTitle.style.fontSize = '16px';
        variationTitle.style.marginTop = '0';
        variationTitle.style.marginBottom = '10px';
        variationSection.appendChild(variationTitle);
        
        // Variation Amount slider
        const variationLabel = document.createElement('label');
        variationLabel.textContent = 'Variation Amount: ';
        variationLabel.style.display = 'block';
        variationLabel.style.marginBottom = '5px';
        variationSection.appendChild(variationLabel);
        
        const variationValue = document.createElement('span');
        variationValue.textContent = BIOME_SIZE_VARIATION.toFixed(2);
        variationValue.style.marginLeft = '5px';
        variationLabel.appendChild(variationValue);
        
        const variationSlider = document.createElement('input');
        variationSlider.type = 'range';
        variationSlider.min = '0';
        variationSlider.max = '1';
        variationSlider.step = '0.05';
        variationSlider.value = BIOME_SIZE_VARIATION;
        variationSlider.style.width = '100%';
        variationSection.appendChild(variationSlider);
        
        // Variation Scale slider
        const scaleLabel = document.createElement('label');
        scaleLabel.textContent = 'Variation Scale: ';
        scaleLabel.style.display = 'block';
        scaleLabel.style.marginTop = '10px';
        scaleLabel.style.marginBottom = '5px';
        variationSection.appendChild(scaleLabel);
        
        const scaleValue = document.createElement('span');
        scaleValue.textContent = BIOME_SIZE_VARIATION_SCALE.toFixed(5);
        scaleValue.style.marginLeft = '5px';
        scaleLabel.appendChild(scaleValue);
        
        const scaleSlider = document.createElement('input');
        scaleSlider.type = 'range';
        scaleSlider.min = '0.00005';
        scaleSlider.max = '0.0005';
        scaleSlider.step = '0.00005';
        scaleSlider.value = BIOME_SIZE_VARIATION_SCALE;
        scaleSlider.style.width = '100%';
        variationSection.appendChild(scaleSlider);
        
        // Event handlers
        variationSlider.addEventListener('input', () => {
            const value = parseFloat(variationSlider.value);
            variationValue.textContent = value.toFixed(2);
            setBiomeSizeVariation(value);
            updateMap();
        });
        
        scaleSlider.addEventListener('input', () => {
            const value = parseFloat(scaleSlider.value);
            scaleValue.textContent = value.toFixed(5);
            setBiomeSizeVariation(BIOME_SIZE_VARIATION, value);
            updateMap();
        });
        
        return variationSection;
    }
    
    // Add controls section after initializing canvas
    controls.appendChild(createBiomeSizeVariationControls());
    
    // Add checkbox for biome size variation visualization
    const biomeVariationCheck = document.createElement('div');
    biomeVariationCheck.style.marginTop = '10px';
    
    const biomeVariationCheckbox = document.createElement('input');
    biomeVariationCheckbox.type = 'checkbox';
    biomeVariationCheckbox.id = 'showBiomeVariation';
    biomeVariationCheckbox.checked = true;
    
    const biomeVariationLabel = document.createElement('label');
    biomeVariationLabel.textContent = 'Show biome size variation';
    biomeVariationLabel.htmlFor = 'showBiomeVariation';
    biomeVariationLabel.style.marginLeft = '5px';
    
    biomeVariationCheck.appendChild(biomeVariationCheckbox);
    biomeVariationCheck.appendChild(biomeVariationLabel);
    
    let showBiomeSizeVariation = true;
    biomeVariationCheckbox.addEventListener('change', () => {
        showBiomeSizeVariation = biomeVariationCheckbox.checked;
        updateMap();
    });
    
    controls.appendChild(biomeVariationCheck);
    
    // Add the controls to the container
    container.appendChild(controls);
    
    // Function to update the map
    function updateMap() {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        
        // Draw gridlines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Draw grid (every 500 units)
        const gridSize = 500;
        const gridPixels = size / (range / gridSize);
        
        // Get the offset for gridlines based on player position
        const offsetX = (playerX % gridSize) / range * size;
        const offsetZ = (playerZ % gridSize) / range * size;
        
        // Vertical gridlines
        for (let x = -offsetX; x < size; x += gridPixels) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
        }
        
        // Horizontal gridlines
        for (let z = -offsetZ; z < size; z += gridPixels) {
            ctx.beginPath();
            ctx.moveTo(0, z);
            ctx.lineTo(size, z);
            ctx.stroke();
        }
        
        // Draw biome colors
        for (let z = 0; z < size; z++) {
            for (let x = 0; x < size; x++) {
                // Convert pixel coordinates to world coordinates centered on player
                const worldX = ((x / size) * range) - (range / 2) + playerX;
                const worldZ = ((z / size) * range) - (range / 2) + playerZ;
                
                const { dominantBiome, blendFactors } = getBiomeAtPosition(worldX, worldZ);
                
                // Extract blend factors
                const trenchFactor = blendFactors[BIOME_TYPES.TRENCH];
                const flatFactor = blendFactors[BIOME_TYPES.FLAT_SANDY];
                const shelfFactor = blendFactors[BIOME_TYPES.CONTINENTAL_SHELF];
                const islandFactor = blendFactors[BIOME_TYPES.ISLAND];
                
                // Use the exact colors from BIOME_PARAMS to blend
                const trenchColor = hexToRgb(BIOME_PARAMS[BIOME_TYPES.TRENCH].color);
                const flatColor = hexToRgb(BIOME_PARAMS[BIOME_TYPES.FLAT_SANDY].color);
                const shelfColor = hexToRgb(BIOME_PARAMS[BIOME_TYPES.CONTINENTAL_SHELF].color);
                const islandColor = hexToRgb(BIOME_PARAMS[BIOME_TYPES.ISLAND].color);
                
                // Blend the colors based on factors
                const r = Math.floor(
                    (trenchColor.r * trenchFactor) +
                    (flatColor.r * flatFactor) +
                    (shelfColor.r * shelfFactor) +
                    (islandColor.r * islandFactor)
                );
                const g = Math.floor(
                    (trenchColor.g * trenchFactor) +
                    (flatColor.g * flatFactor) +
                    (shelfColor.g * shelfFactor) +
                    (islandColor.g * islandFactor)
                );
                const b = Math.floor(
                    (trenchColor.b * trenchFactor) +
                    (flatColor.b * flatFactor) +
                    (shelfColor.b * shelfFactor) +
                    (islandColor.b * islandFactor)
                );
                
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(x, z, 1, 1);
            }
        }
        
        // Draw the player marker in the center
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw a direction indicator (North arrow)
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(size - 30, 30);
        ctx.lineTo(size - 20, 20);
        ctx.lineTo(size - 10, 30);
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText('N', size - 25, 17);
        
        // Draw scale indicator
        const scaleBarWidth = 100; // pixels
        const scaleDistance = Math.floor((scaleBarWidth / size) * range / 100) * 100; // round to nearest 100
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, size - 20);
        ctx.lineTo(20 + scaleBarWidth, size - 20);
        ctx.stroke();
        
        // Add tick marks
        ctx.beginPath();
        ctx.moveTo(20, size - 15);
        ctx.lineTo(20, size - 25);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(20 + scaleBarWidth, size - 15);
        ctx.lineTo(20 + scaleBarWidth, size - 25);
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`${scaleDistance}m`, 20 + scaleBarWidth / 2 - 15, size - 30);
        
        // Draw biome size variation overlay
        if (showBiomeSizeVariation) {
            // Visualize the variable scale using contour lines
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            
            // Draw contour lines showing biome size variation regions
            for (let z = 0; z < size; z += 10) {
                for (let x = 0; x < size; x += 10) {
                    const worldX = ((x / size) * range * 2) - range + playerX;
                    const worldZ = ((z / size) * range * 2) - range + playerZ;
                    
                    // Get the biome scale at this position
                    const regionVariation = perlinNoise.octaveNoise2D(
                        worldX * BIOME_SIZE_VARIATION_SCALE,
                        worldZ * BIOME_SIZE_VARIATION_SCALE,
                        1,
                        0.5
                    );
                    
                    // Only draw points at threshold boundaries to create contour effect
                    const thresholds = [0.25, 0.5, 0.75];
                    for (const threshold of thresholds) {
                        if (Math.abs(regionVariation - threshold) < 0.02) {
                            ctx.beginPath();
                            ctx.arc(x, z, 1, 0, Math.PI * 2);
                            ctx.stroke();
                            break;
                        }
                    }
                }
            }
            
            // Add a legend for biome size variation
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 150, 80);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText('Biome Size Variation:', 20, 30);
            ctx.fillText('Larger biomes', 20, 50);
            ctx.fillText('Smaller biomes', 20, 70);
            
            // Draw gradient bar
            const gradientBar = ctx.createLinearGradient(20, 80, 140, 80);
            gradientBar.addColorStop(0, 'blue');
            gradientBar.addColorStop(0.5, 'green');
            gradientBar.addColorStop(1, 'red');
            ctx.fillStyle = gradientBar;
            ctx.fillRect(20, 75, 120, 10);
            
            ctx.restore();
        }
    }
    
    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        // Remove the # if present
        hex = hex.replace('#', '');
        
        // Parse the hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return { r, g, b };
    }
    
    // Initial map rendering
    updateMap();
    
    return container;
} 