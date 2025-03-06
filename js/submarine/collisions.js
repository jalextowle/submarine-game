// Submarine collision detection and handling

import * as THREE from 'three';
import gameState from '../core/state.js';
import { SURFACE_LEVEL } from '../core/constants.js';
import { createExplosion } from '../effects/explosions.js';

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
        
        // Check for collisions with sharks
        if (gameState.sharks && gameState.sharks.length > 0) {
            checkSharkCollisions(collisionPoints, hullLength);
        }
        
        return collisionDetected;
    } catch (error) {
        console.error('Error in checkSubmarineCollisions:', error);
        return false;
    }
}

// Check for collisions between submarine and sharks
function checkSharkCollisions(collisionPoints, hullLength) {
    try {
        if (!gameState.sharks || gameState.sharks.length === 0) return;
        
        const sharkCollisionRadius = 4; // Shark collision radius
        const subCollisionRadius = hullLength * 0.3; // Submarine collision radius
        const combinedRadius = sharkCollisionRadius + subCollisionRadius;
        const sharksToRemove = [];
        
        // Check each shark
        gameState.sharks.forEach((shark, index) => {
            // Calculate distance to submarine
            let minDistance = Infinity;
            
            // Check distance to each collision point
            for (const point of collisionPoints) {
                const distance = point.distanceTo(shark.object.position);
                minDistance = Math.min(minDistance, distance);
            }
            
            // If shark is close enough, consider it a collision
            if (minDistance < combinedRadius) {
                // Create a small explosion at shark's position
                createExplosion(shark.object.position.clone(), 0.5);
                
                // Calculate impact velocity
                const impactVelocity = gameState.submarine.velocity.length();
                
                // Only remove sharks if submarine is moving fast enough
                if (impactVelocity > 0.5) {
                    // Mark shark for removal
                    sharksToRemove.push(index);
                    
                    // Display message
                    gameState.messageSystem.addMessage('Shark collision!', 2000);
                    
                    // Calculate forward momentum of submarine to determine if it's a direct hit
                    const subForward = new THREE.Vector3(0, 0, -1).applyQuaternion(gameState.submarine.object.quaternion);
                    const toShark = new THREE.Vector3().subVectors(shark.object.position, gameState.submarine.object.position).normalize();
                    const dotProduct = subForward.dot(toShark);
                    
                    // If we're hitting with the front of the submarine, add some forward momentum
                    if (dotProduct > 0.5) {
                        // Reduce speed based on impact
                        gameState.submarine.propulsion = Math.max(0, gameState.submarine.propulsion - 0.3);
                    }
                }
            }
        });
        
        // Remove sharks that collided with submarine
        if (sharksToRemove.length > 0) {
            // Remove in reverse order to maintain correct indices
            for (let i = sharksToRemove.length - 1; i >= 0; i--) {
                const index = sharksToRemove[i];
                const shark = gameState.sharks[index];
                
                // Remove from scene
                if (shark && shark.object) {
                    gameState.scene.remove(shark.object);
                }
                
                // Remove from array
                gameState.sharks.splice(index, 1);
            }
        }
    } catch (error) {
        console.error('Error in checkSharkCollisions:', error);
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