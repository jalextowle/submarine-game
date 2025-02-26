// World chunks management for infinite terrain

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { OCEAN_DEPTH, WORLD_SIZE, TERRAIN_HEIGHT, TERRAIN_SCALE, TERRAIN_OFFSET } from '../core/constants.js';
import { createDetailedTerrainChunk } from './oceanFloor.js';
import perlinNoise from '../utils/perlinNoise.js';
import * as biomeSystem from './biomes.js';

// Configuration for chunked world - optimized for performance
const CHUNK_SIZE = 600; // Size of each terrain chunk (balanced between 500 and 750)
const RENDER_DISTANCE = 3; // Number of chunks to render in each direction
const CHUNK_BUFFER_DISTANCE = 2; // Additional chunks to keep in memory but not visible
const CHUNK_UPDATE_INTERVAL = 100; // Milliseconds between chunk updates (increased for performance)
const MAX_CHUNKS_PER_UPDATE = 2; // Maximum chunks to create per update cycle

// Store active chunks in a Map with chunk key as identifier
const activeChunks = new Map();
// Queue for chunks waiting to be created
const chunkCreationQueue = [];

// Initialize the chunked world system
export function initChunkedWorld() {
    debug('Initializing chunked world system');
    gameState.currentChunk = { x: 0, z: 0 };
    gameState.chunkSystem = {
        chunkSize: CHUNK_SIZE,
        renderDistance: RENDER_DISTANCE,
        activeChunks: activeChunks,
        lastUpdate: 0,
        chunkCreationQueue: chunkCreationQueue
    };
    
    // Create initial chunks around the player
    updateChunks(true); // Force initial update
    
    // Add fog to the scene to create horizon effect
    addHorizonFog();
}

// Add fog to create a horizon effect that hides chunk loading
function addHorizonFog() {
    if (!gameState.scene) return;
    
    // Use a bright tropical blue color for underwater scene
    const fogColor = new THREE.Color(0x3E92CC); // Bright tropical blue
    
    // Create very subtle exponential fog - just enough to hide distant chunk loading
    const fogDensity = 0.0008; // Much lower density for a clearer view
    gameState.scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    
    // Update background color to match - slightly lighter for a bright, tropical feel
    gameState.scene.background = new THREE.Color(0x6ACDFF); // Light sky blue
    
    debug('Added subtle horizon fog for distance effect');
}

// Update chunks based on player position
export function updateChunks(forceUpdate = false) {
    try {
        if (!gameState.submarine.object) return;
        
        // Process chunk creation queue first
        processChunkCreationQueue();
        
        // Get submarine position
        const position = gameState.submarine.object.position;
        
        // Calculate current chunk coordinates
        const chunkX = Math.floor(position.x / CHUNK_SIZE);
        const chunkZ = Math.floor(position.z / CHUNK_SIZE);
        
        // Calculate position within current chunk (0-1 range)
        const positionInChunkX = (position.x - (chunkX * CHUNK_SIZE)) / CHUNK_SIZE;
        const positionInChunkZ = (position.z - (chunkZ * CHUNK_SIZE)) / CHUNK_SIZE;
        
        // If we've moved to a new chunk, update the current chunk reference
        if (chunkX !== gameState.currentChunk.x || chunkZ !== gameState.currentChunk.z) {
            gameState.currentChunk = { x: chunkX, z: chunkZ };
            forceUpdate = true; // Force update when changing chunks
        }
        
        // Throttle chunk updates to avoid performance issues
        const now = Date.now();
        if (!forceUpdate && now - gameState.chunkSystem.lastUpdate < CHUNK_UPDATE_INTERVAL) return;
        gameState.chunkSystem.lastUpdate = now;
        
        // Calculate the chunks we need
        const chunksNeeded = new Set();
        
        // Determine render and buffer distances
        const totalDistance = RENDER_DISTANCE + CHUNK_BUFFER_DISTANCE;
        
        // Predict player movement direction based on velocity for proactive loading
        // Look further ahead based on speed
        let predictiveX = chunkX;
        let predictiveZ = chunkZ;
        let extraPredictiveDistance = 0;
        
        if (gameState.submarine.velocity) {
            // Look ahead in the direction of movement
            const velocity = gameState.submarine.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
            
            // Only predict if moving at a significant speed
            if (speed > 0.5) {
                // Scale prediction distance with speed but limit it to be more conservative
                extraPredictiveDistance = Math.min(Math.floor(speed * 1.5), 3);
                
                const normalizedVelocityX = velocity.x / speed;
                const normalizedVelocityZ = velocity.z / speed;
                
                // Add extra buffer in the direction of movement proportional to speed
                predictiveX += Math.round(normalizedVelocityX * extraPredictiveDistance);
                predictiveZ += Math.round(normalizedVelocityZ * extraPredictiveDistance);
            }
        }
        
        // Add all chunks within our render and buffer distance to the needed set
        for (let x = chunkX - totalDistance; x <= chunkX + totalDistance; x++) {
            for (let z = chunkZ - totalDistance; z <= chunkZ + totalDistance; z++) {
                const chunkKey = `${x},${z}`;
                chunksNeeded.add(chunkKey);
                
                // If chunk doesn't exist yet, queue it for creation
                if (!activeChunks.has(chunkKey) && !isChunkInCreationQueue(x, z)) {
                    queueChunkForCreation(x, z);
                }
            }
        }
        
        // Add additional chunks in the predicted movement direction using the increased prediction distance
        if (extraPredictiveDistance > 0) {
            const predictionTotalDistance = totalDistance + extraPredictiveDistance;
            
            for (let x = predictiveX - predictionTotalDistance; x <= predictiveX + predictionTotalDistance; x++) {
                for (let z = predictiveZ - predictionTotalDistance; z <= predictiveZ + predictionTotalDistance; z++) {
                    // Only add chunks that are in the direction of movement
                    // This avoids loading too many chunks if we already are
                    const dx = x - chunkX;
                    const dz = z - chunkZ;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    // Only add chunks within our extended prediction distance that are not already covered
                    if (distance <= predictionTotalDistance) {
                        const chunkKey = `${x},${z}`;
                        chunksNeeded.add(chunkKey);
                        
                        // If chunk doesn't exist yet, queue it for creation
                        if (!activeChunks.has(chunkKey) && !isChunkInCreationQueue(x, z)) {
                            queueChunkForCreation(x, z);
                        }
                    }
                }
            }
        }
        
        // Remove chunks that are too far away - use a slightly larger distance for removal to prevent thrashing
        const removalDistance = totalDistance + 1;
        for (const [chunkKey, chunkData] of activeChunks.entries()) {
            const [x, z] = chunkKey.split(',').map(Number);
            
            // Calculate distance from current chunk
            const dx = x - chunkX;
            const dz = z - chunkZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // If chunk is beyond removal distance and not in needed set, remove it
            if (distance > removalDistance && !chunksNeeded.has(chunkKey)) {
                // Remove the chunk from the scene
                gameState.scene.remove(chunkData.terrain);
                
                // Remove chunk from active chunks
                activeChunks.delete(chunkKey);
            }
        }
        
        // Update visibility of chunks based on render distance and apply LOD (Level of Detail)
        for (const [chunkKey, chunkData] of activeChunks.entries()) {
            const [x, z] = chunkKey.split(',').map(Number);
            
            // Calculate distance from current chunk
            const dx = x - chunkX;
            const dz = z - chunkZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Determine if the chunk is within render distance
            const isVisible = distance <= RENDER_DISTANCE;
            
            // Update visibility of terrain
            chunkData.terrain.visible = isVisible;
        }
    } catch (error) {
        console.error('Error in updateChunks:', error);
    }
}

