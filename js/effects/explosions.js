// Explosion visual effects

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { createBubbleBurst } from './bubbleEffects.js';

// Create an underwater explosion effect
export function createExplosion(position, size = 5) {
    debug('Creating explosion');
    try {
        // Ensure size is a valid positive number
        const validSize = Math.max(1, isNaN(size) ? 5 : size);
        
        // Check performance limits - but always allow at least the newest explosion
        if (gameState.explosions.length >= gameState.performanceSettings.maxSimultaneousExplosions) {
            // We've reached the maximum number of simultaneous explosions
            // Remove the oldest explosion to make room for the new one
            const oldestExplosion = gameState.explosions[0];
            if (oldestExplosion.particles) gameState.scene.remove(oldestExplosion.particles);
            if (oldestExplosion.light) gameState.scene.remove(oldestExplosion.light);
            gameState.explosions.shift();
        }
        
        // Create explosion particles - ensure we have enough particles to be visible
        const particleCount = Math.min(12 * validSize, 60); // Increased from previous values to ensure visibility
            
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xFF9933,
            size: 1.2, // Increased particle size for better visibility
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.9 // Increased opacity
        });
        
        // Generate random particle positions
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Initial position (near center)
            positions[i3] = (Math.random() - 0.5) * 0.5;
            positions[i3 + 1] = (Math.random() - 0.5) * 0.5;
            positions[i3 + 2] = (Math.random() - 0.5) * 0.5;
            
            // Increased velocity for more visible expansion
            velocities[i] = new THREE.Vector3(
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25
            );
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create particle system
        const explosionParticles = new THREE.Points(particleGeometry, particleMaterial);
        explosionParticles.position.copy(position);
        
        // Add to scene
        gameState.scene.add(explosionParticles);
        
        // Always include a light for better visibility, but optimize it
        let explosionLight = new THREE.PointLight(0xFF9933, 1.5, validSize * 6);
        explosionLight.position.copy(position);
        gameState.scene.add(explosionLight);
        
        // Add bubble effect for visual interest - always create some bubbles
        createBubbleBurst(position, 10, validSize * 0.4);
        
        // Add to explosion array for updating - ensure it's visible long enough
        gameState.explosions.push({
            particles: explosionParticles,
            light: explosionLight,
            velocities: velocities,
            maxAge: 1000, // Longer lifetime to ensure visibility
            createdTime: Date.now(),
            size: validSize
        });
        
        debug('Explosion created');
        return explosionParticles;
    } catch (error) {
        console.error('Error in createExplosion:', error);
    }
}

// Update all explosions (particle movement, fading, etc.)
export function updateExplosions() {
    try {
        // Limit maximum number of explosions for performance
        const maxExplosions = gameState.performanceSettings.maxSimultaneousExplosions;
        if (gameState.explosions.length > maxExplosions) {
            // Remove the oldest explosions when we have too many
            const countToRemove = gameState.explosions.length - maxExplosions;
            for (let i = 0; i < countToRemove; i++) {
                const explosion = gameState.explosions[0]; // Get oldest explosion
                if (explosion.particles) gameState.scene.remove(explosion.particles);
                if (explosion.light) gameState.scene.remove(explosion.light);
                gameState.explosions.shift(); // Remove from beginning of array
            }
        }
        
        const currentTime = Date.now();
        const explosionsToRemove = [];
        
        gameState.explosions.forEach((explosion, index) => {
            const age = currentTime - explosion.createdTime;
            
            // Remove if max age reached
            if (age > explosion.maxAge) {
                explosionsToRemove.push(index);
                return;
            }
            
            // Get normalized age (0-1)
            const lifePhase = age / explosion.maxAge;
            
            // Update particle positions - update more frequently for smoother effect
            if (gameState.frameCount % 2 === 0) {
                const positions = explosion.particles.geometry.attributes.position.array;
                
                for (let i = 0; i < explosion.velocities.length; i++) {
                    const i3 = i * 3;
                    
                    // Slow down over time with underwater resistance
                    const slowdown = 1 - lifePhase * 0.7;
                    
                    // Update position based on velocity
                    positions[i3] += explosion.velocities[i].x * slowdown;
                    positions[i3 + 1] += explosion.velocities[i].y * slowdown;
                    positions[i3 + 2] += explosion.velocities[i].z * slowdown;
                    
                    // Add upward drift for later stages
                    if (lifePhase > 0.5) {
                        positions[i3 + 1] += 0.01;
                    }
                }
                
                explosion.particles.geometry.attributes.position.needsUpdate = true;
            }
            
            // Fade particles - but keep them visible longer
            explosion.particles.material.opacity = 0.9 * (1 - Math.pow(lifePhase, 1.5));
            
            // Fade light
            if (explosion.light) {
                explosion.light.intensity = 1.5 * (1 - lifePhase);
            }
        });
        
        // Remove expired explosions in reverse order
        explosionsToRemove.sort((a, b) => b - a).forEach(index => {
            const explosion = gameState.explosions[index];
            
            // Remove from scene
            if (explosion.particles) gameState.scene.remove(explosion.particles);
            if (explosion.light) gameState.scene.remove(explosion.light);
            
            // Remove from array
            gameState.explosions.splice(index, 1);
        });
    } catch (error) {
        console.error('Error in updateExplosions:', error);
    }
} 