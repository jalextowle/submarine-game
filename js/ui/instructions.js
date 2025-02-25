// Game instructions UI

import { debug } from '../core/debug.js';

// Create and display game instructions
export function createInstructions() {
    debug('Creating game instructions');
    
    // Update instructions element with simplified controls
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
    
    // Add instructions toggle with H key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'h' || e.key === 'H') {
            instructions.classList.toggle('visible');
        }
    });
    
    // Auto-hide instructions after 10 seconds
    setTimeout(() => {
        instructions.classList.remove('visible');
    }, 10000);
    
    // Initially show instructions
    instructions.classList.add('visible');
    
    debug('Game instructions created');
}

// Hide instructions
export function hideInstructions() {
    const instructions = document.getElementById('instructions');
    if (instructions) {
        instructions.classList.remove('visible');
    }
}

// Show instructions
export function showInstructions() {
    const instructions = document.getElementById('instructions');
    if (instructions) {
        instructions.classList.add('visible');
    }
} 