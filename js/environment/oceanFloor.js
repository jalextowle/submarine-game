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
import { createObstacles } from './obstacles.js';
import perlinNoise from '../utils/perlinNoise.js';

// Create the ocean floor with procedural textures
export function createOceanFloor() {
    debug('Creating ocean floor');
    try {
        // Create sand textures
        const { sandTexture, sandBumpMap } = createSandTextures();
        
        // Create base floor (flat, large area)
        createBaseFloor(sandTexture, sandBumpMap);
        
        // Create detailed floor with terrain
        createDetailedFloor(sandTexture, sandBumpMap);
        
        // Add floor lighting
        addOceanFloorLighting();
        
        // Create obstacles (rocks)
        createObstacles();
        
        debug('Realistic sandy ocean floor created');
    } catch (error) {
        console.error('Error in createOceanFloor:', error);
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

// Create large flat base floor
function createBaseFloor(sandTexture, sandBumpMap) {
    const baseFloorGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4);
    const baseFloorMaterial = new THREE.MeshStandardMaterial({
        color: 0xEADAB5, // Light sandy beige
        roughness: 1.0,
        metalness: 0.0, // No metalness for sand
        map: sandTexture,
        bumpMap: sandBumpMap,
        bumpScale: 0.3,
        emissive: 0xEADAB5, // Match base color for subtle light contribution
        emissiveIntensity: 0.05 // Very subtle glow
    });
    
    const baseFloor = new THREE.Mesh(baseFloorGeometry, baseFloorMaterial);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -OCEAN_DEPTH - 1; // Slightly below the detailed floor
    baseFloor.receiveShadow = true;
    gameState.scene.add(baseFloor);
    
    return baseFloor;
}

// Create detailed floor with terrain
function createDetailedFloor(sandTexture, sandBumpMap) {
    // Use a smaller number of segments for better wireframe rendering if needed
    const segments = 128;
    
    // Create the geometry directly in the XZ plane for a horizontal floor
    // We'll manually construct our terrain using BufferGeometry
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
            
            // Compute terrain height using Perlin noise
            const noiseValue = perlinNoise.octaveNoise2D(
                worldX * TERRAIN_SCALE,
                worldZ * TERRAIN_SCALE,
                TERRAIN_OCTAVES,
                TERRAIN_PERSISTENCE
            );
            
            // Apply scaling and offset
            const worldY = noiseValue * TERRAIN_HEIGHT - TERRAIN_OFFSET;
            
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
        wireframe: false // Will be set by debug panel if needed
    });
    
    // Create the floor mesh
    const floor = new THREE.Mesh(terrainGeometry, floorMaterial);
    
    // Position at ocean depth
    floor.position.y = -OCEAN_DEPTH;
    
    // Enable shadows
    floor.receiveShadow = true;
    floor.castShadow = false;
    
    // Add to scene
    gameState.scene.add(floor);
    
    // Log details for debugging
    console.log('Created ocean floor terrain:', {
        scale: TERRAIN_SCALE,
        height: TERRAIN_HEIGHT,
        offset: TERRAIN_OFFSET,
        octaves: TERRAIN_OCTAVES,
        persistence: TERRAIN_PERSISTENCE,
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

// Add additional lighting specific to the ocean floor
function addOceanFloorLighting() {
    // Add a central spotlight for the floor
    const floorLight = new THREE.SpotLight(0xFFFFFF, 2.0); // Much brighter, whiter light
    floorLight.position.set(0, -OCEAN_DEPTH + 150, 0); 
    floorLight.target.position.set(0, -OCEAN_DEPTH, 0);
    floorLight.angle = Math.PI / 3;
    floorLight.penumbra = 0.5;
    floorLight.decay = 1.0; // Less decay
    floorLight.distance = 400; // Greater distance
    floorLight.castShadow = true;
    floorLight.shadow.mapSize.width = 2048; // Higher resolution shadows
    floorLight.shadow.mapSize.height = 2048;
    floorLight.shadow.bias = -0.0005; // Reduce shadow artifacts
    gameState.scene.add(floorLight);
    gameState.scene.add(floorLight.target);
    
    // Add additional spot lights at different angles to enhance visibility
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const offsetX = Math.cos(angle) * 200;
        const offsetZ = Math.sin(angle) * 200;
        
        const additionalLight = new THREE.SpotLight(0xFFFFFF, 1.5);
        additionalLight.position.set(
            offsetX, 
            -OCEAN_DEPTH + 120, 
            offsetZ
        );
        additionalLight.target.position.set(
            offsetX * 0.5, 
            -OCEAN_DEPTH, 
            offsetZ * 0.5
        );
        additionalLight.angle = Math.PI / 4;
        additionalLight.penumbra = 0.7;
        additionalLight.decay = 1.0;
        additionalLight.distance = 400;
        additionalLight.castShadow = true;
        additionalLight.shadow.mapSize.width = 1024;
        additionalLight.shadow.mapSize.height = 1024;
        
        gameState.scene.add(additionalLight);
        gameState.scene.add(additionalLight.target);
    }
    
    // Add a strong ambient light at the floor level to ensure it's well-lit
    const floorAmbientLight = new THREE.AmbientLight(0xFFFFFF, 0.8); // Brighter ambient light
    floorAmbientLight.position.set(0, -OCEAN_DEPTH + 50, 0);
    gameState.scene.add(floorAmbientLight);
}

// Debug function to visualize and adjust terrain parameters
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
            
            // Compute terrain height using Perlin noise
            const noiseValue = perlinNoise.octaveNoise2D(
                worldX * scale,
                worldZ * scale,
                octaves,
                persistence
            );
            
            // Apply scaling and offset
            const worldY = noiseValue * height - offset;
            
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
    
    // Create the base floor under the detailed terrain
    const baseFloor = createBaseFloor(sandTexture, sandBumpMap);
    baseFloor.position.y = -OCEAN_DEPTH - 5; // Position below the terrain
    
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