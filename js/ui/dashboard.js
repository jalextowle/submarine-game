// Game UI dashboard

import { debug } from '../core/debug.js';
import gameState from '../core/state.js';
import { TORPEDO_COOLDOWN, SURFACE_LEVEL } from '../core/constants.js';

// Create the in-game UI dashboard - now disabled to avoid duplication
export function createDashboard() {
    debug('Using original HTML dashboard only');
    
    // Create targeting status display
    createTargetingStatus();
    
    // Store the updateUI function in the game state for use in the game loop
    gameState.updateUI = updateDashboard;
    
    debug('Dashboard configuration complete');
}

// Create targeting status display
function createTargetingStatus() {
    // Create container for targeting status
    const targetingStatus = document.createElement('div');
    targetingStatus.id = 'targeting-status';
    targetingStatus.style.position = 'absolute';
    targetingStatus.style.bottom = '20px';
    targetingStatus.style.right = '20px';
    targetingStatus.style.color = 'white';
    targetingStatus.style.fontFamily = 'Arial, sans-serif';
    targetingStatus.style.fontSize = '14px';
    targetingStatus.style.padding = '10px';
    targetingStatus.style.backgroundColor = 'rgba(0,0,0,0.6)';
    targetingStatus.style.borderRadius = '5px';
    targetingStatus.style.zIndex = '100';
    targetingStatus.style.display = 'none'; // Initially hidden
    
    document.body.appendChild(targetingStatus);
}

// Update the dashboard
export function updateDashboard() {
    // Update depth meter
    updateDepthIndicator();
    
    // Update targeting status
    updateTargetingStatus();
    
    // Future dashboard updates can be added here
}

// Update the depth indicator with current submarine depth
function updateDepthIndicator() {
    try {
        const depthValueElement = document.getElementById('depth-value');
        const depthLabelElement = document.getElementById('depth-label');
        if (!depthValueElement || !depthLabelElement) return;
        
        // Get the current submarine depth from game state
        if (gameState.submarine && gameState.submarine.object) {
            // Get submarine's y position directly
            const yPosition = gameState.submarine.object.position.y;
            
            // If submarine is at or above water level (y >= 0), show height
            if (yPosition >= 0) {
                depthLabelElement.textContent = "Height: ";
                depthValueElement.textContent = Math.floor(yPosition);
            } 
            // If submarine is below water but the depth value is negative (indicating it's actually above water)
            else if (gameState.submarine.depth < 0) {
                depthLabelElement.textContent = "Height: ";
                depthValueElement.textContent = Math.abs(gameState.submarine.depth);
            }
            // Normal underwater case
            else {
                depthLabelElement.textContent = "Depth: ";
                depthValueElement.textContent = gameState.submarine.depth;
            }
        }
    } catch (error) {
        console.error('Error updating depth indicator:', error);
    }
}

// Update targeting status display
function updateTargetingStatus() {
    try {
        const targetingStatus = document.getElementById('targeting-status');
        if (!targetingStatus) return;
        
        // Check if we have a target
        if (window.currentTarget) {
            const isLocked = window.targetLocked;
            const hasFired = window.targetFired;
            
            // Show appropriate status message
            let statusText = '';
            let statusColor = '';
            
            if (hasFired) {
                statusText = 'TORPEDO TRACKING TARGET';
                statusColor = '#ff9900'; // Orange
            } else if (isLocked) {
                statusText = 'TARGET LOCKED - READY TO FIRE';
                statusColor = '#00ff00'; // Green
            } else {
                statusText = 'ACQUIRING TARGET...';
                statusColor = '#ff0000'; // Red
            }
            
            // Update the status display
            targetingStatus.textContent = statusText;
            targetingStatus.style.color = statusColor;
            targetingStatus.style.display = 'block';
            
        } else {
            // No target, hide the status
            targetingStatus.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating targeting status:', error);
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