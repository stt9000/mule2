/**
 * Camera controls utility for managing map navigation
 */
export default class CameraControls {
    /**
     * @param {Phaser.Scene} scene - The scene this camera belongs to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        
        // Default options
        this.options = {
            panSpeed: 1.0,
            zoomSpeed: 0.001,
            minZoom: 0.25,
            maxZoom: 2.0,
            wheelZoom: true,
            dragPan: true,
            keyboardPan: true,
            padding: 50,
            ...options
        };
        
        this.isPanning = false;
        this.lastPointerPosition = { x: 0, y: 0 };
        
        this.setupControls();
    }
    
    setupControls() {
        // Mouse wheel zoom
        if (this.options.wheelZoom) {
            this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                // Zoom based on wheel direction
                const newZoom = this.camera.zoom - deltaY * this.options.zoomSpeed;
                this.setZoom(newZoom);
                
                // Zoom toward pointer position
                if (pointer) {
                    const zoomDelta = this.camera.zoom / (this.camera.zoom - deltaY * this.options.zoomSpeed);
                    const pointerX = pointer.worldX;
                    const pointerY = pointer.worldY;
                    const cameraX = this.camera.scrollX + this.camera.width / 2;
                    const cameraY = this.camera.scrollY + this.camera.height / 2;
                    
                    const dx = pointerX - cameraX;
                    const dy = pointerY - cameraY;
                    
                    this.camera.scrollX += dx * (1 - zoomDelta);
                    this.camera.scrollY += dy * (1 - zoomDelta);
                }
            });
        }
        
        // Drag panning
        if (this.options.dragPan) {
            this.scene.input.on('pointerdown', (pointer) => {
                if (!pointer.wasTouch && pointer.rightButtonDown()) {
                    this.isPanning = true;
                    this.lastPointerPosition.x = pointer.x;
                    this.lastPointerPosition.y = pointer.y;
                }
            });
            
            this.scene.input.on('pointerup', (pointer) => {
                if (!pointer.wasTouch && this.isPanning) {
                    this.isPanning = false;
                }
            });
            
            this.scene.input.on('pointermove', (pointer) => {
                if (this.isPanning) {
                    // Move camera opposite to pointer movement
                    const dx = pointer.x - this.lastPointerPosition.x;
                    const dy = pointer.y - this.lastPointerPosition.y;
                    
                    this.camera.scrollX -= dx / this.camera.zoom * this.options.panSpeed;
                    this.camera.scrollY -= dy / this.camera.zoom * this.options.panSpeed;
                    
                    this.lastPointerPosition.x = pointer.x;
                    this.lastPointerPosition.y = pointer.y;
                }
            });
        }
        
        // Keyboard controls
        if (this.options.keyboardPan) {
            this.cursors = this.scene.input.keyboard.createCursorKeys();
        }
    }
    
    setZoom(zoom) {
        // Clamp zoom to min/max values
        const newZoom = Phaser.Math.Clamp(
            zoom, 
            this.options.minZoom, 
            this.options.maxZoom
        );
        
        // Set the new zoom level
        this.camera.setZoom(newZoom);
    }
    
    update(time, delta) {
        if (this.options.keyboardPan && this.cursors) {
            const panSpeed = (this.options.panSpeed * delta) / this.camera.zoom;
            
            if (this.cursors.left.isDown) {
                this.camera.scrollX -= panSpeed;
            }
            
            if (this.cursors.right.isDown) {
                this.camera.scrollX += panSpeed;
            }
            
            if (this.cursors.up.isDown) {
                this.camera.scrollY -= panSpeed;
            }
            
            if (this.cursors.down.isDown) {
                this.camera.scrollY += panSpeed;
            }
        }
    }
    
    /**
     * Set bounds for camera movement
     * @param {number} x - Left boundary
     * @param {number} y - Top boundary
     * @param {number} width - Width of bounds
     * @param {number} height - Height of bounds
     */
    setBounds(x, y, width, height) {
        this.camera.setBounds(
            x - this.options.padding, 
            y - this.options.padding, 
            width + (this.options.padding * 2), 
            height + (this.options.padding * 2)
        );
    }
    
    /**
     * Center camera on a specific position
     * @param {number} x - X coordinate to center on
     * @param {number} y - Y coordinate to center on
     */
    centerOn(x, y) {
        this.camera.centerOn(x, y);
    }
}