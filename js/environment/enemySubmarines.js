// Enemy submarine creation and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { getBiomeAtPosition } from './biomes.js';
import { getTerrainHeightAtPosition } from './oceanFloor.js';
import { BIOME_TYPES } from './biomes.js';
import { OCEAN_DEPTH, WORLD_SIZE } from '../core/constants.js';

// Constants for enemy submarine behavior
const ENEMY_SUB_SPEED = 0.7; // Slower than sharks
const ENEMY_SUB_TURN_SPEED = 0.015;
const ENEMY_SUB_SPAWN_DISTANCE = 500; // Spawn distance from player
const ENEMY_SUB_DESPAWN_DISTANCE = 700; // Distance at which enemy subs despawn
const ENEMY_SUB_MIN_HEIGHT = 50; // Minimum height above ocean floor
const MAX_ENEMY_SUBS = 5; // Maximum number of enemy submarines at once
const ENEMY_SUB_SPAWN_INTERVAL = 7000; // Time between spawning attempts (ms) - less frequent than sharks
const ENEMY_SUB_BEHAVIOR_PATTERNS = [
    'straight', // Move in a straight line
    'gentle_turn', // Make gentle turns
    'patrol' // Patrol back and forth
];
const ENEMY_SUB_DENSITY_BY_BIOME = {
    [BIOME_TYPES.FLAT_SANDY]: 0.3,
    [BIOME_TYPES.CONTINENTAL_SHELF]: 0.5,
    [BIOME_TYPES.TRENCH]: 0.2,
    [BIOME_TYPES.ISLAND]: 0.4
};

// Initialize enemy submarine system
export function initEnemySubmarineSystem() {
    debug('Initializing enemy submarine system');
    // Add enemy submarines array to game state
    gameState.enemySubmarines = [];
    gameState.lastEnemySubSpawnTime = 0;
}

// Create a simple enemy submarine model based on the player's submarine
function createEnemySubmarineModel() {
    // Create a submarine group
    const submarine = new THREE.Group();
    
    // --- MAIN HULL (simplified) ---
    const hullLength = 20;
    const hullRadius = 2;
    
    // Main pressure hull
    const mainHullMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B0000, // Dark red color to distinguish from player
        metalness: 0.6,
        roughness: 0.4
    });
    
    // Main pressure hull (single piece)
    const mainHullGeometry = new THREE.CylinderGeometry(hullRadius, hullRadius, hullLength * 0.7, 32);
    const mainHull = new THREE.Mesh(mainHullGeometry, mainHullMaterial);
    mainHull.rotation.x = Math.PI / 2; // Align with Z-axis
    
    // Calculate the exact position where the main hull ends
    const mainHullHalfLength = hullLength * 0.7 / 2;
    
    // Forward hull section (tapered) - FRONT of submarine (positive Z)
    const forwardHullGeometry = new THREE.ConeGeometry(hullRadius, hullLength * 0.2, 32);
    const forwardHull = new THREE.Mesh(forwardHullGeometry, mainHullMaterial);
    forwardHull.rotation.x = Math.PI / 2;
    // Position exactly at the end of the main hull
    forwardHull.position.z = mainHullHalfLength + (hullLength * 0.2 / 2);
    
    // Rear hull section (tapered) - BACK of submarine (negative Z)
    const rearHullGeometry = new THREE.ConeGeometry(hullRadius, hullLength * 0.15, 32);
    const rearHull = new THREE.Mesh(rearHullGeometry, mainHullMaterial);
    rearHull.rotation.x = -Math.PI / 2;
    // Position exactly at the end of the main hull
    rearHull.position.z = -mainHullHalfLength - (hullLength * 0.15 / 2);
    
    // --- CONNING TOWER (SAIL) --- (at the FRONT half)
    const towerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x6B0000, // Slightly darker than hull
        metalness: 0.6,
        roughness: 0.3
    });
    
    // Streamlined sail shape (positioned toward FRONT)
    const sailGeometry = new THREE.BoxGeometry(2, 3, 7);
    const sail = new THREE.Mesh(sailGeometry, towerMaterial);
    sail.position.y = hullRadius + 1.5;
    sail.position.z = hullLength * 0.1; // Positioned toward front half
    
    // Rounded front of sail
    const sailFrontGeometry = new THREE.CylinderGeometry(1, 1, 3, 16, 1, false, -Math.PI/2, Math.PI);
    const sailFront = new THREE.Mesh(sailFrontGeometry, towerMaterial);
    sailFront.rotation.x = Math.PI / 2;
    sailFront.position.y = hullRadius + 1.5;
    sailFront.position.z = hullLength * 0.1 + 3.5; // Match sail position + offset
    
    // Add all parts to the submarine group
    submarine.add(mainHull);
    submarine.add(forwardHull);
    submarine.add(rearHull);
    submarine.add(sail);
    submarine.add(sailFront);
    
    // Add control surfaces (fins)
    addControlSurfaces(submarine, hullLength);
    
    return submarine;
}

