// Shark creation and management for the submarine game

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import perlinNoise from '../utils/perlinNoise.js';
import { BIOME_TYPES } from './biomes.js';
import { getBiomeAtPosition } from './biomes.js';
import { getTerrainHeightAtPosition } from './oceanFloor.js';
import { OCEAN_DEPTH, WORLD_SIZE } from '../core/constants.js';

// Constants for shark behavior
const SHARK_SPEED = 1.0;
const SHARK_TURN_SPEED = 0.02;
const SHARK_SPAWN_DISTANCE = 400; // Spawn distance from player
const SHARK_DESPAWN_DISTANCE = 600; // Distance at which sharks despawn
const SHARK_MIN_HEIGHT = 30; // Minimum height above ocean floor
const MAX_SHARKS = 15; // Maximum number of sharks in the game at once
const SHARK_SPAWN_INTERVAL = 3000; // Time between spawning attempts (ms)
const SHARK_DENSITY_BY_BIOME = {
    [BIOME_TYPES.FLAT_SANDY]: 0.6,
    [BIOME_TYPES.CONTINENTAL_SHELF]: 1.0, // Most sharks here
    [BIOME_TYPES.TRENCH]: 0.3, // Fewer sharks in deep trenches
    [BIOME_TYPES.ISLAND]: 0.8
};

// Initialize shark system
export function initSharkSystem() {
    debug('Initializing shark system');
    // Add sharks array to game state
    gameState.sharks = [];
    gameState.lastSharkSpawnTime = 0;
}

// Create a shark model
function createSharkModel() {
    const shark = new THREE.Group();
    
    // Shark body - elongated shape
    const bodyGeometry = new THREE.CapsuleGeometry(1, 6, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x505c66, // Gray-blue color
        roughness: 0.7,
        metalness: 0.1
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2; // Align with forward direction
    shark.add(body);
    
    // Shark tail
    const tailGeometry = new THREE.ConeGeometry(1, 2.5, 8);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.x = -4; // Behind the body
    tail.rotation.z = -Math.PI / 2;
    shark.add(tail);
    
    // Dorsal fin
    const dorsalGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    const finMaterial = new THREE.MeshStandardMaterial({
        color: 0x454f57, // Slightly darker than body
        roughness: 0.8,
        metalness: 0.1
    });
    
    const dorsalFin = new THREE.Mesh(dorsalGeometry, finMaterial);
    dorsalFin.position.set(0, 1.5, 0);
    dorsalFin.rotation.z = Math.PI / 2;
    shark.add(dorsalFin);
    
    // Pectoral fins
    const pectoralGeometry = new THREE.ConeGeometry(0.3, 1.5, 8);
    
    const leftPectoral = new THREE.Mesh(pectoralGeometry, finMaterial);
    leftPectoral.position.set(1, 0, -1.2);
    leftPectoral.rotation.set(0, 0, -Math.PI / 4);
    shark.add(leftPectoral);
    
    const rightPectoral = new THREE.Mesh(pectoralGeometry, finMaterial);
    rightPectoral.position.set(1, 0, 1.2);
    rightPectoral.rotation.set(0, 0, -Math.PI / 4);
    shark.add(rightPectoral);
    
    // Shark eyes
    const eyeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(3, 0.5, -0.7);
    shark.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(3, 0.5, 0.7);
    shark.add(rightEye);
    
    return shark;
}

// Spawn a new shark near the player
export function spawnShark() {
    try {
        if (gameState.sharks.length >= MAX_SHARKS) {
            return; // Max sharks reached
        }
        
        const sub = gameState.submarine.object;
        if (!sub) return;
        
        // Get submarine position
        const subPos = sub.position.clone();
        
        // Generate a random angle
        const angle = Math.random() * Math.PI * 2;
        
        // Calculate spawn position in a circle around the submarine
        const spawnX = subPos.x + Math.cos(angle) * SHARK_SPAWN_DISTANCE;
        const spawnZ = subPos.z + Math.sin(angle) * SHARK_SPAWN_DISTANCE;
        
        // Get biome at spawn position
        const biomeData = getBiomeAtPosition(spawnX, spawnZ);
        
        // Randomly decide whether to spawn a shark based on biome density
        let spawnProbability = 0;
        for (const [biomeType, factor] of Object.entries(biomeData.blendFactors)) {
            spawnProbability += SHARK_DENSITY_BY_BIOME[biomeType] * factor;
        }
        
        if (Math.random() > spawnProbability) {
            return; // Skip this spawn attempt
        }
        
        // Get terrain height at spawn position
        const terrainHeightResult = getTerrainHeightAtPosition(spawnX, spawnZ);
        
        // Handle promise or direct value
        const handleTerrainHeight = (terrainHeight) => {
            // Validate terrain height
            if (isNaN(terrainHeight) || terrainHeight === undefined) {
                terrainHeight = subPos.y - 100; // Fallback value
                debug('Using fallback terrain height for shark spawning');
            }
            
            // Calculate spawn height (random height above ocean floor, but below water surface)
            const minSpawnHeight = terrainHeight + SHARK_MIN_HEIGHT;
            
            // Ensure maxSpawnHeight is above minSpawnHeight
            let maxSpawnHeight = Math.min(-20, subPos.y + 50); // Either near surface or near sub
            if (maxSpawnHeight <= minSpawnHeight) {
                maxSpawnHeight = minSpawnHeight + 20; // Ensure at least some range
            }
            
            const spawnY = minSpawnHeight + Math.random() * (maxSpawnHeight - minSpawnHeight);
            
            // Create shark model
            const sharkModel = createSharkModel();
            
            // Position shark at spawn location
            sharkModel.position.set(spawnX, spawnY, spawnZ);
            
            // Rotate to face random direction
            sharkModel.rotation.y = Math.random() * Math.PI * 2;
            
            // Add to scene
            gameState.scene.add(sharkModel);
            
            // Create shark data
            const shark = {
                object: sharkModel,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5, // Initial random velocity
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.5
                ),
                targetPosition: null, // Will be set during update
                turnSpeed: SHARK_TURN_SPEED * (0.8 + Math.random() * 0.4), // Slightly randomize turn speed
                speed: SHARK_SPEED * (0.7 + Math.random() * 0.6), // Randomize speed a bit
                swimCycle: Math.random() * Math.PI * 2, // For swimming animation
                lastTerrainHeight: terrainHeight
            };
            
            // Add to game sharks array
            gameState.sharks.push(shark);
            
            // Use safe output to avoid toFixed errors
            try {
                debug(`Spawned shark at ${Math.floor(spawnX)}, ${Math.floor(spawnY)}, ${Math.floor(spawnZ)}`);
            } catch (e) {
                debug('Spawned shark (position logging error)');
            }
            
            return shark;
        };
        
        // Process the terrain height result, which could be a Promise or direct value
        if (terrainHeightResult instanceof Promise) {
            terrainHeightResult
                .then(handleTerrainHeight)
                .catch(error => {
                    console.error('Error getting terrain height for shark:', error);
                    // Use fallback height
                    handleTerrainHeight(subPos.y - 100);
                });
        } else {
            // Direct value
            return handleTerrainHeight(terrainHeightResult);
        }
    } catch (error) {
        console.error('Error in spawnShark:', error);
    }
}

