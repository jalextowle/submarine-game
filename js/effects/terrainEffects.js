// Terrain-related visual effects

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';

// Create a sand cloud effect when submarine hits the ocean floor
export function createSandCloud(position, size = 2, intensity = 1) {
    try {
        debug('Creating sand cloud effect');
        
        // Number of particles based on size and intensity - increased for better visibility
        const particleCount = Math.floor(150 * size * intensity); // Increased from 120 to 150
        
        // Create particle system with improved sand appearance
        const particleGeometry = new THREE.BufferGeometry();
        
        // Create texture for sand particles to make them look more grainy
        const sandTexture = createSandParticleTexture();
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xE6D5AC, // Lighter sandy color - more beige than brown
            size: 0.75 + (Math.random() * 0.5), // Increased particle size
            transparent: true,
            opacity: 0.9, // Increased opacity for better visibility
            map: sandTexture, // Use the custom texture
            blending: THREE.NormalBlending, 
            depthWrite: false // Prevent depth-sorting issues
        });
        
        // Generate positions and velocities
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const particleSizes = [];
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position in a disc shape along the ocean floor (xz plane)
            const radius = Math.random() * size * 2.5;
            const angle = Math.random() * Math.PI * 2;
            
            positions[i3] = Math.cos(angle) * radius; // X
            positions[i3 + 1] = (Math.random() * 1.0); // Increased height for better visibility
            positions[i3 + 2] = Math.sin(angle) * radius; // Z
            
            // Create velocity - increased for more dramatic effect
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.09 * intensity, // Slightly more horizontal spread
                Math.random() * 0.08 * intensity, // Increased upward movement
                (Math.random() - 0.5) * 0.09 * intensity // Slightly more horizontal spread
            );
            
            velocities.push(vel);
            
            // More varied and larger particle sizes
            particleSizes.push(0.4 + Math.random() * 0.8); // Increased size variation
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create the particle system
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.position.copy(position);
        particles.userData.startTime = Date.now();
        particles.userData.sizes = particleSizes;
        gameState.scene.add(particles);
        
        // Create a more noticeable light for better visibility
        const sandLight = new THREE.PointLight(0xF0E6C8, 0.8 * intensity, size * 8); // Increased intensity and range
        sandLight.position.copy(position);
        sandLight.position.y += 2; // Position light above the floor
        gameState.scene.add(sandLight);
        
        // Add a second, contrasting light for extra visibility
        const accentLight = new THREE.PointLight(0x88CCFF, 0.4 * intensity, size * 5); // Subtle blue accent
        accentLight.position.copy(position);
        accentLight.position.y += 1;
        gameState.scene.add(accentLight);
        
        // Animate sand cloud
        const maxAge = 2000; // 2 seconds duration
        const startTime = Date.now();
        
        const animateSandCloud = () => {
            const age = Date.now() - startTime;
            
            if (age > maxAge) {
                gameState.scene.remove(particles);
                gameState.scene.remove(sandLight);
                gameState.scene.remove(accentLight);
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
                
                // Gradually slow down (underwater resistance)
                velocities[i].multiplyScalar(0.97);
                
                // Gravity effect - stronger settling for sand particles
                velocities[i].y -= 0.004;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Fade out particles and lights
            const fadeRatio = 1 - (age / maxAge);
            particles.material.opacity = 0.9 * fadeRatio;
            
            if (sandLight) {
                sandLight.intensity = 0.8 * intensity * fadeRatio;
                sandLight.position.y += 0.01; // Increased upward movement
            }
            
            if (accentLight) {
                accentLight.intensity = 0.4 * intensity * fadeRatio;
                accentLight.position.y += 0.015; // Moves up slightly faster than the main light
            }
            
            requestAnimationFrame(animateSandCloud);
        };
        
        animateSandCloud();
        return { particles, light: sandLight };
    } catch (error) {
        console.error('Error in createSandCloud:', error);
        return null;
    }
}

// Create a texture for sand particles to add more detail
function createSandParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    // Create circular gradient with subtle rim highlight for better contrast
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(235, 220, 185, 1)'); // Slightly brighter center
    gradient.addColorStop(0.5, 'rgba(230, 215, 180, 0.9)'); // Mid-range
    gradient.addColorStop(0.85, 'rgba(240, 230, 200, 0.7)'); // Subtle bright rim for contrast
    gradient.addColorStop(1, 'rgba(220, 205, 170, 0)'); // Transparent at boundary
    
    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    // Add more noise for sand-like texture - more varied colors
    for (let i = 0; i < 120; i++) { // Increased from 100 to 120
        const x = Math.random() * 32;
        const y = Math.random() * 32;
        const size = Math.random() * 2.5 + 0.8; // Slightly larger specks
        
        // More varied colors including some lighter and darker specks for visual interest
        if (Math.random() > 0.7) {
            // Occasionally add brighter specks
            ctx.fillStyle = `rgba(${200 + Math.random() * 55}, ${190 + Math.random() * 45}, ${160 + Math.random() * 40}, 0.8)`;
        } else {
            // Standard specks
            ctx.fillStyle = `rgba(${180 + Math.random() * 50}, ${170 + Math.random() * 40}, ${140 + Math.random() * 40}, 0.7)`;
        }
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Could add other terrain effects in the future:
// - Rock debris when hitting large rocks
// - Sand trail when moving close to the ground
// - Underwater dust storms
// - Bubbles from the seafloor 