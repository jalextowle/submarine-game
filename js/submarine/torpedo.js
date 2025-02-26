// Submarine torpedo creation and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { WORLD_SIZE, OCEAN_DEPTH, SURFACE_LEVEL } from '../core/constants.js'; 
import { createBubbleTrail } from '../effects/bubbleEffects.js';
import { createMuzzleFlash } from '../effects/weaponEffects.js';
import { createExplosion } from '../effects/explosions.js';

// Constants for torpedo behavior
const TORPEDO_SPEED = 2.0;
const TORPEDO_LIFETIME = 6000; // 6 seconds
const TORPEDO_COOLDOWN = 1500; // 1.5 seconds between torpedoes

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
        
        // Add to game torpedoes array with physics data
        gameState.torpedoes.push({
            object: torpedo,
            velocity: forwardDirection.clone().multiplyScalar(TORPEDO_SPEED),
            createdTime: Date.now(),
            collisionRadius: 1.5
        });
        
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

// Update all torpedoes
export function updateTorpedoes(deltaTime) {
    try {
        const currentTime = Date.now();
        const torpedoesToRemove = [];
        
        // Update each torpedo
        gameState.torpedoes.forEach((torpedo, index) => {
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
    let collision = false;
    const pos = torpedo.object.position;
    
    gameState.collisionObjects.forEach(obstacle => {
        if (collision) return; // Skip if already collided
        
        if (obstacle.userData && obstacle.userData.isObstacle) {
            const obstaclePos = new THREE.Vector3();
            obstacle.getWorldPosition(obstaclePos);
            
            const distance = pos.distanceTo(obstaclePos);
            const minDistance = torpedo.collisionRadius + obstacle.userData.collisionRadius;
            
            if (distance < minDistance) {
                collision = true;
                // Create explosion at collision point
                const explosionPos = pos.clone().add(
                    obstaclePos.clone().sub(pos).normalize().multiplyScalar(torpedo.collisionRadius)
                );
                createExplosion(explosionPos);
                
                // Mark torpedo for removal
                torpedoesToRemove.push(index);
            }
        }
    });
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