// Submarine Game Logic

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Ensure canvas is properly sized
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game constants
const SUBMARINE_WIDTH = 100;
const SUBMARINE_HEIGHT = 40;
const MOVEMENT_SPEED = 3;
const VERTICAL_SPEED = 2;
const MAX_DEPTH = 500;
const OXYGEN_DEPLETION_RATE = 0.05;
const OXYGEN_REFILL_RATE = 0.2;
const SURFACE_LEVEL = 50;
const TREASURE_SIZE = 20;
const TREASURE_SPAWN_RATE = 0.005;

// Game state
const game = {
    submarine: {
        x: canvas.width / 2 - SUBMARINE_WIDTH / 2,
        y: SURFACE_LEVEL,
        width: SUBMARINE_WIDTH,
        height: SUBMARINE_HEIGHT,
        velocityX: 0,
        velocityY: 0,
        oxygen: 100,
        depth: 0
    },
    keys: {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        w: false,
        a: false,
        s: false,
        d: false
    },
    bubbles: [],
    seaFloor: {
        y: canvas.height - 50,
        segments: []
    },
    seaObjects: [],
    treasures: [],
    score: 0,
    gameOver: false
};

// Generate sea floor segments
function generateSeaFloor() {
    const segments = [];
    const segmentWidth = 50;
    const numSegments = Math.ceil(canvas.width / segmentWidth) + 1;
    
    for (let i = 0; i < numSegments; i++) {
        const height = Math.random() * 30 + 20;
        segments.push({
            x: i * segmentWidth,
            width: segmentWidth,
            height: height
        });
    }
    
    game.seaFloor.segments = segments;
}

// Generate sea objects (rocks, plants, etc.)
function generateSeaObjects() {
    const numObjects = 15;
    const objects = [];
    
    for (let i = 0; i < numObjects; i++) {
        const type = Math.random() > 0.5 ? 'rock' : 'plant';
        const size = Math.random() * 30 + 20;
        
        objects.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height - SURFACE_LEVEL - 100) + SURFACE_LEVEL + 50,
            width: size,
            height: size,
            type: type
        });
    }
    
    game.seaObjects = objects;
}

// Initialize game objects
function initGame() {
    // Reset game state
    game.submarine = {
        x: canvas.width / 2 - SUBMARINE_WIDTH / 2,
        y: SURFACE_LEVEL,
        width: SUBMARINE_WIDTH,
        height: SUBMARINE_HEIGHT,
        velocityX: 0,
        velocityY: 0,
        oxygen: 100,
        depth: 0
    };
    
    game.bubbles = [];
    game.treasures = [];
    game.score = 0;
    game.gameOver = false;
    
    // Update UI
    document.getElementById('score-value').textContent = game.score;
    document.getElementById('depth-value').textContent = game.depth;
    document.getElementById('oxygen-bar').style.width = '100%';
    
    // Hide game over screen if visible
    const gameOverScreen = document.getElementById('game-over');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
    }
    
    // Generate environment
    generateSeaFloor();
    generateSeaObjects();
}

// Initialize game
initGame();

// Event listeners for keyboard input
window.addEventListener('keydown', (e) => {
    if (game.keys.hasOwnProperty(e.key)) {
        game.keys[e.key] = true;
    }
    
    // Restart game with 'R' key when game over
    if (e.key === 'r' && game.gameOver) {
        initGame();
    }
});

window.addEventListener('keyup', (e) => {
    if (game.keys.hasOwnProperty(e.key)) {
        game.keys[e.key] = false;
    }
});

// Create bubbles
function createBubble() {
    if (game.submarine.y > SURFACE_LEVEL) {
        game.bubbles.push({
            x: game.submarine.x + Math.random() * SUBMARINE_WIDTH,
            y: game.submarine.y,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 1
        });
    }
}

