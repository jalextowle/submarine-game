// Obstacles creation and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { OCEAN_DEPTH, WORLD_SIZE } from '../core/constants.js';

// Create initial obstacles for the starting area
export function createObstacles() {
    debug('Creating initial obstacles');
    try {
        // Create rocks in the starting area
        createRocksInArea(0, 0, WORLD_SIZE, WORLD_SIZE);
        
        debug('Initial obstacles created');
    } catch (error) {
        console.error('Error in createObstacles:', error);
    }
}

// Create obstacles for a specific chunk
export function createObstaclesInChunk(offsetX, offsetZ, width, height, seed) {
    try {
        debug(`Creating obstacles for chunk at ${offsetX}, ${offsetZ}`);
        
        // Create a seeded random number generator for deterministic positioning
        const seededRandom = new SeededRandom(seed);
        
        const rocks = [];
        
        // Density of rocks (adjust as needed)
        const rockCount = 10; // Less density per chunk
        
        for (let i = 0; i < rockCount; i++) {
            // Create rock with random size
            const rockSize = seededRandom.random() * 20 + 15;
            const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
            
            // Different rock colors and textures
            const rockMaterial = new THREE.MeshStandardMaterial({
                color: seededRandom.random() > 0.5 ? 0x808080 : 0x707070, // Gray variations
                roughness: 0.9,
                metalness: 0.1,
                flatShading: true
            });
            
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            
            // Position rocks randomly within the chunk
            const x = offsetX + seededRandom.random() * width - width/2;
            const z = offsetZ + seededRandom.random() * height - height/2;
            
            rock.position.set(x, -OCEAN_DEPTH + rockSize/2 - 5, z);
            rock.rotation.set(
                seededRandom.random() * Math.PI,
                seededRandom.random() * Math.PI,
                seededRandom.random() * Math.PI
            );
            
            // Give rocks slight deformation for more natural look
            rock.scale.set(
                1 + seededRandom.random() * 0.3 - 0.15,
                1 + seededRandom.random() * 0.3 - 0.15,
                1 + seededRandom.random() * 0.3 - 0.15
            );
            
            rock.castShadow = true;
            rock.receiveShadow = true;
            
            // Add collision data with increased radius for better collision detection
            rock.userData.isObstacle = true;
            rock.userData.collisionRadius = rockSize * 1.5;
            
            gameState.scene.add(rock);
            gameState.collisionObjects.push(rock);
            rocks.push(rock);
        }
        
        return rocks;
    } catch (error) {
        console.error(`Error in createObstaclesInChunk at ${offsetX}, ${offsetZ}:`, error);
        return [];
    }
}

// Create rocks in a specific area (used for initial world generation)
function createRocksInArea(offsetX, offsetZ, width, height) {
    // Add large rocks that the submarine can't pass through
    for (let i = 0; i < 40; i++) {
        // Create rock with random size
        const rockSize = Math.random() * 20 + 15;
        const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
        
        // Different rock colors and textures
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0x808080 : 0x707070, // Gray variations
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });
        
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Position rocks randomly on ocean floor within the specified area
        const x = offsetX + Math.random() * width - width / 2;
        const z = offsetZ + Math.random() * height - height / 2;
        
        rock.position.set(x, -OCEAN_DEPTH + rockSize/2 - 5, z);
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        // Give rocks slight deformation for more natural look
        rock.scale.set(
            1 + Math.random() * 0.3 - 0.15,
            1 + Math.random() * 0.3 - 0.15,
            1 + Math.random() * 0.3 - 0.15
        );
        
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        // Add collision data with increased radius for better collision detection
        rock.userData.isObstacle = true;
        rock.userData.collisionRadius = rockSize * 1.5; // Increased from 1.2 to 1.5
        
        gameState.scene.add(rock);
        gameState.collisionObjects.push(rock);
    }
}

// Check for collisions between an object and the obstacles
export function checkObstacleCollisions(position, radius) {
    // Loop through all obstacles to check for collisions
    for (const obstacle of gameState.collisionObjects) {
        if (obstacle.userData && obstacle.userData.isObstacle) {
            const obstacleWorldPos = new THREE.Vector3();
            obstacle.getWorldPosition(obstacleWorldPos);
            
            const distance = position.distanceTo(obstacleWorldPos);
            const minDistance = radius + obstacle.userData.collisionRadius;
            
            if (distance < minDistance) {
                // Calculate penetration depth
                const penetration = minDistance - distance;
                
                // Get direction away from obstacle
                const repulsionDirection = new THREE.Vector3()
                    .subVectors(position, obstacleWorldPos)
                    .normalize();
                
                return {
                    collision: true,
                    penetration: penetration,
                    direction: repulsionDirection
                };
            }
        }
    }
    
    return { collision: false };
}

// Seeded random number generator for deterministic object placement
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    
    // Generate a random number between 0 and 1
    random() {
        // Simple LCG algorithm
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
} 