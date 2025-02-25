// Obstacles creation and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { OCEAN_DEPTH, WORLD_SIZE } from '../core/constants.js';

// Create obstacles such as rocks
export function createObstacles() {
    debug('Creating obstacles');
    try {
        // Create large rocks
        createRocks();
        
        debug('Obstacles created');
    } catch (error) {
        console.error('Error in createObstacles:', error);
    }
}

// Create large rock formations that can be collided with
function createRocks() {
    // Add large rocks that the submarine can't pass through
    for (let i = 0; i < 40; i++) { // Increased rock count
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
        
        // Position rocks randomly on ocean floor
        const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
        const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
        
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