// Update all sharks
export function updateSharks(deltaTime) {
    try {
        if (!gameState.sharks) return;
        
        const sub = gameState.submarine.object;
        if (!sub) return;
        
        // Check if we should try to spawn a new shark
        const currentTime = Date.now();
        if (currentTime - gameState.lastSharkSpawnTime > SHARK_SPAWN_INTERVAL) {
            spawnShark();
            gameState.lastSharkSpawnTime = currentTime;
        }
        
        const sharksToRemove = [];
        
        // Update each shark
        gameState.sharks.forEach((shark, index) => {
            try {
                // Calculate distance to submarine
                const distanceToSub = shark.object.position.distanceTo(sub.position);
                
                // Remove sharks that are too far away
                if (distanceToSub > SHARK_DESPAWN_DISTANCE) {
                    sharksToRemove.push(index);
                    return;
                }
                
                // Update swim cycle for animation
                shark.swimCycle += deltaTime * 2;
                if (shark.swimCycle > Math.PI * 2) {
                    shark.swimCycle -= Math.PI * 2;
                }
                
                // Animate tail with swim cycle
                const tail = shark.object.children.find(child => 
                    child.geometry && child.geometry.type === 'ConeGeometry' && child.position.x < -3);
                if (tail) {
                    tail.rotation.y = Math.sin(shark.swimCycle) * 0.3;
                }
                
                // Animate fins with swim cycle
                const fins = shark.object.children.filter(child => 
                    child.geometry && child.geometry.type === 'ConeGeometry' && 
                    Math.abs(child.position.z) > 0.5);
                fins.forEach(fin => {
                    fin.rotation.x = Math.sin(shark.swimCycle) * 0.2;
                });
                
                // Periodically update target position (shark intelligence)
                if (!shark.targetPosition || Math.random() < 0.005) {
                    // Sometimes target the submarine
                    const targetSub = distanceToSub < 200 && Math.random() < 0.3;
                    
                    if (targetSub) {
                        // Target slightly offset from sub position for more natural movement
                        shark.targetPosition = sub.position.clone().add(
                            new THREE.Vector3(
                                (Math.random() - 0.5) * 50,
                                (Math.random() - 0.5) * 30,
                                (Math.random() - 0.5) * 50
                            )
                        );
                    } else {
                        // Random position near current location
                        shark.targetPosition = shark.object.position.clone().add(
                            new THREE.Vector3(
                                (Math.random() - 0.5) * 150,
                                (Math.random() - 0.5) * 50,
                                (Math.random() - 0.5) * 150
                            )
                        );
                    }
                }
                
                // Calculate direction to target
                const targetDirection = new THREE.Vector3().subVectors(
                    shark.targetPosition,
                    shark.object.position
                ).normalize();
                
                // Get terrain height at shark position
                const terrainHeightResult = getTerrainHeightAtPosition(
                    shark.object.position.x, 
                    shark.object.position.z
                );
                
                // Function to handle terrain height, whether from Promise or direct value
                const handleTerrainHeight = (height) => {
                    // Validate height
                    let terrainHeight = height;
                    if (isNaN(terrainHeight) || terrainHeight === undefined) {
                        // Use last known height if available, otherwise use position Y minus offset
                        terrainHeight = shark.lastTerrainHeight;
                        if (isNaN(terrainHeight) || terrainHeight === undefined) {
                            terrainHeight = shark.object.position.y - 50;
                        }
                    }
                    
                    // Store valid height for future reference
                    shark.lastTerrainHeight = terrainHeight;
                    
                    // Avoid getting too close to terrain
                    if (shark.object.position.y - terrainHeight < SHARK_MIN_HEIGHT) {
                        targetDirection.y = Math.max(targetDirection.y, 0.5);
                    }
                };
                
                // Process the terrain height result
                if (terrainHeightResult instanceof Promise) {
                    // If it's a Promise, use last known height immediately and update when Promise resolves
                    if (shark.lastTerrainHeight !== undefined) {
                        if (shark.object.position.y - shark.lastTerrainHeight < SHARK_MIN_HEIGHT) {
                            targetDirection.y = Math.max(targetDirection.y, 0.5);
                        }
                    }
                    
                    // Handle Promise result when it resolves
                    terrainHeightResult
                        .then(handleTerrainHeight)
                        .catch(error => {
                            // On error, continue with last known height
                            console.error('Error getting shark terrain height:', error);
                        });
                } else {
                    // Direct value
                    handleTerrainHeight(terrainHeightResult);
                }
                
                // Avoid getting too close to surface
                if (shark.object.position.y > -20) {
                    targetDirection.y = Math.min(targetDirection.y, -0.5);
                }
                
                // Create rotation quaternion toward target
                const targetQuaternion = new THREE.Quaternion();
                const lookAtMatrix = new THREE.Matrix4();
                lookAtMatrix.lookAt(
                    new THREE.Vector3(0, 0, 0),
                    targetDirection,
                    new THREE.Vector3(0, 1, 0)
                );
                targetQuaternion.setFromRotationMatrix(lookAtMatrix);
                
                // Smoothly rotate toward target
                shark.object.quaternion.slerp(targetQuaternion, shark.turnSpeed);
                
                // Get forward direction from shark's rotation
                const forward = new THREE.Vector3(0, 0, -1);
                forward.applyQuaternion(shark.object.quaternion);
                
                // Move in that direction
                shark.object.position.addScaledVector(forward, shark.speed);
                
                // Update shark velocity
                shark.velocity.copy(forward).multiplyScalar(shark.speed);
            } catch (error) {
                console.error('Error updating shark:', error);
                sharksToRemove.push(index);
            }
        });
        
        // Remove sharks marked for removal
        removeSharks(sharksToRemove);
    } catch (error) {
        console.error('Error in updateSharks:', error);
    }
}

// Remove sharks from scene and array
function removeSharks(sharksToRemove) {
    try {
        if (sharksToRemove.length === 0) return;
        
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
    } catch (error) {
        console.error('Error removing sharks:', error);
    }
} 