// Add control surfaces (fins) to the submarine
function addControlSurfaces(submarine, hullLength) {
    const finMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x9B0000, // Slightly lighter than hull
        metalness: 0.5,
        roughness: 0.5
    });
    
    // Horizontal rear fins (X-axis)
    const rearFinGeometry = new THREE.BoxGeometry(12, 0.5, 3);
    const rearFin = new THREE.Mesh(rearFinGeometry, finMaterial);
    rearFin.position.z = -hullLength * 0.3;
    
    // Vertical rear fin (Y-axis)
    const verticalFinGeometry = new THREE.BoxGeometry(0.5, 8, 3);
    const verticalFin = new THREE.Mesh(verticalFinGeometry, finMaterial);
    verticalFin.position.z = -hullLength * 0.3;
    
    // Add fins to submarine
    submarine.add(rearFin);
    submarine.add(verticalFin);
}

// Spawn a new enemy submarine near the player
export async function spawnEnemySubmarine() {
    try {
        if (gameState.enemySubmarines.length >= MAX_ENEMY_SUBS) {
            return; // Max enemy subs reached
        }
        
        const sub = gameState.submarine.object;
        if (!sub) return;
        
        // Get submarine position
        const subPos = sub.position.clone();
        
        // Generate a random angle
        const angle = Math.random() * Math.PI * 2;
        
        // Calculate spawn position in a circle around the submarine
        const spawnX = subPos.x + Math.cos(angle) * ENEMY_SUB_SPAWN_DISTANCE;
        const spawnZ = subPos.z + Math.sin(angle) * ENEMY_SUB_SPAWN_DISTANCE;
        
        // Get biome at spawn position
        const biomeData = getBiomeAtPosition(spawnX, spawnZ);
        
        // Randomly decide whether to spawn an enemy sub based on biome density
        let spawnProbability = 0;
        for (const [biomeType, factor] of Object.entries(biomeData.blendFactors)) {
            spawnProbability += ENEMY_SUB_DENSITY_BY_BIOME[biomeType] * factor;
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
                debug('Using fallback terrain height for enemy sub spawning');
            }
            
            // Calculate spawn height (random height above ocean floor, but below water surface)
            const minSpawnHeight = terrainHeight + ENEMY_SUB_MIN_HEIGHT;
            
            // Ensure maxSpawnHeight is above minSpawnHeight
            let maxSpawnHeight = Math.min(-50, subPos.y + 80); // Either near surface or near sub
            if (maxSpawnHeight <= minSpawnHeight) {
                maxSpawnHeight = minSpawnHeight + 30; // Ensure at least some range
            }
            
            const spawnY = minSpawnHeight + Math.random() * (maxSpawnHeight - minSpawnHeight);
            
            // Create enemy submarine model
            const enemySubModel = createEnemySubmarineModel();
            
            // Position submarine at spawn location
            enemySubModel.position.set(spawnX, spawnY, spawnZ);
            
            // Rotate to face random direction
            enemySubModel.rotation.y = Math.random() * Math.PI * 2;
            
            // Add to scene
            gameState.scene.add(enemySubModel);
            
            // Pick a movement behavior pattern
            const behaviorPattern = ENEMY_SUB_BEHAVIOR_PATTERNS[
                Math.floor(Math.random() * ENEMY_SUB_BEHAVIOR_PATTERNS.length)
            ];
            
            // Create enemy submarine data
            const enemySub = {
                object: enemySubModel,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3, // Initial random velocity
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.3
                ),
                targetPosition: null, // Will be set during update
                turnSpeed: ENEMY_SUB_TURN_SPEED * (0.8 + Math.random() * 0.4), // Slightly randomize turn speed
                speed: ENEMY_SUB_SPEED * (0.7 + Math.random() * 0.6), // Randomize speed a bit
                lastTerrainHeight: terrainHeight,
                lastDirectionChange: Date.now(),
                behaviorPattern: behaviorPattern,
                // Add health-related properties
                maxHealth: 100,
                currentHealth: 100,
                healthRegenRate: 2, // Health points regenerated per second
                lastDamageTime: 0, // Track when sub last took damage
                damageRecoveryTime: 5000, // Milliseconds before health regeneration begins after damage
                healthBar: null, // Will hold reference to health bar object
                behaviorState: {
                    phase: 0, // For cyclic behaviors
                    straightLineDuration: 5000 + Math.random() * 5000, // Time to swim straight
                    turnDirection: Math.random() > 0.5 ? 1 : -1, // For turning behaviors
                    turnDuration: 3000 + Math.random() * 2000, // How long to turn
                    patrolDistance: 200 + Math.random() * 200, // Distance for patrol pattern
                    patrolDirection: 1 // Current patrol direction
                }
            };
            
            // Create health bar for enemy submarine
            createHealthBar(enemySub);
            
            // Add to game enemySubmarines array
            gameState.enemySubmarines.push(enemySub);
            
            debug(`Spawned enemy submarine at ${Math.floor(spawnX)}, ${Math.floor(spawnY)}, ${Math.floor(spawnZ)} with ${behaviorPattern} behavior`);
            
            return enemySub;
        };
        
        // Process the terrain height result, which could be a Promise or direct value
        if (terrainHeightResult instanceof Promise) {
            return terrainHeightResult
                .then(handleTerrainHeight)
                .catch(error => {
                    console.error('Error getting terrain height for enemy sub:', error);
                    // Use fallback height
                    return handleTerrainHeight(subPos.y - 100);
                });
        } else {
            // Direct value
            return handleTerrainHeight(terrainHeightResult);
        }
    } catch (error) {
        console.error('Error in spawnEnemySubmarine:', error);
    }
}

