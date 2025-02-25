// Game UI dashboard

import { debug } from '../core/debug.js';
import gameState from '../core/state.js';
import { TORPEDO_COOLDOWN, SURFACE_LEVEL } from '../core/constants.js';

// Create the in-game UI dashboard - now disabled to avoid duplication
export function createDashboard() {
    debug('Using original HTML dashboard only');
    
    // Store the updateUI function in the game state for use in the game loop
    gameState.updateUI = updateDashboard;
    
    debug('Dashboard configuration complete');
}

// Update only the original depth meter from HTML
export function updateDashboard() {
    try {
        // Get depth-value element from the original HTML
        const depthValueElement = document.getElementById('depth-value');
        const depthLabelElement = document.getElementById('depth-label');
        
        if (!depthValueElement || !depthLabelElement) return;
        
        // Update depth or height display
        if (gameState.submarine.isAirborne) {
            // When above water, show height as a positive number
            const height = Math.floor(gameState.submarine.object.position.y);
            depthValueElement.textContent = height;
            depthLabelElement.textContent = "Height: ";
        } else {
            // When underwater, show depth as usual
            const depth = Math.max(0, Math.floor(-gameState.submarine.object.position.y));
            depthValueElement.textContent = depth;
            depthLabelElement.textContent = "Depth: ";
        }
        
    } catch (error) {
        console.error('Error in updateDashboard:', error);
    }
}

// Show a message on the dashboard
export function showMessage(message, duration = 3000) {
    try {
        // Create message element if it doesn't exist
        let messageElement = document.getElementById('dashboard-message');
        
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'dashboard-message';
            document.body.appendChild(messageElement);
        }
        
        // Set message and show
        messageElement.textContent = message;
        messageElement.classList.add('visible');
        
        // Hide after duration
        setTimeout(() => {
            messageElement.classList.remove('visible');
        }, duration);
    } catch (error) {
        console.error('Error in showMessage:', error);
    }
} 