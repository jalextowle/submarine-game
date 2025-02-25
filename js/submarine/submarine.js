// Submarine creation and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { createPropeller, animatePropeller } from './propeller.js';

// Create the submarine with all its components
export function createSubmarine() {
    debug('Creating submarine');
    try {
        // Create a simplified submarine
        
        // Create a submarine group
        const submarine = new THREE.Group();
        
        // --- MAIN HULL (simplified) ---
        const hullLength = 20; // Slightly reduced length
        const hullRadius = 2;
        
        // Main pressure hull
        const mainHullMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2C3539, // Dark naval gray
            metalness: 0.6,
            roughness: 0.4
        });
        
        // Main pressure hull (single piece)
        const mainHullGeometry = new THREE.CylinderGeometry(hullRadius, hullRadius, hullLength * 0.7, 32);
        const mainHull = new THREE.Mesh(mainHullGeometry, mainHullMaterial);
        mainHull.rotation.x = Math.PI / 2; // Align with Z-axis
        
        // Calculate the exact position where the main hull ends
        const mainHullHalfLength = hullLength * 0.7 / 2;
        
        // Forward hull section (tapered) - FRONT of submarine (positive Z)
        const forwardHullGeometry = new THREE.ConeGeometry(hullRadius, hullLength * 0.2, 32);
        const forwardHull = new THREE.Mesh(forwardHullGeometry, mainHullMaterial);
        forwardHull.rotation.x = Math.PI / 2;
        // Position exactly at the end of the main hull
        forwardHull.position.z = mainHullHalfLength + (hullLength * 0.2 / 2);
        
        // Rear hull section (tapered) - BACK of submarine (negative Z)
        const rearHullGeometry = new THREE.ConeGeometry(hullRadius, hullLength * 0.15, 32);
        const rearHull = new THREE.Mesh(rearHullGeometry, mainHullMaterial);
        rearHull.rotation.x = -Math.PI / 2;
        // Position exactly at the end of the main hull
        rearHull.position.z = -mainHullHalfLength - (hullLength * 0.15 / 2);
        
        // --- CONNING TOWER (SAIL) --- (at the FRONT half)
        const towerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1C2529, // Slightly darker than hull
            metalness: 0.6,
            roughness: 0.3
        });
        
        // Streamlined sail shape (positioned toward FRONT)
        const sailGeometry = new THREE.BoxGeometry(2, 3, 7);
        const sail = new THREE.Mesh(sailGeometry, towerMaterial);
        sail.position.y = hullRadius + 1.5;
        sail.position.z = hullLength * 0.1; // Positioned toward front half
        
        // Rounded front of sail
        const sailFrontGeometry = new THREE.CylinderGeometry(1, 1, 3, 16, 1, false, -Math.PI/2, Math.PI);
        const sailFront = new THREE.Mesh(sailFrontGeometry, towerMaterial);
        sailFront.rotation.x = Math.PI / 2;
        sailFront.position.y = hullRadius + 1.5;
        sailFront.position.z = hullLength * 0.1 + 3.5; // Match sail position + offset
        
        // Single periscope
        const periscopeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const periscopeGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const periscope = new THREE.Mesh(periscopeGeometry, periscopeMaterial);
        periscope.position.y = hullRadius + 4;
        periscope.position.z = hullLength * 0.1 + 2; // Match sail position + offset
        
        // --- ADD PROPELLER SHAFT TO MAKE IT OBVIOUS --- (at the BACK)
        const shaftMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.9,
            roughness: 0.2
        });
        
        // Smaller and shorter propeller shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16);
        const propellerShaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        propellerShaft.rotation.x = Math.PI / 2;
        // Position closer to the rear cone
        propellerShaft.position.z = -mainHullHalfLength - hullLength * 0.12;
        
        // --- CONTROL SURFACES ---
        addControlSurfaces(submarine, hullLength);
        
        // --- WINDOWS ---
        addWindows(sail);
        
        // --- PROPELLER --- (clearly at the BACK of submarine)
        // Create realistic propeller with proper positioning
        const propHub = createPropeller(hullLength);
        // Position propeller right behind the shaft
        propHub.position.z = -mainHullHalfLength - hullLength * 0.18;
        propHub.rotation.z = Math.PI / 2; // Proper propeller facing
        propHub.scale.set(0.8, 0.8, 0.8); // Scaled down from 2.5 to 0.8 (more than 3x smaller)
        
        // Add lighting to make propeller more visible
        const propellerLight = new THREE.PointLight(0xFFCC88, 1, 10);
        propellerLight.position.set(0, 0, -mainHullHalfLength - hullLength * 0.18);
        submarine.add(propellerLight);
        
        // --- Add all components to submarine group ---
        submarine.add(mainHull);
        submarine.add(forwardHull);
        submarine.add(rearHull);
        submarine.add(sail);
        submarine.add(sailFront);
        submarine.add(periscope);
        submarine.add(propellerShaft);
        submarine.add(propHub);
        
        // Add submarine to scene
        gameState.scene.add(submarine);
        gameState.submarine.object = submarine;
        
        // Position submarine and set initial rotation
        submarine.position.set(0, 0, 0);
        
        // IMPORTANT: Set rotation order BEFORE applying rotations to prevent issues
        submarine.rotation.order = 'YXZ';  // Apply yaw first, then pitch, then roll
        
        // Apply negative Z scale to flip the submarine model
        submarine.scale.set(1, 1, -1);
        
        // Keep the original rotation
        submarine.rotation.set(0, Math.PI, 0);
        
        // Explicitly set the targetYaw in the gameState to match our rotation
        gameState.submarine.targetYaw = Math.PI;
        
        // Explicitly ensure these rotations are applied immediately
        submarine.updateMatrix();
        submarine.updateMatrixWorld(true);
        
        // Start propeller animation
        animatePropeller(propHub);
        
        // Store the rotation order and initial values in the game state
        gameState.submarine.rotationOrder = 'YXZ';
        gameState.submarine.initialYaw = Math.PI;
        
        debug('Submarine flipped along Z-axis to reverse direction');
        return submarine;
    } catch (error) {
        console.error('Error in createSubmarine:', error);
    }
}

