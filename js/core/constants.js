// Game constants for submarine game

// Movement constants
export const MOVEMENT_SPEED = 1.5;
export const STRAFE_SPEED = 1.2;      // Side-to-side movement speed
export const ROTATION_SPEED = 0.03;
export const PROPULSION_ACCELERATION = 0.03; // How quickly the submarine accelerates
export const MAX_PROPULSION = 2.0;          // Maximum propulsion speed
export const PROPULSION_DECAY = 0.99;       // How quickly propulsion decays without input
export const GRAVITY = 0.1;                 // Gravity force when submarine is above water

// Environment constants
export const MAX_DEPTH = 500;
export const SURFACE_LEVEL = 10;
export const WORLD_SIZE = 1000;
export const OCEAN_DEPTH = 500;

// Weapon constants
export const TORPEDO_SPEED = 3.0;        // Speed of torpedoes
export const TORPEDO_LIFETIME = 5000;    // Torpedo lifetime in milliseconds
export const TORPEDO_COOLDOWN = 1000;    // Cooldown between torpedo shots in milliseconds

// Control constants
export const MOUSE_SENSITIVITY = 0.2;       // Sensitivity for mouse controls
export const MAX_PITCH_ANGLE = Math.PI/2;  // Increased to 90 degrees (straight down) 