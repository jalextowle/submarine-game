// Shark creation and management for the submarine game

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
const SHARK_DIRECTION_CHANGE_INTERVAL = 5000; // ms between direction changes
const SHARK_BEHAVIOR_PATTERNS = [
    'straight', // Swim in a straight line
    'gentle_turn', // Make gentle turns
    'circling', // Circle around the submarine
    'zig_zag' // Zig-zag pattern
];
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

async function createSharkModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('../models/shark.glb.glb/scene.gltf'); // Load the shark model from js/models directory
    const model = gltf.scene;

    // Adjust scale and position as needed
    model.scale.set(1, 1, 1);    // Adjust based on your game's scale
    model.position.set(0, 0, 0); // Set initial position
    
    // After examining the model, we need to rotate it correctly
    // Try adding a small rotation to align with the negative Z axis (forward direction)
    // The exact angle depends on the original model orientation
    model.rotation.y = 0; // Reset to default, we'll add direction indicators

    // Add direction indicators to help debug the model's orientation
    // Red arrow points in local +X direction
    const xArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        3,
        0xff0000
    );
    
    // Green arrow points in local +Y direction
    const yArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        3,
        0x00ff00
    );
    
    // Blue arrow points in local +Z direction
    const zArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 0),
        3,
        0x0000ff
    );
    
    // Add helpers to the model
    model.add(xArrow);
    model.add(yArrow);
    model.add(zArrow);
    
    console.log("Loaded shark model:", model);
    
    return model;
}

// Spawn a new shark near the player
export async function spawnShark() {
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
        const handleTerrainHeight = async (terrainHeight) => {
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
            const sharkModel = await createSharkModel();
            
            // Position shark at spawn location
            sharkModel.position.set(spawnX, spawnY, spawnZ);
            
            // Rotate to face random direction
            sharkModel.rotation.y = Math.random() * Math.PI * 2;
            
            // Add to scene
            gameState.scene.add(sharkModel);
            
            // Pick a movement behavior pattern
            const behaviorPattern = SHARK_BEHAVIOR_PATTERNS[
                Math.floor(Math.random() * SHARK_BEHAVIOR_PATTERNS.length)
            ];
            
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
                lastTerrainHeight: terrainHeight,
                lastDirectionChange: Date.now(),
                behaviorPattern: behaviorPattern,
                behaviorState: {
                    phase: 0, // For cyclic behaviors
                    straightLineDuration: 3000 + Math.random() * 4000, // Time to swim straight
                    turnDirection: Math.random() > 0.5 ? 1 : -1, // For turning behaviors
                    turnDuration: 2000 + Math.random() * 2000, // How long to turn
                    zigZagInterval: 2000 + Math.random() * 1000 // Time between zigzags
                },
                previousQuaternion: sharkModel.quaternion.clone() // Initialize with the starting rotation
            };
            
            // Add to game sharks array
            gameState.sharks.push(shark);
            
            // Use safe output to avoid toFixed errors
            try {
                debug(`Spawned shark at ${Math.floor(spawnX)}, ${Math.floor(spawnY)}, ${Math.floor(spawnZ)} with ${behaviorPattern} behavior`);
            } catch (e) {
                debug('Spawned shark (position logging error)');
            }
            
            return shark;
        };
        
        // Process the terrain height result, which could be a Promise or direct value
        if (terrainHeightResult instanceof Promise) {
            return terrainHeightResult
                .then(handleTerrainHeight)
                .catch(error => {
                    console.error('Error getting terrain height for shark:', error);
                    // Use fallback height
                    return handleTerrainHeight(subPos.y - 100);
                });
        } else {
            // Direct value
            return handleTerrainHeight(terrainHeightResult);
        }
    } catch (error) {
        console.error('Error in spawnShark:', error);
    }
}

