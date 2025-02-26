// Water surface creation and animation

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { WORLD_SIZE } from '../core/constants.js';

// Store references to water objects for repositioning
let waterSurface, deepWaterLayer, surfaceHighlight;
const WATER_SIZE = WORLD_SIZE * 5; // Larger water surface to cover more area

// Create water surface with animations
export function createWaterSurface() {
    debug('Creating water surface');
    try {
        // Create a larger water surface
        const waterGeometry = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, 64, 64);
        
        // Make water much more transparent
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x40E0D0,
            transparent: true,
            opacity: 0.3, // Much more transparent to see the ocean floor
            side: THREE.DoubleSide,
            metalness: 0.3,
            roughness: 0.4
        });
        
        waterSurface = new THREE.Mesh(waterGeometry, waterMaterial);
        waterSurface.rotation.x = -Math.PI / 2;
        waterSurface.position.y = 0;
        waterSurface.receiveShadow = true;
        gameState.scene.add(waterSurface);
        
        // Add a second layer for depth effect - make it very transparent
        const deepWaterGeometry = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE);
        const deepWaterMaterial = new THREE.MeshStandardMaterial({
            color: 0x008080, // Darker teal for depth
            transparent: true,
            opacity: 0.2, // Very transparent
            side: THREE.DoubleSide
        });
        
        deepWaterLayer = new THREE.Mesh(deepWaterGeometry, deepWaterMaterial);
        deepWaterLayer.rotation.x = -Math.PI / 2;
        deepWaterLayer.position.y = -5; // Slightly below the surface
        gameState.scene.add(deepWaterLayer);
        
        // Add waves animation with more pronounced effect
        animateWaves(waterGeometry);
        
        // Add water surface highlight
        surfaceHighlight = createWaterSurfaceHighlight();
        
        debug('Water surface created');
        return waterSurface;
    } catch (error) {
        console.error('Error in createWaterSurface:', error);
    }
}

// Create water surface highlight effect
function createWaterSurfaceHighlight() {
    const surfaceHighlightGeometry = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, 1, 1);
    const surfaceHighlightMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    
    const surfaceHighlight = new THREE.Mesh(surfaceHighlightGeometry, surfaceHighlightMaterial);
    surfaceHighlight.rotation.x = -Math.PI / 2;
    surfaceHighlight.position.y = 0.5; // Slightly above the surface
    gameState.scene.add(surfaceHighlight);
    
    return surfaceHighlight;
}

// Animate waves on water surface
function animateWaves(waterGeometry) {
    const vertices = waterGeometry.attributes.position.array;
    
    const waveAnimation = () => {
        if (gameState.gameOver) return;
        
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            vertices[i + 1] = Math.sin(x * 0.05 + time) * Math.sin(z * 0.05 + time) * 3;
        }
        
        waterGeometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(waveAnimation);
    };
    
    waveAnimation();
}

// Update water position to follow the submarine
export function updateWaterPosition() {
    if (!waterSurface || !deepWaterLayer || !surfaceHighlight || !gameState.submarine.object) {
        return;
    }
    
    try {
        // Get the submarine's position
        const submarinePos = gameState.submarine.object.position;
        
        // Update water positions to follow submarine (only X and Z)
        waterSurface.position.x = submarinePos.x;
        waterSurface.position.z = submarinePos.z;
        
        deepWaterLayer.position.x = submarinePos.x;
        deepWaterLayer.position.z = submarinePos.z;
        
        surfaceHighlight.position.x = submarinePos.x;
        surfaceHighlight.position.z = submarinePos.z;
    } catch (error) {
        console.error('Error in updateWaterPosition:', error);
    }
} 