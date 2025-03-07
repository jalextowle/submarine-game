// Enemy submarine creation and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { getBiomeAtPosition } from './biomes.js';
import { getTerrainHeightAtPosition } from './oceanFloor.js';
import { BIOME_TYPES } from './biomes.js';
import { OCEAN_DEPTH, WORLD_SIZE } from '../core/constants.js';
import { createTorpedo } from '../submarine/torpedo.js';

// Constants for enemy submarine behavior
const ENEMY_SUB_SPEED = 1.8; // Increased from 1.2 to make them even faster
const ENEMY_SUB_TURN_SPEED = 0.035; // Increased from 0.025 to make them more responsive
const ENEMY_SUB_SPAWN_DISTANCE = 500; // Spawn distance from player
const ENEMY_SUB_DESPAWN_DISTANCE = 700; // Distance at which enemy subs despawn
const ENEMY_SUB_MIN_HEIGHT = 50; // Minimum height above ocean floor
const MAX_ENEMY_SUBS = 5; // Maximum number of enemy submarines at once
const ENEMY_SUB_SPAWN_INTERVAL = 7000; // Time between spawning attempts (ms) - less frequent than sharks
const ENEMY_SUB_BEHAVIOR_PATTERNS = [
    'chase_player', // New behavior to chase the player
    'intercept_player', // New behavior to intercept the player's path
    'patrol', // Patrol back and forth
    'stealth_ambush' // New behavior to hide and ambush
];
const ENEMY_SUB_DENSITY_BY_BIOME = {
    [BIOME_TYPES.FLAT_SANDY]: 0.3,
    [BIOME_TYPES.CONTINENTAL_SHELF]: 0.5,
    [BIOME_TYPES.TRENCH]: 0.2,
    [BIOME_TYPES.ISLAND]: 0.4
};

// Torpedo firing constants
const TORPEDO_ATTACK_RANGE = 230; // Reduced from 250
const TORPEDO_COOLDOWN = 8000; // Increased back to 8 seconds between torpedo fires
const TORPEDO_LEAD_FACTOR = 0.8; // Reduced back to 0.8
const GUIDED_TORPEDO_CHANCE = 0.5; // Reduced to 50% chance for guided torpedo
const TORPEDO_MIN_FIRE_DISTANCE = 80; // Minimum distance to fire torpedoes
const MAX_ACTIVE_ENEMY_TORPEDOES = 5; // Maximum number of enemy torpedoes active at once
const TORPEDO_DAMAGE = 15; // Reduced torpedo damage (from 25)
const GLOBAL_TORPEDO_COOLDOWN = 2500; // Minimum time between any torpedo fires from any submarine

// Tracking when the last torpedo was fired globally
let lastGlobalTorpedoTime = 0;