// Update shark behavior based on its pattern
function updateSharkBehavior(shark, deltaTime, sub) {
    // Target position for the shark
    let targetPosition = null;
    const currentTime = Date.now();
    
    // Update behavior state based on pattern
    switch (shark.behaviorPattern) {
        case 'straight':
            // Change direction periodically
            if (currentTime - shark.lastDirectionChange > shark.behaviorState.straightLineDuration) {
                // Pick new random direction
                const randomDir = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 2
                ).normalize();
                
                // Set new target far away in that direction
                targetPosition = shark.object.position.clone().add(
                    randomDir.multiplyScalar(300)
                );
                
                shark.lastDirectionChange = currentTime;
                shark.behaviorState.straightLineDuration = 3000 + Math.random() * 4000;
            } else if (!shark.targetPosition) {
                // Initial target
                const randomDir = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 2
                ).normalize();
                
                targetPosition = shark.object.position.clone().add(
                    randomDir.multiplyScalar(300)
                );
            } else {
                // Keep existing target
                targetPosition = shark.targetPosition;
            }
            break;
            
        case 'gentle_turn':
            // Update turn phase
            shark.behaviorState.phase += deltaTime * 0.2;
            
            // Create a gently curving path
            const turnOffset = new THREE.Vector3(
                Math.sin(shark.behaviorState.phase) * 50 * shark.behaviorState.turnDirection,
                Math.sin(shark.behaviorState.phase * 0.5) * 20,
                Math.cos(shark.behaviorState.phase) * 50 * shark.behaviorState.turnDirection
            );
            
            // Set target ahead with curve offset
            const forwardDir = new THREE.Vector3(0, 0, -1)
                .applyQuaternion(shark.object.quaternion)
                .multiplyScalar(100);
                
            targetPosition = shark.object.position.clone()
                .add(forwardDir)
                .add(turnOffset);
                
            // Occasionally change turn direction
            if (currentTime - shark.lastDirectionChange > shark.behaviorState.turnDuration) {
                shark.behaviorState.turnDirection *= -1;
                shark.lastDirectionChange = currentTime;
                shark.behaviorState.turnDuration = 2000 + Math.random() * 2000;
            }
            break;
            
        case 'circling':
            // Only circle if submarine is within range
            const distToSub = shark.object.position.distanceTo(sub.position);
            if (distToSub < 150) {
                // Update circle phase
                shark.behaviorState.phase += deltaTime * 0.5;
                
                // Calculate position on circle around submarine
                const circleRadius = 60 + Math.sin(shark.behaviorState.phase * 0.2) * 20;
                
                // Calculate next position on circle
                // This approach ensures the shark is always swimming forward in the direction it's facing
                const nextPhase = shark.behaviorState.phase + deltaTime * 0.6;
                
                // Current position on circle
                const currentCirclePos = new THREE.Vector3(
                    Math.cos(shark.behaviorState.phase) * circleRadius,
                    Math.sin(shark.behaviorState.phase * 0.3) * 20, // Slight vertical oscillation
                    Math.sin(shark.behaviorState.phase) * circleRadius
                );
                
                // Next position on circle to determine movement direction
                const nextCirclePos = new THREE.Vector3(
                    Math.cos(nextPhase) * circleRadius,
                    Math.sin(nextPhase * 0.3) * 20,
                    Math.sin(nextPhase) * circleRadius
                );
                
                // Calculate direction by subtracting current from next position
                const circleDirection = nextCirclePos.clone().sub(currentCirclePos).normalize();
                
                // Calculate target point that is ahead on the circle path
                const anticipationDistance = 30; // Look ahead distance
                const anticipatedPos = currentCirclePos.clone().add(
                    circleDirection.clone().multiplyScalar(anticipationDistance)
                );
                
                // Set target relative to submarine
                targetPosition = sub.position.clone().add(anticipatedPos);
                
                // Store the phase for next update
                shark.behaviorState.lastPhase = shark.behaviorState.phase;
            } else {
                // If too far from sub, move toward it
                targetPosition = sub.position.clone().add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 100,
                        (Math.random() - 0.5) * 50,
                        (Math.random() - 0.5) * 100
                    )
                );
            }
            break;
            
        case 'zig_zag':
            // Update zig-zag phase
            if (currentTime - shark.lastDirectionChange > shark.behaviorState.zigZagInterval) {
                // Switch zig-zag direction
                shark.behaviorState.turnDirection *= -1;
                shark.lastDirectionChange = currentTime;
            }
            
            // Get forward direction
            const forward = new THREE.Vector3(0, 0, -1)
                .applyQuaternion(shark.object.quaternion)
                .multiplyScalar(100);
                
            // Get side direction based on current zigzag phase
            const side = new THREE.Vector3(1, 0, 0)
                .applyQuaternion(shark.object.quaternion)
                .multiplyScalar(40 * shark.behaviorState.turnDirection);
                
            // Create zigzag path
            targetPosition = shark.object.position.clone()
                .add(forward)
                .add(side);
            break;
            
        default:
            // Fallback to basic targeting like before
            if (Math.random() < 0.005) {
                const distanceToSub = shark.object.position.distanceTo(sub.position);
                const targetSub = distanceToSub < 200 && Math.random() < 0.3;
                
                if (targetSub) {
                    targetPosition = sub.position.clone().add(
                        new THREE.Vector3(
                            (Math.random() - 0.5) * 50,
                            (Math.random() - 0.5) * 30,
                            (Math.random() - 0.5) * 50
                        )
                    );
                } else {
                    targetPosition = shark.object.position.clone().add(
                        new THREE.Vector3(
                            (Math.random() - 0.5) * 150,
                            (Math.random() - 0.5) * 50,
                            (Math.random() - 0.5) * 150
                        )
                    );
                }
            } else {
                targetPosition = shark.targetPosition;
            }
    }
    
    return targetPosition;
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
            spawnShark().catch(error => {
                console.error('Error spawning shark:', error);
            });
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
                
                // Update shark behavior and get target position
                shark.targetPosition = updateSharkBehavior(shark, deltaTime, sub);
                
                // If we don't have a target position yet, use a default
                if (!shark.targetPosition) {
                    shark.targetPosition = shark.object.position.clone().add(
                        new THREE.Vector3(
                            (Math.random() - 0.5) * 150,
                            (Math.random() - 0.5) * 50,
                            (Math.random() - 0.5) * 150
                        )
                    );
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
                    
                    // Check if shark is below terrain and adjust if needed
                    const collisionBuffer = 10; // Buffer distance to keep above terrain
                    if (shark.object.position.y < terrainHeight + collisionBuffer) {
                        // Push shark above terrain immediately to prevent clipping
                        shark.object.position.y = terrainHeight + collisionBuffer;
                        
                        // Modify target direction to swim upward away from terrain
                        targetDirection.y = Math.max(targetDirection.y, 0.7);
                    } 
                    // Avoid getting too close to terrain
                    else if (shark.object.position.y - terrainHeight < SHARK_MIN_HEIGHT) {
                        // Gradually steer upward as we get closer to terrain
                        const distanceToTerrain = shark.object.position.y - terrainHeight;
                        const urgencyFactor = 1 - (distanceToTerrain / SHARK_MIN_HEIGHT);
                        targetDirection.y = Math.max(targetDirection.y, 0.4 * urgencyFactor);
                    }
                };
                
                // Process the terrain height result
                if (terrainHeightResult instanceof Promise) {
                    // If it's a Promise, use last known height immediately and update when Promise resolves
                    if (shark.lastTerrainHeight !== undefined) {
                        // Check if shark is below terrain and adjust if needed
                        const collisionBuffer = 10;
                        if (shark.object.position.y < shark.lastTerrainHeight + collisionBuffer) {
                            // Push shark above terrain immediately to prevent clipping
                            shark.object.position.y = shark.lastTerrainHeight + collisionBuffer;
                            
                            // Modify target direction to swim upward away from terrain
                            targetDirection.y = Math.max(targetDirection.y, 0.7);
                        } 
                        // Avoid getting too close
                        else if (shark.object.position.y - shark.lastTerrainHeight < SHARK_MIN_HEIGHT) {
                            const distanceToTerrain = shark.object.position.y - shark.lastTerrainHeight;
                            const urgencyFactor = 1 - (distanceToTerrain / SHARK_MIN_HEIGHT);
                            targetDirection.y = Math.max(targetDirection.y, 0.4 * urgencyFactor);
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
                
                // Directly set the shark to look at the target position
                // This ensures the front of the shark faces the direction of travel
                const sharkPosition = shark.object.position.clone();
                const targetPosition = sharkPosition.clone().add(targetDirection);
                
                const newQuaternion = new THREE.Quaternion();
                const newRotation = new THREE.Matrix4();
                
                // Create a matrix that looks from the shark's position toward the target
                newRotation.lookAt(
                    sharkPosition,
                    targetPosition,
                    new THREE.Vector3(0, 1, 0)
                );
                
                // Convert the matrix to a quaternion
                newQuaternion.setFromRotationMatrix(newRotation);
                
                // Apply smooth rotation to make it look more natural
                // The higher the factor, the faster the turn
                const turnAmount = Math.min(shark.turnSpeed * (deltaTime / 16), 0.05); // Scale by deltaTime for consistent turning regardless of frame rate
                
                // Apply the new rotation with smooth interpolation
                shark.object.quaternion.slerp(newQuaternion, turnAmount);
                
                // Move the shark in the direction it's facing
                // Based on the model orientation, we need to adjust which axis is "forward"
                // For now, we'll try using the positive Z axis
                const forward = new THREE.Vector3(0, 0, 1);
                forward.applyQuaternion(shark.object.quaternion);
                
                // Move in that direction
                const movementSpeed = shark.speed;
                const newPosition = shark.object.position.clone().addScaledVector(forward, movementSpeed);
                
                // Final terrain check before committing to the new position
                const finalTerrainHeight = shark.lastTerrainHeight;
                const minSafeHeight = finalTerrainHeight + 10; // 10 unit buffer
                
                // If we would move below terrain, adjust to safe height
                if (finalTerrainHeight !== undefined && newPosition.y < minSafeHeight) {
                    newPosition.y = minSafeHeight;
                }
                
                // Set new position
                shark.object.position.copy(newPosition);
                
                // Update shark velocity to match its forward direction
                shark.velocity.copy(forward).multiplyScalar(movementSpeed);
                
                // Adjust swim cycle for animation
                shark.swimCycle += deltaTime * 5 * movementSpeed;
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