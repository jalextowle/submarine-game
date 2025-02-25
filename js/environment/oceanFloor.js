// Ocean floor creation and texturing

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { OCEAN_DEPTH, WORLD_SIZE } from '../core/constants.js';
import { createObstacles } from './obstacles.js';

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
    // Create a larger and more detailed ocean floor
    const floorGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 256, 256);
    
    // Create more pronounced height variations for the ocean floor
    const vertices = floorGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        // Create a more varied terrain with hills and valleys
        const x = vertices[i];
        const z = vertices[i + 2];
        const distance = Math.sqrt(x * x + z * z) / 100;
        
        // Combine multiple noise patterns for more natural terrain
        vertices[i + 1] = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15 + 
                         Math.sin(x * 0.1 + z * 0.1) * 5 +
                         Math.cos(distance) * 10 +
                         Math.sin(x * 0.3) * Math.sin(z * 0.2) * 2; // Add more detail
    }
    
    floorGeometry.attributes.position.needsUpdate = true;
    floorGeometry.computeVertexNormals();
    
    // Create a more realistic sandy floor with texture
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xF0E6C8, // Sandy color
        roughness: 0.9,
        metalness: 0.0,
        map: sandTexture,
        bumpMap: sandBumpMap,
        bumpScale: 0.5,
        flatShading: false, // Smoother look
        emissive: 0xF0E6C8, // Match main color
        emissiveIntensity: 0.1 // Subtle glow
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -OCEAN_DEPTH;
    floor.receiveShadow = true;
    gameState.scene.add(floor);
    
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