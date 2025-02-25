// 3D Submarine Game using Three.js

// Add error handling
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    alert('Error occurred: ' + event.error.message);
});

// Debug function
function debug(message) {
    console.log('Debug:', message);
}

debug('Script started');

// Game constants
const MOVEMENT_SPEED = 0.5;
const ROTATION_SPEED = 0.03;
const MAX_DEPTH = 500;
const SURFACE_LEVEL = 10;
const WORLD_SIZE = 1000;
const OCEAN_DEPTH = 500;

// Game state
const game = {
    submarine: {
        object: null,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        depth: 0
    },
    camera: {
        main: null,
        followDistance: 25,
        heightOffset: 8,
        lookAtOffset: new THREE.Vector3(0, 0, 10)
    },
    keys: {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        w: false,
        a: false,
        s: false,
        d: false,
        q: false,
        e: false
    },
    scene: null,
    renderer: null,
    clock: new THREE.Clock(),
    collisionObjects: []
};

debug('Game state initialized');

// Initialize Three.js scene
function initScene() {
    debug('Initializing scene');
    try {
        // Create scene
        game.scene = new THREE.Scene();
        // Brighter blue sky background
        game.scene.background = new THREE.Color(0x87CEEB);
        // Reduce fog significantly to see the ocean floor clearly
        game.scene.fog = new THREE.FogExp2(0x40E0D0, 0.0004);

        // Create renderer with improved shadow settings
        game.renderer = new THREE.WebGLRenderer({ antialias: true });
        game.renderer.setPixelRatio(window.devicePixelRatio);
        game.renderer.setSize(window.innerWidth, window.innerHeight);
        game.renderer.shadowMap.enabled = true;
        game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        game.renderer.shadowMap.autoUpdate = true;
        game.renderer.physicallyCorrectLights = true;
        
        // Add renderer to DOM
        const container = document.getElementById('game-canvas');
        if (!container) {
            throw new Error('Could not find game-canvas element');
        }
        container.appendChild(game.renderer.domElement);
        debug('Renderer added to DOM');

        // Create camera
        game.camera.main = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 2000
        );
        game.camera.main.position.set(0, 10, -30); // Position camera behind the submarine (negative Z)
        game.camera.main.lookAt(0, 0, 0);
        
        // Add brighter ambient light
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.9);
        game.scene.add(ambientLight);
        
        // Add stronger directional light (sun) with improved shadow settings
        const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.8);
        sunLight.position.set(100, 100, 100);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048; // Increased for better shadow quality
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -150;
        sunLight.shadow.camera.right = 150;
        sunLight.shadow.camera.top = 150;
        sunLight.shadow.camera.bottom = -150;
        sunLight.shadow.bias = -0.0005; // Reduces shadow acne
        game.scene.add(sunLight);

        // Add underwater light with tropical blue color - reduce intensity
        const underwaterLight = new THREE.PointLight(0x00FFFF, 0.8, 200);
        underwaterLight.position.set(0, -50, 0);
        game.scene.add(underwaterLight);
        
        // Add a strong warm light at the bottom to illuminate the ocean floor
        const floorAmbientLight = new THREE.AmbientLight(0xFFD700, 0.6);
        floorAmbientLight.position.set(0, -OCEAN_DEPTH, 0);
        game.scene.add(floorAmbientLight);
        
        // Add multiple spotlights to illuminate the ocean floor with shadows
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const radius = WORLD_SIZE / 4;
            
            const spotLight = new THREE.SpotLight(0xFFFFAA, 1.0);
            spotLight.position.set(
                Math.cos(angle) * radius, 
                -OCEAN_DEPTH + 100, 
                Math.sin(angle) * radius
            );
            spotLight.target.position.set(
                Math.cos(angle) * radius, 
                -OCEAN_DEPTH, 
                Math.sin(angle) * radius
            );
            spotLight.angle = Math.PI / 3;
            spotLight.penumbra = 0.5;
            spotLight.decay = 1.5;
            spotLight.distance = 300;
            spotLight.castShadow = true;
            spotLight.shadow.mapSize.width = 1024;
            spotLight.shadow.mapSize.height = 1024;
            
            game.scene.add(spotLight);
            game.scene.add(spotLight.target);
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            game.camera.main.aspect = window.innerWidth / window.innerHeight;
            game.camera.main.updateProjectionMatrix();
            game.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Initialize collision objects array
        game.collisionObjects = [];
        
        debug('Scene initialization complete');
    } catch (error) {
        console.error('Error in initScene:', error);
        alert('Error initializing scene: ' + error.message);
    }
}

