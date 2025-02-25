// Submarine collision detection and handling

import * as THREE from 'three';
import gameState from '../core/state.js';

// Check for collisions between submarine and obstacles
export function checkSubmarineCollisions(previousPosition) {
    try {
        const sub = gameState.submarine;
        if (!sub.object) return false;
        
        // Define collision parameters
        const hullLength = 25; // Length of submarine
        const collisionRadius = 12; // Increased collision radius for better detection
        let collisionDetected = false;
        let maxPenetration = 0;
        let strongestRepulsion = null;
        
        // Get submarine orientation vectors
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(sub.object.rotation);
        
        // Forward direction for collision point calculations
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(quaternion);
        
        // Define collision check points along the submarine hull
        const collisionPoints = getCollisionPoints(sub.object, forwardDirection, hullLength);
        
        // Check each obstacle against all collision points
        for (const obstacle of gameState.collisionObjects) {
            if (obstacle.userData && obstacle.userData.isObstacle) {
                const obstacleWorldPos = new THREE.Vector3();
                obstacle.getWorldPosition(obstacleWorldPos);
                
                // Check each collision point
                for (const point of collisionPoints) {
                    const distance = point.distanceTo(obstacleWorldPos);
                    const minDistance = 2 + obstacle.userData.collisionRadius; // Smaller point radius
                    
                    if (distance < minDistance) {
                        // Calculate penetration depth
                        const penetration = minDistance - distance;
                        
                        if (penetration > maxPenetration) {
                            maxPenetration = penetration;
                            
                            // Get direction away from obstacle
                            const repulsionDirection = new THREE.Vector3()
                                .subVectors(point, obstacleWorldPos)
                                .normalize();
                            
                            // Store strongest repulsion
                            strongestRepulsion = {
                                direction: repulsionDirection,
                                strength: penetration * 1.5 // Stronger repulsion factor
                            };
                        }
                        
                        collisionDetected = true;
                    }
                }
            }
        }
        
        // Apply repulsion if collision detected
        if (collisionDetected) {
            if (strongestRepulsion) {
                // Apply very strong repulsion force
                sub.object.position.addScaledVector(strongestRepulsion.direction, strongestRepulsion.strength);
            } else {
                // Fallback to previous position if no valid repulsion found
                sub.object.position.copy(previousPosition);
            }
        }
        
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