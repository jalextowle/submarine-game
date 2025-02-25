// Lighting setup and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { OCEAN_DEPTH, WORLD_SIZE } from '../core/constants.js';

// Setup all scene lighting
export function setupLighting() {
    debug('Setting up scene lighting');
    
    // Add brighter ambient light
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.9);
    gameState.scene.add(ambientLight);
    
    // Add directional light (sun)
    setupSunlight();
    
    // Add underwater lighting
    setupUnderwaterLighting();
    
    // Add ocean floor lighting
    setupOceanFloorLighting();
    
    debug('Lighting setup complete');
}

// Setup sun light
function setupSunlight() {
    // Add stronger directional light (sun) with improved shadow settings
    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.8);
    sunLight.position.set(100, 100, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;  // Increased for better shadow quality
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -150;
    sunLight.shadow.camera.right = 150;
    sunLight.shadow.camera.top = 150;
    sunLight.shadow.camera.bottom = -150;
    sunLight.shadow.bias = -0.0005;  // Reduces shadow acne
    gameState.scene.add(sunLight);
}

// Setup underwater lighting
function setupUnderwaterLighting() {
    // Add underwater light with tropical blue color
    const underwaterLight = new THREE.PointLight(0x00FFFF, 0.8, 200);
    underwaterLight.position.set(0, -50, 0);
    gameState.scene.add(underwaterLight);
}

// Setup ocean floor lighting
function setupOceanFloorLighting() {
    // Add a strong warm light at the bottom to illuminate the ocean floor
    const floorAmbientLight = new THREE.AmbientLight(0xFFD700, 0.6);
    floorAmbientLight.position.set(0, -OCEAN_DEPTH, 0);
    gameState.scene.add(floorAmbientLight);
    
    // Add multiple spotlights to illuminate the ocean floor with shadows
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const radius = WORLD_SIZE / 4;
        
        const spotLight = new THREE.SpotLight(0xFFFFAA, 1.0);
        spotLight.position.set(
            Math.cos(angle) * radius, 
            -OCEAN_DEPTH + 100, 
            Math.sin(angle) * radius
        );
        spotLight.target.position.set(
            Math.cos(angle) * radius, 
            -OCEAN_DEPTH, 
            Math.sin(angle) * radius
        );
        spotLight.angle = Math.PI / 3;
        spotLight.penumbra = 0.5;
        spotLight.decay = 1.5;
        spotLight.distance = 300;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        
        gameState.scene.add(spotLight);
        gameState.scene.add(spotLight.target);
    }
} 