// Initialize enemy submarine system
export function initEnemySubmarineSystem() {
    debug('Initializing enemy submarine system');
    // Add enemy submarines array to game state
    gameState.enemySubmarines = [];
    gameState.lastEnemySubSpawnTime = 0;
    gameState.enemyTorpedoes = [];
    lastGlobalTorpedoTime = Date.now();
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
            
            // Pick a movement behavior pattern - weighted toward new aggressive behaviors
            const behaviorRoll = Math.random();
            let behaviorPattern;
            
            if (behaviorRoll < 0.4) {
                behaviorPattern = 'chase_player';
            } else if (behaviorRoll < 0.7) {
                behaviorPattern = 'intercept_player';
            } else if (behaviorRoll < 0.9) {
                behaviorPattern = 'patrol';
            } else {
                behaviorPattern = 'stealth_ambush';
            }
            
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
                // Add attack-related properties
                lastTorpedoTime: 0, // Last time a torpedo was fired
                torpedoCooldown: TORPEDO_COOLDOWN * (0.8 + Math.random() * 0.4), // Slightly randomized cooldown
                behaviorState: {
                    phase: 0, // For cyclic behaviors
                    straightLineDuration: 5000 + Math.random() * 5000, // Time to swim straight
                    turnDirection: Math.random() > 0.5 ? 1 : -1, // For turning behaviors
                    turnDuration: 3000 + Math.random() * 2000, // How long to turn
                    patrolDistance: 200 + Math.random() * 200, // Distance for patrol pattern
                    patrolDirection: 1, // Current patrol direction
                    ambushReady: false, // For stealth ambush behavior
                    ambushDistance: 120 + Math.random() * 60, // Distance for ambush
                    maxAmbushTime: 15000 + Math.random() * 10000 // Max time to wait for ambush
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
    
    // Player submarine position and velocity
    const playerPos = sub.position.clone();
    const playerVelocity = gameState.submarine.physics ? 
                          gameState.submarine.physics.velocity.clone() : 
                          new THREE.Vector3();
    
    // Update behavior state based on pattern
    switch (enemySub.behaviorPattern) {
        case 'chase_player':
            // Directly chase the player submarine
            targetPosition = playerPos.clone();
            
            // Try to fire torpedoes when in range
            tryFireTorpedo(enemySub, sub, currentTime);
            break;
            
        case 'intercept_player':
            // Calculate interception point based on player velocity
            // Predict where the player will be and try to intercept
            const interceptDistance = enemySub.object.position.distanceTo(playerPos);
            const interceptTime = interceptDistance / enemySub.speed;
            
            // Create an intercept position by projecting player position along velocity
            targetPosition = playerPos.clone().add(
                playerVelocity.clone().multiplyScalar(interceptTime * TORPEDO_LEAD_FACTOR)
            );
            
            // Try to fire torpedoes when in range
            tryFireTorpedo(enemySub, sub, currentTime);
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
            
            // Check if player comes within range while patrolling
            const patrolDistanceToPlayer = enemySub.object.position.distanceTo(playerPos);
            if (patrolDistanceToPlayer < TORPEDO_ATTACK_RANGE * 0.7) {
                // Switch to chase behavior temporarily
                targetPosition = playerPos.clone();
                
                // Try to fire torpedoes when in range
                tryFireTorpedo(enemySub, sub, currentTime);
            }
            break;
            
        case 'stealth_ambush':
            // Hide and wait for player to come close, then ambush
            if (!enemySub.ambushPosition) {
                // Set initial ambush position
                enemySub.ambushPosition = enemySub.object.position.clone();
                enemySub.ambushStartTime = currentTime;
                enemySub.behaviorState.ambushReady = false;
            }
            
            const ambushDistanceToPlayer = enemySub.object.position.distanceTo(playerPos);
            
            if (!enemySub.behaviorState.ambushReady) {
                // Still getting into position
                if (enemySub.object.position.distanceTo(enemySub.ambushPosition) < 10) {
                    // We've reached the ambush position, now wait
                    enemySub.behaviorState.ambushReady = true;
                } else {
                    // Move to ambush position
                    targetPosition = enemySub.ambushPosition;
                }
            } else {
                // Ready to ambush, check if player is close enough or we've waited too long
                if (ambushDistanceToPlayer < enemySub.behaviorState.ambushDistance || 
                    currentTime - enemySub.ambushStartTime > enemySub.behaviorState.maxAmbushTime) {
                    
                    // Ambush! Chase player
                    targetPosition = playerPos.clone();
                    
                    // Try to fire torpedoes if in range
                    if (ambushDistanceToPlayer < TORPEDO_ATTACK_RANGE) {
                        tryFireTorpedo(enemySub, sub, currentTime, true); // Force torpedo fire for ambush
                    }
                    
                    // Reset ambush after action
                    if (ambushDistanceToPlayer > enemySub.behaviorState.ambushDistance * 1.5 || 
                        currentTime - enemySub.ambushStartTime > enemySub.behaviorState.maxAmbushTime) {
                        
                        // Find new ambush position
                        const randomDir = new THREE.Vector3(
                            (Math.random() - 0.5) * 2,
                            (Math.random() - 0.5) * 0.3,
                            (Math.random() - 0.5) * 2
                        ).normalize();
                        
                        enemySub.ambushPosition = playerPos.clone().add(
                            randomDir.multiplyScalar(enemySub.behaviorState.ambushDistance * 1.5)
                        );
                        enemySub.ambushStartTime = currentTime;
                        enemySub.behaviorState.ambushReady = false;
                    }
                } else {
                    // Still waiting, stay in position
                    targetPosition = enemySub.ambushPosition;
                }
            }
            break;
    }
    
    return targetPosition;
}

// Try to fire torpedo at player
function tryFireTorpedo(enemySub, playerSub, currentTime, forceFireAnyway = false) {
    // Check cooldown for this specific submarine
    if (currentTime - enemySub.lastTorpedoTime < enemySub.torpedoCooldown && !forceFireAnyway) {
        return null;
    }
    
    // Check global cooldown for all submarines
    if (currentTime - lastGlobalTorpedoTime < GLOBAL_TORPEDO_COOLDOWN && !forceFireAnyway) {
        return null;
    }
    
    // Check maximum number of active torpedoes
    if (gameState.enemyTorpedoes && gameState.enemyTorpedoes.length >= MAX_ACTIVE_ENEMY_TORPEDOES) {
        return null;
    }
    
    // Calculate distance to player
    const distanceToPlayer = enemySub.object.position.distanceTo(playerSub.position);
    
    // Ensure sub is not too close to player (prevents instant kill-zones)
    if (distanceToPlayer < TORPEDO_MIN_FIRE_DISTANCE && !forceFireAnyway) {
        return null;
    }
    
    // Check if player is in range
    if (distanceToPlayer <= TORPEDO_ATTACK_RANGE || forceFireAnyway) {
        // Get enemy sub's forward direction
        const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(enemySub.object.quaternion);
        
        // Get direction to player
        const directionToPlayer = new THREE.Vector3().subVectors(
            playerSub.position,
            enemySub.object.position
        ).normalize();
        
        // Check if player is somewhat in front (within a 75-degree cone) - reduced from 90 degrees
        const angleToPlayer = forwardDirection.angleTo(directionToPlayer);
        
        if (angleToPlayer < Math.PI / 2.4 || forceFireAnyway) {  // ~75 degrees (reduced from 90)
            // Random chance to skip firing (even if conditions are met)
            if (!forceFireAnyway && Math.random() < 0.4) {  // 40% chance to skip firing
                return null;
            }
            
            // Create torpedo
            const torpedo = createEnemyTorpedo(enemySub, playerSub);
            
            if (torpedo) {
                // Update last torpedo time for this submarine
                enemySub.lastTorpedoTime = currentTime;
                
                // Update global torpedo time
                lastGlobalTorpedoTime = currentTime;
                
                return torpedo;
            }
        }
    }
    
    return null;
}

// Create a torpedo from an enemy submarine
function createEnemyTorpedo(enemySub, targetSub) {
    try {
        // Get enemy submarine's forward direction
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(enemySub.object.quaternion);
        
        // Create torpedo group
        const torpedo = new THREE.Group();
        
        // Torpedo body - elongated cylinder
        const torpedoBodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3, 16);
        const torpedoMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x880000, // Dark red to distinguish from player torpedoes
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
        
        // Add all parts to torpedo group
        torpedo.add(torpedoBody);
        torpedo.add(torpedoNose);
        torpedo.add(torpedoTail);
        
        // Position torpedo at submarine's front, offset forward
        const torpedoStartPos = enemySub.object.position.clone();
        torpedoStartPos.addScaledVector(forwardDirection, 10);
        torpedo.position.copy(torpedoStartPos);
        
        // Rotate torpedo to match submarine's orientation
        torpedo.rotation.copy(enemySub.object.rotation);
        
        // Add to scene
        gameState.scene.add(torpedo);
        
        // Determine if this should be a guided torpedo
        const isGuided = Math.random() < GUIDED_TORPEDO_CHANCE;
        
        // Calculate torpedo speed
        const torpedoSpeed = isGuided ? 3.0 : 3.5; // Reduced speeds slightly
        
        // Calculate initial velocity
        const initialVelocity = forwardDirection.clone().multiplyScalar(torpedoSpeed);
        
        // Add torpedo to game state
        if (!gameState.enemyTorpedoes) {
            gameState.enemyTorpedoes = [];
        }
        
        const torpedoData = {
            object: torpedo,
            velocity: initialVelocity,
            speed: torpedoSpeed,
            creationTime: Date.now(),
            lifetime: 6000, // 6 seconds lifetime
            guided: isGuided,
            target: isGuided ? { object: targetSub } : null, // Target player submarine if guided
            turnSpeed: 0.03, // Reduced from 0.04 - How quickly guided torpedoes can turn
            friendly: false, // Mark as enemy torpedo
            damage: TORPEDO_DAMAGE // Use the damage constant
        };
        
        gameState.enemyTorpedoes.push(torpedoData);
        
        return torpedoData;
    } catch (error) {
        console.error('Error creating enemy torpedo:', error);
        return null;
    }
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
                    
                    // For more realistic movement, create a rotation that points the submarine's nose 
                    // toward the target direction (and thus toward the player when chasing)
                    
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
                    // Using adaptive turn rate - turn faster when further from target direction
                    const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(enemySub.object.quaternion);
                    const angleDifference = currentDirection.angleTo(targetDirection);
                    
                    // Calculate adaptive turn speed - faster turn when angle is larger
                    const adaptiveTurnSpeed = Math.min(
                        enemySub.turnSpeed * (1.0 + angleDifference * 2),
                        enemySub.turnSpeed * 3
                    );
                    
                    // Apply smoother rotation with adaptive turn speed
                    enemySub.object.quaternion.slerp(targetQuaternion, adaptiveTurnSpeed * deltaTime * 10);
                    
                    // Calculate forward direction based on current rotation
                    const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(enemySub.object.quaternion);
                    
                    // Move forward in the direction the enemy sub is facing with adaptive speed based on alignment
                    // Move faster when well-aligned with target direction
                    const alignmentFactor = Math.max(0.5, forwardDirection.dot(targetDirection));
                    enemySub.object.position.add(
                        forwardDirection.multiplyScalar(enemySub.speed * alignmentFactor * deltaTime * 30)
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
        
        // Update enemy torpedoes
        updateEnemyTorpedoes(deltaTime);
        
        // Remove enemy submarines marked for removal (in reverse order to maintain indices)
        removeEnemySubmarines(enemySubsToRemove);
    } catch (error) {
        console.error('Error in updateEnemySubmarines:', error);
    }
}

