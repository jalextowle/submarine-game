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
const TREASURE_SPAWN_RATE = 0.005;
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
        followDistance: 15,
        heightOffset: 5,
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
    treasures: [],
    seaObjects: [],
    score: 0,
    gameOver: false,
    clock: new THREE.Clock()
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

        // Create renderer
        game.renderer = new THREE.WebGLRenderer({ antialias: true });
        game.renderer.setPixelRatio(window.devicePixelRatio);
        game.renderer.setSize(window.innerWidth, window.innerHeight);
        game.renderer.shadowMap.enabled = true;
        game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
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
        game.camera.main.position.set(0, 10, 30);
        game.camera.main.lookAt(0, 0, 0);
        
        // Add brighter ambient light
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.9);
        game.scene.add(ambientLight);
        
        // Add stronger directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.8);
        sunLight.position.set(100, 100, 100);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        game.scene.add(sunLight);

        // Add underwater light with tropical blue color - reduce intensity
        const underwaterLight = new THREE.PointLight(0x00FFFF, 0.8, 200);
        underwaterLight.position.set(0, -50, 0);
        game.scene.add(underwaterLight);
        
        // Add a strong warm light at the bottom to illuminate the ocean floor
        const floorAmbientLight = new THREE.AmbientLight(0xFFD700, 0.6);
        floorAmbientLight.position.set(0, -OCEAN_DEPTH, 0);
        game.scene.add(floorAmbientLight);
        
        // Add multiple spotlights to illuminate the ocean floor
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
            
            game.scene.add(spotLight);
            game.scene.add(spotLight.target);
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            game.camera.main.aspect = window.innerWidth / window.innerHeight;
            game.camera.main.updateProjectionMatrix();
            game.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
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

// Create clouds in the sky
function createClouds() {
    debug('Creating clouds');
    try {
        // Create several cloud clusters
        for (let i = 0; i < 15; i++) {
            const cloudGroup = new THREE.Group();
            
            // Each cloud is made of several spheres clustered together
            const numPuffs = Math.floor(Math.random() * 5) + 3;
            const cloudSize = Math.random() * 30 + 20;
            
            for (let j = 0; j < numPuffs; j++) {
                const puffSize = Math.random() * (cloudSize / 2) + (cloudSize / 4);
                const cloudGeometry = new THREE.SphereGeometry(puffSize, 7, 7);
                const cloudMaterial = new THREE.MeshStandardMaterial({
                    color: 0xFFFFFF,
                    transparent: true,
                    opacity: 0.9,
                    roughness: 1,
                    metalness: 0
                });
                
                const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
                
                // Position puffs relative to each other to form a cloud
                puff.position.set(
                    (Math.random() - 0.5) * cloudSize,
                    (Math.random() - 0.5) * (cloudSize / 3),
                    (Math.random() - 0.5) * cloudSize
                );
                
                cloudGroup.add(puff);
            }
            
            // Position the cloud in the sky
            cloudGroup.position.set(
                (Math.random() - 0.5) * WORLD_SIZE,
                100 + Math.random() * 50,
                (Math.random() - 0.5) * WORLD_SIZE
            );
            
            // Add some random rotation to each cloud
            cloudGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Add cloud movement data
            cloudGroup.userData = {
                speed: Math.random() * 0.05 + 0.02,
                direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
            };
            
            game.scene.add(cloudGroup);
            game.seaObjects.push(cloudGroup); // We'll use seaObjects to update them
        }
        
        debug('Clouds created');
    } catch (error) {
        console.error('Error in createClouds:', error);
    }
}