// Update enemy submarine behavior based on its pattern
function updateEnemySubBehavior(enemySub, deltaTime, sub) {
    // Target position for the enemy submarine
    let targetPosition = null;
    const currentTime = Date.now();
    
    // Update behavior state based on pattern
    switch (enemySub.behaviorPattern) {
        case 'straight':
            // Change direction periodically
            if (currentTime - enemySub.lastDirectionChange > enemySub.behaviorState.straightLineDuration) {
                // Pick new random direction
                const randomDir = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 2
                ).normalize();
                
                // Set new target far away in that direction
                targetPosition = enemySub.object.position.clone().add(
                    randomDir.multiplyScalar(500)
                );
                
                enemySub.lastDirectionChange = currentTime;
                enemySub.behaviorState.straightLineDuration = 5000 + Math.random() * 5000;
            } else if (!enemySub.targetPosition) {
                // Initial target
                const randomDir = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 2
                ).normalize();
                
                targetPosition = enemySub.object.position.clone().add(
                    randomDir.multiplyScalar(500)
                );
            }
            break;
            
        case 'gentle_turn':
            // Continuous gentle turning
            if (!enemySub.targetPosition || currentTime - enemySub.lastDirectionChange > enemySub.behaviorState.turnDuration) {
                // Set new turn parameters
                enemySub.behaviorState.turnDirection = Math.random() > 0.5 ? 1 : -1;
                enemySub.lastDirectionChange = currentTime;
                enemySub.behaviorState.turnDuration = 3000 + Math.random() * 2000;
            }
            
            // Create a turning direction based on current forward direction
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemySub.object.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(enemySub.object.quaternion);
            
            // Add a component of the right vector to create a turn
            const turnVector = forward.clone().add(
                right.multiplyScalar(0.3 * enemySub.behaviorState.turnDirection)
            ).normalize();
            
            // Set target position in the turning direction
            targetPosition = enemySub.object.position.clone().add(
                turnVector.multiplyScalar(300)
            );
            break;
            
        case 'patrol':
            // Patrol back and forth along a line
            if (!enemySub.initialPatrolPosition) {
                // Set initial patrol position and direction
                enemySub.initialPatrolPosition = enemySub.object.position.clone();
                enemySub.patrolDirection = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 2
                ).normalize();
            }
            
            // Check if we need to reverse direction
            const distanceFromInitial = enemySub.object.position.distanceTo(enemySub.initialPatrolPosition);
            if (distanceFromInitial > enemySub.behaviorState.patrolDistance) {
                // Reverse patrol direction
                enemySub.behaviorState.patrolDirection *= -1;
                enemySub.lastDirectionChange = currentTime;
            }
            
            // Calculate patrol target
            const patrolDirection = enemySub.patrolDirection.clone().multiplyScalar(
                enemySub.behaviorState.patrolDirection
            );
            
            targetPosition = enemySub.initialPatrolPosition.clone().add(
                patrolDirection.multiplyScalar(enemySub.behaviorState.patrolDistance)
            );
            break;
    }
    
    return targetPosition;
}

