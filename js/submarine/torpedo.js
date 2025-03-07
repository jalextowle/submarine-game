// Submarine torpedo creation and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { WORLD_SIZE, OCEAN_DEPTH, SURFACE_LEVEL } from '../core/constants.js'; 
import { createBubbleTrail } from '../effects/bubbleEffects.js';
import { createMuzzleFlash } from '../effects/weaponEffects.js';
import { createExplosion } from '../effects/explosions.js';
import { damageEnemySubmarine } from '../environment/enemySubmarines.js';

// Constants for torpedo behavior
const TORPEDO_SPEED = 4.0;
const GUIDED_TORPEDO_SPEED = 3.5; // Slightly slower for guided torpedoes
const TORPEDO_LIFETIME = 6000; // 6 seconds
const TORPEDO_COOLDOWN = 1500; // 1.5 seconds between torpedoes
const TORPEDO_TURN_SPEED = 0.04; // How quickly guided torpedoes can turn
const TARGET_DETECTION_RANGE = 250; // Range to detect potential targets
const TARGET_LOCK_TIME = 1000; // Time in ms to establish target lock
const PREDICTION_FACTOR = 0.7; // How much to lead the target (0-1)

// Add a target indicator for visual feedback
let targetIndicator = null;
let currentTarget = null;
let targetLockStartTime = 0;
let targetLocked = false;
let targetFired = false; // New flag to track if we've fired at the current target

// Expose targeting state to window for UI to access
window.currentTarget = currentTarget;
window.targetLocked = targetLocked;
window.targetFired = targetFired;

// Create a torpedo from the submarine
export function createTorpedo() {
    debug('Creating torpedo');
    try {
        const sub = gameState.submarine.object;
        if (!sub) return;
        
        // Get submarine's forward direction
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(sub.quaternion);
        
        // Create torpedo group
        const torpedo = new THREE.Group();
        
        // Torpedo body - elongated cylinder
        const torpedoBodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3, 16);
        const torpedoMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        
        const torpedoBody = new THREE.Mesh(torpedoBodyGeometry, torpedoMaterial);
        torpedoBody.rotation.x = Math.PI / 2; // Align with Z-axis
        
        // Torpedo nose - cone
        const torpedoNoseGeometry = new THREE.ConeGeometry(0.3, 0.7, 16);
        const torpedoNose = new THREE.Mesh(torpedoNoseGeometry, torpedoMaterial);
        torpedoNose.rotation.x = -Math.PI / 2;
        torpedoNose.position.z = 1.85;
        
        // Torpedo tail - small cylinder
        const torpedoTailGeometry = new THREE.CylinderGeometry(0.3, 0.2, 0.5, 16);
        const torpedoTail = new THREE.Mesh(torpedoTailGeometry, torpedoMaterial);
        torpedoTail.rotation.x = Math.PI / 2;
        torpedoTail.position.z = -1.75;
        
        // Add propeller and fins
        const propHub = createTorpedoPropeller();
        addTorpedoFins(torpedo);
        
        // Add a point light to simulate torpedo engine glow
        const torpedoLight = new THREE.PointLight(0x00FFFF, 1, 5);
        torpedoLight.position.z = -2;
        
        // Add all parts to torpedo group
        torpedo.add(torpedoBody);
        torpedo.add(torpedoNose);
        torpedo.add(torpedoTail);
        torpedo.add(propHub);
        torpedo.add(torpedoLight);
        
        // Position torpedo at submarine's front, offset forward
        const torpedoStartPos = sub.position.clone();
        // Start from the bow of the submarine
        torpedoStartPos.addScaledVector(forwardDirection, 15);
        torpedo.position.copy(torpedoStartPos);
        
        // Rotate torpedo to match submarine's orientation
        torpedo.rotation.copy(sub.rotation);
        
        // Add to scene
        gameState.scene.add(torpedo);
        
        // Calculate initial torpedo speed
        const speed = targetLocked ? GUIDED_TORPEDO_SPEED : TORPEDO_SPEED;
        
        // Add to game torpedoes array with physics data
        gameState.torpedoes.push({
            object: torpedo,
            velocity: forwardDirection.clone().multiplyScalar(speed),
            createdTime: Date.now(),
            collisionRadius: 1.5,
            guided: targetLocked,
            target: targetLocked ? currentTarget : null,
            turnSpeed: TORPEDO_TURN_SPEED
        });
        
        // Reset target lock after firing
        if (targetLocked) {
            gameState.messageSystem.addMessage('Guided torpedo launched!', 2000);
            targetFired = true; // Mark that we've fired at this target
        } else {
            gameState.messageSystem.addMessage('Torpedo launched', 1500);
        }
        
        // Play torpedo sound (if available)
        playTorpedoSound();
        
        // Add muzzle flash effect
        createMuzzleFlash(torpedoStartPos);
        
        debug('Torpedo created');
        return torpedo;
    } catch (error) {
        console.error('Error in createTorpedo:', error);
    }
}

