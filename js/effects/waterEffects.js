// Water-related visual effects

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';

// Create a water jet effect (e.g. for torpedo launch)
export function createWaterJet(position, direction, size = 1) {
    try {
        // Number of particles based on size
        const particleCount = Math.floor(30 * size);
        
        // Create particle system
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x40E0D0,
            size: 0.3,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        // Generate random initial positions near the center
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Start positions (slightly random)
            positions[i3] = (Math.random() - 0.5) * 0.5;
            positions[i3 + 1] = (Math.random() - 0.5) * 0.5;
            positions[i3 + 2] = (Math.random() - 0.5) * 0.5;
            
            // Create velocity in the specified direction with randomness
            const vel = direction.clone();
            vel.x += (Math.random() - 0.5) * 0.5;
            vel.y += (Math.random() - 0.5) * 0.5;
            vel.z += (Math.random() - 0.5) * 0.5;
            vel.normalize().multiplyScalar(0.2 + Math.random() * 0.3);
            
            velocities.push(vel);
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create the particle system
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.position.copy(position);
        gameState.scene.add(particles);
        
        // Create a small light
        const jetLight = new THREE.PointLight(0x40E0D0, 1, size * 5);
        jetLight.position.copy(position);
        gameState.scene.add(jetLight);
        
        // Animate the jet
        const maxAge = 500 + Math.random() * 200; // 0.5 to 0.7 seconds
        const startTime = Date.now();
        
        const animateJet = () => {
            const age = Date.now() - startTime;
            
            if (age > maxAge) {
                // Remove the particles when done
                gameState.scene.remove(particles);
                gameState.scene.remove(jetLight);
                return;
            }
            
            // Update particle positions based on velocities
            const positions = particles.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // Apply velocity
                positions[i3] += velocities[i].x;
                positions[i3 + 1] += velocities[i].y;
                positions[i3 + 2] += velocities[i].z;
                
                // Slow down with age (underwater resistance)
                velocities[i].multiplyScalar(0.92);
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Fade out
            particles.material.opacity = 0.7 * (1 - age / maxAge);
            jetLight.intensity = 1 * (1 - age / maxAge);
            
            requestAnimationFrame(animateJet);
        };
        
        animateJet();
    } catch (error) {
        console.error('Error in createWaterJet:', error);
    }
}

// Create a water splash effect (e.g. for submarine entering/exiting water)
export function createWaterSplash(position, size = 3) {
    try {
        // Number of particles
        const particleCount = Math.floor(80 * size);
        
        // Create particle system
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.4,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        // Generate positions and velocities
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position near center
            positions[i3] = (Math.random() - 0.5) * size * 0.5;
            positions[i3 + 1] = (Math.random() - 0.5) * size * 0.2;
            positions[i3 + 2] = (Math.random() - 0.5) * size * 0.5;
            
            // Create random velocity with more horizontal than vertical
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.4,  // Mostly upward
                (Math.random() - 0.5) * 0.3
            );
            
            velocities.push(vel);
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create the particle system
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.position.copy(position);
        particles.position.y = 0; // At water level
        gameState.scene.add(particles);
        
        // Add a light
        const splashLight = new THREE.PointLight(0xFFFFFF, 2, size * 7);
        splashLight.position.copy(position);
        splashLight.position.y = 0;
        gameState.scene.add(splashLight);
        
        // Animate splash
        const maxAge = 1000; // 1 second
        const startTime = Date.now();
        
        const animateSplash = () => {
            const age = Date.now() - startTime;
            
            if (age > maxAge) {
                gameState.scene.remove(particles);
                gameState.scene.remove(splashLight);
                return;
            }
            
            // Update particle positions
            const positions = particles.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // Apply velocity
                positions[i3] += velocities[i].x;
                positions[i3 + 1] += velocities[i].y;
                positions[i3 + 2] += velocities[i].z;
                
                // Apply gravity
                velocities[i].y -= 0.01;
                
                // Bounce off water surface
                if (positions[i3 + 1] < 0) {
                    positions[i3 + 1] = 0;
                    velocities[i].y *= -0.3; // Bounce with reduced energy
                }
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Fade out particles and light
            particles.material.opacity = 0.8 * (1 - age / maxAge);
            if (splashLight) {
                splashLight.intensity = 2 * (1 - age / maxAge);
            }
            
            requestAnimationFrame(animateSplash);
        };
        
        animateSplash();
    } catch (error) {
        console.error('Error in createWaterSplash:', error);
    }
} 