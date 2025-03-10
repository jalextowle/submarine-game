// Ocean floor creation and texturing

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { 
    OCEAN_DEPTH, 
    WORLD_SIZE,
    TERRAIN_SCALE,
    TERRAIN_HEIGHT,
    TERRAIN_OFFSET,
    TERRAIN_OCTAVES,
    TERRAIN_PERSISTENCE,
} from '../core/constants.js';
import perlinNoise from '../utils/perlinNoise.js';
import * as biomeSystem from './biomes.js';

// Created shared materials to avoid duplicate material creation
let sandTexture, sandBumpMap;
let oceanFloorMaterial;

// Cache for the dynamically imported worldChunks module
let worldChunksModule = null;

// Create the ocean floor with procedural textures
export function createOceanFloor() {
    debug('Creating ocean floor');
    try {
        // Create sand textures if they don't exist
        if (!sandTexture || !sandBumpMap) {
            const textures = createSandTextures();
            sandTexture = textures.sandTexture;
            sandBumpMap = textures.sandBumpMap;
            
            // Create material for ocean floor
            oceanFloorMaterial = new THREE.MeshStandardMaterial({
                color: 0xF5E1B3, // Brighter, golden sand color
                roughness: 0.9,
                metalness: 0.1, // Slight shimmer for underwater effect
                map: sandTexture,
                bumpMap: sandBumpMap,
                bumpScale: 0.3,
                emissive: 0xF0D890, // Subtle golden glow
                emissiveIntensity: 0.1 // Slightly increased glow
            });
        }
        
        // No longer creating a base floor - we'll rely solely on the chunked terrain
        
        // Add floor lighting
        addOceanFloorLighting();
        
        debug('Ocean floor material created. Detailed terrain will be generated in chunks.');
    } catch (error) {
        console.error('Error in createOceanFloor:', error);
    }
}

// Function to get the height of the terrain at a specific X,Z position
// This is used for collision detection with the seafloor
export function getTerrainHeightAtPosition(x, z) {
    try {
        // If we have a chunk system initialized, defer to it for infinite terrain height
        if (gameState.chunkSystem) {
            // Use cached module if available
            if (worldChunksModule) {
                return Promise.resolve(worldChunksModule.getInfiniteTerrainHeightAtPosition(x, z));
            } else {
                // Import dynamically to avoid circular dependency and cache for future use
                return import('./worldChunks.js').then(module => {
                    worldChunksModule = module; // Cache the module
                    return module.getInfiniteTerrainHeightAtPosition(x, z);
                });
            }
        }
        
        // Get biome-specific terrain parameters
        const biomeParams = biomeSystem.getTerrainParametersAtPosition(x, z);
        
        // Calculate noise value using biome-specific parameters
        const noiseValue = perlinNoise.octaveNoise2D(
            x * TERRAIN_SCALE * biomeParams.noiseScale,
            z * TERRAIN_SCALE * biomeParams.noiseScale,
            biomeParams.noiseOctaves,
            biomeParams.noisePersistence
        );
        
        // Apply biome-specific height scaling and offset
        const terrainHeight = (noiseValue * TERRAIN_HEIGHT * biomeParams.heightScale) + biomeParams.heightOffset - TERRAIN_OFFSET;
        
        // Return the actual Y position by adding the terrain height to the ocean depth
        return -OCEAN_DEPTH + terrainHeight;
    } catch (error) {
        console.error('Error calculating terrain height:', error);
        return -OCEAN_DEPTH; // Fallback to base ocean depth
    }
}

