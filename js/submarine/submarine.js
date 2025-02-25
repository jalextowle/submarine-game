// Submarine creation and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { createPropeller, animatePropeller } from './propeller.js';

// Create the submarine with all its components
export function createSubmarine() {
    debug('Creating submarine');
    try {
        // Create a more streamlined military-style submarine
        
        // Create a submarine group
        const submarine = new THREE.Group();
        
        // --- MAIN HULL (longer and more streamlined) ---
        const hullLength = 25; // Increased length
        const hullRadius = 2;
        
        // Main pressure hull
        const mainHullMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2C3539, // Dark naval gray
            metalness: 0.6,
            roughness: 0.4
        });
        
        // Main pressure hull (middle section)
        const mainHullGeometry = new THREE.CylinderGeometry(hullRadius, hullRadius, hullLength * 0.7, 32);
        const mainHull = new THREE.Mesh(mainHullGeometry, mainHullMaterial);
        mainHull.rotation.x = Math.PI / 2; // Align with Z-axis
        
        // Forward hull section (tapered)
        const forwardHullGeometry = new THREE.CylinderGeometry(hullRadius, hullRadius * 0.6, hullLength * 0.2, 32);
        const forwardHull = new THREE.Mesh(forwardHullGeometry, mainHullMaterial);
        forwardHull.rotation.x = Math.PI / 2;
        forwardHull.position.z = hullLength * 0.43;
        
        // Bow section (pointed)
        const bowGeometry = new THREE.ConeGeometry(hullRadius * 0.6, hullLength * 0.1, 32);
        const bow = new THREE.Mesh(bowGeometry, mainHullMaterial);
        bow.rotation.x = -Math.PI / 2;
        bow.position.z = hullLength * 0.58;
        
        // Aft hull section (tapered)
        const aftHullGeometry = new THREE.CylinderGeometry(hullRadius * 0.75, hullRadius, hullLength * 0.15, 32);
        const aftHull = new THREE.Mesh(aftHullGeometry, mainHullMaterial);
        aftHull.rotation.x = Math.PI / 2;
        aftHull.position.z = -hullLength * 0.42;
        
        // Stern section (rounded)
        const sternGeometry = new THREE.SphereGeometry(hullRadius * 0.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const stern = new THREE.Mesh(sternGeometry, mainHullMaterial);
        stern.rotation.x = Math.PI;
        stern.position.z = -hullLength * 0.5;
        
        // --- CONNING TOWER (SAIL) ---
        const towerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1C2529, // Slightly darker than hull
            metalness: 0.6,
            roughness: 0.3
        });
        
        // Streamlined sail shape
        const sailGeometry = new THREE.BoxGeometry(2, 3, 7);
        const sail = new THREE.Mesh(sailGeometry, towerMaterial);
        sail.position.y = hullRadius + 1.5;
        
        // Rounded front of sail
        const sailFrontGeometry = new THREE.CylinderGeometry(1, 1, 3, 16, 1, false, -Math.PI/2, Math.PI);
        const sailFront = new THREE.Mesh(sailFrontGeometry, towerMaterial);
        sailFront.rotation.x = Math.PI / 2;
        sailFront.position.y = hullRadius + 1.5;
        sailFront.position.z = 3.5;
        
        // Single periscope
        const periscopeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const periscopeGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const periscope = new THREE.Mesh(periscopeGeometry, periscopeMaterial);
        periscope.position.y = hullRadius + 4;
        periscope.position.z = 2;
        
        // --- CONTROL SURFACES ---
        addControlSurfaces(submarine, hullLength);
        
        // --- WINDOWS ---
        addWindows(sail);
        
        // --- PROPELLER ---
        const propHub = createPropeller(hullLength);
        
        // --- Add all components to submarine group ---
        submarine.add(mainHull);
        submarine.add(forwardHull);
        submarine.add(bow);
        submarine.add(aftHull);
        submarine.add(stern);
        submarine.add(sail);
        submarine.add(sailFront);
        submarine.add(periscope);
        submarine.add(propHub);
        
        // Add weathering effects
        addWeatheringEffects(submarine, hullRadius, hullLength);
        
        // Add submarine to scene
        gameState.scene.add(submarine);
        gameState.submarine.object = submarine;
        
        // Position submarine and set initial rotation
        submarine.position.set(0, 0, 0);
        submarine.rotation.y = 0; // Submarine directly faces into screen
        
        // Start propeller animation
        animatePropeller(propHub);
        
        // Set rotation order to YXZ to prevent gimbal lock issues and unwanted roll
        submarine.rotation.order = 'YXZ';  // Apply yaw first, then pitch, then roll
        
        // Set initial rotation values
        submarine.rotation.x = 0;  // Pitch
        submarine.rotation.y = 0;  // Yaw
        submarine.rotation.z = 0;  // Roll
        
        // Store the rotation order in the game state
        gameState.submarine.rotationOrder = 'YXZ';
        
        debug('Streamlined submarine created');
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
    sternPlaneLeft.position.z = -hullLength * 0.3;
    
    const sternPlaneRight = new THREE.Mesh(sternPlaneGeometry, controlSurfaceMaterial);
    sternPlaneRight.position.x = 3;
    sternPlaneRight.position.z = -hullLength * 0.3;
    
    // Single rudder (simplified)
    const rudderGeometry = new THREE.BoxGeometry(0.3, 3, 2);
    const rudder = new THREE.Mesh(rudderGeometry, controlSurfaceMaterial);
    rudder.position.y = 0;
    rudder.position.z = -hullLength * 0.45;
    
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

// Add weathering effects to submarine hull
function addWeatheringEffects(submarine, hullRadius, hullLength) {
    // Just a few subtle weathering effects
    for (let i = 0; i < 8; i++) {
        const weatheringSize = Math.random() * 2 + 1;
        const weatheringGeometry = new THREE.CircleGeometry(weatheringSize, 8);
        const weatheringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x202020, 
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const weatheringMark = new THREE.Mesh(weatheringGeometry, weatheringMaterial);
        
        // Position randomly on hull
        const angle = Math.random() * Math.PI * 2;
        const heightPos = Math.random() * hullLength - hullLength / 2;
        
        weatheringMark.position.x = Math.cos(angle) * hullRadius;
        weatheringMark.position.y = Math.sin(angle) * hullRadius;
        weatheringMark.position.z = heightPos;
        
        // Align with hull surface
        weatheringMark.lookAt(weatheringMark.position.clone().add(
            new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0)
        ));
        
        submarine.add(weatheringMark);
    }
} 