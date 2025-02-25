// Submarine camera management

import * as THREE from 'three';
import gameState from '../core/state.js';

// Update camera position and orientation to follow the submarine
export function updateSubmarineCamera() {
    try {
        if (!gameState.submarine.object) return;
        
        const sub = gameState.submarine.object;
        const camera = gameState.camera.main;
        
        // Get submarine's forward direction
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
        camera.position.copy(cameraPosition);
        
        // Look ahead of submarine
        const lookAtPoint = new THREE.Vector3().copy(sub.position);
        lookAtPoint.addScaledVector(forwardDirection, 10);
        
        camera.lookAt(lookAtPoint);
    } catch (error) {
        console.error('Error in updateSubmarineCamera:', error);
    }
}

// Set up first-person camera view inside submarine
export function setFirstPersonCamera() {
    try {
        if (!gameState.submarine.object) return;
        
        const sub = gameState.submarine.object;
        const camera = gameState.camera.main;
        
        // Position camera at submarine's "head"
        const cameraPosition = new THREE.Vector3().copy(sub.position);
        
        // Add offset to place camera in conning tower
        cameraPosition.y += 3; // Raise to conning tower height
        
        // Position camera slightly forward in sail
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(sub.quaternion);
        cameraPosition.addScaledVector(forwardDirection, 2);
        
        // Set camera position
        camera.position.copy(cameraPosition);
        
        // Set camera rotation to match submarine
        const cameraRotation = new THREE.Euler().copy(sub.rotation);
        camera.rotation.copy(cameraRotation);
        
        // Set to first-person mode
        gameState.camera.mode = 'first-person';
    } catch (error) {
        console.error('Error in setFirstPersonCamera:', error);
    }
}

// Set up third-person camera view following submarine
export function setThirdPersonCamera() {
    try {
        // Set to third-person mode
        gameState.camera.mode = 'third-person';
        
        // Update camera immediately
        updateSubmarineCamera();
    } catch (error) {
        console.error('Error in setThirdPersonCamera:', error);
    }
}

// Toggle between camera modes
export function toggleCameraMode() {
    const currentMode = gameState.camera.mode || 'third-person';
    
    if (currentMode === 'third-person') {
        setFirstPersonCamera();
    } else {
        setThirdPersonCamera();
    }
} 