// Create a health bar for an enemy submarine
function createHealthBar(enemySub) {
    // Create container for the health bar
    const healthBarContainer = new THREE.Group();
    
    // Create background bar (gray)
    const backgroundGeometry = new THREE.PlaneGeometry(5, 0.5);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
        color: 0x444444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    
    // Create foreground bar (red for health)
    const foregroundGeometry = new THREE.PlaneGeometry(5, 0.5);
    const foregroundMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide
    });
    const foreground = new THREE.Mesh(foregroundGeometry, foregroundMaterial);
    
    // Position foreground at left edge of background (so it scales from left to right)
    foreground.position.x = 0;
    
    // Add both to container
    healthBarContainer.add(background);
    healthBarContainer.add(foreground);
    
    // Position health bar above the submarine
    healthBarContainer.position.y = 6;
    
    // Rotate to face camera always
    healthBarContainer.rotation.x = Math.PI / 2;
    
    // Add to scene
    enemySub.object.add(healthBarContainer);
    
    // Store reference to health bar parts
    enemySub.healthBar = {
        container: healthBarContainer,
        background: background,
        foreground: foreground,
        initialWidth: 5 // Store initial width for scaling
    };
    
    // Update health bar to match initial health
    updateHealthBar(enemySub);
}

// Update a health bar to match current health
function updateHealthBar(enemySub) {
    if (!enemySub.healthBar) return;
    
    // Calculate health percentage
    const healthPercent = enemySub.currentHealth / enemySub.maxHealth;
    
    // Scale the foreground bar
    enemySub.healthBar.foreground.scale.x = healthPercent;
    
    // Adjust position to keep left-aligned
    enemySub.healthBar.foreground.position.x = -((1 - healthPercent) * enemySub.healthBar.initialWidth) / 2;
    
    // Update color based on health percentage
    if (healthPercent > 0.6) {
        // Green for high health
        enemySub.healthBar.foreground.material.color.setHex(0x00ff00);
    } else if (healthPercent > 0.3) {
        // Yellow for medium health
        enemySub.healthBar.foreground.material.color.setHex(0xffff00);
    } else {
        // Red for low health
        enemySub.healthBar.foreground.material.color.setHex(0xff0000);
    }
    
    // Make health bar face the camera
    if (gameState.camera && gameState.camera.main) {
        const camPos = gameState.camera.main.position.clone();
        enemySub.healthBar.container.lookAt(camPos);
    }
}

