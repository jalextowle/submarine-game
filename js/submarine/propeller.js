// Submarine propeller creation and animation

import * as THREE from 'three';
import gameState from '../core/state.js';

// Create the propeller at the back of the submarine
export function createPropeller(hullLength) {
    // Propeller material (bronze color)
    const propellerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xD4AF37, // Gold/bronze color
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x553311,
        emissiveIntensity: 0.2
    });
    
    // Propeller hub
    const propHub = new THREE.Group();
    
    // Central hub piece
    const hubGeometry = new THREE.CylinderGeometry(0.4, 0.6, 0.8, 16);
    const hub = new THREE.Mesh(hubGeometry, propellerMaterial);
    hub.rotation.x = Math.PI / 2;
    propHub.add(hub);
    
    // Create 4 large distinctive propeller blades
    const bladeCount = 4;
    for (let i = 0; i < bladeCount; i++) {
        // Create a blade group for proper orientation
        const bladeGroup = new THREE.Group();
        
        // Create a curved propeller blade using a custom shape
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, 0);
        bladeShape.lineTo(0.2, 0.1);
        bladeShape.lineTo(0.6, 0.6);
        bladeShape.lineTo(1.2, 1.5);
        bladeShape.lineTo(1.0, 1.7);
        bladeShape.lineTo(0.4, 0.8);
        bladeShape.lineTo(0, 0.3);
        bladeShape.lineTo(0, 0);
        
        const extrudeSettings = {
            steps: 1,
            depth: 0.1,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 3
        };
        
        const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
        const blade = new THREE.Mesh(bladeGeometry, propellerMaterial);
        
        // Set blade angle for realistic propeller look
        blade.rotation.x = -Math.PI / 6; // Tilt blade for propulsion angle
        
        // Add to blade group
        bladeGroup.add(blade);
        
        // Rotate each blade group around the hub
        bladeGroup.rotation.z = (Math.PI * 2 / bladeCount) * i;
        
        // Add blade group to hub
        propHub.add(bladeGroup);
    }
    
    return propHub;
}

// Animate the propeller rotation
export function animatePropeller(propHub) {
    const animate = () => {
        if (!gameState.gameOver) {
            propHub.rotation.z += 0.15; // Rotate around Z axis for correct motion
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