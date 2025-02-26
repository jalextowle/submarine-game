// World chunks management for infinite terrain

import * as THREE from 'three';
import gameState from '../core/state.js';
import { debug } from '../core/debug.js';
import { OCEAN_DEPTH, WORLD_SIZE } from '../core/constants.js';
import { createDetailedTerrainChunk } from './oceanFloor.js';
import { createObstaclesInChunk } from './obstacles.js';
import perlinNoise from '../utils/perlinNoise.js';

// Configuration for chunked world
const CHUNK_SIZE = 500; // Size of each terrain chunk
const RENDER_DISTANCE = 2; // Number of chunks to render in each direction
const CHUNK_BUFFER_DISTANCE = 1; // Additional chunks to keep in memory but not visible

// Store active chunks in a Map with chunk key as identifier
const activeChunks = new Map();

// Initialize the chunked world system
export function initChunkedWorld() {
    debug('Initializing chunked world system');
    gameState.currentChunk = { x: 0, z: 0 };
    gameState.chunkSystem = {
        chunkSize: CHUNK_SIZE,
        renderDistance: RENDER_DISTANCE,
        activeChunks: activeChunks,
        lastUpdate: 0
    };
    
    // Create initial chunks around the player
    updateChunks();
}

// Update chunks based on player position
export function updateChunks() {
    try {
        if (!gameState.submarine.object) return;
        
        // Get submarine position
        const position = gameState.submarine.object.position;
        
        // Calculate current chunk coordinates
        const chunkX = Math.floor(position.x / CHUNK_SIZE);
        const chunkZ = Math.floor(position.z / CHUNK_SIZE);
        
        // If we've moved to a new chunk, update the current chunk reference
        if (chunkX !== gameState.currentChunk.x || chunkZ !== gameState.currentChunk.z) {
            gameState.currentChunk = { x: chunkX, z: chunkZ };
        }
        
        // Throttle chunk updates to avoid performance issues
        // Only update chunks every 100ms at most
        const now = Date.now();
        if (now - gameState.chunkSystem.lastUpdate < 100) return;
        gameState.chunkSystem.lastUpdate = now;
        
        // Calculate the chunks we need
        const chunksNeeded = new Set();
        
        // Determine render and buffer distances
        const totalDistance = RENDER_DISTANCE + CHUNK_BUFFER_DISTANCE;
        
        // Add all chunks within our render distance to the needed set
        for (let x = chunkX - totalDistance; x <= chunkX + totalDistance; x++) {
            for (let z = chunkZ - totalDistance; z <= chunkZ + totalDistance; z++) {
                const chunkKey = `${x},${z}`;
                chunksNeeded.add(chunkKey);
                
                // If chunk doesn't exist yet, create it
                if (!activeChunks.has(chunkKey)) {
                    createChunk(x, z);
                }
            }
        }
        
        // Remove chunks that are too far away
        for (const [chunkKey, chunkData] of activeChunks.entries()) {
            if (!chunksNeeded.has(chunkKey)) {
                // Remove the chunk from the scene
                gameState.scene.remove(chunkData.terrain);
                
                // Remove obstacles
                for (const obstacle of chunkData.obstacles) {
                    gameState.scene.remove(obstacle);
                    
                    // Also remove from collision objects
                    const index = gameState.collisionObjects.indexOf(obstacle);
                    if (index !== -1) {
                        gameState.collisionObjects.splice(index, 1);
                    }
                }
                
                // Remove chunk from active chunks
                activeChunks.delete(chunkKey);
            }
        }
        
        // Update visibility of chunks based on render distance
        for (const [chunkKey, chunkData] of activeChunks.entries()) {
            const [x, z] = chunkKey.split(',').map(Number);
            
            // Determine if the chunk is within render distance
            const isVisible = Math.abs(x - chunkX) <= RENDER_DISTANCE && 
                             Math.abs(z - chunkZ) <= RENDER_DISTANCE;
            
            // Update visibility of terrain and obstacles
            chunkData.terrain.visible = isVisible;
            for (const obstacle of chunkData.obstacles) {
                obstacle.visible = isVisible;
            }
        }
    } catch (error) {
        console.error('Error in updateChunks:', error);
    }
}

// Create a new chunk at the specified coordinates
function createChunk(chunkX, chunkZ) {
    try {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Calculate world position of chunk
        const worldX = chunkX * CHUNK_SIZE;
        const worldZ = chunkZ * CHUNK_SIZE;
        
        // Create terrain for this chunk
        const terrain = createDetailedTerrainChunk(
            worldX, 
            worldZ, 
            CHUNK_SIZE,
            CHUNK_SIZE
        );
        
        // Add to scene
        gameState.scene.add(terrain);
        
        // Generate a deterministic seed for this chunk's obstacles
        const chunkSeed = perlinNoise.getPositionHash(chunkX, chunkZ);
        
        // Create obstacles for this chunk with deterministic positioning
        const obstacles = createObstaclesInChunk(
            worldX, 
            worldZ, 
            CHUNK_SIZE, 
            CHUNK_SIZE, 
            chunkSeed
        );
        
        // Add chunk to active chunks
        activeChunks.set(chunkKey, { 
            terrain,
            obstacles,
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

// Get the height of the terrain at any world position
export function getInfiniteTerrainHeightAtPosition(x, z) {
    try {
        return getTerrainHeightAtCoordinates(x, z);
    } catch (error) {
        console.error('Error in getInfiniteTerrainHeightAtPosition:', error);
        return -OCEAN_DEPTH; // Fallback to default ocean depth
    }
}

// Calculate terrain height at any coordinate using the same algorithm as terrain generation
function getTerrainHeightAtCoordinates(x, z) {
    // Use the same noise function parameters as in terrain creation
    const noiseValue = perlinNoise.octaveNoise2D(
        x * 0.003, // TERRAIN_SCALE
        z * 0.003, // TERRAIN_SCALE
        5,         // TERRAIN_OCTAVES
        0.65       // TERRAIN_PERSISTENCE
    );
    
    // Apply the same height scaling and offset used in terrain creation
    const terrainHeight = noiseValue * 80 - 20; // TERRAIN_HEIGHT - TERRAIN_OFFSET
    
    // Return the actual Y position 
    return -OCEAN_DEPTH + terrainHeight;
} 