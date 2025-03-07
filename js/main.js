// Main Game Entry Point

import * as THREE from 'three';
import gameState, { resetGameState } from './core/state.js';
import { debug } from './core/debug.js';
import { WORLD_SIZE, OCEAN_DEPTH } from './core/constants.js';

// Scene imports
import { initScene } from './scene/scene.js';
import { setupCamera, updateCamera } from './scene/camera.js';

// Environment imports
import { createWaterSurface, updateWaterPosition } from './environment/water.js';
import { createOceanFloor, debugTerrain } from './environment/oceanFloor.js';
import { initChunkedWorld, updateChunks } from './environment/worldChunks.js';
import * as biomeSystem from './environment/biomes.js';
import { initSharkSystem, updateSharks } from './environment/sharks.js';
import { initEnemySubmarineSystem, updateEnemySubmarines } from './environment/enemySubmarines.js';

// Submarine imports
import { createSubmarine } from './submarine/submarine.js';
import { updateSubmarinePhysics } from './submarine/physics.js';
import { checkSubmarineCollisions } from './submarine/collisions.js';
import { updateSubmarineCamera } from './submarine/camera.js';
import { updateTorpedoes, handleTorpedoFiring, resetTargeting } from './submarine/torpedo.js';

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
        
        // Reset torpedo targeting system
        resetTargeting();
        
        // Initialize the scene and renderer
        initScene();
        
        // Initialize biome system with medium distribution by default
        // This can be changed with biomeSystem.setBiomeDistributionScale('SMALL' or 'LARGE')
        debug('Initializing biome system');
        biomeSystem.setBiomeDistributionScale('MEDIUM');
        
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
        
        // Initialize the infinite chunked world system
        initChunkedWorld();
        
        // Initialize shark system
        initSharkSystem();
        
        // Initialize enemy submarine system
        initEnemySubmarineSystem();
        
        // Add debug controls
        setupDebugControls();
        
        // Start the game loop
        animate();
        
        debug('Game initialized with infinite world');
    } catch (error) {
        console.error('Error in initGame:', error);
    }
}

// Setup debug controls
function setupDebugControls() {
    window.addEventListener('keydown', (event) => {
        // Toggle terrain debug panel with 'T' key
        if (event.key === 't' || event.key === 'T') {
            debugTerrain();
        }
        
        // Change biome distribution scale with number keys
        if (event.key === '1') {
            debug('Setting biome scale: SMALL (larger biomes)');
            biomeSystem.setBiomeDistributionScale('SMALL');
            // Notify player
            gameState.messageSystem.addMessage('Biome Scale: SMALL (larger biomes)');
        }
        if (event.key === '2') {
            debug('Setting biome scale: MEDIUM');
            biomeSystem.setBiomeDistributionScale('MEDIUM');
            // Notify player
            gameState.messageSystem.addMessage('Biome Scale: MEDIUM');
        }
        if (event.key === '3') {
            debug('Setting biome scale: LARGE (smaller biomes)');
            biomeSystem.setBiomeDistributionScale('LARGE');
            // Notify player
            gameState.messageSystem.addMessage('Biome Scale: LARGE (smaller biomes)');
        }
        
        // Show biome debug visualization with 'B' key
        if (event.key === 'b' || event.key === 'B') {
            // If shift is held, show the enhanced biome map instead
            if (event.shiftKey) {
                toggleEnhancedBiomeMap();
            } else {
                // Original simple biome debug visualization
                const debugElement = document.getElementById('biome-debug');
                if (debugElement) {
                    document.body.removeChild(debugElement);
                } else {
                    const { canvas } = biomeSystem.createBiomeDebugTexture(256);
                    canvas.id = 'biome-debug';
                    canvas.style.position = 'absolute';
                    canvas.style.top = '70px';
                    canvas.style.right = '10px';
                    canvas.style.border = '2px solid white';
                    canvas.style.zIndex = '1000';
                    document.body.appendChild(canvas);
                }
            }
        }
    });
    
    // Function to toggle the enhanced biome map
    function toggleEnhancedBiomeMap() {
        const existingMap = document.getElementById('enhanced-biome-map');
        if (existingMap) {
            document.body.removeChild(existingMap);
        } else {
            // Create the enhanced biome map with submarine's current position
            let playerX = 0;
            let playerZ = 0;
            
            if (gameState.submarine) {
                playerX = gameState.submarine.position.x;
                playerZ = gameState.submarine.position.z;
            }
            
            const biomeMap = biomeSystem.createEnhancedBiomeMap(512, 2000, playerX, playerZ);
            document.body.appendChild(biomeMap);
            
            // Show a message about the map
            gameState.messageSystem.addMessage('Enhanced Biome Map opened. Use Shift+B to toggle.');
        }
    }
}

// Main game loop
function animate() {
    try {
        if (gameState.gameOver) return;
        
        // Request next frame
        requestAnimationFrame(animate);
        
        // Increment frame counter for performance optimizations
        gameState.frameCount++;
        
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
        
        // Update submarine health if the function exists
        if (gameState.submarine && gameState.submarine.updateHealth) {
            gameState.submarine.updateHealth(deltaTime);
        }
        
        // Update torpedoes
        updateTorpedoes(deltaTime);
        
        // Update sharks
        updateSharks(deltaTime);
        
        // Update enemy submarines
        updateEnemySubmarines(deltaTime);
        
        // Check if we have active explosions (for performance optimization)
        const hasExplosions = gameState.explosions && gameState.explosions.length > 0;
        
        // Update explosions
        updateExplosions();
        
        // Performance optimization - reduce update frequency of non-critical systems when explosions are active
        const skipNonEssentials = hasExplosions && (gameState.frameCount % 2 !== 0);
        
        // Update chunks for infinite world - skip every other frame during explosions
        if (!skipNonEssentials && gameState.chunkSystem) {
            updateChunks();
        }
        
        // Update water position to follow submarine - essential, always update
        updateWaterPosition();
        
        // Update UI - skip every other frame during explosions
        if (!skipNonEssentials && gameState.updateUI) {
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