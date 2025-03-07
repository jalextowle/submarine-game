// Submarine creation and management

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { createPropeller, animatePropeller } from './propeller.js';
import { createExplosion } from '../effects/explosions.js';

// Health and damage constants
const MAX_SUBMARINE_HEALTH = 100;
const DAMAGE_RECOVERY_TIME = 10000; // 10 seconds before health regeneration starts
const HEALTH_REGEN_RATE = 5; // Health points regenerated per second
const LOW_HEALTH_THRESHOLD = 25; // Threshold for low health warning

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
        
        // Initialize submarine health system
        initializeSubmarineHealth();
        
        debug('Submarine flipped along Z-axis to reverse direction');
        return submarine;
    } catch (error) {
        console.error('Error in createSubmarine:', error);
    }
}

// Initialize the submarine health system
function initializeSubmarineHealth() {
    // Set up health properties
    gameState.submarine.maxHealth = MAX_SUBMARINE_HEALTH;
    gameState.submarine.currentHealth = MAX_SUBMARINE_HEALTH;
    gameState.submarine.lastDamageTime = 0;
    gameState.submarine.healthRegenRate = HEALTH_REGEN_RATE;
    gameState.submarine.damageRecoveryTime = DAMAGE_RECOVERY_TIME;
    gameState.submarine.damageEffects = {
        damageSmokeParticles: null,
        damageLights: [],
        damageOverlay: null
    };
    
    // Create health bar
    createHealthBar();
    
    // Add damage function to the submarine object
    gameState.submarine.damage = damageSubmarine;
    
    // Add update health function
    gameState.submarine.updateHealth = updateSubmarineHealth;
    
    debug('Submarine health system initialized');
}

// Create a health bar for the submarine
function createHealthBar() {
    // Create the health bar HTML element if it doesn't exist
    if (!document.getElementById('submarine-health-bar')) {
        const healthBarContainer = document.createElement('div');
        healthBarContainer.id = 'submarine-health-bar-container';
        healthBarContainer.style.position = 'absolute';
        healthBarContainer.style.bottom = '20px';
        healthBarContainer.style.left = '20px';
        healthBarContainer.style.width = '200px';
        healthBarContainer.style.height = '30px';
        healthBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        healthBarContainer.style.borderRadius = '5px';
        healthBarContainer.style.padding = '5px';
        healthBarContainer.style.zIndex = '100';
        
        const healthBarLabel = document.createElement('div');
        healthBarLabel.id = 'submarine-health-bar-label';
        healthBarLabel.textContent = 'HULL INTEGRITY';
        healthBarLabel.style.color = 'white';
        healthBarLabel.style.fontSize = '12px';
        healthBarLabel.style.marginBottom = '5px';
        healthBarLabel.style.fontFamily = 'Arial, sans-serif';
        
        const healthBarOuter = document.createElement('div');
        healthBarOuter.style.width = '100%';
        healthBarOuter.style.height = '15px';
        healthBarOuter.style.backgroundColor = 'rgba(50, 50, 50, 0.7)';
        healthBarOuter.style.borderRadius = '3px';
        healthBarOuter.style.overflow = 'hidden';
        
        const healthBarInner = document.createElement('div');
        healthBarInner.id = 'submarine-health-bar';
        healthBarInner.style.width = '100%';
        healthBarInner.style.height = '100%';
        healthBarInner.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
        healthBarInner.style.transition = 'width 0.3s ease, background-color 0.3s ease';
        
        healthBarOuter.appendChild(healthBarInner);
        healthBarContainer.appendChild(healthBarLabel);
        healthBarContainer.appendChild(healthBarOuter);
        document.body.appendChild(healthBarContainer);
    }
}

// Update the submarine health bar
function updateHealthBar() {
    const healthBar = document.getElementById('submarine-health-bar');
    if (!healthBar) return;
    
    const healthPercent = gameState.submarine.currentHealth / gameState.submarine.maxHealth;
    
    // Update width
    healthBar.style.width = `${healthPercent * 100}%`;
    
    // Update color based on health level
    if (healthPercent > 0.6) {
        healthBar.style.backgroundColor = 'rgba(0, 255, 0, 0.7)'; // Green
    } else if (healthPercent > 0.3) {
        healthBar.style.backgroundColor = 'rgba(255, 255, 0, 0.7)'; // Yellow
    } else {
        healthBar.style.backgroundColor = 'rgba(255, 0, 0, 0.7)'; // Red
    }
}

// Apply damage to the submarine
function damageSubmarine(damageAmount) {
    try {
        // Set last damage time
        gameState.submarine.lastDamageTime = Date.now();
        
        // Reduce health
        gameState.submarine.currentHealth = Math.max(0, gameState.submarine.currentHealth - damageAmount);
        
        // Update the health bar
        updateHealthBar();
        
        // Play damage sound if available
        if (typeof playDamageSound === 'function') {
            playDamageSound();
        }
        
        // Add screen shake effect
        addScreenShake(damageAmount * 0.05);
        
        // Display damage message
        const healthPercent = Math.floor((gameState.submarine.currentHealth / gameState.submarine.maxHealth) * 100);
        gameState.messageSystem.addMessage(`Hull damage! Integrity: ${healthPercent}%`, 2000);
        
        // Check if submarine is destroyed
        if (gameState.submarine.currentHealth <= 0) {
            submarineDestroyed();
            return true;
        }
        
        // Add visual damage effects based on health percentage
        updateDamageEffects();
        
        return false;
    } catch (error) {
        console.error('Error applying damage to submarine:', error);
        return false;
    }
}

