// Simple Perlin noise implementation

// A simple implementation of Perlin noise
class PerlinNoise {
    constructor(seed = 12345) {  // Fixed seed for deterministic generation
        this.seed = seed;
        this.permutation = this.generatePermutation();
    }

    // Generate a random permutation table
    generatePermutation() {
        const p = new Array(512);
        for (let i = 0; i < 256; i++) {
            p[i] = p[i + 256] = Math.floor(this.seededRandom() * 256);
        }
        return p;
    }

    // Seeded random number generator
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    // Fade function as defined by Ken Perlin
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // Linear interpolation
    lerp(a, b, t) {
        return a + t * (b - a);
    }

    // Gradient function
    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    // 2D Perlin noise
    noise2D(x, y) {
        // Find unit grid cell containing point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        // Get relative xy coordinates of point within cell
        x -= Math.floor(x);
        y -= Math.floor(y);

        // Compute fade curves for x and y
        const u = this.fade(x);
        const v = this.fade(y);

        // Hash coordinates of the 4 square corners
        const A = this.permutation[X] + Y;
        const AA = this.permutation[A];
        const AB = this.permutation[A + 1];
        const B = this.permutation[X + 1] + Y;
        const BA = this.permutation[B];
        const BB = this.permutation[B + 1];

        // Add blended results from 4 corners of square
        return this.lerp(
            this.lerp(
                this.grad(this.permutation[AA], x, y, 0),
                this.grad(this.permutation[BA], x - 1, y, 0),
                u
            ),
            this.lerp(
                this.grad(this.permutation[AB], x, y - 1, 0),
                this.grad(this.permutation[BB], x - 1, y - 1, 0),
                u
            ),
            v
        ) * 0.5 + 0.5; // Transform from -1.0:1.0 to 0.0:1.0
    }

    // Get noise at multiple octaves for more natural looking terrain
    octaveNoise2D(x, y, octaves = 6, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }
    
    // Get an integer hash value for a chunk position
    // Used for deterministic chunk generation
    getPositionHash(x, z) {
        return ((x * 73856093) ^ (z * 19349663)) & 0x7fffffff;
    }
}

// Create and export a singleton instance
const perlinNoise = new PerlinNoise(12345); // Fixed seed for consistent generation
export default perlinNoise; 