// Create water surface
function createWaterSurface() {
    debug('Creating water surface');
    try {
        // Create a larger water surface
        const waterGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 64, 64);
        // Make water much more transparent
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x40E0D0,
            transparent: true,
            opacity: 0.3, // Much more transparent to see the ocean floor
            side: THREE.DoubleSide,
            metalness: 0.3,
            roughness: 0.4
        });
        
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0;
        water.receiveShadow = true;
        game.scene.add(water);
        
        // Add a second layer for depth effect - make it very transparent
        const deepWaterGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2);
        const deepWaterMaterial = new THREE.MeshStandardMaterial({
            color: 0x008080, // Darker teal for depth
            transparent: true,
            opacity: 0.2, // Very transparent
            side: THREE.DoubleSide
        });
        
        const deepWater = new THREE.Mesh(deepWaterGeometry, deepWaterMaterial);
        deepWater.rotation.x = -Math.PI / 2;
        deepWater.position.y = -5; // Slightly below the surface
        game.scene.add(deepWater);
        
        // Add waves animation with more pronounced effect
        const vertices = waterGeometry.attributes.position.array;
        const waveAnimation = () => {
            const time = Date.now() * 0.001;
            
            for (let i = 0; i < vertices.length; i += 3) {
                const x = vertices[i];
                const z = vertices[i + 2];
                vertices[i + 1] = Math.sin(x * 0.05 + time) * Math.sin(z * 0.05 + time) * 3;
            }
            
            waterGeometry.attributes.position.needsUpdate = true;
            requestAnimationFrame(waveAnimation);
        };
        
        waveAnimation();
        
        // Add water surface highlight
        const surfaceHighlightGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 1, 1);
        const surfaceHighlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const surfaceHighlight = new THREE.Mesh(surfaceHighlightGeometry, surfaceHighlightMaterial);
        surfaceHighlight.rotation.x = -Math.PI / 2;
        surfaceHighlight.position.y = 0.5; // Slightly above the surface
        game.scene.add(surfaceHighlight);
        
        debug('Water surface created');
    } catch (error) {
        console.error('Error in createWaterSurface:', error);
    }
}

