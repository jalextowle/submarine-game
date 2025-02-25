// Explosion visual effects

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { createBubbleBurst } from './bubbleEffects.js';

// Create an underwater explosion effect
export function createExplosion(position, size = 5) {
    debug('Creating explosion');
    try {
        // Create explosion particles
        const particleCount = 30 * size;
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xFF9933,
            size: 0.8,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8
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
            
            // Random velocity
            velocities[i] = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            );
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create particle system
        const explosionParticles = new THREE.Points(particleGeometry, particleMaterial);
        explosionParticles.position.copy(position);
        
        // Add to scene
        gameState.scene.add(explosionParticles);
        
        // Add a point light at explosion location
        const explosionLight = new THREE.PointLight(0xFF9933, 2, size * 10);
        explosionLight.position.copy(position);
        gameState.scene.add(explosionLight);
        
        // Create bubble burst effect
        createBubbleBurst(position, 20, size * 0.5);
        
        // Add to explosion array for updating
        gameState.explosions.push({
            particles: explosionParticles,
            light: explosionLight,
            velocities: velocities,
            maxAge: 1500,
            createdTime: Date.now(),
            size: size
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
            
            // Update particle positions
            const positions = explosion.particles.geometry.attributes.position.array;
            
            for (let i = 0; i < explosion.velocities.length; i++) {
                const i3 = i * 3;
                
                // Slow down over time with underwater resistance
                const slowdown = 1 - lifePhase * 0.7;
                
                // Update position based on velocity
                positions[i3] += explosion.velocities[i].x * slowdown;
                positions[i3 + 1] += explosion.velocities[i].y * slowdown;
                positions[i3 + 2] += explosion.velocities[i].z * slowdown;
                
                // Add upward drift for later stages (bubbles rising)
                if (lifePhase > 0.5) {
                    positions[i3 + 1] += 0.01 * (lifePhase - 0.5) * 2;
                }
            }
            
            explosion.particles.geometry.attributes.position.needsUpdate = true;
            
            // Fade particles
            explosion.particles.material.opacity = 0.8 * (1 - lifePhase);
            
            // Fade light
            if (explosion.light) {
                explosion.light.intensity = 2 * (1 - lifePhase);
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