// Add control surfaces (fins, rudders, etc.)
function addControlSurfaces(submarine, hullLength) {
    const controlSurfaceMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1C2529,
        metalness: 0.5,
        roughness: 0.5
    });
    
    // Forward dive planes
    const bowPlaneGeometry = new THREE.BoxGeometry(5, 0.3, 1.2);
    const bowPlaneLeft = new THREE.Mesh(bowPlaneGeometry, controlSurfaceMaterial);
    bowPlaneLeft.position.x = -2.5;
    bowPlaneLeft.position.z = hullLength * 0.3;
    
    const bowPlaneRight = new THREE.Mesh(bowPlaneGeometry, controlSurfaceMaterial);
    bowPlaneRight.position.x = 2.5;
    bowPlaneRight.position.z = hullLength * 0.3;
    
    // Stern planes
    const sternPlaneGeometry = new THREE.BoxGeometry(6, 0.3, 1.5);
    const sternPlaneLeft = new THREE.Mesh(sternPlaneGeometry, controlSurfaceMaterial);
    sternPlaneLeft.position.x = -3;
    sternPlaneLeft.position.z = -hullLength * 0.25;
    
    const sternPlaneRight = new THREE.Mesh(sternPlaneGeometry, controlSurfaceMaterial);
    sternPlaneRight.position.x = 3;
    sternPlaneRight.position.z = -hullLength * 0.25;
    
    // Single rudder (simplified)
    const rudderGeometry = new THREE.BoxGeometry(0.3, 3, 2);
    const rudder = new THREE.Mesh(rudderGeometry, controlSurfaceMaterial);
    rudder.position.y = 0;
    rudder.position.z = -hullLength * 0.3;
    
    // Add all control surfaces to submarine
    submarine.add(bowPlaneLeft);
    submarine.add(bowPlaneRight);
    submarine.add(sternPlaneLeft);
    submarine.add(sternPlaneRight);
    submarine.add(rudder);
}

// Add windows to the sail
function addWindows(sail) {
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3A75C4, 
        transparent: true,
        opacity: 0.7,
        emissive: 0x3A75C4,
        emissiveIntensity: 0.3
    });
    
    // Just 2 windows on the sail
    for (let i = 0; i < 2; i++) {
        const windowGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.1);
        const windowPane = new THREE.Mesh(windowGeometry, windowMaterial);
        windowPane.position.z = 3.5;
        windowPane.position.y = 1.8;
        windowPane.position.x = i * 0.7 - 0.3;
        sail.add(windowPane);
    }
} 