// Process the chunk creation queue to spread out chunk creation over frames
function processChunkCreationQueue() {
    // Create a limited number of chunks per update
    for (let i = 0; i < MAX_CHUNKS_PER_UPDATE && chunkCreationQueue.length > 0; i++) {
        const chunkData = chunkCreationQueue.shift();
        createChunk(chunkData.x, chunkData.z);
    }
}

// Check if a chunk is already in the creation queue
function isChunkInCreationQueue(x, z) {
    return chunkCreationQueue.some(item => item.x === x && item.z === z);
}

// Add a chunk to the creation queue
function queueChunkForCreation(x, z) {
    chunkCreationQueue.push({ x, z });
    
    // Sort the queue by distance to current chunk
    if (gameState.currentChunk) {
        const currentX = gameState.currentChunk.x;
        const currentZ = gameState.currentChunk.z;
        
        chunkCreationQueue.sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - currentX, 2) + Math.pow(a.z - currentZ, 2));
            const distB = Math.sqrt(Math.pow(b.x - currentX, 2) + Math.pow(b.z - currentZ, 2));
            return distA - distB; // Sort by ascending distance (closest first)
        });
    }
}

// Create a new chunk at the specified coordinates
function createChunk(chunkX, chunkZ) {
    try {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Calculate world position of chunk
        const worldX = chunkX * CHUNK_SIZE;
        const worldZ = chunkZ * CHUNK_SIZE;
        
        // Create terrain for this chunk - order of parameters fixed to match function signature:
        // createDetailedTerrainChunk(width, height, offsetX, offsetZ, terrainGroup)
        const terrain = createDetailedTerrainChunk(
            CHUNK_SIZE,    // width
            CHUNK_SIZE,    // height
            worldX,        // offsetX
            worldZ,        // offsetZ
            null          // terrainGroup (optional)
        );
        
        // Add to scene
        gameState.scene.add(terrain);
        
        // Add chunk to active chunks
        activeChunks.set(chunkKey, { 
            terrain,
            position: { x: worldX, z: worldZ }
        });
        
        debug(`Created chunk at ${chunkX}, ${chunkZ}`);
    } catch (error) {
        console.error(`Error creating chunk at ${chunkX}, ${chunkZ}:`, error);
    }
}

// Convert world coordinates to chunk coordinates
export function worldToChunkCoordinates(worldX, worldZ) {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    return { chunkX, chunkZ };
}

// Get the terrain height at any position in the infinite world
export function getInfiniteTerrainHeightAtPosition(x, z) {
    try {
        // Get biome-specific terrain parameters
        const biomeParams = biomeSystem.getTerrainParametersAtPosition(x, z);
        
        // Calculate noise value using biome-specific parameters
        const noiseValue = perlinNoise.octaveNoise2D(
            x * TERRAIN_SCALE * biomeParams.noiseScale,
            z * TERRAIN_SCALE * biomeParams.noiseScale,
            biomeParams.noiseOctaves,
            biomeParams.noisePersistence
        );
        
        // Apply biome-specific height scaling and offset
        const terrainHeight = (noiseValue * TERRAIN_HEIGHT * biomeParams.heightScale) + 
                              biomeParams.heightOffset - TERRAIN_OFFSET;
        
        // Return the actual Y position by adding the terrain height to the ocean depth
        return -OCEAN_DEPTH + terrainHeight;
    } catch (error) {
        console.error('Error calculating infinite terrain height:', error);
        return -OCEAN_DEPTH; // Fallback to base ocean depth
    }
} 