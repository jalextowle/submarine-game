// Submarine collision detection and handling

import * as THREE from 'three';
import gameState from '../core/state.js';
import { SURFACE_LEVEL } from '../core/constants.js';

// Check for collisions between submarine and terrain or other elements
export function checkSubmarineCollisions(previousPosition) {
    try {
        const sub = gameState.submarine;
        if (!sub.object) return false;
        
        // Define collision parameters
        const hullLength = 25; // Length of submarine
        const collisionRadius = 12; // Increased collision radius for better detection
        let collisionDetected = false;
        
        // Get submarine orientation vectors
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(sub.object.rotation);
        
        // Forward direction for collision point calculations
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(quaternion);
        
        // Define collision check points along the submarine hull
        const collisionPoints = getCollisionPoints(sub.object, forwardDirection, hullLength);
        
        // With obstacles removed, we can implement terrain collision detection here in the future
        // No longer restricting submarine from going above water

        // Check for collisions with ocean floor or other objects can be added here
        
        return collisionDetected;
    } catch (error) {
        console.error('Error in checkSubmarineCollisions:', error);
        return false;
    }
}

// Calculate multiple collision points around the submarine for better collision detection
function getCollisionPoints(submarineObj, forwardDirection, hullLength) {
    const points = [];
    
    // Center point
    points.push(submarineObj.position.clone());
    
    // Front point (bow)
    points.push(submarineObj.position.clone().addScaledVector(forwardDirection, hullLength * 0.5));
    
    // Back point (stern)
    points.push(submarineObj.position.clone().addScaledVector(forwardDirection, -hullLength * 0.5));
    
    // Top point (conning tower)
    points.push(submarineObj.position.clone().add(new THREE.Vector3(0, 3, 0)));
    
    // Left point (port side)
    points.push(submarineObj.position.clone().add(
        new THREE.Vector3(-3, 0, 0).applyQuaternion(submarineObj.quaternion)
    ));
    
    // Right point (starboard side)
    points.push(submarineObj.position.clone().add(
        new THREE.Vector3(3, 0, 0).applyQuaternion(submarineObj.quaternion)
    ));
    
    return points;
}

// Get collision points for visualization or debugging
export function getDebugCollisionPoints() {
    const sub = gameState.submarine;
    if (!sub.object) return [];
    
    // Get submarine orientation vectors
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(sub.object.rotation);
    
    // Forward direction for collision point calculations
    const forwardDirection = new THREE.Vector3(0, 0, -1);
    forwardDirection.applyQuaternion(quaternion);
    
    // Define collision check points
    return getCollisionPoints(sub.object, forwardDirection, 25);
} 