// Create treasure
function createTreasure() {
    const treasureTypes = ['gold', 'silver', 'gem'];
    const type = treasureTypes[Math.floor(Math.random() * treasureTypes.length)];
    
    let value;
    let color;
    
    switch(type) {
        case 'gold':
            value = 100;
            color = '#FFD700';
            break;
        case 'silver':
            value = 50;
            color = '#C0C0C0';
            break;
        case 'gem':
            value = 200;
            color = '#00FFFF';
            break;
    }
    
    game.treasures.push({
        x: Math.random() * (canvas.width - TREASURE_SIZE),
        y: Math.random() * (canvas.height - SURFACE_LEVEL - 100) + SURFACE_LEVEL + 50,
        size: TREASURE_SIZE,
        type: type,
        value: value,
        color: color,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.05
    });
}

// Check collision between two objects
function checkCollision(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.size &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.size &&
        obj1.y + obj1.height > obj2.y
    );
}

// Show game over screen
function showGameOver() {
    // Create game over screen if it doesn't exist
    let gameOverScreen = document.getElementById('game-over');
    
    if (!gameOverScreen) {
        gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over';
        gameOverScreen.className = 'game-over';
        
        const gameOverContent = `
            <h2>Game Over</h2>
            <p>Your submarine ran out of oxygen!</p>
            <p>Final Score: <span id="final-score">${game.score}</span></p>
            <button id="restart-button">Restart Game</button>
            <p class="restart-hint">Or press 'R' to restart</p>
        `;
        
        gameOverScreen.innerHTML = gameOverContent;
        document.querySelector('.game-container').appendChild(gameOverScreen);
        
        // Add event listener to restart button
        document.getElementById('restart-button').addEventListener('click', initGame);
    } else {
        // Update final score
        document.getElementById('final-score').textContent = game.score;
        gameOverScreen.style.display = 'flex';
    }
}

// Update game state
function update() {
    // Skip update if game over
    if (game.gameOver) return;
    
    // Handle submarine movement
    const sub = game.submarine;
    
    // Horizontal movement
    if (game.keys.ArrowLeft || game.keys.a) {
        sub.velocityX = -MOVEMENT_SPEED;
    } else if (game.keys.ArrowRight || game.keys.d) {
        sub.velocityX = MOVEMENT_SPEED;
    } else {
        // Apply friction
        sub.velocityX *= 0.9;
    }
    
    // Vertical movement
    if ((game.keys.ArrowUp || game.keys.w) && sub.y > SURFACE_LEVEL) {
        sub.velocityY = -VERTICAL_SPEED;
    } else if (game.keys.ArrowDown || game.keys.s) {
        sub.velocityY = VERTICAL_SPEED;
    } else {
        // Apply buoyancy (slight upward force when underwater)
        if (sub.y > SURFACE_LEVEL) {
            sub.velocityY *= 0.9;
            sub.velocityY -= 0.1;
        } else {
            sub.velocityY = 0;
        }
    }
    
    // Update submarine position
    sub.x += sub.velocityX;
    sub.y += sub.velocityY;
    
    // Boundary checks
    if (sub.x < 0) sub.x = 0;
    if (sub.x + sub.width > canvas.width) sub.x = canvas.width - sub.width;
    if (sub.y < SURFACE_LEVEL) sub.y = SURFACE_LEVEL;
    
    // Check for sea floor collision
    const floorSegment = game.seaFloor.segments.find(seg => 
        sub.x + sub.width > seg.x && sub.x < seg.x + seg.width
    );
    
    if (floorSegment) {
        const floorY = canvas.height - floorSegment.height;
        if (sub.y + sub.height > floorY) {
            sub.y = floorY - sub.height;
            sub.velocityY = 0;
        }
    }
    
    // Update depth
    sub.depth = Math.max(0, Math.floor(sub.y - SURFACE_LEVEL));
    document.getElementById('depth-value').textContent = sub.depth;
    
    // Update oxygen
    if (sub.y > SURFACE_LEVEL) {
        sub.oxygen = Math.max(0, sub.oxygen - OXYGEN_DEPLETION_RATE);
    } else {
        sub.oxygen = Math.min(100, sub.oxygen + OXYGEN_REFILL_RATE);
    }
    
    document.getElementById('oxygen-bar').style.width = `${sub.oxygen}%`;
    
    // Check for oxygen depletion (game over)
    if (sub.oxygen <= 0) {
        game.gameOver = true;
        showGameOver();
    }
    
    // Update bubbles
    if (Math.random() < 0.1 && sub.y > SURFACE_LEVEL) {
        createBubble();
    }
    
    game.bubbles.forEach((bubble, index) => {
        bubble.y -= bubble.speed;
        
        // Remove bubbles that reach the surface
        if (bubble.y < SURFACE_LEVEL) {
            game.bubbles.splice(index, 1);
        }
    });
    
    // Spawn treasures
    if (Math.random() < TREASURE_SPAWN_RATE && sub.y > SURFACE_LEVEL) {
        createTreasure();
    }
    
    // Update treasures
    game.treasures.forEach((treasure, index) => {
        // Rotate treasures
        treasure.rotation += treasure.rotationSpeed;
        
        // Check for collision with submarine
        if (checkCollision(sub, treasure)) {
            // Add to score
            game.score += treasure.value;
            
            // Update score display
            document.getElementById('score-value').textContent = game.score;
            
            // Remove collected treasure
            game.treasures.splice(index, 1);
        }
    });
}

