// Main game loop
function gameLoop() {
    try {
        // Get delta time from clock
        const deltaTime = gameState.clock.getDelta();
        
        // Update game physics
        updateGamePhysics(deltaTime);
        
        // Update game logic
        updateGameLogic(deltaTime);
        
        // Update any animation callbacks
        updateAnimations();
        
        // Render the scene
        gameState.renderer.render(gameState.scene, gameState.camera);
        
        // Call the next frame
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('Error in game loop:', error);
    }
}

// Update animation callbacks
function updateAnimations() {
    if (gameState.animations && gameState.animations.length > 0) {
        // Process all animation callbacks
        const remainingAnimations = [];
        
        for (let i = 0; i < gameState.animations.length; i++) {
            const animationCallback = gameState.animations[i];
            
            // Only keep animations that return true (still active)
            if (typeof animationCallback === 'function' && animationCallback()) {
                remainingAnimations.push(animationCallback);
            }
        }
        
        // Replace animations array with remaining active animations
        gameState.animations = remainingAnimations;
    }
} 