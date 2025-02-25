// Water surface creation and animation

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { WORLD_SIZE } from '../core/constants.js';

// Create water surface with animations
export function createWaterSurface() {
    debug('Creating water surface');
    try {
        // Create a larger water surface
        const waterGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 64, 64);
        
        // Make water much more transparent
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x40E0D0,
            transparent: true,
            opacity: 0.3, // Much more transparent to see the ocean floor
            side: THREE.DoubleSide,
            metalness: 0.3,
            roughness: 0.4
        });
        
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0;
        water.receiveShadow = true;
        gameState.scene.add(water);
        
        // Add a second layer for depth effect - make it very transparent
        const deepWaterGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2);
        const deepWaterMaterial = new THREE.MeshStandardMaterial({
            color: 0x008080, // Darker teal for depth
            transparent: true,
            opacity: 0.2, // Very transparent
            side: THREE.DoubleSide
        });
        
        const deepWater = new THREE.Mesh(deepWaterGeometry, deepWaterMaterial);
        deepWater.rotation.x = -Math.PI / 2;
        deepWater.position.y = -5; // Slightly below the surface
        gameState.scene.add(deepWater);
        
        // Add waves animation with more pronounced effect
        animateWaves(waterGeometry);
        
        // Add water surface highlight
        createWaterSurfaceHighlight();
        
        debug('Water surface created');
        return water;
    } catch (error) {
        console.error('Error in createWaterSurface:', error);
    }
}

// Create water surface highlight effect
function createWaterSurfaceHighlight() {
    const surfaceHighlightGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 1, 1);
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