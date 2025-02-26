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
import { createSandCloud } from '../effects/terrainEffects.js';
import { getTerrainHeightAtPosition } from '../environment/oceanFloor.js';

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
        
        // Calculate velocity before position update
        const startPosition = sub.object.position.clone();
        
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
        
        // In infinite world, we don't apply world boundaries anymore
        
        // Apply buoyancy and depth physics
        applyBuoyancyAndDepth(sub, deltaTime);
        
        // Check for surface transitions (entering/exiting water)
        checkSurfaceTransitions(sub);
        
        // Calculate velocity vector from position change
        const endPosition = sub.object.position.clone();
        sub.velocity = endPosition.clone().sub(startPosition).divideScalar(deltaTime);
        
        // Return the previous position for collision handling
        return previousPosition;
    } catch (error) {
        console.error('Error in updateSubmarinePhysics:', error);
    }
}

// Apply buoyancy and depth-related physics
function applyBuoyancyAndDepth(sub, deltaTime) {
    // Buoyancy near the surface is stronger
    if (sub.object.position.y < 0 && sub.object.position.y > -5) {
        sub.object.position.y += 0.05; // Strong buoyancy near surface
    } else if (sub.object.position.y < -5 && sub.object.position.y > -20) {
        sub.object.position.y += 0.02; // Weaker buoyancy deeper
    }
    
    // Apply gravity when above water - quadratic model
    if (sub.isAirborne) {
        // Initialize fallingVelocity if not already set
        if (sub.fallingVelocity === undefined) {
            sub.fallingVelocity = 0;
        }
        
        // Apply gravity acceleration to the velocity
        sub.fallingVelocity += GRAVITY * deltaTime;
        
        // Apply velocity to position
        sub.object.position.y -= sub.fallingVelocity;
    } else {
        // Reset falling velocity when in water
        sub.fallingVelocity = 0;
    }
    
    // Get terrain height at current submarine position
    const terrainHeight = getTerrainHeightAtPosition(sub.object.position.x, sub.object.position.z);
    
    // Add a small buffer (collision clearance) to prevent clipping
    const collisionBuffer = 5; 
    
    // Ocean floor boundary - use actual terrain height
    if (sub.object.position.y < terrainHeight + collisionBuffer) {
        // Calculate impact velocity - used to determine intensity of sand cloud
        const impactSpeed = sub.object.position.y - (terrainHeight + collisionBuffer);
        const impactIntensity = Math.min(Math.abs(impactSpeed) * 3, 3); // Scale and cap intensity
        
        // Adjust position to be above the terrain
        sub.object.position.y = terrainHeight + collisionBuffer;
        
        // Level out when hitting ocean floor to prevent continuous collision
        sub.targetPitch = Math.max(0, sub.targetPitch);
        
        // Visual feedback for collision with ocean floor
        if (!sub.floorCollision) {
            sub.floorCollision = true;
            console.log(`Submarine collided with ocean floor - Impact: ${impactIntensity.toFixed(2)}`);
            
            // Create sand cloud effect at the impact point
            // Position the effect slightly below the submarine
            const effectPosition = sub.object.position.clone();
            effectPosition.y = terrainHeight;
            
            // Create a stronger effect if impact velocity is higher
            if (impactIntensity > 0.2) {
                createSandCloud(effectPosition, 2 + impactIntensity * 0.5, impactIntensity);
                
                // Add camera shake effect based on impact intensity
                if (gameState.camera && impactIntensity > 0.7) {
                    addCameraShake(impactIntensity);
                }
            }
        }
    } else {
        sub.floorCollision = false;
    }
    
    // Update depth value
    sub.depth = Math.floor(-sub.object.position.y);
}

// Add camera shake effect on impact
function addCameraShake(intensity) {
    // Store original camera position
    if (!gameState.camera.userData.originalPosition) {
        gameState.camera.userData.originalPosition = gameState.camera.position.clone();
    }
    
    // Set shake parameters
    const duration = 500; // milliseconds
    const startTime = Date.now();
    const maxShake = 0.1 * Math.min(intensity, 3); // Limit maximum shake
    
    // Clear any existing shake animation
    if (gameState.cameraShakeAnimationId) {
        cancelAnimationFrame(gameState.cameraShakeAnimationId);
    }
    
    // Animate camera shake
    const shakeCamera = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > duration) {
            // Reset camera position when done
            if (gameState.camera.userData.originalPosition) {
                gameState.camera.position.copy(gameState.camera.userData.originalPosition);
            }
            return;
        }
        
        // Calculate shake amount that decreases over time
        const shakeAmount = maxShake * (1 - elapsed / duration);
        
        // Apply random offset to camera position
        const originalPos = gameState.camera.userData.originalPosition;
        gameState.camera.position.set(
            originalPos.x + (Math.random() - 0.5) * shakeAmount,
            originalPos.y + (Math.random() - 0.5) * shakeAmount,
            originalPos.z + (Math.random() - 0.5) * shakeAmount
        );
        
        // Continue animation
        gameState.cameraShakeAnimationId = requestAnimationFrame(shakeCamera);
    };
    
    shakeCamera();
}

// Check for surface transitions (entering/exiting water)
function checkSurfaceTransitions(sub) {
    const wasAirborne = sub.isAirborne;
    sub.isAirborne = sub.object.position.y > SURFACE_LEVEL;
    
    // Create splash effect when entering or exiting water
    if (wasAirborne && !sub.isAirborne) {
        // Submarine is entering water
        createWaterSplash(sub.object.position.clone(), 3);
        
        // Reset falling velocity when entering water
        sub.fallingVelocity = 0;
    } else if (!wasAirborne && sub.isAirborne) {
        // Submarine is exiting water
        createWaterSplash(sub.object.position.clone(), 2);
        
        // Initialize falling velocity when becoming airborne
        sub.fallingVelocity = 0;
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