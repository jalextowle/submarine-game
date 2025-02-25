// Weapon-related visual effects

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';

// Create a muzzle flash effect at the torpedo launch point
export function createMuzzleFlash(position) {
    try {
        // Create a point light for the flash
        const flashLight = new THREE.PointLight(0x00FFFF, 3, 10);
        flashLight.position.copy(position);
        gameState.scene.add(flashLight);
        
        // Create a small sphere to represent the flash
        const flashGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        gameState.scene.add(flash);
        
        // Animate the flash
        const duration = 300; // milliseconds
        const startTime = Date.now();
        
        const animateFlash = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // Remove the flash
                gameState.scene.remove(flash);
                gameState.scene.remove(flashLight);
                return;
            }
            
            // Scale down
            const scale = 1 - progress;
            flash.scale.set(scale, scale, scale);
            
            // Fade out
            flash.material.opacity = 0.8 * (1 - progress);
            flashLight.intensity = 3 * (1 - progress);
            
            requestAnimationFrame(animateFlash);
        };
        
        animateFlash();
    } catch (error) {
        console.error('Error in createMuzzleFlash:', error);
    }
}

// Create a tracer effect behind a torpedo
export function createTracerEffect(torpedo, duration = 500) {
    try {
        // Get initial position
        const position = torpedo.position.clone();
        
        // Create a line to represent the tracer
        const tracerGeometry = new THREE.BufferGeometry().setFromPoints([
            position,
            position.clone().addScaledVector(torpedo.velocity.clone().normalize(), -3)
        ]);
        
        const tracerMaterial = new THREE.LineBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const tracer = new THREE.Line(tracerGeometry, tracerMaterial);
        gameState.scene.add(tracer);
        
        // Animate the tracer
        const startTime = Date.now();
        
        const animateTracer = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // Remove the tracer
                gameState.scene.remove(tracer);
                return;
            }
            
            // Fade out
            tracer.material.opacity = 0.6 * (1 - progress);
            
            requestAnimationFrame(animateTracer);
        };
        
        animateTracer();
    } catch (error) {
        console.error('Error in createTracerEffect:', error);
    }
} 