// Create ocean floor
function createOceanFloor() {
    debug('Creating ocean floor');
    try {
        // First, create a large flat sandy base that covers the entire ocean floor
        const baseFloorGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4);
        const baseFloorMaterial = new THREE.MeshStandardMaterial({
            color: 0xE6C78F, // Sandy color
            roughness: 1.0,
            metalness: 0.0,
            emissive: 0x553311,
            emissiveIntensity: 0.2
        });
        
        const baseFloor = new THREE.Mesh(baseFloorGeometry, baseFloorMaterial);
        baseFloor.rotation.x = -Math.PI / 2;
        baseFloor.position.y = -OCEAN_DEPTH - 1; // Slightly below the detailed floor
        baseFloor.receiveShadow = true;
        game.scene.add(baseFloor);
        
        // Create a larger and more detailed ocean floor
        const floorGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 128, 128);
        
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
                             Math.cos(distance) * 10;
        }
        
        floorGeometry.attributes.position.needsUpdate = true;
        floorGeometry.computeVertexNormals();
        
        // Create a more realistic sandy floor with much more distinct coloring
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xF0D090, // Brighter, more distinct sandy color
            roughness: 1.0,
            metalness: 0.0,
            flatShading: true,
            emissive: 0x553311, // Warm glow to enhance visibility
            emissiveIntensity: 0.2
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -OCEAN_DEPTH;
        floor.receiveShadow = true;
        game.scene.add(floor);
        
        // Add a spotlight pointing at the ocean floor for better visibility
        const floorLight = new THREE.SpotLight(0xFFFFAA, 1.5);
        floorLight.position.set(0, -OCEAN_DEPTH + 100, 0);
        floorLight.target.position.set(0, -OCEAN_DEPTH, 0);
        floorLight.angle = Math.PI / 3;
        floorLight.penumbra = 0.5;
        floorLight.decay = 1.5;
        floorLight.distance = 300;
        game.scene.add(floorLight);
        game.scene.add(floorLight.target);
        
        // Add sand ripple texture using small bumps with higher contrast
        for (let i = 0; i < 2000; i++) {
            const bumpSize = Math.random() * 3 + 1;
            const bumpGeometry = new THREE.SphereGeometry(bumpSize, 4, 4, 0, Math.PI * 2, 0, Math.PI / 2);
            
            // Use more contrasting colors for sand bumps
            const sandColors = [0xD2B48C, 0xC2A278, 0xE6C78F, 0xF5DEB3, 0xFFDEAD];
            const bumpColor = sandColors[Math.floor(Math.random() * sandColors.length)];
            
            const bumpMaterial = new THREE.MeshStandardMaterial({
                color: bumpColor,
                roughness: 1.0,
                metalness: 0.0
            });
            
            const bump = new THREE.Mesh(bumpGeometry, bumpMaterial);
            
            // Position bumps randomly on ocean floor
            const x = Math.random() * WORLD_SIZE * 1.8 - WORLD_SIZE * 0.9;
            const z = Math.random() * WORLD_SIZE * 1.8 - WORLD_SIZE * 0.9;
            
            // Get height at this position (approximate)
            const xIndex = Math.floor((x + WORLD_SIZE) / (WORLD_SIZE * 2) * 128);
            const zIndex = Math.floor((z + WORLD_SIZE) / (WORLD_SIZE * 2) * 128);
            const sampleIndex = (zIndex * 128 + xIndex) * 3 + 1;
            let height = 0;
            
            if (sampleIndex >= 0 && sampleIndex < vertices.length) {
                height = vertices[sampleIndex];
            }
            
            bump.position.set(x, -OCEAN_DEPTH + height + bumpSize * 0.5, z);
            bump.rotation.set(
                Math.PI / 2 + Math.random() * 0.2 - 0.1,
                Math.random() * Math.PI * 2,
                0
            );
            bump.scale.set(1, 0.3, 1); // Flatten the bump
            
            game.scene.add(bump);
        }
        
        // Add sand ripple patterns
        for (let i = 0; i < 300; i++) {
            const rippleWidth = Math.random() * 20 + 10;
            const rippleDepth = Math.random() * 5 + 2;
            
            const rippleGeometry = new THREE.PlaneGeometry(rippleWidth, rippleDepth, 1, 1);
            const rippleMaterial = new THREE.MeshStandardMaterial({
                color: 0xD2B48C, // Tan color for ripples
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            
            const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
            
            // Position ripples randomly on ocean floor
            const x = Math.random() * WORLD_SIZE * 1.5 - WORLD_SIZE * 0.75;
            const z = Math.random() * WORLD_SIZE * 1.5 - WORLD_SIZE * 0.75;
            
            ripple.position.set(x, -OCEAN_DEPTH + 0.5, z);
            ripple.rotation.set(
                Math.PI / 2 + (Math.random() * 0.2 - 0.1),
                Math.random() * Math.PI * 2,
                0
            );
            
            game.scene.add(ripple);
        }
        
        // Add some larger sand dunes for extra detail - make them more prominent
        for (let i = 0; i < 60; i++) {
            const duneGeometry = new THREE.SphereGeometry(
                Math.random() * 40 + 30, // Larger size
                8, 8, // Segments
                0, Math.PI * 2, 
                0, Math.PI / 2 // Half sphere
            );
            
            const duneMaterial = new THREE.MeshStandardMaterial({
                color: 0xEEDFCC, // Slightly different sand color
                roughness: 1.0,
                metalness: 0.0,
                flatShading: true
            });
            
            const dune = new THREE.Mesh(duneGeometry, duneMaterial);
            
            // Position dunes randomly on ocean floor
            const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            
            dune.position.set(x, -OCEAN_DEPTH + 2, z);
            dune.rotation.set(
                Math.PI / 2 + Math.random() * 0.2 - 0.1,
                Math.random() * Math.PI * 2,
                0
            );
            dune.scale.set(1, 0.25, 1); // Flatten the dune more
            
            game.scene.add(dune);
        }
        
        // Add some scattered shells and small rocks with more contrast
        for (let i = 0; i < 200; i++) {
            let geometry, material, scale;
            
            if (Math.random() > 0.6) {
                // Shell
                geometry = new THREE.TorusGeometry(2, 1, 8, 12, Math.PI);
                material = new THREE.MeshStandardMaterial({
                    color: Math.random() > 0.5 ? 0xFFFAF0 : 0xFFE4C4, // Shell colors
                    roughness: 0.7,
                    metalness: 0.3,
                    emissive: 0xFFE4C4,
                    emissiveIntensity: 0.1
                });
                scale = Math.random() * 0.8 + 0.5; // Larger shells
            } else {
                // Small rock
                geometry = new THREE.DodecahedronGeometry(2, 0);
                material = new THREE.MeshStandardMaterial({
                    color: 0x808080, // Gray
                    roughness: 0.9,
                    metalness: 0.1
                });
                scale = Math.random() * 1.0 + 0.5; // Larger rocks
            }
            
            const object = new THREE.Mesh(geometry, material);
            
            // Position objects randomly on ocean floor
            const x = Math.random() * WORLD_SIZE * 1.5 - WORLD_SIZE * 0.75;
            const z = Math.random() * WORLD_SIZE * 1.5 - WORLD_SIZE * 0.75;
            
            object.position.set(x, -OCEAN_DEPTH + 2, z);
            object.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            object.scale.set(scale, scale, scale);
            
            game.scene.add(object);
        }
        
        // Add some starfish for color contrast
        for (let i = 0; i < 40; i++) {
            const starfishGeometry = new THREE.CircleGeometry(5, 5);
            
            // Bright starfish colors
            const starfishColors = [0xFF4500, 0xFF6347, 0xFF7F50, 0xFFA07A];
            const starfishColor = starfishColors[Math.floor(Math.random() * starfishColors.length)];
            
            const starfishMaterial = new THREE.MeshStandardMaterial({
                color: starfishColor,
                roughness: 0.8,
                metalness: 0.2,
                emissive: starfishColor,
                emissiveIntensity: 0.2,
                side: THREE.DoubleSide
            });
            
            const starfish = new THREE.Mesh(starfishGeometry, starfishMaterial);
            
            // Position starfish on ocean floor
            const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            
            starfish.position.set(x, -OCEAN_DEPTH + 1, z);
            starfish.rotation.set(
                Math.PI / 2 + (Math.random() * 0.3 - 0.15),
                0,
                Math.random() * Math.PI * 2
            );
            
            game.scene.add(starfish);
        }
        
        debug('Ocean floor created');
    } catch (error) {
        console.error('Error in createOceanFloor:', error);
    }
}

