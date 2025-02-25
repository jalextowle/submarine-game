// Submarine propeller creation and animation

import * as THREE from 'three';
import gameState from '../core/state.js';

// Create the propeller at the back of the submarine
export function createPropeller(hullLength) {
    // Propeller material (bronze color)
    const propellerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xC88A3A, // Bronze color
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Propeller hub
    const propHubGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16);
    const propHub = new THREE.Mesh(propHubGeometry, propellerMaterial);
    propHub.rotation.x = Math.PI / 2;
    propHub.position.z = -hullLength * 0.5 - 0.7;
    
    // Simplified propeller blades
    for (let i = 0; i < 5; i++) {
        const bladeGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.1);
        const blade = new THREE.Mesh(bladeGeometry, propellerMaterial);
        blade.position.z = -0.1;
        blade.rotation.z = (Math.PI * 2 / 5) * i;
        propHub.add(blade);
    }
    
    return propHub;
}

// Animate the propeller rotation
export function animatePropeller(propHub) {
    const animate = () => {
        if (!gameState.gameOver) {
            propHub.rotation.z += 0.1;
            requestAnimationFrame(animate);
        }
    };
    
    animate();
}

// Adjust propeller rotation speed based on submarine propulsion
export function updatePropellerSpeed(propHub, propulsion) {
    // Scale rotation speed based on propulsion
    const baseRotationSpeed = 0.1;
    const maxSpeedMultiplier = 3;
    
    // Calculate speed multiplier based on absolute propulsion value
    const speedMultiplier = Math.abs(propulsion) * maxSpeedMultiplier;
    
    // Set new rotation speed
    propHub.userData.rotationSpeed = baseRotationSpeed * speedMultiplier;
    
    // Reverse rotation if going backwards
    propHub.userData.rotationDirection = propulsion >= 0 ? 1 : -1;
} 