// Update submarine health (regeneration, etc.)
function updateSubmarineHealth(deltaTime) {
    try {
        // Skip if at full health
        if (gameState.submarine.currentHealth >= gameState.submarine.maxHealth) {
            return;
        }
        
        const currentTime = Date.now();
        
        // Check if enough time has passed since last damage for regeneration
        if (currentTime - gameState.submarine.lastDamageTime > gameState.submarine.damageRecoveryTime) {
            // Regenerate health
            gameState.submarine.currentHealth = Math.min(
                gameState.submarine.maxHealth,
                gameState.submarine.currentHealth + (gameState.submarine.healthRegenRate * deltaTime)
            );
            
            // Update health bar
            updateHealthBar();
            
            // Update visual damage effects
            updateDamageEffects();
            
            // If health is restored to full, display message
            if (gameState.submarine.currentHealth >= gameState.submarine.maxHealth) {
                gameState.messageSystem.addMessage('Hull integrity restored', 2000);
            }
        }
    } catch (error) {
        console.error('Error updating submarine health:', error);
    }
}

// Add screen shake effect on damage
function addScreenShake(intensity) {
    if (!gameState.camera || !gameState.camera.main) return;
    
    // Store original camera position
    const originalPosition = gameState.camera.main.position.clone();
    
    // Apply random shake offsets
    function applyShake() {
        if (!gameState.camera || !gameState.camera.main) return;
        
        const offsetX = (Math.random() - 0.5) * intensity * 2;
        const offsetY = (Math.random() - 0.5) * intensity * 2;
        const offsetZ = (Math.random() - 0.5) * intensity * 2;
        
        gameState.camera.main.position.set(
            originalPosition.x + offsetX,
            originalPosition.y + offsetY,
            originalPosition.z + offsetZ
        );
        
        // Decrease intensity for next shake
        intensity *= 0.9;
        
        // Continue shaking if intensity is still significant
        if (intensity > 0.01) {
            setTimeout(applyShake, 16); // ~60fps
        } else {
            // Reset to original position when done
            gameState.camera.main.position.copy(originalPosition);
        }
    }
    
    // Start the shake effect
    applyShake();
}

// Update visual damage effects based on current health
function updateDamageEffects() {
    const healthPercent = gameState.submarine.currentHealth / gameState.submarine.maxHealth;
    
    // TODO: Add smoke particles and damage lights when health is low
    // This could be expanded in the future
}

// Handle submarine destruction
function submarineDestroyed() {
    try {
        // Create large explosion at submarine position
        if (gameState.submarine.object) {
            createExplosion(gameState.submarine.object.position.clone(), 3.0);
        }
        
        // Display game over message
        gameState.messageSystem.addMessage('SUBMARINE DESTROYED', 5000);
        
        // Set game over state
        gameState.gameOver = true;
        
        // Show game over screen
        showGameOverScreen();
    } catch (error) {
        console.error('Error handling submarine destruction:', error);
    }
}

// Show game over screen
function showGameOverScreen() {
    // Create game over overlay if it doesn't exist
    if (!document.getElementById('game-over-screen')) {
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over-screen';
        gameOverScreen.style.position = 'absolute';
        gameOverScreen.style.top = '0';
        gameOverScreen.style.left = '0';
        gameOverScreen.style.width = '100%';
        gameOverScreen.style.height = '100%';
        gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        gameOverScreen.style.display = 'flex';
        gameOverScreen.style.flexDirection = 'column';
        gameOverScreen.style.justifyContent = 'center';
        gameOverScreen.style.alignItems = 'center';
        gameOverScreen.style.zIndex = '1000';
        
        const gameOverTitle = document.createElement('h1');
        gameOverTitle.textContent = 'SUBMARINE DESTROYED';
        gameOverTitle.style.color = 'red';
        gameOverTitle.style.fontFamily = 'Arial, sans-serif';
        gameOverTitle.style.fontSize = '40px';
        gameOverTitle.style.marginBottom = '20px';
        
        const gameOverMessage = document.createElement('p');
        gameOverMessage.textContent = 'Your submarine has been destroyed by enemy forces.';
        gameOverMessage.style.color = 'white';
        gameOverMessage.style.fontFamily = 'Arial, sans-serif';
        gameOverMessage.style.fontSize = '20px';
        gameOverMessage.style.marginBottom = '40px';
        
        const restartButton = document.createElement('button');
        restartButton.textContent = 'RESTART MISSION';
        restartButton.style.padding = '15px 30px';
        restartButton.style.fontSize = '18px';
        restartButton.style.backgroundColor = '#003366';
        restartButton.style.color = 'white';
        restartButton.style.border = 'none';
        restartButton.style.borderRadius = '5px';
        restartButton.style.cursor = 'pointer';
        
        // Add restart functionality
        restartButton.addEventListener('click', () => {
            location.reload(); // Simple page reload to restart
        });
        
        gameOverScreen.appendChild(gameOverTitle);
        gameOverScreen.appendChild(gameOverMessage);
        gameOverScreen.appendChild(restartButton);
        
        document.body.appendChild(gameOverScreen);
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