// Render game objects
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw water surface
    ctx.fillStyle = '#0077be';
    ctx.fillRect(0, SURFACE_LEVEL, canvas.width, canvas.height - SURFACE_LEVEL);
    
    // Draw surface waves
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let x = 0; x < canvas.width; x += 20) {
        const waveHeight = Math.sin(x * 0.05 + Date.now() * 0.002) * 5;
        if (x === 0) {
            ctx.moveTo(x, SURFACE_LEVEL + waveHeight);
        } else {
            ctx.lineTo(x, SURFACE_LEVEL + waveHeight);
        }
    }
    
    ctx.stroke();
    
    // Draw sea objects
    game.seaObjects.forEach(obj => {
        if (obj.type === 'rock') {
            ctx.fillStyle = '#555555';
            ctx.beginPath();
            ctx.ellipse(obj.x, obj.y, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (obj.type === 'plant') {
            ctx.fillStyle = '#00aa00';
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y + obj.height);
            ctx.quadraticCurveTo(
                obj.x + obj.width / 2, 
                obj.y - obj.height / 2,
                obj.x + obj.width, 
                obj.y + obj.height
            );
            ctx.fill();
        }
    });
    
    // Draw treasures
    game.treasures.forEach(treasure => {
        ctx.save();
        ctx.translate(treasure.x + treasure.size / 2, treasure.y + treasure.size / 2);
        ctx.rotate(treasure.rotation);
        
        // Draw treasure based on type
        ctx.fillStyle = treasure.color;
        
        if (treasure.type === 'gem') {
            // Draw diamond shape
            ctx.beginPath();
            ctx.moveTo(0, -treasure.size / 2);
            ctx.lineTo(treasure.size / 2, 0);
            ctx.lineTo(0, treasure.size / 2);
            ctx.lineTo(-treasure.size / 2, 0);
            ctx.closePath();
            ctx.fill();
            
            // Add sparkle
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-treasure.size / 4, -treasure.size / 4, treasure.size / 10, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw coin
            ctx.beginPath();
            ctx.arc(0, 0, treasure.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Add detail to coin
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, treasure.size / 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    });
    
    // Draw sea floor
    ctx.fillStyle = '#553300';
    game.seaFloor.segments.forEach(segment => {
        ctx.fillRect(
            segment.x, 
            canvas.height - segment.height, 
            segment.width, 
            segment.height
        );
    });
    
    // Draw bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    game.bubbles.forEach(bubble => {
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw submarine
    const sub = game.submarine;
    
    // Submarine body
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.ellipse(
        sub.x + sub.width / 2, 
        sub.y + sub.height / 2, 
        sub.width / 2, 
        sub.height / 2, 
        0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Submarine window
    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.arc(
        sub.x + sub.width * 0.7, 
        sub.y + sub.height / 2, 
        sub.height / 4, 
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Submarine propeller
    ctx.fillStyle = '#333333';
    ctx.fillRect(
        sub.x - 5, 
        sub.y + sub.height / 2 - 5, 
        10, 
        10
    );
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop(); 