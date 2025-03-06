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
            
            <h3>Guided Torpedoes</h3>
            <p>1. Point at a shark to begin target tracking (red ring)</p>
            <p>2. Wait for the targeting ring to turn green (target locked)</p>
            <p>3. Fire a guided torpedo with Space</p>
            <p>The torpedo will automatically track and intercept the shark!</p>
            
            <h3>Shark Behavior</h3>
            <p>Sharks have different movement patterns:</p>
            <p>• <strong>Straight:</strong> Move in a mostly straight line</p>
            <p>• <strong>Gentle Turn:</strong> Follow a smooth curved path</p>
            <p>• <strong>Circling:</strong> Circle around your submarine</p>
            <p>• <strong>Zig-Zag:</strong> Move in a zig-zag pattern</p>
            
            <h3>Debug Controls</h3>
            <p><strong>B:</strong> Toggle simple biome map</p>
            <p><strong>Shift+B:</strong> Toggle enhanced biome map</p>
            <p><strong>1/2/3:</strong> Change biome distribution (Large/Medium/Small)</p>
            <p><strong>T:</strong> Toggle terrain debug</p>
        </div>
    `;
    document.body.appendChild(instructions);
    
    // Add instructions toggle with H key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'h' || e.key === 'H') {
            instructions.classList.toggle('visible');
        }
    });
    
    // Keep instructions visible longer initially due to more information
    setTimeout(() => {
        instructions.classList.remove('visible');
    }, 15000);
    
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