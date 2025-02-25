// Game UI dashboard

import { debug } from '../core/debug.js';
import gameState from '../core/state.js';
import { TORPEDO_COOLDOWN } from '../core/constants.js';

// Create the in-game UI dashboard
export function createDashboard() {
    debug('Creating dashboard UI');
    
    try {
        // Create dashboard container
        const dashboard = document.createElement('div');
        dashboard.id = 'dashboard';
        dashboard.innerHTML = `
            <div class="dashboard-panel">
                <div class="dashboard-section">
                    <h3>Depth</h3>
                    <div id="depth-value" class="value">0 m</div>
                    <div id="depth-gauge" class="gauge">
                        <div id="depth-gauge-fill" class="gauge-fill"></div>
                    </div>
                </div>
                <div class="dashboard-section">
                    <h3>Torpedo</h3>
                    <div id="torpedo-status" class="status ready">READY</div>
                    <div id="torpedo-cooldown" class="gauge">
                        <div id="torpedo-cooldown-fill" class="gauge-fill"></div>
                    </div>
                </div>
                <div class="dashboard-section">
                    <h3>Propulsion</h3>
                    <div id="propulsion-value" class="value">0%</div>
                    <div id="propulsion-gauge" class="gauge">
                        <div id="propulsion-gauge-fill" class="gauge-fill"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dashboard);
        
        // Store the updateUI function in the game state for use in the game loop
        gameState.updateUI = updateDashboard;
        
        debug('Dashboard UI created');
    } catch (error) {
        console.error('Error in createDashboard:', error);
    }
}

// Update the dashboard with current game state
export function updateDashboard() {
    try {
        if (!document.getElementById('depth-value')) return;
        
        // Update depth display
        const depth = Math.max(0, Math.floor(-gameState.submarine.object.position.y));
        document.getElementById('depth-value').textContent = `${depth} m`;
        
        // Update depth gauge
        const depthPercentage = Math.min(100, (depth / 500) * 100);
        document.getElementById('depth-gauge-fill').style.width = `${depthPercentage}%`;
        
        // Update torpedo status
        const currentTime = Date.now();
        const timeSinceLastTorpedo = currentTime - gameState.submarine.lastTorpedoTime;
        const torpedoReady = timeSinceLastTorpedo >= TORPEDO_COOLDOWN;
        
        if (torpedoReady) {
            document.getElementById('torpedo-status').textContent = 'READY';
            document.getElementById('torpedo-status').className = 'status ready';
            document.getElementById('torpedo-cooldown-fill').style.width = '100%';
        } else {
            document.getElementById('torpedo-status').textContent = 'RELOADING';
            document.getElementById('torpedo-status').className = 'status loading';
            
            // Update cooldown gauge
            const cooldownPercentage = (timeSinceLastTorpedo / TORPEDO_COOLDOWN) * 100;
            document.getElementById('torpedo-cooldown-fill').style.width = `${cooldownPercentage}%`;
        }
        
        // Update propulsion display
        const propulsionPercentage = Math.floor((gameState.submarine.propulsion / 2) * 100);
        document.getElementById('propulsion-value').textContent = `${propulsionPercentage}%`;
        
        // Update propulsion gauge
        document.getElementById('propulsion-gauge-fill').style.width = `${Math.abs(propulsionPercentage)}%`;
        
        // Change color for reverse propulsion
        if (gameState.submarine.propulsion < 0) {
            document.getElementById('propulsion-gauge-fill').className = 'gauge-fill reverse';
        } else {
            document.getElementById('propulsion-gauge-fill').className = 'gauge-fill';
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
            document.getElementById('dashboard').appendChild(messageElement);
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