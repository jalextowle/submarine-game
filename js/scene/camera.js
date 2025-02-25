// Camera setup and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';

// Setup the main camera
export function setupCamera() {
    debug('Setting up camera');
    
    // Create camera
    gameState.camera.main = new THREE.PerspectiveCamera(
        60, window.innerWidth / window.innerHeight, 0.1, 2000
    );
    
    // Position camera behind the submarine (negative Z)
    gameState.camera.main.position.set(0, 10, -30);
    gameState.camera.main.lookAt(0, 0, 0);
    
    return gameState.camera.main;
}

// Update camera position to follow submarine
export function updateCamera() {
    try {
        if (!gameState.submarine.object) return;
        
        const sub = gameState.submarine.object;
        
        // Always use third-person view
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(sub.quaternion);
        
        // Position camera behind and above submarine
        const cameraPosition = new THREE.Vector3();
        cameraPosition.copy(sub.position);
        
        // Calculate position behind submarine
        cameraPosition.addScaledVector(forwardDirection, -gameState.camera.followDistance);
        
        // Add height offset
        cameraPosition.y += gameState.camera.heightOffset;
        
        // Set camera position
        gameState.camera.main.position.copy(cameraPosition);
        
        // Look ahead of submarine
        const lookAtPoint = new THREE.Vector3().copy(sub.position);
        lookAtPoint.addScaledVector(forwardDirection, 10);
        
        gameState.camera.main.lookAt(lookAtPoint);
    } catch (error) {
        console.error('Error in updateCamera:', error);
    }
} 