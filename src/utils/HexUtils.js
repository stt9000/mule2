/**
 * Utility class for handling hexagonal grid calculations
 * Using axial coordinate system (q,r)
 */
export default class HexUtils {
    constructor(hexSize) {
        this.hexSize = hexSize;
        this.width = Math.sqrt(3) * hexSize;
        this.height = 2 * hexSize;
    }

    /**
     * Convert axial coordinates to pixel position
     * @param {number} q - q coordinate (column)
     * @param {number} r - r coordinate (row)
     * @returns {Object} {x, y} pixel coordinates
     */
    axialToPixel(q, r) {
        const x = this.hexSize * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const y = this.hexSize * (3 / 2 * r);
        return { x, y };
    }

    /**
     * Convert pixel position to axial coordinates
     * @param {number} x - x coordinate
     * @param {number} y - y coordinate
     * @returns {Object} {q, r} axial coordinates
     */
    pixelToAxial(x, y) {
        const q = (Math.sqrt(3)/3 * x - 1/3 * y) / this.hexSize;
        const r = (2/3 * y) / this.hexSize;
        return this.roundAxial(q, r);
    }

    /**
     * Round floating point axial coordinates to the nearest hex
     * @param {number} q - q coordinate
     * @param {number} r - r coordinate
     * @returns {Object} {q, r} rounded axial coordinates
     */
    roundAxial(q, r) {
        let s = -q - r;
        
        let qi = Math.round(q);
        let ri = Math.round(r);
        let si = Math.round(s);
        
        const qDiff = Math.abs(qi - q);
        const rDiff = Math.abs(ri - r);
        const sDiff = Math.abs(si - s);
        
        if (qDiff > rDiff && qDiff > sDiff) {
            qi = -ri - si;
        } else if (rDiff > sDiff) {
            ri = -qi - si;
        } else {
            // s = -q - r so no need to adjust
        }
        
        return { q: qi, r: ri };
    }

    /**
     * Get the vertices of a hexagon at the given axial coordinates
     * @param {number} q - q coordinate
     * @param {number} r - r coordinate
     * @returns {Array} Array of {x, y} points for the corners of the hexagon
     */
    getHexCorners(q, r) {
        const center = this.axialToPixel(q, r);
        const corners = [];
        
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            corners.push({
                x: center.x + this.hexSize * Math.cos(angle),
                y: center.y + this.hexSize * Math.sin(angle)
            });
        }
        
        return corners;
    }
    
    /**
     * Get all coordinates within a certain radius from a center
     * @param {number} centerQ - center q coordinate
     * @param {number} centerR - center r coordinate
     * @param {number} radius - radius in hexes
     * @returns {Array} Array of {q, r} coordinates
     */
    getHexesInRadius(centerQ, centerR, radius) {
        const results = [];
        
        for (let q = -radius; q <= radius; q++) {
            const r1 = Math.max(-radius, -q - radius);
            const r2 = Math.min(radius, -q + radius);
            
            for (let r = r1; r <= r2; r++) {
                results.push({
                    q: centerQ + q,
                    r: centerR + r
                });
            }
        }
        
        return results;
    }
    
    /**
     * Get the axial distance between two hexes
     * @param {number} q1 - First hex q coordinate
     * @param {number} r1 - First hex r coordinate
     * @param {number} q2 - Second hex q coordinate
     * @param {number} r2 - Second hex r coordinate
     * @returns {number} Distance in hex units
     */
    distance(q1, r1, q2, r2) {
        const s1 = -q1 - r1;
        const s2 = -q2 - r2;
        return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
    }
    
    /**
     * Get all neighboring hexes
     * @param {number} q - q coordinate
     * @param {number} r - r coordinate
     * @returns {Array} Array of {q, r} neighbor coordinates
     */
    neighbors(q, r) {
        const directions = [
            { q: 1, r: 0 },  // East
            { q: 1, r: -1 }, // Northeast
            { q: 0, r: -1 }, // Northwest
            { q: -1, r: 0 }, // West
            { q: -1, r: 1 }, // Southwest
            { q: 0, r: 1 }   // Southeast
        ];
        
        return directions.map(dir => {
            return { q: q + dir.q, r: r + dir.r };
        });
    }
}