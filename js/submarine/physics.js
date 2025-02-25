// Submarine physics and movement handling

import * as THREE from 'three';
import gameState from '../core/state.js';
import { 
    MOVEMENT_SPEED,
    STRAFE_SPEED,
    PROPULSION_ACCELERATION,
    PROPULSION_DECAY,
    MAX_PROPULSION,
    GRAVITY,
    MAX_PITCH_ANGLE,
    OCEAN_DEPTH, 
    SURFACE_LEVEL ,
    WORLD_SIZE, 
} from '../core/constants.js';
import { createWaterSplash } from '../effects/waterEffects.js';

// Update submarine physics
export function updateSubmarinePhysics(deltaTime) {
    try {
        const sub = gameState.submarine;
        if (!sub.object) return;
        
        // Store previous position for collision detection
        const previousPosition = sub.object.position.clone();
        
        // Get orientation vectors from submarine rotation
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(sub.object.rotation);
        
        // Create forward vector (submarine points along negative Z)
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(quaternion);
        
        // Create right vector (perpendicular to forward direction)
        const rightDirection = new THREE.Vector3(1, 0, 0);
        rightDirection.applyQuaternion(quaternion);
        
        // Apply propulsion in forward direction
        const propulsionEffectiveness = sub.isAirborne ? 0.3 : 1.0; // 30% effectiveness in air
        const propulsionForce = sub.propulsion * MOVEMENT_SPEED * propulsionEffectiveness;
        sub.object.position.addScaledVector(forwardDirection, propulsionForce);
        
        // Apply strafe movement if active
        if (sub.strafeDirection !== 0) {
            const strafeEffectiveness = sub.isAirborne ? 0.2 : 1.0; // 20% effectiveness in air
            sub.object.position.addScaledVector(
                rightDirection, 
                sub.strafeDirection * STRAFE_SPEED * strafeEffectiveness
            );
        }
        
        // Apply direct rotation from target values
        sub.object.rotation.y = sub.targetYaw;
        sub.object.rotation.x = sub.targetPitch;
        sub.object.rotation.z = 0; // Keep roll at zero
        sub.object.rotation.order = 'YXZ'; // Maintain rotation order
        
        // Apply world boundaries
        applyWorldBoundaries(sub.object);
        
        // Apply buoyancy and depth physics
        applyBuoyancyAndDepth(sub);
        
        // Check for surface transitions (entering/exiting water)
        checkSurfaceTransitions(sub);
        
        // Return the previous position for collision handling
        return previousPosition;
    } catch (error) {
        console.error('Error in updateSubmarinePhysics:', error);
    }
}

// Apply world boundaries to keep submarine in playable area
function applyWorldBoundaries(submarineObj) {
    const boundaryLimit = WORLD_SIZE / 2 - 50;
    if (submarineObj.position.x > boundaryLimit) submarineObj.position.x = boundaryLimit;
    if (submarineObj.position.x < -boundaryLimit) submarineObj.position.x = -boundaryLimit;
    if (submarineObj.position.z > boundaryLimit) submarineObj.position.z = boundaryLimit;
    if (submarineObj.position.z < -boundaryLimit) submarineObj.position.z = -boundaryLimit;
}

// Apply buoyancy and depth-related physics
function applyBuoyancyAndDepth(sub) {
    // Buoyancy near the surface is stronger
    if (sub.object.position.y < 0 && sub.object.position.y > -5) {
        sub.object.position.y += 0.05; // Strong buoyancy near surface
    } else if (sub.object.position.y < -5 && sub.object.position.y > -20) {
        sub.object.position.y += 0.02; // Weaker buoyancy deeper
    }
    
    // Apply gravity when above water
    if (sub.isAirborne) {
        sub.object.position.y -= GRAVITY;
    }
    
    // Ocean floor boundary
    if (sub.object.position.y < -OCEAN_DEPTH + 10) {
        sub.object.position.y = -OCEAN_DEPTH + 10;
        sub.targetPitch = 0; // Level out when hitting ocean floor
    }
    
    // Update depth value
    sub.depth = Math.floor(-sub.object.position.y);
}

// Check for surface transitions (entering/exiting water)
function checkSurfaceTransitions(sub) {
    const wasAirborne = sub.isAirborne;
    sub.isAirborne = sub.object.position.y > SURFACE_LEVEL;
    
    // Create splash effect when entering or exiting water
    if (wasAirborne && !sub.isAirborne) {
        // Submarine is entering water
        createWaterSplash(sub.object.position.clone(), 3);
    } else if (!wasAirborne && sub.isAirborne) {
        // Submarine is exiting water
        createWaterSplash(sub.object.position.clone(), 2);
    }
}

// Update submarine propulsion based on input
export function updatePropulsion(keys) {
    const sub = gameState.submarine;
    
    // Forward/backward propulsion (W/S)
    if (keys.w) {
        // Increase forward propulsion
        sub.propulsion = Math.min(sub.propulsion + PROPULSION_ACCELERATION, MAX_PROPULSION);
    } else if (keys.s) {
        // Increase backward propulsion
        sub.propulsion = Math.max(sub.propulsion - PROPULSION_ACCELERATION, -MAX_PROPULSION * 0.5);
    } else {
        // Gradually decrease propulsion
        sub.propulsion *= PROPULSION_DECAY;
        if (Math.abs(sub.propulsion) < 0.01) sub.propulsion = 0;
    }
    
    // Strafe left/right movement (A/D)
    if (keys.a) {
        sub.strafeDirection = -1; // Strafe left
    } else if (keys.d) {
        sub.strafeDirection = 1;  // Strafe right
    } else {
        sub.strafeDirection = 0;  // No strafe
    }
} 