// Create torpedo propeller
function createTorpedoPropeller() {
    const propellerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x777777,
        metalness: 0.7,
        roughness: 0.3
    });
    
    const propHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8),
        propellerMaterial
    );
    propHub.rotation.x = Math.PI / 2;
    propHub.position.z = -2;
    
    // Add propeller blades
    for (let i = 0; i < 3; i++) {
        const bladeGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.1);
        const blade = new THREE.Mesh(bladeGeometry, propellerMaterial);
        blade.rotation.z = (i / 3) * Math.PI * 2;
        propHub.add(blade);
    }
    
    return propHub;
}

// Add fins to torpedo
function addTorpedoFins(torpedo) {
    const finMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        metalness: 0.6,
        roughness: 0.4
    });
    
    for (let i = 0; i < 4; i++) {
        const finGeometry = new THREE.BoxGeometry(0.1, 0.6, 0.8);
        const fin = new THREE.Mesh(finGeometry, finMaterial);
        fin.position.z = -1.5;
        
        // Position fins in X pattern
        const angle = (i / 4) * Math.PI * 2;
        fin.position.x = Math.cos(angle) * 0.3;
        fin.position.y = Math.sin(angle) * 0.3;
        fin.rotation.z = angle;
        
        torpedo.add(fin);
    }
}

// Play torpedo launch sound
function playTorpedoSound() {
    // In a future enhancement, actual sound effects could be added here
    debug('Playing torpedo sound');
}

// Create a target indicator visual
function createTargetIndicator(position) {
    // Remove existing indicator if any
    removeTargetIndicator();
    
    // Create a ring to indicate the target
    const geometry = new THREE.TorusGeometry(3, 0.2, 8, 16);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });
    
    targetIndicator = new THREE.Mesh(geometry, material);
    targetIndicator.position.copy(position);
    
    // Add to scene
    gameState.scene.add(targetIndicator);
    
    // Add pulsing animation
    targetIndicator.userData = {
        pulsePhase: 0,
        originalScale: 1.0
    };
}

// Remove target indicator
function removeTargetIndicator() {
    if (targetIndicator) {
        gameState.scene.remove(targetIndicator);
        targetIndicator = null;
    }
}

// Find nearest shark in front of submarine
function findNearestTargetInView() {
    if (!gameState.submarine.object) return null;
    
    const subPos = gameState.submarine.object.position;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(gameState.submarine.object.quaternion);
    
    let nearestTarget = null;
    let nearestDistance = Infinity;
    
    // Check sharks as potential targets
    if (gameState.sharks && gameState.sharks.length > 0) {
        gameState.sharks.forEach(shark => {
            const toShark = new THREE.Vector3().subVectors(shark.object.position, subPos);
            const distance = toShark.length();
            
            if (distance < TARGET_DETECTION_RANGE) {
                // Check if shark is in front of the submarine (within a cone)
                toShark.normalize();
                const angle = forward.angleTo(toShark);
                
                // Only target sharks in a ~60 degree cone in front
                if (angle < Math.PI / 3) {
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestTarget = shark;
                    }
                }
            }
        });
    }
    
    // Check enemy submarines as potential targets
    if (gameState.enemySubmarines && gameState.enemySubmarines.length > 0) {
        gameState.enemySubmarines.forEach(enemySub => {
            const toEnemySub = new THREE.Vector3().subVectors(enemySub.object.position, subPos);
            const distance = toEnemySub.length();
            
            if (distance < TARGET_DETECTION_RANGE) {
                // Check if enemy sub is in front of the submarine (within a cone)
                toEnemySub.normalize();
                const angle = forward.angleTo(toEnemySub);
                
                // Only target enemy subs in a ~60 degree cone in front
                if (angle < Math.PI / 3) {
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestTarget = enemySub;
                    }
                }
            }
        });
    }
    
    return nearestTarget;
}