// Update enemy torpedoes
function updateEnemyTorpedoes(deltaTime) {
    try {
        if (!gameState.enemyTorpedoes || gameState.enemyTorpedoes.length === 0) return;
        
        const currentTime = Date.now();
        const torpedoesToRemove = [];
        
        // Update each torpedo
        gameState.enemyTorpedoes.forEach((torpedo, index) => {
            // Check lifetime
            if (currentTime - torpedo.creationTime > torpedo.lifetime) {
                torpedoesToRemove.push(index);
                return;
            }
            
            // Guide torpedo if it's targeting something
            if (torpedo.guided && torpedo.target) {
                // Make sure target still exists
                const targetExists = torpedo.target.object ? true : false;
                
                if (!targetExists) {
                    torpedo.guided = false;
                } else {
                    // Calculate target position with prediction
                    const targetPos = torpedo.target.object.position.clone();
                    
                    // Add prediction offset based on target's velocity if available
                    if (gameState.submarine.physics && gameState.submarine.physics.velocity) {
                        // Calculate intercept time based on distance and speeds
                        const distance = torpedo.object.position.distanceTo(targetPos);
                        const interceptTime = distance / torpedo.speed;
                        
                        // Predict where the target will be
                        const predictedOffset = gameState.submarine.physics.velocity.clone()
                            .multiplyScalar(interceptTime * TORPEDO_LEAD_FACTOR);
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
                    
                    // Smoothly rotate toward target
                    torpedo.object.quaternion.slerp(
                        targetQuaternion, 
                        adaptiveTurnSpeed
                    );
                    
                    // Get torpedo's new forward direction
                    const forward = new THREE.Vector3(0, 0, -1);
                    forward.applyQuaternion(torpedo.object.quaternion);
                    
                    // Update velocity
                    torpedo.velocity.copy(forward).multiplyScalar(torpedo.speed);
                }
            }
            
            // Move torpedo
            torpedo.object.position.add(torpedo.velocity);
            
            // Check for collisions with player submarine
            if (gameState.submarine && gameState.submarine.object) {
                const playerSub = gameState.submarine.object;
                const distanceToPlayer = torpedo.object.position.distanceTo(playerSub.position);
                
                // Simple collision detection with player submarine
                if (distanceToPlayer < 7) { // Approximate submarine radius for collision
                    // Damage player
                    if (gameState.submarine && gameState.submarine.damage) {
                        gameState.submarine.damage(torpedo.damage || TORPEDO_DAMAGE); // Use the torpedo's damage value or fallback to constant
                        
                        // Create explosion effect
                        if (typeof createExplosion === 'function') {
                            createExplosion(torpedo.object.position.clone(), 1.0);
                        }
                    }
                    
                    // Mark torpedo for removal
                    torpedoesToRemove.push(index);
                }
            }
        });
        
        // Remove torpedoes marked for removal (in reverse order to maintain indices)
        torpedoesToRemove.sort((a, b) => b - a).forEach(index => {
            const torpedo = gameState.enemyTorpedoes[index];
            if (torpedo && torpedo.object) {
                gameState.scene.remove(torpedo.object);
                
                // Dispose of geometries to free memory
                torpedo.object.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
            
            gameState.enemyTorpedoes.splice(index, 1);
        });
    } catch (error) {
        console.error('Error updating enemy torpedoes:', error);
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