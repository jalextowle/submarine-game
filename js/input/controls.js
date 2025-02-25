// Input controls handling

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { MOUSE_SENSITIVITY, MAX_PITCH_ANGLE } from '../core/constants.js';
import { updatePropulsion } from '../submarine/physics.js';
import { handleTorpedoFiring } from '../submarine/torpedo.js';

// Initialize controls for keyboard and mouse
export function initControls() {
    debug('Initializing controls');
    try {
        // Key down event
        window.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() in gameState.keys) {
                gameState.keys[event.key.toLowerCase()] = true;
            }
            
            // Prevent space from scrolling the page
            if (event.key === ' ') {
                event.preventDefault();
            }
        });
        
        // Key up event
        window.addEventListener('keyup', (event) => {
            if (event.key.toLowerCase() in gameState.keys) {
                gameState.keys[event.key.toLowerCase()] = false;
            }
        });
        
        // Mouse movement event
        document.addEventListener('mousemove', handleMouseMove);
        
        // Mouse button events
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left mouse button
                gameState.mouse.leftButton = true;
            } else if (event.button === 2) { // Right mouse button
                gameState.mouse.rightButton = true;
            }
        });
        
        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) { // Left mouse button
                gameState.mouse.leftButton = false;
            } else if (event.button === 2) { // Right mouse button
                gameState.mouse.rightButton = false;
            }
        });
        
        // Lock pointer when clicking on the renderer
        if (gameState.renderer) {
            gameState.renderer.domElement.addEventListener('click', () => {
                gameState.renderer.domElement.requestPointerLock();
            });
        }
        
        // Pointer lock change events
        document.addEventListener('pointerlockchange', handlePointerLockChange);
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        debug('Controls initialized');
    } catch (error) {
        console.error('Error in initControls:', error);
    }
}

// Handle mouse movement
function handleMouseMove(event) {
    // Store the current mouse position
    gameState.mouse.x = event.clientX;
    gameState.mouse.y = event.clientY;
    
    // If pointer is locked (mouse control active)
    if (gameState.submarine.mouseControlActive) {
        // Store movement values
        gameState.mouse.movementX = event.movementX || 0;
        gameState.mouse.movementY = event.movementY || 0;
        
        // Apply mouse movement to submarine rotation targets
        gameState.submarine.targetYaw -= gameState.mouse.movementX * MOUSE_SENSITIVITY * 0.01;
        gameState.submarine.targetPitch += gameState.mouse.movementY * MOUSE_SENSITIVITY * 0.01;
        
        // Clamp pitch to prevent going upside down
        gameState.submarine.targetPitch = Math.min(
            Math.max(gameState.submarine.targetPitch, -MAX_PITCH_ANGLE), 
            MAX_PITCH_ANGLE
        );
    }
}

// Handle pointer lock change
function handlePointerLockChange() {
    // Check if the pointer is currently locked
    if (document.pointerLockElement === gameState.renderer.domElement) {
        gameState.submarine.mouseControlActive = true;
        debug('Mouse controls active');
    } else {
        gameState.submarine.mouseControlActive = false;
        debug('Mouse controls inactive');
    }
}

// Process user input and update submarine state
export function processInput() {
    try {
        // Update submarine propulsion based on key states (W/S for forward/backward)
        updatePropulsion(gameState.keys);
        
        // Check for torpedo firing (Space)
        if (gameState.keys[' ']) {
            handleTorpedoFiring();
        }
        
        // Special keys handling
        // Example: H key for toggling help/instructions already handled in instructions.js
        
    } catch (error) {
        console.error('Error in processInput:', error);
    }
} 