// Create submarine model
function createSubmarine() {
    debug('Creating submarine');
    try {
        // Create submarine body (using cylinder instead of capsule)
        const bodyGeometry = new THREE.CylinderGeometry(2, 2, 6, 16);
        // Bright yellow submarine
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        
        // Add rounded ends to simulate capsule
        const endCapGeometry1 = new THREE.SphereGeometry(2, 16, 16);
        const endCapGeometry2 = new THREE.SphereGeometry(2, 16, 16);
        const endCap1 = new THREE.Mesh(endCapGeometry1, bodyMaterial);
        const endCap2 = new THREE.Mesh(endCapGeometry2, bodyMaterial);
        endCap1.position.set(3, 0, 0);
        endCap2.position.set(-3, 0, 0);
        
        // Create submarine window
        const windowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x87CEFA,
            transparent: true,
            opacity: 0.7
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.x = 2;
        window.position.y = 1;
        
        // Create submarine propeller
        const propellerGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.2);
        const propellerMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        propeller.position.x = -4;
        
        // Create submarine fins
        const finGeometry = new THREE.BoxGeometry(2, 0.2, 1);
        const finMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        
        const topFin = new THREE.Mesh(finGeometry, finMaterial);
        topFin.position.y = 2;
        
        const bottomFin = new THREE.Mesh(finGeometry, finMaterial);
        bottomFin.position.y = -2;
        
        const sideFin = new THREE.Mesh(finGeometry, finMaterial);
        sideFin.rotation.z = Math.PI / 2;
        sideFin.position.z = 2;
        
        const sideFin2 = new THREE.Mesh(finGeometry, finMaterial);
        sideFin2.rotation.z = Math.PI / 2;
        sideFin2.position.z = -2;
        
        // Create submarine group
        const submarine = new THREE.Group();
        submarine.add(body);
        submarine.add(endCap1);
        submarine.add(endCap2);
        submarine.add(window);
        submarine.add(propeller);
        submarine.add(topFin);
        submarine.add(bottomFin);
        submarine.add(sideFin);
        submarine.add(sideFin2);
        
        // Add submarine to scene
        game.scene.add(submarine);
        game.submarine.object = submarine;
        
        // Position submarine
        submarine.position.set(0, 0, 0);
        
        // Add propeller animation
        const animatePropeller = () => {
            if (!game.gameOver) {
                propeller.rotation.x += 0.1;
                requestAnimationFrame(animatePropeller);
            }
        };
        
        animatePropeller();
        debug('Submarine created');
    } catch (error) {
        console.error('Error in createSubmarine:', error);
    }
}

