// Bubble visual effects

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';

// Create a bubble trail effect behind moving objects
export function createBubbleTrail(position, size = 1) {
    try {
        // Create bubble with higher probability (removing the 50% skip)
        
        // Create bubble particles
        const bubbleSize = size * (Math.random() * 0.5 + 0.5); // Restored to original size range
        
        // Use reasonable segment count - balance between performance and appearance
        const bubbleGeometry = new THREE.SphereGeometry(bubbleSize, 6, 6); // Moderate segment count
        const bubbleMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.4, // Increased opacity for better visibility
            shininess: 90
        });
        
        // Create bubble mesh
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        
        // Position bubble with slight randomness
        bubble.position.copy(position);
        bubble.position.x += (Math.random() - 0.5) * size;
        bubble.position.y += (Math.random() - 0.5) * size;
        bubble.position.z += (Math.random() - 0.5) * size;
        
        // Add bubble to scene
        gameState.scene.add(bubble);
        
        // Medium lifetime - balance between visibility and performance
        const maxAge = 1500 + Math.random() * 800;
        const startTime = Date.now();
        
        // Rising speed (faster near surface)
        const riseSpeed = 0.01 + (position.y < -50 ? 0.01 : 0.03);
        
        const animateBubble = () => {
            if (gameState.gameOver) {
                gameState.scene.remove(bubble);
                return;
            }
            
            const age = Date.now() - startTime;
            
            if (age > maxAge) {
                gameState.scene.remove(bubble);
                return;
            }
            
            // Optimize updates - update every other frame for smooth appearance
            if (gameState.frameCount % 2 === 0) {
                // Make bubbles rise (move upward)
                bubble.position.y += riseSpeed * (1 + age / maxAge); // Accelerate as they rise
                
                // Add some random movement but moderate for performance
                bubble.position.x += (Math.random() - 0.5) * 0.03;
                bubble.position.z += (Math.random() - 0.5) * 0.03;
                
                // Scale up slightly as they rise
                const scale = 1 + (age / maxAge) * 0.5;
                bubble.scale.set(scale, scale, scale);
            }
            
            // Fade out as they age but keep visible
            bubble.material.opacity = 0.4 * (1 - Math.pow(age / maxAge, 1.2));
            
            requestAnimationFrame(animateBubble);
        };
        
        animateBubble();
        
        return bubble;
    } catch (error) {
        console.error('Error in createBubbleTrail:', error);
    }
}

// Create a larger bubble burst effect (multiple bubbles)
export function createBubbleBurst(position, count = 10, size = 1) {
    try {
        // Use a reasonable number of bubbles for visual impact
        const actualCount = Math.min(count, 10);
        
        // Count the current number of explosion-related effects
        const totalExplosions = gameState.explosions ? gameState.explosions.length : 0;
        
        // Adaptive bubble count based on active explosions
        let bubblesPerExplosion = 8;
        if (totalExplosions >= 3) {
            bubblesPerExplosion = 5;
        } else if (totalExplosions >= 2) {
            bubblesPerExplosion = 6;
        }
        
        const finalCount = Math.min(actualCount, bubblesPerExplosion);
        
        for (let i = 0; i < finalCount; i++) {
            // Create bubble with random offset
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * size,
                (Math.random() - 0.5) * size,
                (Math.random() - 0.5) * size
            );
            
            const bubblePos = position.clone().add(offset);
            createBubbleTrail(bubblePos, size * (Math.random() * 0.5 + 0.5));
        }
    } catch (error) {
        console.error('Error in createBubbleBurst:', error);
    }
} 