// Create ocean floor
function createOceanFloor() {
    debug('Creating ocean floor');
    try {
        // Create procedural sand texture with a reliable sandy texture
        // Create a procedural sand texture without relying on external URLs
        const sandCanvas = document.createElement('canvas');
        sandCanvas.width = 512;
        sandCanvas.height = 512;
        const ctx = sandCanvas.getContext('2d');
        
        // Fill with base sand color
        ctx.fillStyle = '#E6D5AC';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add sand grain noise
        for (let i = 0; i < 15000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 1.5 + 0.5;
            const shade = Math.random() * 30;
            
            ctx.fillStyle = `rgba(${180 - shade}, ${165 - shade}, ${130 - shade}, 0.5)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add subtle ripples
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const length = Math.random() * 40 + 10;
            const width = Math.random() * 5 + 1;
            const angle = Math.random() * Math.PI;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            const grd = ctx.createLinearGradient(-length/2, 0, length/2, 0);
            grd.addColorStop(0, 'rgba(160, 145, 110, 0)');
            grd.addColorStop(0.5, 'rgba(160, 145, 110, 0.4)');
            grd.addColorStop(1, 'rgba(160, 145, 110, 0)');
            
            ctx.fillStyle = grd;
            ctx.fillRect(-length/2, -width/2, length, width);
            ctx.restore();
        }
        
        // Create texture from canvas
        const sandTexture = new THREE.CanvasTexture(sandCanvas);
        sandTexture.wrapS = THREE.RepeatWrapping;
        sandTexture.wrapT = THREE.RepeatWrapping;
        sandTexture.repeat.set(20, 20);
        
        // Create a bump map for sand
        const bumpCanvas = document.createElement('canvas');
        bumpCanvas.width = 512;
        bumpCanvas.height = 512;
        const bumpCtx = bumpCanvas.getContext('2d');
        
        // Fill with neutral gray (no bump)
        bumpCtx.fillStyle = '#808080';
        bumpCtx.fillRect(0, 0, 512, 512);
        
        // Add bump details
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 3 + 1;
            const bright = Math.random() * 80;
            
            // Make small bumps (lighter = higher)
            bumpCtx.fillStyle = `rgb(${128 + bright}, ${128 + bright}, ${128 + bright})`;
            bumpCtx.beginPath();
            bumpCtx.arc(x, y, size, 0, Math.PI * 2);
            bumpCtx.fill();
        }
        
        // Add ripple bumps
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const length = Math.random() * 60 + 20;
            const width = Math.random() * 6 + 2;
            const angle = Math.random() * Math.PI;
            
            bumpCtx.save();
            bumpCtx.translate(x, y);
            bumpCtx.rotate(angle);
            
            const grd = bumpCtx.createLinearGradient(-length/2, 0, length/2, 0);
            grd.addColorStop(0, 'rgb(128, 128, 128)');
            grd.addColorStop(0.5, 'rgb(180, 180, 180)');
            grd.addColorStop(1, 'rgb(128, 128, 128)');
            
            bumpCtx.fillStyle = grd;
            bumpCtx.fillRect(-length/2, -width/2, length, width);
            bumpCtx.restore();
        }
        
        const sandBumpMap = new THREE.CanvasTexture(bumpCanvas);
        sandBumpMap.wrapS = THREE.RepeatWrapping;
        sandBumpMap.wrapT = THREE.RepeatWrapping;
        sandBumpMap.repeat.set(20, 20);
        
        // First, create a large flat sandy base that covers the entire ocean floor
        const baseFloorGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4);
        const baseFloorMaterial = new THREE.MeshStandardMaterial({
            color: 0xEADAB5, // Light sandy beige
            roughness: 1.0,
            metalness: 0.0, // No metalness for sand
            map: sandTexture,
            bumpMap: sandBumpMap,
            bumpScale: 0.3,
            emissive: 0xEADAB5, // Match base color for subtle light contribution
            emissiveIntensity: 0.05 // Very subtle glow
        });
        
        const baseFloor = new THREE.Mesh(baseFloorGeometry, baseFloorMaterial);
        baseFloor.rotation.x = -Math.PI / 2;
        baseFloor.position.y = -OCEAN_DEPTH - 1; // Slightly below the detailed floor
        baseFloor.receiveShadow = true;
        game.scene.add(baseFloor);
        
        // Create a larger and more detailed ocean floor
        const floorGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 256, 256);
        
        // Create more pronounced height variations for the ocean floor
        const vertices = floorGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            // Create a more varied terrain with hills and valleys
            const x = vertices[i];
            const z = vertices[i + 2];
            const distance = Math.sqrt(x * x + z * z) / 100;
            
            // Combine multiple noise patterns for more natural terrain
            vertices[i + 1] = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15 + 
                             Math.sin(x * 0.1 + z * 0.1) * 5 +
                             Math.cos(distance) * 10 +
                             Math.sin(x * 0.3) * Math.sin(z * 0.2) * 2; // Add more detail
        }
        
        floorGeometry.attributes.position.needsUpdate = true;
        floorGeometry.computeVertexNormals();
        
        // Create a more realistic sandy floor with texture
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xF0E6C8, // Sandy color
            roughness: 0.9,
            metalness: 0.0,
            map: sandTexture,
            bumpMap: sandBumpMap,
            bumpScale: 0.5,
            flatShading: false, // Smoother look
            emissive: 0xF0E6C8, // Match main color
            emissiveIntensity: 0.1 // Subtle glow
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -OCEAN_DEPTH;
        floor.receiveShadow = true;
        game.scene.add(floor);
        
        // Add multiple spotlights pointing at the ocean floor for better visibility
        // Clear existing lights pointing at floor first
        const floorLight = new THREE.SpotLight(0xFFFFFF, 2.0); // Much brighter, whiter light
        floorLight.position.set(0, -OCEAN_DEPTH + 150, 0); 
        floorLight.target.position.set(0, -OCEAN_DEPTH, 0);
        floorLight.angle = Math.PI / 3;
        floorLight.penumbra = 0.5;
        floorLight.decay = 1.0; // Less decay
        floorLight.distance = 400; // Greater distance
        floorLight.castShadow = true;
        floorLight.shadow.mapSize.width = 2048; // Higher resolution shadows
        floorLight.shadow.mapSize.height = 2048;
        floorLight.shadow.bias = -0.0005; // Reduce shadow artifacts
        game.scene.add(floorLight);
        game.scene.add(floorLight.target);
        
        // Add additional spot lights at different angles to enhance visibility
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const offsetX = Math.cos(angle) * 200;
            const offsetZ = Math.sin(angle) * 200;
            
            const additionalLight = new THREE.SpotLight(0xFFFFFF, 1.5);
            additionalLight.position.set(
                offsetX, 
                -OCEAN_DEPTH + 120, 
                offsetZ
            );
            additionalLight.target.position.set(
                offsetX * 0.5, 
                -OCEAN_DEPTH, 
                offsetZ * 0.5
            );
            additionalLight.angle = Math.PI / 4;
            additionalLight.penumbra = 0.7;
            additionalLight.decay = 1.0;
            additionalLight.distance = 400;
            additionalLight.castShadow = true;
            additionalLight.shadow.mapSize.width = 1024;
            additionalLight.shadow.mapSize.height = 1024;
            
            game.scene.add(additionalLight);
            game.scene.add(additionalLight.target);
        }
        
        // Add a strong ambient light at the floor level to ensure it's well-lit
        const floorAmbientLight = new THREE.AmbientLight(0xFFFFFF, 0.8); // Brighter ambient light
        floorAmbientLight.position.set(0, -OCEAN_DEPTH + 50, 0);
        game.scene.add(floorAmbientLight);
        
        // Create large rocks (collidable obstacles only)
        createLargerObstacles();
        
        debug('Realistic sandy ocean floor created');
    } catch (error) {
        console.error('Error in createOceanFloor:', error);
    }
}

// Create larger collidable obstacles
function createLargerObstacles() {
    // Add large rocks that the submarine can't pass through
    for (let i = 0; i < 40; i++) { // Increased rock count
        // Create rock with random size
        const rockSize = Math.random() * 20 + 15;
        const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
        
        // Different rock colors and textures
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0x808080 : 0x707070, // Gray variations
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });
        
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Position rocks randomly on ocean floor
        const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
        const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
        
        rock.position.set(x, -OCEAN_DEPTH + rockSize/2 - 5, z);
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        // Give rocks slight deformation for more natural look
        rock.scale.set(
            1 + Math.random() * 0.3 - 0.15,
            1 + Math.random() * 0.3 - 0.15,
            1 + Math.random() * 0.3 - 0.15
        );
        
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        // Add collision data with increased radius for better collision detection
        rock.userData.isObstacle = true;
        rock.userData.collisionRadius = rockSize * 1.5; // Increased from 1.2 to 1.5
        
        game.scene.add(rock);
        game.collisionObjects.push(rock);
    }
    
    // We've removed the columns/ruins creation code as requested
}

// Create submarine model
function createSubmarine() {
    debug('Creating submarine');
    try {
        // Create a more streamlined military-style submarine
        
        // Create a submarine group
        const submarine = new THREE.Group();
        
        // --- MAIN HULL (longer and more streamlined) ---
        const hullLength = 25; // Increased length
        const hullRadius = 2;
        
        // Main pressure hull
        const mainHullMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2C3539, // Dark naval gray
            metalness: 0.6,
            roughness: 0.4
        });
        
        // Main pressure hull (middle section)
        const mainHullGeometry = new THREE.CylinderGeometry(hullRadius, hullRadius, hullLength * 0.7, 32);
        const mainHull = new THREE.Mesh(mainHullGeometry, mainHullMaterial);
        mainHull.rotation.x = Math.PI / 2; // Align with Z-axis
        
        // Forward hull section (tapered)
        const forwardHullGeometry = new THREE.CylinderGeometry(hullRadius, hullRadius * 0.6, hullLength * 0.2, 32);
        const forwardHull = new THREE.Mesh(forwardHullGeometry, mainHullMaterial);
        forwardHull.rotation.x = Math.PI / 2;
        forwardHull.position.z = hullLength * 0.43;
        
        // Bow section (pointed)
        const bowGeometry = new THREE.ConeGeometry(hullRadius * 0.6, hullLength * 0.1, 32);
        const bow = new THREE.Mesh(bowGeometry, mainHullMaterial);
        bow.rotation.x = -Math.PI / 2;
        bow.position.z = hullLength * 0.58;
        
        // Aft hull section (tapered)
        const aftHullGeometry = new THREE.CylinderGeometry(hullRadius * 0.75, hullRadius, hullLength * 0.15, 32);
        const aftHull = new THREE.Mesh(aftHullGeometry, mainHullMaterial);
        aftHull.rotation.x = Math.PI / 2;
        aftHull.position.z = -hullLength * 0.42;
        
        // Stern section (rounded)
        const sternGeometry = new THREE.SphereGeometry(hullRadius * 0.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const stern = new THREE.Mesh(sternGeometry, mainHullMaterial);
        stern.rotation.x = Math.PI;
        stern.position.z = -hullLength * 0.5;
        
        // --- SIMPLIFIED CONNING TOWER (SAIL) ---
        const towerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1C2529, // Slightly darker than hull
            metalness: 0.6,
            roughness: 0.3
        });
        
        // Streamlined sail shape
        const sailGeometry = new THREE.BoxGeometry(2, 3, 7);
        const sail = new THREE.Mesh(sailGeometry, towerMaterial);
        sail.position.y = hullRadius + 1.5;
        
        // Rounded front of sail
        const sailFrontGeometry = new THREE.CylinderGeometry(1, 1, 3, 16, 1, false, -Math.PI/2, Math.PI);
        const sailFront = new THREE.Mesh(sailFrontGeometry, towerMaterial);
        sailFront.rotation.x = Math.PI / 2;
        sailFront.position.y = hullRadius + 1.5;
        sailFront.position.z = 3.5;
        
        // Single periscope
        const periscopeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const periscopeGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const periscope = new THREE.Mesh(periscopeGeometry, periscopeMaterial);
        periscope.position.y = hullRadius + 4;
        periscope.position.z = 2;
        
        // --- SIMPLIFIED CONTROL SURFACES ---
        const controlSurfaceMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1C2529,
            metalness: 0.5,
            roughness: 0.5
        });
        
        // Forward dive planes
        const bowPlaneGeometry = new THREE.BoxGeometry(5, 0.3, 1.2);
        const bowPlaneLeft = new THREE.Mesh(bowPlaneGeometry, controlSurfaceMaterial);
        bowPlaneLeft.position.x = -2.5;
        bowPlaneLeft.position.z = hullLength * 0.3;
        
        const bowPlaneRight = new THREE.Mesh(bowPlaneGeometry, controlSurfaceMaterial);
        bowPlaneRight.position.x = 2.5;
        bowPlaneRight.position.z = hullLength * 0.3;
        
        // Stern planes
        const sternPlaneGeometry = new THREE.BoxGeometry(6, 0.3, 1.5);
        const sternPlaneLeft = new THREE.Mesh(sternPlaneGeometry, controlSurfaceMaterial);
        sternPlaneLeft.position.x = -3;
        sternPlaneLeft.position.z = -hullLength * 0.3;
        
        const sternPlaneRight = new THREE.Mesh(sternPlaneGeometry, controlSurfaceMaterial);
        sternPlaneRight.position.x = 3;
        sternPlaneRight.position.z = -hullLength * 0.3;
        
        // Single rudder (simplified)
        const rudderGeometry = new THREE.BoxGeometry(0.3, 3, 2);
        const rudder = new THREE.Mesh(rudderGeometry, controlSurfaceMaterial);
        rudder.position.y = 0;
        rudder.position.z = -hullLength * 0.45;
        
        // --- PROPELLER (simplified) ---
        const propellerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xC88A3A, // Bronze color
            metalness: 0.8,
            roughness: 0.2
        });
        
        // Propeller hub
        const propHubGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16);
        const propHub = new THREE.Mesh(propHubGeometry, propellerMaterial);
        propHub.rotation.x = Math.PI / 2;
        propHub.position.z = -hullLength * 0.5 - 0.7;
        
        // Simplified propeller blades
        for (let i = 0; i < 5; i++) {
            const bladeGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.1);
            const blade = new THREE.Mesh(bladeGeometry, propellerMaterial);
            blade.position.z = -0.1;
            blade.rotation.z = (Math.PI * 2 / 5) * i;
            propHub.add(blade);
        }
        
        // --- WINDOWS ---
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3A75C4, 
            transparent: true,
            opacity: 0.7,
            emissive: 0x3A75C4,
            emissiveIntensity: 0.3
        });
        
        // Just 2 windows on the sail
        for (let i = 0; i < 2; i++) {
            const windowGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.1);
            const windowPane = new THREE.Mesh(windowGeometry, windowMaterial);
            windowPane.position.z = 3.5;
            windowPane.position.y = hullRadius + 1.8;
            windowPane.position.x = i * 0.7 - 0.3;
            sail.add(windowPane);
        }
        
        // --- Add all components to submarine group ---
        submarine.add(mainHull);
        submarine.add(forwardHull);
        submarine.add(bow);
        submarine.add(aftHull);
        submarine.add(stern);
        submarine.add(sail);
        submarine.add(sailFront);
        submarine.add(periscope);
        submarine.add(bowPlaneLeft);
        submarine.add(bowPlaneRight);
        submarine.add(sternPlaneLeft);
        submarine.add(sternPlaneRight);
        submarine.add(rudder);
        submarine.add(propHub);
        
        // Just a few subtle weathering effects
        for (let i = 0; i < 8; i++) {
            const weatheringSize = Math.random() * 2 + 1;
            const weatheringGeometry = new THREE.CircleGeometry(weatheringSize, 8);
            const weatheringMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x202020, 
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            
            const weatheringMark = new THREE.Mesh(weatheringGeometry, weatheringMaterial);
            
            // Position randomly on hull
            const angle = Math.random() * Math.PI * 2;
            const heightPos = Math.random() * hullLength - hullLength / 2;
            
            weatheringMark.position.x = Math.cos(angle) * hullRadius;
            weatheringMark.position.y = Math.sin(angle) * hullRadius;
            weatheringMark.position.z = heightPos;
            
            // Align with hull surface
            weatheringMark.lookAt(weatheringMark.position.clone().add(
                new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0)
            ));
            
            submarine.add(weatheringMark);
        }
        
        // Add submarine to scene
        game.scene.add(submarine);
        game.submarine.object = submarine;
        
        // Position submarine and set initial rotation
        submarine.position.set(0, 0, 0);
        submarine.rotation.y = 0; // Submarine directly faces into screen
        
        // Add propeller animation
        const animatePropeller = () => {
            if (!game.gameOver) {
                propHub.rotation.z += 0.1;
                requestAnimationFrame(animatePropeller);
            }
        };
        
        animatePropeller();
        debug('Streamlined submarine created');
    } catch (error) {
        console.error('Error in createSubmarine:', error);
    }
}

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

// Update game state
function update(deltaTime) {
    try {
        // Skip update if game over
        if (game.gameOver) return;
        
        const sub = game.submarine;
        if (!sub.object) return;
        
        // Store previous position for collision detection
        const previousPosition = sub.object.position.clone();
        
        // COMPLETELY REWRITTEN CONTROL SYSTEM
        // ===================================
        
        // 1. Define our control variables
        let moveForward = 0;      // For forward/backward movement (W/S, Up/Down)
        let diveAmount = 0;       // For depth control (Q/E only)
        let rotateAmount = 0;     // For rotation (A/D, Left/Right)
        let rotateX = 0;          // For visual pitch effect
        
        // 2. Clear and direct control mapping
        // Forward/backward movement - ONLY controls movement in the direction the sub is facing
        if (game.keys.w || game.keys.ArrowUp) {
            moveForward = 1;      // Forward
        } else if (game.keys.s || game.keys.ArrowDown) {
            moveForward = -1;     // Backward
        }
        
        // Left/right - ONLY controls rotation
        if (game.keys.a || game.keys.ArrowLeft) {
            rotateAmount = 1;     // Turn left
        } else if (game.keys.d || game.keys.ArrowRight) {
            rotateAmount = -1;    // Turn right
        }
        
        // Up/down - ONLY controls diving/surfacing
        if (game.keys.q) {
            diveAmount = -1;      // Move up (decrease depth)
        } else if (game.keys.e) {
            diveAmount = 1;       // Move down (increase depth)
        }
        
        // 3. Apply rotation (turn submarine)
        sub.object.rotation.y += rotateAmount * ROTATION_SPEED;
        
        // 4. Create visual feedback for diving/surfacing
        if (diveAmount < 0) {
            rotateX = -0.2;       // Nose up when surfacing
        } else if (diveAmount > 0) {
            rotateX = 0.2;        // Nose down when diving
        }
        
        // 5. Apply limited pitch rotation for visual effect
        const targetRotationX = rotateX * 0.3;
        sub.object.rotation.x += (targetRotationX - sub.object.rotation.x) * 0.1;
        
        // 6. Calculate movement direction based on submarine orientation
        // Use negative Z-axis as forward direction (standard in Three.js)
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(sub.object.quaternion);
        
        // 7. Apply forward/backward movement - ONLY in the direction the sub is facing
        sub.object.position.addScaledVector(forwardDirection, moveForward * MOVEMENT_SPEED);
        
        // 8. Apply depth movement - ONLY affects Y-position (depth)
        // This is COMPLETELY SEPARATE from forward/backward movement
        sub.object.position.y += diveAmount * MOVEMENT_SPEED * 0.5;
        
        // 9. Apply buoyancy when near surface
        if (sub.object.position.y < 0) {
            // Underwater - slight buoyancy
            sub.object.position.y += 0.01;
        } else if (sub.object.position.y > SURFACE_LEVEL) {
            // Above surface limit - push down
            sub.object.position.y = SURFACE_LEVEL;
        }
        
        // World boundaries
        const boundaryLimit = WORLD_SIZE / 2 - 50;
        if (sub.object.position.x > boundaryLimit) sub.object.position.x = boundaryLimit;
        if (sub.object.position.x < -boundaryLimit) sub.object.position.x = -boundaryLimit;
        if (sub.object.position.z > boundaryLimit) sub.object.position.z = boundaryLimit;
        if (sub.object.position.z < -boundaryLimit) sub.object.position.z = -boundaryLimit;
        
        // Ocean floor boundary
        if (sub.object.position.y < -OCEAN_DEPTH + 10) {
            sub.object.position.y = -OCEAN_DEPTH + 10;
        }
        
        // IMPROVED COLLISION DETECTION SYSTEM
        // =================================== 
        // Use multiple collision points for more accurate detection
        const hullLength = 25; // Length of submarine (from createSubmarine function)
        const subCollisionRadius = 12; // Increased collision radius to ensure no penetration
        let collisionDetected = false;
        let maxPenetration = 0;
        let strongestRepulsion = null;
        
        // Define collision check points along the submarine hull
        const collisionPoints = [
            // Center point
            sub.object.position.clone(),
            // Front point (bow)
            sub.object.position.clone().addScaledVector(forwardDirection, hullLength * 0.5),
            // Back point (stern)
            sub.object.position.clone().addScaledVector(forwardDirection, -hullLength * 0.5),
            // Top point (conning tower)
            sub.object.position.clone().add(new THREE.Vector3(0, 3, 0)),
            // Left point (port side)
            sub.object.position.clone().add(new THREE.Vector3(-3, 0, 0).applyQuaternion(sub.object.quaternion)),
            // Right point (starboard side)
            sub.object.position.clone().add(new THREE.Vector3(3, 0, 0).applyQuaternion(sub.object.quaternion))
        ];
        
        // Check each obstacle against all collision points
        for (const obstacle of game.collisionObjects) {
            if (obstacle.userData && obstacle.userData.isObstacle) {
                const obstacleWorldPos = new THREE.Vector3();
                obstacle.getWorldPosition(obstacleWorldPos);
                
                // Check each collision point
                for (const point of collisionPoints) {
                    const distance = point.distanceTo(obstacleWorldPos);
                    const minDistance = 2 + obstacle.userData.collisionRadius; // Smaller point radius
                    
                    if (distance < minDistance) {
                        // Calculate penetration depth
                        const penetration = minDistance - distance;
                        
                        if (penetration > maxPenetration) {
                            maxPenetration = penetration;
                            
                            // Get direction away from obstacle
                            const repulsionDirection = new THREE.Vector3()
                                .subVectors(point, obstacleWorldPos)
                                .normalize();
                            
                            // Store strongest repulsion
                            strongestRepulsion = {
                                direction: repulsionDirection,
                                strength: penetration * 1.5 // Stronger repulsion factor
                            };
                        }
                        
                        collisionDetected = true;
                    }
                }
            }
        }
        
        // Apply repulsion if collision detected
        if (collisionDetected) {
            if (strongestRepulsion) {
                // Apply very strong repulsion force
                sub.object.position.addScaledVector(strongestRepulsion.direction, strongestRepulsion.strength);
            } else {
                // Fallback to previous position if no valid repulsion found
                sub.object.position.copy(previousPosition);
            }
        }
        
        // Update camera position to follow submarine
        updateCamera();
        
        // Update depth
        sub.depth = Math.max(0, Math.floor(-sub.object.position.y));
        document.getElementById('depth-value').textContent = sub.depth;
        
    } catch (error) {
        console.error('Error in update:', error);
    }
}

// Update camera position to follow submarine
function updateCamera() {
    try {
        if (!game.submarine.object) return;
        
        // Calculate camera position behind and above submarine
        const sub = game.submarine.object;
        
        // Get submarine's forward direction (consistent with movement direction)
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(sub.quaternion);
        
        // Position camera behind submarine (opposite of forward direction)
        const cameraPosition = new THREE.Vector3();
        cameraPosition.copy(sub.position);
        cameraPosition.addScaledVector(forwardDirection, -game.camera.followDistance); // Negative to go behind
        cameraPosition.y += game.camera.heightOffset;
        
        // Set camera position
        game.camera.main.position.copy(cameraPosition);
        
        // Calculate look-at position (ahead of submarine in the direction it's facing)
        const lookAtPosition = new THREE.Vector3();
        lookAtPosition.copy(sub.position);
        // Look slightly ahead of submarine
        lookAtPosition.addScaledVector(forwardDirection, 5);
        
        // Make camera look at submarine
        game.camera.main.lookAt(lookAtPosition);
    } catch (error) {
        console.error('Error in updateCamera:', error);
    }
}

// Initialize game
function initGame() {
    debug('Initializing game');
    try {
        // Clear previous game state
        if (game.scene) {
            // Remove all objects from scene
            while (game.scene.children.length > 0) {
                game.scene.remove(game.scene.children[0]);
            }
        }
        
        // Reset game state
        game.submarine.position = new THREE.Vector3(0, 0, 0);
        game.submarine.rotation = new THREE.Euler(0, 0, 0);
        game.submarine.velocity = new THREE.Vector3(0, 0, 0);
        game.submarine.depth = 0;
        game.gameOver = false;
        
        // Update UI
        document.getElementById('depth-value').textContent = game.depth;
        
        // Hide score display since we've removed scoring
        const scoreDisplay = document.querySelector('.score-display');
        if (scoreDisplay) {
            scoreDisplay.style.display = 'none';
        }
        
        // Initialize scene if first time
        if (!game.scene) {
            initScene();
        }
        
        // Create environment
        createWaterSurface();
        createOceanFloor();
        createSubmarine();
        
        // Start game loop
        if (!game.clock.running) {
            game.clock.start();
        } else {
            game.clock.elapsedTime = 0;
        }
        
        // Start animation
        animate();
        debug('Game initialized');
    } catch (error) {
        console.error('Error in initGame:', error);
        alert('Error initializing game: ' + error.message);
    }
}

// Animation loop
function animate() {
    try {
        if (game.gameOver) {
            // Slow down animation when game over
            setTimeout(() => requestAnimationFrame(animate), 100);
        } else {
            requestAnimationFrame(animate);
        }
        
        const deltaTime = game.clock.getDelta();
        update(deltaTime);
        
        // Render scene
        if (game.renderer && game.scene && game.camera.main) {
            game.renderer.render(game.scene, game.camera.main);
        }
    } catch (error) {
        console.error('Error in animate:', error);
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    debug('DOM loaded, starting game');
    setTimeout(initGame, 100); // Small delay to ensure everything is loaded
}); 