// Create underwater environment
function createEnvironment() {
    debug('Creating environment');
    try {
        // Create coral formations
        for (let i = 0; i < 30; i++) {
            const size = Math.random() * 10 + 5;
            // Use different geometry for coral
            const coralGeometry = Math.random() > 0.5 ? 
                new THREE.DodecahedronGeometry(size, 0) : 
                new THREE.TorusKnotGeometry(size/2, size/4, 64, 8);
            
            // Bright coral colors
            const coralColors = [0xFF6F61, 0xFF00FF, 0xFFA500, 0xFF69B4, 0xFFD700];
            const coralColor = coralColors[Math.floor(Math.random() * coralColors.length)];
            
            const coralMaterial = new THREE.MeshStandardMaterial({ 
                color: coralColor,
                roughness: 0.8,
                metalness: 0.2
            });
            
            const coral = new THREE.Mesh(coralGeometry, coralMaterial);
            
            // Position coral randomly on ocean floor
            const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            const y = -OCEAN_DEPTH + size / 2 + Math.random() * 10;
            
            coral.position.set(x, y, z);
            coral.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            game.scene.add(coral);
            game.seaObjects.push(coral);
        }
        
        // Create seaweed/kelp
        for (let i = 0; i < 40; i++) {
            const height = Math.random() * 30 + 20;
            const segments = Math.floor(height / 5);
            
            const seaweedGeometry = new THREE.CylinderGeometry(0.5, 0.1, height, 8, segments, true);
            // Brighter green for seaweed
            const seaweedMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00FF7F,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9
            });
            
            // Bend the seaweed by moving vertices
            const vertices = seaweedGeometry.attributes.position.array;
            for (let j = 0; j < vertices.length; j += 3) {
                const y = vertices[j + 1];
                const bendFactor = (y + height / 2) / height; // 0 at bottom, 1 at top
                vertices[j] += Math.sin(bendFactor * Math.PI) * 2;
            }
            
            seaweedGeometry.attributes.position.needsUpdate = true;
            
            const seaweed = new THREE.Mesh(seaweedGeometry, seaweedMaterial);
            
            // Position seaweed randomly on ocean floor
            const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
            const y = -OCEAN_DEPTH + height / 2;
            
            seaweed.position.set(x, y, z);
            
            game.scene.add(seaweed);
            game.seaObjects.push(seaweed);
        }
        
        // Add tropical fish
        for (let i = 0; i < 50; i++) {
            createTropicalFish();
        }
        
        debug('Environment created');
    } catch (error) {
        console.error('Error in createEnvironment:', error);
    }
}

