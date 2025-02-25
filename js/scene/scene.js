// Scene initialization and management

import * as THREE from 'three';
import { debug } from '../core/debug.js';
import gameState from '../core/state.js'; 
import { OCEAN_DEPTH, WORLD_SIZE } from '../core/constants.js';
import { setupCamera } from './camera.js';
import { setupLighting } from './lighting.js';

// Initialize the Three.js scene and renderer
export function initScene() {
    debug('Initializing scene');
    try {
        // Create scene
        gameState.scene = new THREE.Scene();
        
        // Brighter blue sky background
        gameState.scene.background = new THREE.Color(0x87CEEB);
        
        // Reduce fog significantly to see the ocean floor clearly
        gameState.scene.fog = new THREE.FogExp2(0x40E0D0, 0.0004);

        // Create renderer with improved shadow settings
        gameState.renderer = new THREE.WebGLRenderer({ antialias: true });
        gameState.renderer.setPixelRatio(window.devicePixelRatio);
        gameState.renderer.setSize(window.innerWidth, window.innerHeight);
        gameState.renderer.shadowMap.enabled = true;
        gameState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        gameState.renderer.shadowMap.autoUpdate = true;
        gameState.renderer.physicallyCorrectLights = true;
        
        // Add renderer to DOM
        const container = document.getElementById('game-canvas');
        if (!container) {
            throw new Error('Could not find game-canvas element');
        }
        container.appendChild(gameState.renderer.domElement);
        debug('Renderer added to DOM');

        // Setup camera
        setupCamera();
        
        // Setup lighting
        setupLighting();
        
        // Handle window resize
        window.addEventListener('resize', handleWindowResize);
        
        // Initialize collision objects array
        gameState.collisionObjects = [];
        
        // After initializing camera - Lock the pointer when clicking on the renderer
        gameState.renderer.domElement.addEventListener('click', () => {
            gameState.renderer.domElement.requestPointerLock();
        });
        
        // Create instructions element
        createInstructions();
        
        debug('Scene initialization complete');
    } catch (error) {
        console.error('Error in initScene:', error);
        alert('Error initializing scene: ' + error.message);
    }
    
    return gameState.scene;
}

// Handle window resize
function handleWindowResize() {
    if (gameState.camera.main && gameState.renderer) {
        gameState.camera.main.aspect = window.innerWidth / window.innerHeight;
        gameState.camera.main.updateProjectionMatrix();
        gameState.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Create instructions element
function createInstructions() {
    const instructions = document.createElement('div');
    instructions.id = 'instructions';
    instructions.innerHTML = `
        <div class="instructions-content">
            <h2>Controls</h2>
            <p><strong>Mouse:</strong> Control direction (aim)</p>
            <p><strong>W/S:</strong> Move forward/backward</p>
            <p><strong>A/D:</strong> Strafe left/right</p>
            <p><strong>Space:</strong> Fire torpedo</p>
            <p><strong>H:</strong> Toggle help</p>
            <p><strong>Jump:</strong> Point up and accelerate!</p>
            <p><strong>Click game to activate mouse control</strong></p>
        </div>
    `;
    document.body.appendChild(instructions);
} 