// Update all torpedoes
export function updateTorpedoes(deltaTime) {
    try {
        const currentTime = Date.now();
        const torpedoesToRemove = [];
        
        // Always try to find the best target unless we've fired at the current one
        if (!targetFired) {
            const potentialTarget = findNearestTargetInView();
            
            if (potentialTarget) {
                // If it's a different target or we don't have one yet
                if (!currentTarget || potentialTarget !== currentTarget) {
                    // Reset the lock and set the new target
                    targetLocked = false;
                    currentTarget = potentialTarget;
                    createTargetIndicator(potentialTarget.object.position);
                    targetLockStartTime = currentTime;
                    
                    // Only show the message if this is a new target (not just refreshing the same one)
                    if (!currentTarget) {
                        gameState.messageSystem.addMessage('Target acquired...', 1000);
                    }
                }
            } else if (currentTarget) {
                // We lost our target (moved out of view)
                removeTargetIndicator();
                currentTarget = null;
                targetLocked = false;
            }
        } else {
            // We've fired a torpedo, check if the current target still exists
            if (currentTarget) {
                let targetExists = false;
                
                // Check if target exists in sharks array
                if (gameState.sharks && gameState.sharks.includes(currentTarget)) {
                    targetExists = true;
                }
                
                // Check if target exists in enemy submarines array
                if (!targetExists && gameState.enemySubmarines && gameState.enemySubmarines.includes(currentTarget)) {
                    targetExists = true;
                }
                
                if (!targetExists) {
                    // Target is gone (destroyed or despawned)
                    removeTargetIndicator();
                    currentTarget = null;
                    targetLocked = false;
                    targetFired = false;
                } else {
                    // Check if any guided torpedoes are still tracking this target
                    let stillTracking = false;
                    
                    if (gameState.torpedoes && gameState.torpedoes.length > 0) {
                        for (const torpedo of gameState.torpedoes) {
                            if (torpedo.guided && torpedo.target === currentTarget) {
                                stillTracking = true;
                                break;
                            }
                        }
                    }
                    
                    // If no torpedoes are tracking the target anymore, reset the targetFired flag
                    if (!stillTracking) {
                        targetFired = false;
                    }
                }
            } else {
                // No current target
                targetFired = false;
            }
        }
        
        // Update target lock status
        if (currentTarget && !targetLocked) {
            if (currentTime - targetLockStartTime > TARGET_LOCK_TIME) {
                // Target lock complete
                targetLocked = true;
                
                // Update target indicator to show locked state
                if (targetIndicator) {
                    targetIndicator.material.color.set(0x00ff00);
                    gameState.messageSystem.addMessage('Target LOCKED!', 1500);
                }
            }
        }
        
        // Update the global variables for UI
        window.currentTarget = currentTarget;
        window.targetLocked = targetLocked;
        window.targetFired = targetFired;
        
        // Update target indicator position and animation
        if (targetIndicator && currentTarget) {
            // Check if target still exists
            let targetExists = false;
            
            // Check if target exists in sharks array
            if (gameState.sharks && gameState.sharks.includes(currentTarget)) {
                targetExists = true;
            }
            
            // Check if target exists in enemy submarines array
            if (!targetExists && gameState.enemySubmarines && gameState.enemySubmarines.includes(currentTarget)) {
                targetExists = true;
            }
            
            if (!targetExists) {
                removeTargetIndicator();
                currentTarget = null;
                targetLocked = false;
            } else {
                // Update position and animation
                targetIndicator.position.copy(currentTarget.object.position);
                
                // Pulse animation
                targetIndicator.userData.pulsePhase += deltaTime * 5;
                if (targetIndicator.userData.pulsePhase > Math.PI * 2) {
                    targetIndicator.userData.pulsePhase -= Math.PI * 2;
                }
                
                const pulseFactor = 0.2 * Math.sin(targetIndicator.userData.pulsePhase) + 1.2;
                targetIndicator.scale.set(pulseFactor, pulseFactor, pulseFactor);
                
                // Rotate the indicator
                targetIndicator.rotation.y += deltaTime * 2;
            }
        }
        
        // Update each torpedo
        gameState.torpedoes.forEach((torpedo, index) => {
            // Guide the torpedo if it's targeting something
            if (torpedo.guided && torpedo.target) {
                // Make sure target still exists
                let targetExists = false;
                
                // Check if target exists in sharks array
                if (gameState.sharks && gameState.sharks.includes(torpedo.target)) {
                    targetExists = true;
                }
                
                // Check if target exists in enemy submarines array
                if (!targetExists && gameState.enemySubmarines && gameState.enemySubmarines.includes(torpedo.target)) {
                    targetExists = true;
                }
                
                if (!targetExists) {
                    torpedo.guided = false;
                } else {
                    // Calculate target position with prediction
                    const targetPos = torpedo.target.object.position.clone();
                    
                    // Add prediction offset based on target's velocity
                    if (torpedo.target.velocity) {
                        // Calculate intercept time based on distance and speeds
                        const distance = torpedo.object.position.distanceTo(targetPos);
                        const interceptTime = distance / GUIDED_TORPEDO_SPEED;
                        
                        // Predict where the target will be
                        const predictedOffset = torpedo.target.velocity.clone()
                            .multiplyScalar(interceptTime * PREDICTION_FACTOR);
                        targetPos.add(predictedOffset);
                    }
                    
                    // Calculate direction to target
                    const targetDirection = new THREE.Vector3().subVectors(
                        targetPos,
                        torpedo.object.position
                    ).normalize();
                    
                    // Create a quaternion for the new direction
                    const targetQuaternion = new THREE.Quaternion();
                    const lookAtMatrix = new THREE.Matrix4();
                    lookAtMatrix.lookAt(
                        new THREE.Vector3(0, 0, 0),
                        targetDirection,
                        new THREE.Vector3(0, 1, 0)
                    );
                    targetQuaternion.setFromRotationMatrix(lookAtMatrix);
                    
                    // Calculate current torpedo direction
                    const torpedoDirection = new THREE.Vector3(0, 0, -1);
                    torpedoDirection.applyQuaternion(torpedo.object.quaternion);
                    
                    // Calculate angle between current direction and target direction
                    const angle = torpedoDirection.angleTo(targetDirection);
                    
                    // Use adaptive turn speed - turn faster when far off target
                    const adaptiveTurnSpeed = Math.min(
                        torpedo.turnSpeed * (1.0 + angle * 2), 
                        torpedo.turnSpeed * 3
                    );
                    
                    // Smoothly rotate toward target, but avoid overshooting by slowing down when close
                    torpedo.object.quaternion.slerp(
                        targetQuaternion, 
                        adaptiveTurnSpeed
                    );
                    
                    // Get torpedo's new forward direction
                    const forward = new THREE.Vector3(0, 0, -1);
                    forward.applyQuaternion(torpedo.object.quaternion);
                    
                    // Update velocity
                    torpedo.velocity.copy(forward).multiplyScalar(GUIDED_TORPEDO_SPEED);
                }
            }
            
            // Move torpedo
            torpedo.object.position.add(torpedo.velocity);
            
            // Rotate propeller for effect
            const propeller = torpedo.object.children.find(child => 
                child.geometry && child.geometry.type === 'CylinderGeometry' && child.position.z < -1.5);
            if (propeller) {
                propeller.rotation.z += 0.3;
            }
            
            // Add bubble trail
            if (Math.random() < 0.3) {
                createBubbleTrail(torpedo.object.position.clone(), 0.2);
            }
            
            // Check lifetime
            if (currentTime - torpedo.createdTime > TORPEDO_LIFETIME) {
                torpedoesToRemove.push(index);
                return;
            }
            
            // Check world boundaries only when not using infinite world (chunk system)
            if (!gameState.chunkSystem) {
                const pos = torpedo.object.position;
                const boundaryLimit = WORLD_SIZE / 2;
                if (Math.abs(pos.x) > boundaryLimit || 
                    Math.abs(pos.z) > boundaryLimit) {
                    torpedoesToRemove.push(index);
                    return;
                }
            }
            
            const pos = torpedo.object.position;
            
            // Check ocean depth boundary - create explosion on ocean floor
            // First do a basic check to avoid unnecessary terrain height calculations
            if (pos.y < -OCEAN_DEPTH + 50) { // Add some margin to account for terrain variations
                // Import the getTerrainHeightAtPosition function
                import('../environment/oceanFloor.js').then(module => {
                    // Get the actual terrain height at torpedo position
                    const terrainHeightResult = module.getTerrainHeightAtPosition(pos.x, pos.z);
                    
                    // Handle potential promise return from terrain height calculation
                    if (terrainHeightResult instanceof Promise) {
                        terrainHeightResult.then(terrainHeight => {
                            // Check if torpedo is below or at terrain level
                            if (pos.y <= terrainHeight + 5) {
                                // Create explosion on ocean floor
                                createExplosion(pos.clone());
                                
                                // Mark torpedo for removal if not already removed
                                if (gameState.torpedoes.includes(torpedo)) {
                                    const currentIndex = gameState.torpedoes.indexOf(torpedo);
                                    if (currentIndex !== -1 && !torpedoesToRemove.includes(currentIndex)) {
                                        torpedoesToRemove.push(currentIndex);
                                    }
                                }
                            }
                        });
                    } else {
                        // Direct value return - check immediately
                        if (pos.y <= terrainHeightResult + 5) {
                            // Create explosion on ocean floor
                            createExplosion(pos.clone());
                            torpedoesToRemove.push(index);
                        }
                    }
                });
            }
            
            // Check surface boundary
            if (pos.y > SURFACE_LEVEL) {
                torpedoesToRemove.push(index);
                return;
            }
            
            // Check collision with obstacles
            checkTorpedoCollisions(torpedo, index, torpedoesToRemove);
        });
        
        // Remove torpedoes in reverse order
        removeTorpedoes(torpedoesToRemove);
    } catch (error) {
        console.error('Error in updateTorpedoes:', error);
    }
}

