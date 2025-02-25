// Bubble visual effects

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';

// Create a bubble trail effect behind moving objects
export function createBubbleTrail(position, size = 1) {
    try {
        // Create bubble particles
        const particleCount = Math.floor(Math.random() * 3) + 2; // Random number of bubbles
        const bubbleSize = size * (Math.random() * 0.5 + 0.5); // Varied size
        
        const bubbleGeometry = new THREE.SphereGeometry(bubbleSize, 8, 8);
        const bubbleMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.3,
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
        
        // Animate bubble rising and fading
        const maxAge = 2000 + Math.random() * 1000; // Random lifespan
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
            
            // Make bubbles rise (move upward)
            bubble.position.y += riseSpeed * (1 + age / maxAge); // Accelerate as they rise
            
            // Add some random movement
            bubble.position.x += (Math.random() - 0.5) * 0.05;
            bubble.position.z += (Math.random() - 0.5) * 0.05;
            
            // Scale up slightly as they rise
            const scale = 1 + (age / maxAge) * 0.5;
            bubble.scale.set(scale, scale, scale);
            
            // Fade out as they age
            bubble.material.opacity = 0.3 * (1 - age / maxAge);
            
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
        for (let i = 0; i < count; i++) {
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