// Function to damage an enemy submarine
export function damageEnemySubmarine(enemySub, damageAmount) {
    // Set last damage time
    enemySub.lastDamageTime = Date.now();
    
    // Reduce health
    enemySub.currentHealth = Math.max(0, enemySub.currentHealth - damageAmount);
    
    // Update health bar
    updateHealthBar(enemySub);
    
    // Return true if sub was destroyed
    return enemySub.currentHealth <= 0;
}

// Update all enemy submarines
export function updateEnemySubmarines(deltaTime) {
    try {
        if (!gameState.enemySubmarines) return;
        
        const sub = gameState.submarine.object;
        if (!sub) return;
        
        // Current time for various time-based checks
        const currentTime = Date.now();
        
        // Check if we should try to spawn a new enemy submarine
        if (currentTime - gameState.lastEnemySubSpawnTime > ENEMY_SUB_SPAWN_INTERVAL) {
            spawnEnemySubmarine().catch(error => {
                console.error('Error spawning enemy submarine:', error);
            });
            gameState.lastEnemySubSpawnTime = currentTime;
        }
        
        const enemySubsToRemove = [];
        
        // Update each enemy submarine
        gameState.enemySubmarines.forEach((enemySub, index) => {
            try {
                // Calculate distance to player submarine
                const distanceToSub = enemySub.object.position.distanceTo(sub.position);
                
                // Remove enemy subs that are too far away
                if (distanceToSub > ENEMY_SUB_DESPAWN_DISTANCE) {
                    enemySubsToRemove.push(index);
                    return;
                }
                
                // Update enemy submarine behavior and get target position
                enemySub.targetPosition = updateEnemySubBehavior(enemySub, deltaTime, sub);
                
                // If we don't have a target position yet, use a default
                if (!enemySub.targetPosition) {
                    enemySub.targetPosition = enemySub.object.position.clone().add(
                        new THREE.Vector3(
                            (Math.random() - 0.5) * 200,
                            (Math.random() - 0.5) * 50,
                            (Math.random() - 0.5) * 200
                        )
                    );
                }
                
                // Health regeneration after damage recovery time
                if (enemySub.currentHealth < enemySub.maxHealth && 
                    currentTime - enemySub.lastDamageTime > enemySub.damageRecoveryTime) {
                    // Regenerate health based on time passed
                    enemySub.currentHealth = Math.min(
                        enemySub.maxHealth,
                        enemySub.currentHealth + enemySub.healthRegenRate * deltaTime
                    );
                    
                    // Update health bar
                    updateHealthBar(enemySub);
                }
                
                // Always make health bar face the camera
                updateHealthBar(enemySub);
                
                // Calculate direction to target
                const targetDirection = new THREE.Vector3().subVectors(
                    enemySub.targetPosition,
                    enemySub.object.position
                ).normalize();
                
                // Get terrain height at enemy sub position
                const terrainHeightResult = getTerrainHeightAtPosition(
                    enemySub.object.position.x, 
                    enemySub.object.position.z
                );
                
                // Function to handle terrain height, whether from Promise or direct value
                const handleTerrainHeight = (height) => {
                    // Validate height
                    let terrainHeight = height;
                    if (isNaN(terrainHeight) || terrainHeight === undefined) {
                        // Use last known height if available, otherwise use position Y minus offset
                        terrainHeight = enemySub.lastTerrainHeight;
                        if (isNaN(terrainHeight) || terrainHeight === undefined) {
                            terrainHeight = enemySub.object.position.y - 50;
                        }
                    }
                    
                    // Store valid height for future reference
                    enemySub.lastTerrainHeight = terrainHeight;
                    
                    // Check if enemy sub is below terrain and adjust if needed
                    const collisionBuffer = 20; // Buffer distance to keep above terrain
                    if (enemySub.object.position.y < terrainHeight + collisionBuffer) {
                        // Push enemy sub above terrain immediately to prevent clipping
                        enemySub.object.position.y = terrainHeight + collisionBuffer;
                        
                        // Modify target direction to swim upward away from terrain
                        targetDirection.y = Math.max(targetDirection.y, 0.7);
                    }
                    
                    // Check if enemy sub is too close to surface
                    const surfaceBuffer = 30;
                    if (enemySub.object.position.y > -surfaceBuffer) {
                        // Push enemy sub below surface
                        enemySub.object.position.y = -surfaceBuffer;
                        
                        // Modify target direction to dive
                        targetDirection.y = Math.min(targetDirection.y, -0.5);
                    }
                    
                    // Set target quaternion to face the target direction
                    const targetQuaternion = new THREE.Quaternion();
                    const up = new THREE.Vector3(0, 1, 0);
                    
                    // Create rotation matrix to look in the target direction
                    const lookMatrix = new THREE.Matrix4().lookAt(
                        new THREE.Vector3(0, 0, 0),
                        targetDirection,
                        up
                    );
                    
                    // Convert rotation matrix to quaternion
                    targetQuaternion.setFromRotationMatrix(lookMatrix);
                    
                    // Smoothly interpolate current rotation to target rotation
                    enemySub.object.quaternion.slerp(targetQuaternion, enemySub.turnSpeed * deltaTime * 10);
                    
                    // Calculate forward direction based on current rotation
                    const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(enemySub.object.quaternion);
                    
                    // Move forward in the direction the enemy sub is facing
                    enemySub.object.position.add(
                        forwardDirection.multiplyScalar(enemySub.speed * deltaTime * 30)
                    );
                };
                
                // Process the terrain height result, which could be a Promise or direct value
                if (terrainHeightResult instanceof Promise) {
                    terrainHeightResult
                        .then(handleTerrainHeight)
                        .catch(error => {
                            console.error('Error getting terrain height for enemy sub update:', error);
                            // Use fallback
                            handleTerrainHeight(enemySub.object.position.y - 50);
                        });
                } else {
                    // Direct value
                    handleTerrainHeight(terrainHeightResult);
                }
            } catch (error) {
                console.error('Error updating enemy submarine:', error);
                enemySubsToRemove.push(index);
            }
        });
        
        // Remove enemy submarines marked for removal (in reverse order to maintain indices)
        removeEnemySubmarines(enemySubsToRemove);
    } catch (error) {
        console.error('Error in updateEnemySubmarines:', error);
    }
}

// Remove enemy submarines that are marked for removal
function removeEnemySubmarines(enemySubsToRemove) {
    // Sort indices in descending order to avoid index shifting during removal
    enemySubsToRemove.sort((a, b) => b - a);
    
    // Remove each enemy submarine
    enemySubsToRemove.forEach(index => {
        try {
            const enemySub = gameState.enemySubmarines[index];
            if (enemySub && enemySub.object) {
                // Clean up health bar resources
                if (enemySub.healthBar) {
                    // Dispose of health bar geometries and materials
                    if (enemySub.healthBar.background) {
                        enemySub.healthBar.background.geometry.dispose();
                        enemySub.healthBar.background.material.dispose();
                    }
                    if (enemySub.healthBar.foreground) {
                        enemySub.healthBar.foreground.geometry.dispose();
                        enemySub.healthBar.foreground.material.dispose();
                    }
                }
                
                // Remove from scene
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
                
                // Remove from enemy submarines array
                gameState.enemySubmarines.splice(index, 1);
            }
        } catch (error) {
            console.error('Error removing enemy submarine:', error);
        }
    });
} 