// Check collisions for a single torpedo
function checkTorpedoCollisions(torpedo, index, torpedoesToRemove) {
    // Check if the torpedo has gone below max depth
    const pos = torpedo.object.position;
    const maxDepth = -1000; // Maximum depth for torpedoes
    
    if (pos.y < maxDepth) {
        // Create a small explosion at the max depth point
        createExplosion(pos.clone());
        
        // Mark torpedo for removal
        torpedoesToRemove.push(index);
        return;
    }
    
    // Check collisions with sharks
    if (gameState.sharks && gameState.sharks.length > 0) {
        const torpedoRadius = torpedo.collisionRadius || 1.5;
        const sharksToRemove = [];
        
        gameState.sharks.forEach((shark, sharkIndex) => {
            // For guided torpedoes, increase the collision radius for better hit chances
            const effectiveRadius = torpedo.guided ? 
                torpedoRadius * 1.8 : // Larger hit radius for guided torpedoes
                torpedoRadius;
                
            const distance = torpedo.object.position.distanceTo(shark.object.position);
            const sharkRadius = 5; // Increased shark collision radius
            const combinedRadius = effectiveRadius + sharkRadius;
            
            if (distance < combinedRadius) {
                // Create explosion at impact point
                const impactPosition = shark.object.position.clone();
                // Ensure we're passing a valid THREE.Vector3 position and a positive size
                if (impactPosition && impactPosition instanceof THREE.Vector3) {
                    createExplosion(impactPosition, 0.8);
                } else {
                    // Fallback to torpedo position if shark position is invalid
                    createExplosion(torpedo.object.position.clone(), 0.8);
                }
                
                // Mark torpedo for removal
                if (!torpedoesToRemove.includes(index)) {
                    torpedoesToRemove.push(index);
                }
                
                // Mark shark for removal
                sharksToRemove.push(sharkIndex);
                
                // Display message
                const hitMessage = torpedo.guided ? 
                    'Direct hit with guided torpedo!' : 
                    'Direct hit!';
                gameState.messageSystem.addMessage(hitMessage, 2000);
            }
        });
        
        // Remove sharks hit by torpedoes
        if (sharksToRemove.length > 0) {
            sharksToRemove.sort((a, b) => b - a).forEach(sharkIndex => {
                const shark = gameState.sharks[sharkIndex];
                if (shark && shark.object) {
                    gameState.scene.remove(shark.object);
                }
                gameState.sharks.splice(sharkIndex, 1);
                
                // If this was the currently targeted shark, clear the targeting
                if (shark === currentTarget) {
                    removeTargetIndicator();
                    currentTarget = null;
                    targetLocked = false;
                }
            });
        }
    }
    
    // Check collisions with enemy submarines
    if (gameState.enemySubmarines && gameState.enemySubmarines.length > 0) {
        const torpedoRadius = torpedo.collisionRadius || 1.5;
        const enemySubsToRemove = [];
        
        gameState.enemySubmarines.forEach((enemySub, enemySubIndex) => {
            // For guided torpedoes, increase the collision radius for better hit chances
            const effectiveRadius = torpedo.guided ? 
                torpedoRadius * 1.8 : // Larger hit radius for guided torpedoes
                torpedoRadius;
                
            const distance = torpedo.object.position.distanceTo(enemySub.object.position);
            const enemySubRadius = 10; // Enemy submarine collision radius
            const combinedRadius = effectiveRadius + enemySubRadius;
            
            if (distance < combinedRadius) {
                // Create explosion at impact point
                const impactPosition = enemySub.object.position.clone();
                // Ensure we're passing a valid THREE.Vector3 position and a positive size
                if (impactPosition && impactPosition instanceof THREE.Vector3) {
                    createExplosion(impactPosition, 2.0); // Larger explosion for submarines
                } else {
                    // Fallback to torpedo position if enemy sub position is invalid
                    createExplosion(torpedo.object.position.clone(), 2.0);
                }
                
                // Mark torpedo for removal
                if (!torpedoesToRemove.includes(index)) {
                    torpedoesToRemove.push(index);
                }
                
                // Calculate damage based on torpedo type
                const torpedoDamage = torpedo.guided ? 40 : 30; // Guided torpedoes do more damage
                
                // Apply damage to the enemy submarine
                const isDestroyed = damageEnemySubmarine(enemySub, torpedoDamage);
                
                // Only mark for removal if destroyed
                if (isDestroyed) {
                    // Mark enemy submarine for removal
                    enemySubsToRemove.push(enemySubIndex);
                    
                    // Display destruction message
                    const hitMessage = torpedo.guided ? 
                        'Enemy submarine destroyed with guided torpedo!' : 
                        'Enemy submarine destroyed!';
                    gameState.messageSystem.addMessage(hitMessage, 2000);
                } else {
                    // Display hit message
                    const healthPercent = Math.floor((enemySub.currentHealth / enemySub.maxHealth) * 100);
                    const hitMessage = torpedo.guided ? 
                        `Direct hit with guided torpedo! Enemy sub at ${healthPercent}%` : 
                        `Direct hit! Enemy sub at ${healthPercent}%`;
                    gameState.messageSystem.addMessage(hitMessage, 2000);
                }
            }
        });
        
        // Remove enemy submarines hit by torpedoes
        if (enemySubsToRemove.length > 0) {
            enemySubsToRemove.sort((a, b) => b - a).forEach(enemySubIndex => {
                const enemySub = gameState.enemySubmarines[enemySubIndex];
                if (enemySub && enemySub.object) {
                    gameState.scene.remove(enemySub.object);
                    
                    // Dispose of geometries to free memory
                    enemySub.object.traverse(child => {
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(material => material.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
                gameState.enemySubmarines.splice(enemySubIndex, 1);
                
                // If this was the currently targeted enemy sub, clear the targeting
                if (enemySub === currentTarget) {
                    removeTargetIndicator();
                    currentTarget = null;
                    targetLocked = false;
                }
            });
        }
    }
}

// Remove torpedoes from the scene and array
function removeTorpedoes(torpedoesToRemove) {
    // Remove torpedoes in reverse order
    torpedoesToRemove.sort((a, b) => b - a).forEach(index => {
        const torpedo = gameState.torpedoes[index];
        if (torpedo && torpedo.object) {
            gameState.scene.remove(torpedo.object);
        }
        gameState.torpedoes.splice(index, 1);
    });
}

// Handle torpedo firing based on input
export function handleTorpedoFiring() {
    const currentTime = Date.now();
    if (currentTime - gameState.submarine.lastTorpedoTime > TORPEDO_COOLDOWN) {
        createTorpedo();
        gameState.submarine.lastTorpedoTime = currentTime;
    }
}

// Reset targeting when game state is reset
export function resetTargeting() {
    removeTargetIndicator();
    currentTarget = null;
    targetLocked = false;
    targetFired = false;
} 