// Create tropical fish
function createTropicalFish() {
    try {
        // Fish body
        const bodySize = Math.random() * 2 + 1;
        const bodyGeometry = new THREE.ConeGeometry(bodySize, bodySize * 3, 8);
        
        // Bright fish colors
        const fishColors = [0xFF6347, 0x4169E1, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0x32CD32];
        const fishColor = fishColors[Math.floor(Math.random() * fishColors.length)];
        
        const fishMaterial = new THREE.MeshStandardMaterial({
            color: fishColor,
            metalness: 0.3,
            roughness: 0.6
        });
        
        const fishBody = new THREE.Mesh(bodyGeometry, fishMaterial);
        fishBody.rotation.z = Math.PI / 2;
        
        // Fish tail
        const tailGeometry = new THREE.ConeGeometry(bodySize * 1.2, bodySize * 1.5, 4);
        const tail = new THREE.Mesh(tailGeometry, fishMaterial);
        tail.position.x = -bodySize * 1.5;
        tail.rotation.z = Math.PI / 2;
        tail.scale.y = 0.5;
        
        // Create fish group
        const fish = new THREE.Group();
        fish.add(fishBody);
        fish.add(tail);
        
        // Position fish randomly in water
        const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
        const y = -(Math.random() * (OCEAN_DEPTH - 50)) - 20; // Keep fish away from surface
        const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
        
        fish.position.set(x, y, z);
        fish.rotation.y = Math.random() * Math.PI * 2;
        
        // Add movement properties
        fish.userData = {
            speed: Math.random() * 0.2 + 0.1,
            turnSpeed: Math.random() * 0.02 - 0.01,
            timeOffset: Math.random() * 1000
        };
        
        game.scene.add(fish);
        game.seaObjects.push(fish);
    } catch (error) {
        console.error('Error in createTropicalFish:', error);
    }
}

// Create treasure
function createTreasure() {
    try {
        const treasureTypes = ['gold', 'silver', 'gem'];
        const type = treasureTypes[Math.floor(Math.random() * treasureTypes.length)];
        
        let value;
        let color;
        let geometry;
        
        switch(type) {
            case 'gold':
                value = 100;
                color = 0xFFD700;
                geometry = new THREE.TorusGeometry(2, 0.5, 16, 32);
                break;
            case 'silver':
                value = 50;
                color = 0xC0C0C0;
                geometry = new THREE.CylinderGeometry(2, 2, 0.5, 32);
                break;
            case 'gem':
                value = 200;
                color = 0x00FFFF;
                geometry = new THREE.OctahedronGeometry(2, 0);
                break;
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.2,
            emissive: color,
            emissiveIntensity: 0.2
        });
        
        const treasure = new THREE.Mesh(geometry, material);
        
        // Position treasure randomly in the ocean
        const x = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
        const z = Math.random() * WORLD_SIZE - WORLD_SIZE / 2;
        const y = -(Math.random() * OCEAN_DEPTH * 0.8);
        
        treasure.position.set(x, y, z);
        
        // Add treasure to scene and game state
        game.scene.add(treasure);
        game.treasures.push({
            object: treasure,
            type: type,
            value: value,
            rotationSpeed: new THREE.Vector3(
                Math.random() * 0.02,
                Math.random() * 0.02,
                Math.random() * 0.02
            )
        });
    } catch (error) {
        console.error('Error in createTreasure:', error);
    }
}