// Create procedural sand textures
function createSandTextures() {
    // Create procedural sand texture
    const sandCanvas = document.createElement('canvas');
    sandCanvas.width = 512;
    sandCanvas.height = 512;
    const ctx = sandCanvas.getContext('2d');
    
    // Fill with base sand color
    ctx.fillStyle = '#E6D5AC';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add sand grain noise
    for (let i = 0; i < 15000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 1.5 + 0.5;
        const shade = Math.random() * 30;
        
        ctx.fillStyle = `rgba(${180 - shade}, ${165 - shade}, ${130 - shade}, 0.5)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Add subtle ripples
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const length = Math.random() * 40 + 10;
        const width = Math.random() * 5 + 1;
        const angle = Math.random() * Math.PI;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        const grd = ctx.createLinearGradient(-length/2, 0, length/2, 0);
        grd.addColorStop(0, 'rgba(160, 145, 110, 0)');
        grd.addColorStop(0.5, 'rgba(160, 145, 110, 0.4)');
        grd.addColorStop(1, 'rgba(160, 145, 110, 0)');
        
        ctx.fillStyle = grd;
        ctx.fillRect(-length/2, -width/2, length, width);
        ctx.restore();
    }
    
    // Create texture from canvas
    const sandTexture = new THREE.CanvasTexture(sandCanvas);
    sandTexture.wrapS = THREE.RepeatWrapping;
    sandTexture.wrapT = THREE.RepeatWrapping;
    sandTexture.repeat.set(20, 20);
    
    // Create a bump map for sand
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bumpCtx = bumpCanvas.getContext('2d');
    
    // Fill with neutral gray (no bump)
    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, 512, 512);
    
    // Add bump details
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 3 + 1;
        const bright = Math.random() * 80;
        
        // Make small bumps (lighter = higher)
        bumpCtx.fillStyle = `rgb(${128 + bright}, ${128 + bright}, ${128 + bright})`;
        bumpCtx.beginPath();
        bumpCtx.arc(x, y, size, 0, Math.PI * 2);
        bumpCtx.fill();
    }
    
    // Add ripple bumps
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const length = Math.random() * 60 + 20;
        const width = Math.random() * 6 + 2;
        const angle = Math.random() * Math.PI;
        
        bumpCtx.save();
        bumpCtx.translate(x, y);
        bumpCtx.rotate(angle);
        
        const grd = bumpCtx.createLinearGradient(-length/2, 0, length/2, 0);
        grd.addColorStop(0, 'rgb(128, 128, 128)');
        grd.addColorStop(0.5, 'rgb(180, 180, 180)');
        grd.addColorStop(1, 'rgb(128, 128, 128)');
        
        bumpCtx.fillStyle = grd;
        bumpCtx.fillRect(-length/2, -width/2, length, width);
        bumpCtx.restore();
    }
    
    const sandBumpMap = new THREE.CanvasTexture(bumpCanvas);
    sandBumpMap.wrapS = THREE.RepeatWrapping;
    sandBumpMap.wrapT = THREE.RepeatWrapping;
    sandBumpMap.repeat.set(20, 20);
    
    return { sandTexture, sandBumpMap };
}

// Create a single detailed terrain chunk
export function createDetailedTerrainChunk(width, height, offsetX, offsetZ, terrainGroup) {
    try {
        // Use variable segment density based on chunk size for performance
        // For larger chunks, we need fewer segments per unit area
        const baseSegments = 96; // Reduced from 128 for better performance
        
        // Scale segments based on chunk size
        const scaleFactor = 500 / width;
        const segments = Math.max(48, Math.floor(baseSegments * scaleFactor)); // Reduced minimum from 64 to 48
        
        // Create the geometry directly in the XZ plane for a horizontal floor
        const terrainGeometry = new THREE.BufferGeometry();
        
        // Calculate grid size
        const gridSize = segments + 1;
        const cellSize = width / segments;
        
        // Create position array for all vertices
        const positions = new Float32Array(gridSize * gridSize * 3);
        const colors = new Float32Array(gridSize * gridSize * 3); // For vertex coloring
        const indices = [];
        
        // Use cached biome parameters to avoid recalculating for adjacent vertices
        // This improves performance by reducing redundant biome calculations
        const biomeCache = new Map();
        
        // Define color ranges based on biome types
        const biomeColors = {
            [biomeSystem.BIOME_TYPES.FLAT_SANDY]: new THREE.Color(0xF5E1B3),      // Standard sand color
            [biomeSystem.BIOME_TYPES.CONTINENTAL_SHELF]: new THREE.Color(0xFFEEBB), // Slightly brighter, more yellow sand
            [biomeSystem.BIOME_TYPES.TRENCH]: new THREE.Color(0xB59A70),           // Darker, more gray/brown sand
            [biomeSystem.BIOME_TYPES.SEAMOUNT]: new THREE.Color(0x3A7D8C),         // Teal-blue color for underwater mountains
            [biomeSystem.BIOME_TYPES.ISLAND]: new THREE.Color(0x5A9678)            // Green-tinted color for islands above water
        };
        
        // For each vertex in our grid
        for (let z = 0; z < gridSize; z++) {
            for (let x = 0; x < gridSize; x++) {
                // Calculate vertex index
                const vertexIndex = (z * gridSize + x) * 3;
                
                // Calculate world position
                const worldX = offsetX + (x * cellSize) - width/2;
                const worldZ = offsetZ + (z * cellSize) - height/2;
                
                // Get biome-specific terrain parameters with caching
                // Only calculate every few vertices to improve performance
                // (the biome distribution changes more slowly than the terrain detail)
                const cacheKey = `${Math.floor(worldX/10)},${Math.floor(worldZ/10)}`;
                let biomeParams;
                let biomeData;
                
                if (biomeCache.has(cacheKey)) {
                    const cachedData = biomeCache.get(cacheKey);
                    biomeParams = cachedData.params;
                    biomeData = cachedData.biomeData;
                } else {
                    biomeParams = biomeSystem.getTerrainParametersAtPosition(worldX, worldZ);
                    biomeData = biomeSystem.getBiomeAtPosition(worldX, worldZ);
                    biomeCache.set(cacheKey, { params: biomeParams, biomeData });
                }
                
                // Compute terrain height using Perlin noise with biome parameters
                const noiseValue = perlinNoise.octaveNoise2D(
                    worldX * TERRAIN_SCALE * biomeParams.noiseScale,
                    worldZ * TERRAIN_SCALE * biomeParams.noiseScale,
                    biomeParams.noiseOctaves,
                    biomeParams.noisePersistence
                );
                
                // Apply biome-specific scaling and offset
                const worldY = (noiseValue * TERRAIN_HEIGHT * biomeParams.heightScale) + 
                               biomeParams.heightOffset - TERRAIN_OFFSET;
                
                // Set vertex positions - directly in the XZ plane with Y as height
                positions[vertexIndex] = worldX;     // X
                positions[vertexIndex + 1] = worldY; // Y (height)
                positions[vertexIndex + 2] = worldZ; // Z
                
                // Blend colors based on biome blend factors
                const blendedColor = new THREE.Color(0);
                for (const [biomeType, factor] of Object.entries(biomeData.blendFactors)) {
                    if (factor > 0) {
                        const biomeColor = biomeColors[biomeType].clone();
                        
                        // Apply depth-based darkening to trenches
                        if (biomeType === biomeSystem.BIOME_TYPES.TRENCH) {
                            // Make deeper trenches darker
                            const depthFactor = Math.min(1.0, Math.abs(worldY) / 500);
                            biomeColor.multiplyScalar(1.0 - (depthFactor * 0.4));
                        }
                        
                        // Apply height-based coloring to seamounts
                        if (biomeType === biomeSystem.BIOME_TYPES.SEAMOUNT) {
                            // Adjust color based on height - higher parts are lighter
                            const heightFactor = Math.min(1.0, (worldY + OCEAN_DEPTH) / 400);
                            biomeColor.lerp(new THREE.Color(0x78B7C5), heightFactor * 0.5);
                        }
                        
                        // Special handling for islands that break the surface
                        if (biomeType === biomeSystem.BIOME_TYPES.ISLAND) {
                            // Above water level (approximately 0), use land colors
                            if (worldY - OCEAN_DEPTH > -10) {
                                // Calculate how far above water the terrain is (as percentage)
                                const aboveWaterFactor = Math.min(1.0, (worldY - OCEAN_DEPTH + 10) / 100);
                                
                                // Transition from underwater sand to land colors
                                // For higher elevations (beaches to grass to mountains)
                                if (aboveWaterFactor < 0.2) {
                                    // Beach - sandy color
                                    biomeColor.set(0xF5E1B3);
                                } else if (aboveWaterFactor < 0.6) {
                                    // Grassy areas
                                    const grassFactor = (aboveWaterFactor - 0.2) / 0.4;
                                    biomeColor.lerp(new THREE.Color(0x4B9E47), grassFactor);
                                } else {
                                    // Mountain/rock areas
                                    const rockFactor = (aboveWaterFactor - 0.6) / 0.4;
                                    biomeColor.lerp(new THREE.Color(0x8B7D6B), rockFactor);
                                }
                            } else {
                                // Underwater part of islands - more coral-like
                                const depthFactor = Math.min(1.0, (OCEAN_DEPTH - worldY) / 100);
                                biomeColor.lerp(new THREE.Color(0xD97941), 0.3 - (depthFactor * 0.3));
                            }
                        }
                        
                        blendedColor.add(biomeColor.multiplyScalar(factor));
                    }
                }
                
                // Set the vertex color
                colors[vertexIndex] = blendedColor.r;
                colors[vertexIndex + 1] = blendedColor.g;
                colors[vertexIndex + 2] = blendedColor.b;
                
                // Create triangles (2 per grid cell)
                // Skip the last row and column as they don't create cells
                if (x < segments && z < segments) {
                    const topLeft = z * gridSize + x;
                    const topRight = topLeft + 1;
                    const bottomLeft = (z + 1) * gridSize + x;
                    const bottomRight = bottomLeft + 1;
                    
                    // First triangle (top-left, bottom-left, top-right)
                    indices.push(topLeft, bottomLeft, topRight);
                    
                    // Second triangle (top-right, bottom-left, bottom-right)
                    indices.push(topRight, bottomLeft, bottomRight);
                }
            }
        }
        
        // Clear the cache to free memory
        biomeCache.clear();
        
        // Add position attribute to the geometry
        terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Add vertex colors to the geometry
        terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Add face indices
        terrainGeometry.setIndex(indices);
        
        // Compute vertex normals for proper lighting
        terrainGeometry.computeVertexNormals();
        
        // Create material that uses vertex colors
        const terrainMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.1,
            map: sandTexture,
            bumpMap: sandBumpMap,
            bumpScale: 0.3,
            emissive: 0x555555, // Subtle glow
            emissiveIntensity: 0.05
        });
        
        // Create mesh with material
        const terrainMesh = new THREE.Mesh(
            terrainGeometry,
            terrainMaterial
        );
        
        // Position mesh so it's centered at the given offset
        terrainMesh.position.set(0, -OCEAN_DEPTH, 0);
        
        // Set name for easy identification
        terrainMesh.name = `TerrainChunk_${offsetX}_${offsetZ}`;
        
        // Add custom userData for LOD management
        terrainMesh.userData = {
            isTerrainChunk: true,
            chunkOffset: { x: offsetX, z: offsetZ },
            chunkSize: width
        };
        
        return terrainMesh;
    } catch (error) {
        console.error('Error creating detailed terrain chunk:', error);
        return createFallbackChunk(offsetX, offsetZ, width, height);
    }
}

// Add lighting for ocean floor
function addOceanFloorLighting() {
    // Add spotlight for dramatic lighting on ocean floor
    const spotLight = new THREE.SpotLight(0x8CFFFF, 0.8); // Brighter, more tropical blue
    spotLight.position.set(0, 100, 0);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.1;
    spotLight.decay = 1;
    spotLight.distance = 1000;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    gameState.scene.add(spotLight);
    
    // Add ambient light for general visibility - brighter and more blue for tropical waters
    const ambientLight = new THREE.AmbientLight(0x6AADE0, 3.5); // Increased intensity, bluer tone
    gameState.scene.add(ambientLight);
}

// Debug function to show terrain information
export function debugTerrain() {
    // Toggle existing debug panel if it already exists
    const existingPanel = document.getElementById('terrain-debug');
    if (existingPanel) {
        if (existingPanel.style.display === 'none') {
            existingPanel.style.display = 'block';
        } else {
            existingPanel.style.display = 'none';
        }
        return;
    }
    
    // Otherwise, create the debug panel
    const debugContainer = document.createElement('div');
    debugContainer.id = 'terrain-debug';
    
    // Add basic styling
    debugContainer.style.position = 'absolute';
    debugContainer.style.top = '50px';
    debugContainer.style.right = '20px';
    debugContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
    debugContainer.style.border = '2px solid #40E0D0';
    debugContainer.style.borderRadius = '10px';
    debugContainer.style.padding = '15px';
    debugContainer.style.color = '#FFFFFF';
    debugContainer.style.fontFamily = 'Arial, sans-serif';
    debugContainer.style.zIndex = '1000';
    debugContainer.style.boxShadow = '0 0 10px rgba(64, 224, 208, 0.7)';
    debugContainer.style.width = '300px';
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Terrain Debug Panel';
    title.style.textAlign = 'center';
    title.style.margin = '0 0 15px 0';
    title.style.color = '#40E0D0';
    title.style.fontSize = '18px';
    title.style.textShadow = '0 0 5px rgba(64, 224, 208, 0.7)';
    debugContainer.appendChild(title);
    
    // Default values - we'll use the module-level constants
    const defaultValues = {
        scale: TERRAIN_SCALE,
        height: TERRAIN_HEIGHT,
        offset: TERRAIN_OFFSET,
        octaves: TERRAIN_OCTAVES,
        persistence: TERRAIN_PERSISTENCE,
        wireframe: false
    };
    
    // Current parameter values
    const currentValues = { ...defaultValues };
    
    // Create parameter sliders
    const parameters = [
        { name: 'Scale', min: 0.001, max: 0.05, step: 0.001, key: 'scale', initial: defaultValues.scale },
        { name: 'Height', min: 5, max: 100, step: 1, key: 'height', initial: defaultValues.height },
        { name: 'Offset', min: 0, max: 50, step: 1, key: 'offset', initial: defaultValues.offset },
        { name: 'Octaves', min: 1, max: 8, step: 1, key: 'octaves', initial: defaultValues.octaves },
        { name: 'Persistence', min: 0.1, max: 0.9, step: 0.05, key: 'persistence', initial: defaultValues.persistence }
    ];
    
    // Create sliders
    parameters.forEach(param => {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';
        
        const label = document.createElement('label');
        label.textContent = `${param.name}: `;
        label.style.display = 'inline-block';
        label.style.width = '100px';
        label.style.color = '#FFFFFF';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = param.min;
        slider.max = param.max;
        slider.step = param.step;
        slider.value = param.initial;
        slider.style.width = '120px';
        slider.style.verticalAlign = 'middle';
        
        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = param.initial;
        valueDisplay.style.marginLeft = '10px';
        valueDisplay.style.width = '50px';
        valueDisplay.style.display = 'inline-block';
        valueDisplay.style.color = '#FFFFFF';
        
        // Update value display when slider changes
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            valueDisplay.textContent = value;
            currentValues[param.key] = value;
        });
        
        container.appendChild(label);
        container.appendChild(slider);
        container.appendChild(valueDisplay);
        debugContainer.appendChild(container);
    });
    
    // Add wireframe toggle - direct update for immediate feedback
    const wireframeContainer = document.createElement('div');
    wireframeContainer.style.marginBottom = '15px';
    wireframeContainer.style.marginTop = '15px';
    
    const wireframeLabel = document.createElement('label');
    wireframeLabel.textContent = 'Wireframe: ';
    wireframeLabel.style.display = 'inline-block';
    wireframeLabel.style.width = '100px';
    wireframeLabel.style.color = '#FFFFFF';
    
    const wireframeToggle = document.createElement('input');
    wireframeToggle.type = 'checkbox';
    wireframeToggle.checked = defaultValues.wireframe;
    wireframeToggle.style.transform = 'scale(1.5)';
    wireframeToggle.style.verticalAlign = 'middle';
    
    // Add a span to indicate the current state
    const wireframeStatus = document.createElement('span');
    wireframeStatus.textContent = wireframeToggle.checked ? 'ON' : 'OFF';
    wireframeStatus.style.marginLeft = '10px';
    wireframeStatus.style.fontWeight = 'bold';
    wireframeStatus.style.color = wireframeToggle.checked ? '#40E0D0' : '#FF6B6B';
    
    // Apply wireframe immediately on toggle
    wireframeToggle.addEventListener('change', () => {
        currentValues.wireframe = wireframeToggle.checked;
        wireframeStatus.textContent = wireframeToggle.checked ? 'ON' : 'OFF';
        wireframeStatus.style.color = wireframeToggle.checked ? '#40E0D0' : '#FF6B6B';
        
        // Find all floor meshes and update wireframe
        if (gameState.scene) {
            gameState.scene.traverse(object => {
                if (object.isMesh && (
                    object.position.y === -OCEAN_DEPTH || 
                    object.position.y === -OCEAN_DEPTH - 1
                )) {
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(mat => {
                                mat.wireframe = wireframeToggle.checked;
                                mat.needsUpdate = true;
                            });
                        } else {
                            object.material.wireframe = wireframeToggle.checked;
                            object.material.needsUpdate = true;
                        }
                        console.log(`Set wireframe ${wireframeToggle.checked ? 'ON' : 'OFF'} for mesh at y=${object.position.y}`);
                    }
                }
            });
        }
    });
    
    wireframeContainer.appendChild(wireframeLabel);
    wireframeContainer.appendChild(wireframeToggle);
    wireframeContainer.appendChild(wireframeStatus);
    debugContainer.appendChild(wireframeContainer);
    
    // Divider
    const divider = document.createElement('hr');
    divider.style.border = '1px solid rgba(64, 224, 208, 0.3)';
    divider.style.margin = '15px 0';
    debugContainer.appendChild(divider);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '15px';
    
    // Add apply button
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply Changes';
    applyButton.style.backgroundColor = '#40E0D0';
    applyButton.style.color = '#000000';
    applyButton.style.border = 'none';
    applyButton.style.padding = '8px 12px';
    applyButton.style.borderRadius = '5px';
    applyButton.style.cursor = 'pointer';
    applyButton.style.fontWeight = 'bold';
    applyButton.style.flex = '1';
    applyButton.style.marginRight = '5px';
    applyButton.style.boxShadow = '0 0 5px rgba(64, 224, 208, 0.7)';
    
    applyButton.addEventListener('click', () => {
        // Remove existing floor meshes
        if (gameState.scene) {
            const meshesToRemove = [];
            gameState.scene.traverse(object => {
                if (object.isMesh && (
                    object.position.y === -OCEAN_DEPTH || 
                    object.position.y === -OCEAN_DEPTH - 1 ||
                    object.position.y === -OCEAN_DEPTH - 5 // Also remove adjusted base floor
                )) {
                    meshesToRemove.push(object);
                }
            });
            
            meshesToRemove.forEach(mesh => {
                gameState.scene.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(mat => mat.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }
            });
            
            console.log(`Removed ${meshesToRemove.length} existing floor meshes`);
        }
        
        // Generate new terrain with custom parameters
        const { sandTexture, sandBumpMap } = createSandTextures();
        
        // Create the detailed floor with custom parameters
        const floor = createDetailedFloorWithParams(
            currentValues.scale,
            currentValues.height,
            currentValues.offset, 
            currentValues.octaves,
            currentValues.persistence
        );
        
        // Apply wireframe setting to the floor material
        if (floor && floor.material) {
            if (Array.isArray(floor.material)) {
                // Handle multi-material case
                floor.material.forEach(mat => {
                    mat.wireframe = currentValues.wireframe;
                    // For wireframe mode, flat shading can be helpful to see the structure better
                    mat.flatShading = currentValues.wireframe;
                    mat.needsUpdate = true;
                });
            } else {
                // Single material case
                floor.material.wireframe = currentValues.wireframe;
                // Also update flatShading based on wireframe for better visualization
                floor.material.flatShading = currentValues.wireframe;
                if (currentValues.wireframe) {
                    floor.material.needsUpdate = true;
                }
            }
        }
        
        // Create success message with details
        const messageContainer = document.createElement('div');
        messageContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
        messageContainer.style.padding = '10px';
        messageContainer.style.borderRadius = '5px';
        messageContainer.style.marginTop = '10px';
        
        const message = document.createElement('div');
        message.textContent = 'Terrain updated successfully!';
        message.style.color = '#40E0D0';
        message.style.textAlign = 'center';
        message.style.fontWeight = 'bold';
        
        // Add details about the update
        const details = document.createElement('div');
        details.innerHTML = `
            Scale: ${currentValues.scale.toFixed(4)}<br>
            Height: ${currentValues.height.toFixed(1)}<br>
            Wireframe: ${currentValues.wireframe ? 'ON' : 'OFF'}
        `;
        details.style.color = '#FFFFFF';
        details.style.fontSize = '12px';
        details.style.marginTop = '5px';
        
        messageContainer.appendChild(message);
        messageContainer.appendChild(details);
        debugContainer.appendChild(messageContainer);
        
        setTimeout(() => {
            if (debugContainer.contains(messageContainer)) {
                debugContainer.removeChild(messageContainer);
            }
        }, 3000);
        
        console.log('Terrain updated with parameters:', {
            ...currentValues,
            wireframeEnabled: currentValues.wireframe
        });
    });
    
    buttonContainer.appendChild(applyButton);
    
    // Add reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset';
    resetButton.style.backgroundColor = '#FF6B6B';
    resetButton.style.color = '#FFFFFF';
    resetButton.style.border = 'none';
    resetButton.style.padding = '8px 12px';
    resetButton.style.borderRadius = '5px';
    resetButton.style.cursor = 'pointer';
    resetButton.style.fontWeight = 'bold';
    resetButton.style.flex = '1';
    resetButton.style.marginLeft = '5px';
    resetButton.style.boxShadow = '0 0 5px rgba(255, 107, 107, 0.7)';
    
    resetButton.addEventListener('click', () => {
        // Reset current values
        Object.assign(currentValues, defaultValues);
        
        // Update slider values
        const sliders = debugContainer.querySelectorAll('input[type="range"]');
        const displays = debugContainer.querySelectorAll('span');
        
        parameters.forEach((param, index) => {
            sliders[index].value = param.initial;
            displays[index].textContent = param.initial;
        });
        
        // Reset wireframe toggle
        wireframeToggle.checked = defaultValues.wireframe;
    });
    
    buttonContainer.appendChild(resetButton);
    debugContainer.appendChild(buttonContainer);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close Panel';
    closeButton.style.backgroundColor = '#888888';
    closeButton.style.color = '#FFFFFF';
    closeButton.style.border = 'none';
    closeButton.style.padding = '8px 12px';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.width = '100%';
    closeButton.style.marginTop = '10px';
    
    closeButton.addEventListener('click', () => {
        debugContainer.style.display = 'none';
    });
    
    debugContainer.appendChild(closeButton);
    
    // Add message area for notifications
    const messageArea = document.createElement('div');
    messageArea.id = 'terrain-debug-messages';
    messageArea.style.marginTop = '10px';
    messageArea.style.minHeight = '50px';
    debugContainer.appendChild(messageArea);
    
    // Add panel to document
    document.body.appendChild(debugContainer);
    
    // Inform user through console
    console.log('Terrain debug panel created');
}

// Function to create detailed floor with custom terrain parameters
function createDetailedFloorWithParams(scale, height, offset, octaves, persistence) {
    // Create sand textures
    const { sandTexture, sandBumpMap } = createSandTextures();

    // Use a smaller number of segments for debugging if wireframe is enabled
    const segments = 128; // Reduced for better performance and clearer wireframe
    
    // Create the geometry directly in the XZ plane for a horizontal floor
    // We'll manually construct our terrain using BufferGeometry for more control
    const terrainGeometry = new THREE.BufferGeometry();
    
    // Calculate grid size
    const gridSize = segments + 1;
    const halfSize = WORLD_SIZE;
    const cellSize = (WORLD_SIZE * 2) / segments;
    
    // Create position array for all vertices
    const positions = new Float32Array(gridSize * gridSize * 3); // 3 components per vertex
    const indices = [];
    
    // Track min/max heights for debugging
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    
    // For each vertex in our grid
    for (let z = 0; z < gridSize; z++) {
        for (let x = 0; x < gridSize; x++) {
            // Calculate vertex index
            const vertexIndex = (z * gridSize + x) * 3;
            
            // Calculate world position
            const worldX = (x * cellSize) - halfSize;
            const worldZ = (z * cellSize) - halfSize;
            
            // Instead of using fixed values, get biome parameters for a more interesting debug view
            const biomeParams = biomeSystem.getTerrainParametersAtPosition(worldX, worldZ);
            
            // Compute terrain height using Perlin noise - but incorporate biome influence
            const noiseValue = perlinNoise.octaveNoise2D(
                worldX * scale * biomeParams.noiseScale,
                worldZ * scale * biomeParams.noiseScale,
                octaves,
                persistence
            );
            
            // Apply scaling and offset with biome influence
            const worldY = noiseValue * height * biomeParams.heightScale - 
                         (offset + biomeParams.heightOffset * 0.5); // Blend with biome parameters
            
            // Track min/max heights
            minHeight = Math.min(minHeight, worldY);
            maxHeight = Math.max(maxHeight, worldY);
            
            // Set vertex positions - directly in the XZ plane with Y as height
            positions[vertexIndex] = worldX;     // X
            positions[vertexIndex + 1] = worldY; // Y (height)
            positions[vertexIndex + 2] = worldZ; // Z
            
            // Create triangles (2 per grid cell)
            // Skip the last row and column as they don't create cells
            if (x < segments && z < segments) {
                // Get indices of the 4 corners of this grid cell
                const a = z * gridSize + x;
                const b = z * gridSize + (x + 1);
                const c = (z + 1) * gridSize + x;
                const d = (z + 1) * gridSize + (x + 1);
                
                // Create two triangles for this cell
                indices.push(a, c, b); // Triangle 1
                indices.push(c, d, b); // Triangle 2
            }
        }
    }
    
    // Set the attributes for our geometry
    terrainGeometry.setIndex(indices);
    terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Compute normals for proper lighting
    terrainGeometry.computeVertexNormals();
    
    // Generate UVs for texturing
    const uvs = new Float32Array(gridSize * gridSize * 2); // 2 components per UV
    
    for (let z = 0; z < gridSize; z++) {
        for (let x = 0; x < gridSize; x++) {
            const uvIndex = (z * gridSize + x) * 2;
            uvs[uvIndex] = x / segments;
            uvs[uvIndex + 1] = z / segments;
        }
    }
    
    terrainGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    // Create a material that has wireframe capability
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xF0E6C8, // Sandy color
        roughness: 0.9,
        metalness: 0.0,
        map: sandTexture,
        bumpMap: sandBumpMap,
        bumpScale: 0.5,
        flatShading: false, // Smooth by default
        emissive: 0xF0E6C8, // Match main color
        emissiveIntensity: 0.1, // Subtle glow
        wireframe: false // Will be set by debug panel
    });
    
    // Create the floor mesh
    const floor = new THREE.Mesh(terrainGeometry, floorMaterial);
    
    // No rotation needed as we built it in the XZ plane directly
    
    // Position at ocean depth
    floor.position.y = -OCEAN_DEPTH;
    
    // Enable shadows
    floor.receiveShadow = true;
    floor.castShadow = false;
    
    // Add to scene
    gameState.scene.add(floor);
    
    // Log details for debugging
    console.log('Created new ocean floor terrain:', {
        scale, height, offset, octaves, persistence,
        heightRange: { min: minHeight, max: maxHeight },
        terrainStats: {
            vertices: gridSize * gridSize,
            triangles: indices.length / 3,
            gridSize: `${gridSize}x${gridSize}`,
            dimensions: `${WORLD_SIZE * 2}x${WORLD_SIZE * 2}`
        }
    });
    
    return floor;
}

// Create a simple fallback chunk in case of errors
function createFallbackChunk(offsetX, offsetZ, width, height) {
    try {
        // Create a simple plane as fallback
        const geometry = new THREE.PlaneGeometry(width, height, 4, 4);
        geometry.rotateX(-Math.PI / 2); // Rotate to horizontal
        
        // Create a simple material
        const material = createDefaultMaterial();
        
        // Create mesh
        const fallbackMesh = new THREE.Mesh(geometry, material);
        
        // Position at correct location
        fallbackMesh.position.set(offsetX, -OCEAN_DEPTH, offsetZ);
        
        return fallbackMesh;
    } catch (error) {
        console.error('Error creating fallback chunk:', error);
        return null;
    }
}

// Create a default material when needed
function createDefaultMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xF5E1B3, // Brighter, more golden sand color
        roughness: 0.9,
        metalness: 0.1, // Slight shimmer for underwater sand
        emissive: 0xF0D890, // Subtle golden glow
        emissiveIntensity: 0.1, // Low intensity glow
    });
} 