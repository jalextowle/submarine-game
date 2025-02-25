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
        targetYaw: 0,                 // Target yaw angle
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
    updateUI: null               // Function to update UI
};

// Function to reset game state
export function resetGameState() {
    gameState.submarine.position = new THREE.Vector3(0, 0, 0);
    gameState.submarine.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    gameState.submarine.velocity = new THREE.Vector3(0, 0, 0);
    gameState.submarine.depth = 0;
    gameState.submarine.propulsion = 0;
    gameState.submarine.targetPitch = 0;
    gameState.submarine.targetYaw = 0;
    gameState.submarine.mouseControlActive = false;
    gameState.submarine.isAirborne = false;
    
    gameState.collisionObjects = [];
    gameState.torpedoes = [];
    gameState.explosions = [];
    gameState.gameOver = false;
    
    // Reset the clock if it exists
    if (gameState.clock) {
        if (gameState.clock.running) {
            gameState.clock.elapsedTime = 0;
        } else {
            gameState.clock.start();
        }
    }
}

// Export game state as default
export default gameState; 