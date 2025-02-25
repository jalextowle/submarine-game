// Legacy game.js file - now imports from modular structure
// This file is kept for backwards compatibility

import { initGame } from './main.js';

// Initialize the game when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Legacy game.js loaded, redirecting to modular structure...');
    initGame();
}); 