// Game state management

// Import required libraries
import * as THREE from 'three';

// Create game state object
const gameState = {
    submarine: {
        object: null,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        depth: 0,
        lastTorpedoTime: 0,
        propulsion: 0,                // Current propulsion level (-1 to 1)
        targetPitch: 0,               // Target pitch angle
        targetYaw: Math.PI,           // Target yaw angle - start facing away from camera
        mouseControlActive: false,     // Whether mouse control is currently active
        rotationOrder: 'YXZ',           // Added for rotation order
        isAirborne: false              // Flag to track if submarine is above water
    },
    camera: {
        main: null,
        followDistance: 25,
        heightOffset: 8,
        lookAtOffset: new THREE.Vector3(0, 0, 10)
    },
    keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        " ": false
    },
    mouse: {
        x: 0,
        y: 0,
        movementX: 0,
        movementY: 0,
        leftButton: false,
        rightButton: false
    },
    scene: null,
    renderer: null,
    clock: new THREE.Clock(),
    collisionObjects: [],
    torpedoes: [],               // Array to store active torpedoes
    explosions: [],              // Array to store active explosions
    gameOver: false,             // Game over state
    updateUI: null,               // Function to update UI
    frameCount: 0,               // Added to track frame count for optimization
    performanceSettings: {
        lowQualityExplosions: false,   // Changed to false to ensure effects are visible
        disableExplosionLights: false, // Changed to false to ensure visual feedback
        maxSimultaneousExplosions: 4   // Increased to 4 for better visual experience
    },
    chunkSystem: null,
    currentChunk: { x: 0, z: 0 },
    messageSystem: {
        messages: [],
        addMessage: function(text, duration = 3000) {
            const message = { text, created: Date.now(), duration };
            this.messages.push(message);
            
            // Create or update message display
            this.updateMessageDisplay();
            
            // Remove message after duration
            setTimeout(() => {
                this.messages = this.messages.filter(m => m !== message);
                this.updateMessageDisplay();
            }, duration);
        },
        
        updateMessageDisplay: function() {
            // Get or create message container
            let container = document.getElementById('game-messages');
            if (!container) {
                container = document.createElement('div');
                container.id = 'game-messages';
                container.style.position = 'absolute';
                container.style.top = '20px';
                container.style.left = '20px';
                container.style.color = 'white';
                container.style.fontFamily = 'Arial, sans-serif';
                container.style.fontSize = '16px';
                container.style.zIndex = '1000';
                document.body.appendChild(container);
            }
            
            // Update container content
            container.innerHTML = '';
            this.messages.forEach(message => {
                const messageEl = document.createElement('div');
                messageEl.textContent = message.text;
                messageEl.style.marginBottom = '8px';
                messageEl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                messageEl.style.padding = '6px 12px';
                messageEl.style.borderRadius = '4px';
                container.appendChild(messageEl);
            });
        }
    }
};

// Function to reset game state
export function resetGameState() {
    gameState.submarine.position = new THREE.Vector3(0, 0, 0);
    gameState.submarine.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    gameState.submarine.velocity = new THREE.Vector3(0, 0, 0);
    gameState.submarine.depth = 0;
    gameState.submarine.propulsion = 0;
    gameState.submarine.targetPitch = 0;
    gameState.submarine.targetYaw = Math.PI; // Reset to face away from camera
    gameState.submarine.mouseControlActive = false;
    gameState.submarine.isAirborne = false;
    
    gameState.collisionObjects = [];
    gameState.torpedoes = [];
    gameState.explosions = [];
    gameState.gameOver = false;
    gameState.frameCount = 0; // Reset frame counter
    
    // Reset the clock if it exists
    if (gameState.clock) {
        if (gameState.clock.running) {
            gameState.clock.elapsedTime = 0;
        } else {
            gameState.clock.start();
        }
    }
    
    // Clear all chunks if using chunk system
    if (gameState.chunkSystem) {
        gameState.chunkSystem.clear();
        gameState.currentChunk = { x: 0, z: 0 };
    }
    
    // Reset torpedo targeting if available
    import('../submarine/torpedo.js').then(module => {
        if (module.resetTargeting) {
            module.resetTargeting();
        }
    }).catch(error => {
        console.error('Error importing torpedo module for reset:', error);
    });
}

// Export game state as default
export default gameState; 