// Main Game Entry Point

import * as THREE from 'three';
import gameState, { resetGameState } from './core/state.js';
import { debug } from './core/debug.js';
import { WORLD_SIZE, OCEAN_DEPTH } from './core/constants.js';

// Scene imports
import { initScene } from './scene/scene.js';
import { setupCamera, updateCamera } from './scene/camera.js';

// Environment imports
import { createWaterSurface } from './environment/water.js';
import { createOceanFloor } from './environment/oceanFloor.js';
import { createObstacles, checkObstacleCollisions } from './environment/obstacles.js';

// Submarine imports
import { createSubmarine } from './submarine/submarine.js';
import { updateSubmarinePhysics } from './submarine/physics.js';
import { checkSubmarineCollisions } from './submarine/collisions.js';
import { updateSubmarineCamera } from './submarine/camera.js';
import { updateTorpedoes, handleTorpedoFiring } from './submarine/torpedo.js';

// UI imports
import { createInstructions } from './ui/instructions.js';
import { createDashboard, updateDashboard } from './ui/dashboard.js';

// Input imports
import { initControls, processInput } from './input/controls.js';

// Effects imports
import { updateExplosions } from './effects/explosions.js';

// Initialize the game
export function initGame() {
    debug('Initializing game');
    try {
        // Reset game state in case of restart
        resetGameState();
        
        // Initialize the scene and renderer
        initScene();
        
        // Create environment
        createWaterSurface();
        createOceanFloor();
        
        // Create the submarine
        createSubmarine();
        
        // Initialize controls
        initControls();
        
        // Create UI elements
        createInstructions();
        createDashboard();
        
        // Start the game loop
        animate();
        
        debug('Game initialized');
    } catch (error) {
        console.error('Error in initGame:', error);
    }
}

// Main game loop
function animate() {
    try {
        if (gameState.gameOver) return;
        
        // Request next frame
        requestAnimationFrame(animate);
        
        // Calculate delta time
        const deltaTime = gameState.clock.getDelta();
        
        // Process input and update game state
        processInput();
        
        // Update submarine physics
        const previousPosition = updateSubmarinePhysics(deltaTime);
        
        // Check for collisions
        checkSubmarineCollisions(previousPosition);
        
        // Update submarine camera
        updateSubmarineCamera();
        
        // Update torpedoes
        updateTorpedoes(deltaTime);
        
        // Update explosions
        updateExplosions();
        
        // Update UI
        if (gameState.updateUI) {
            gameState.updateUI();
        }
        
        // Render the scene
        if (gameState.renderer && gameState.scene && gameState.camera.main) {
            gameState.renderer.render(gameState.scene, gameState.camera.main);
        }
    } catch (error) {
        console.error('Error in animate:', error);
        gameState.gameOver = true;
    }
}

// Handle torpedo firing based on input
function checkTorpedoFiring() {
    // If space key is pressed and torpedo is ready
    if (gameState.keys[' ']) {
        handleTorpedoFiring();
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (gameState.camera.main && gameState.renderer) {
        // Update camera aspect ratio
        gameState.camera.main.aspect = window.innerWidth / window.innerHeight;
        gameState.camera.main.updateProjectionMatrix();
        
        // Update renderer size
        gameState.renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    debug('DOM loaded, starting game');
    initGame();
}); 