// Check collision between submarine and treasure
function checkTreasureCollision() {
    try {
        if (!game.submarine.object) return;
        
        const subPosition = game.submarine.object.position;
        const collisionDistance = 5; // Distance for collision detection
        
        game.treasures.forEach((treasure, index) => {
            const distance = subPosition.distanceTo(treasure.object.position);
            
            if (distance < collisionDistance) {
                // Add to score
                game.score += treasure.value;
                
                // Update score display
                document.getElementById('score-value').textContent = game.score;
                
                // Remove collected treasure
                game.scene.remove(treasure.object);
                game.treasures.splice(index, 1);
            }
        });
    } catch (error) {
        console.error('Error in checkTreasureCollision:', error);
    }
}

// Show game over screen
function showGameOver() {
    try {
        // Create game over screen if it doesn't exist
        let gameOverScreen = document.getElementById('game-over');
        
        if (!gameOverScreen) {
            gameOverScreen = document.createElement('div');
            gameOverScreen.id = 'game-over';
            gameOverScreen.className = 'game-over';
            
            const gameOverContent = `
                <h2>Game Over</h2>
                <p>Your adventure has ended!</p>
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
    } catch (error) {
        console.error('Error in showGameOver:', error);
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
        game.treasures = [];
        game.seaObjects = [];
        game.score = 0;
        game.gameOver = false;
        
        // Update UI
        document.getElementById('score-value').textContent = game.score;
        document.getElementById('depth-value').textContent = game.depth;
        
        // Hide game over screen if visible
        const gameOverScreen = document.getElementById('game-over');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
        
        // Initialize scene if first time
        if (!game.scene) {
            initScene();
        }
        
        // Create environment
        createWaterSurface();
        createOceanFloor();
        createSubmarine();
        createEnvironment();
        createClouds();
        
        // Create initial treasures
        for (let i = 0; i < 5; i++) {
            createTreasure();
        }
        
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
        
        // Apply submarine controls
        let moveForward = 0;
        let moveRight = 0;
        let moveUp = 0;
        let rotateY = 0;
        let rotateX = 0;
        
        // Forward/backward movement
        if (game.keys.w || game.keys.ArrowUp) {
            moveForward = 1;
        } else if (game.keys.s || game.keys.ArrowDown) {
            moveForward = -1;
        }
        
        // Left/right movement
        if (game.keys.a || game.keys.ArrowLeft) {
            moveRight = -1;
        } else if (game.keys.d || game.keys.ArrowRight) {
            moveRight = 1;
        }
        
        // Up/down movement
        if (game.keys.q) {
            moveUp = 1;
        } else if (game.keys.e) {
            moveUp = -1;
        }
        
        // Rotation
        if (game.keys.a || game.keys.ArrowLeft) {
            rotateY = 1;
        } else if (game.keys.d || game.keys.ArrowRight) {
            rotateY = -1;
        }
        
        if (game.keys.w || game.keys.ArrowUp) {
            rotateX = -0.5;
        } else if (game.keys.s || game.keys.ArrowDown) {
            rotateX = 0.5;
        }
        
        // Apply rotation
        sub.object.rotation.y += rotateY * ROTATION_SPEED;
        
        // Limit pitch rotation
        const targetRotationX = rotateX * 0.3; // Max pitch angle
        sub.object.rotation.x += (targetRotationX - sub.object.rotation.x) * 0.1;
        
        // Calculate movement direction based on submarine orientation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(sub.object.quaternion);
        
        // Apply movement
        sub.object.position.addScaledVector(direction, moveForward * MOVEMENT_SPEED);
        
        // Apply side movement
        const sideDirection = new THREE.Vector3(1, 0, 0);
        sideDirection.applyQuaternion(sub.object.quaternion);
        sub.object.position.addScaledVector(sideDirection, moveRight * MOVEMENT_SPEED * 0.7);
        
        // Apply vertical movement
        sub.object.position.y += moveUp * MOVEMENT_SPEED * 0.5;
        
        // Apply buoyancy when near surface
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
        
        // Update camera position to follow submarine
        updateCamera();
        
        // Update depth
        sub.depth = Math.max(0, Math.floor(-sub.object.position.y));
        document.getElementById('depth-value').textContent = sub.depth;
        
        // Spawn treasures
        if (Math.random() < TREASURE_SPAWN_RATE * deltaTime && !game.gameOver) {
            createTreasure();
        }
        
        // Update treasures
        game.treasures.forEach(treasure => {
            // Rotate treasures
            treasure.object.rotation.x += treasure.rotationSpeed.x;
            treasure.object.rotation.y += treasure.rotationSpeed.y;
            treasure.object.rotation.z += treasure.rotationSpeed.z;
            
            // Make treasures float slightly
            treasure.object.position.y += Math.sin(game.clock.elapsedTime + treasure.object.position.x) * 0.01;
        });
        
        // Animate fish and clouds
        game.seaObjects.forEach(object => {
            // Check if object is a fish (has userData with speed property)
            if (object.userData && object.userData.speed) {
                // Check if it's a cloud (has direction property)
                if (object.userData.direction) {
                    // Move clouds
                    object.position.addScaledVector(object.userData.direction, object.userData.speed);
                    
                    // Wrap clouds around when they go too far
                    const cloudLimit = WORLD_SIZE;
                    if (object.position.x > cloudLimit) object.position.x = -cloudLimit;
                    if (object.position.x < -cloudLimit) object.position.x = cloudLimit;
                    if (object.position.z > cloudLimit) object.position.z = -cloudLimit;
                    if (object.position.z < -cloudLimit) object.position.z = cloudLimit;
                } else {
                    // It's a fish
                    // Move fish forward
                    const fishDirection = new THREE.Vector3(0, 0, 1);
                    fishDirection.applyQuaternion(object.quaternion);
                    object.position.addScaledVector(fishDirection, object.userData.speed);
                    
                    // Make fish swim in a wavy pattern
                    object.rotation.y += object.userData.turnSpeed;
                    
                    // Make fish move up and down slightly
                    object.position.y += Math.sin(game.clock.elapsedTime + object.userData.timeOffset) * 0.02;
                    
                    // Boundary check - if fish hits boundary, turn it around
                    if (
                        object.position.x > boundaryLimit || 
                        object.position.x < -boundaryLimit ||
                        object.position.z > boundaryLimit || 
                        object.position.z < -boundaryLimit
                    ) {
                        // Turn fish around
                        object.rotation.y += Math.PI;
                        // Move fish away from boundary
                        object.position.addScaledVector(fishDirection, -10);
                    }
                    
                    // Make sure fish don't go above water or below ocean floor
                    if (object.position.y > -5) {
                        object.position.y = -5;
                    } else if (object.position.y < -OCEAN_DEPTH + 5) {
                        object.position.y = -OCEAN_DEPTH + 5;
                    }
                    
                    // Animate fish tail
                    if (object.children.length > 1) {
                        const tail = object.children[1];
                        tail.rotation.y = Math.sin(game.clock.elapsedTime * 5 + object.userData.timeOffset) * 0.5;
                    }
                }
            }
        });
        
        // Check for treasure collisions
        checkTreasureCollision();
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
        
        // Get submarine's forward direction
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(sub.quaternion);
        
        // Position camera behind submarine
        const cameraPosition = new THREE.Vector3();
        cameraPosition.copy(sub.position);
        cameraPosition.addScaledVector(direction, -game.camera.followDistance);
        cameraPosition.y += game.camera.heightOffset;
        
        // Set camera position
        game.camera.main.position.copy(cameraPosition);
        
        // Calculate look-at position (ahead of submarine)
        const lookAtPosition = new THREE.Vector3();
        lookAtPosition.copy(sub.position);
        lookAtPosition.addScaledVector(direction, game.camera.lookAtOffset.z);
        lookAtPosition.y += game.camera.lookAtOffset.y;
        
        // Make camera look at submarine
        game.camera.main.lookAt(lookAtPosition);
    } catch (error) {
        console.error('Error in updateCamera:', error);
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