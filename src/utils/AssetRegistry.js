/**
 * Asset registry for managing game assets
 * Provides a central place to define all game assets
 */
export default class AssetRegistry {
    constructor() {
        // Images
        this.images = {
            // UI elements
            ui: {
                logo: { key: 'logo', path: 'assets/images/ui/logo.png' },
                button: { key: 'button', path: 'assets/images/ui/button.png' },
                panel: { key: 'panel', path: 'assets/images/ui/panel.png' }
            },
            // Territory types
            territories: {
                ancient_grove: { key: 'territory_ancient_grove', path: 'assets/images/territories/ancient_grove.png' },
                crystalline_cave: { key: 'territory_crystalline_cave', path: 'assets/images/territories/crystalline_cave.png' },
                ruined_temple: { key: 'territory_ruined_temple', path: 'assets/images/territories/ruined_temple.png' },
                mountain_peak: { key: 'territory_mountain_peak', path: 'assets/images/territories/mountain_peak.png' },
                marshland: { key: 'territory_marshland', path: 'assets/images/territories/marshland.png' },
                volcanic_field: { key: 'territory_volcanic_field', path: 'assets/images/territories/volcanic_field.png' },
                hexOutline: { key: 'hex_outline', path: 'assets/images/territories/hex_outline.png' }
            },
            // Resource icons
            resources: {
                mana: { key: 'resource_mana', path: 'assets/images/resources/mana.png' },
                vitality: { key: 'resource_vitality', path: 'assets/images/resources/vitality.png' },
                arcanum: { key: 'resource_arcanum', path: 'assets/images/resources/arcanum.png' },
                aether: { key: 'resource_aether', path: 'assets/images/resources/aether.png' },
                gold: { key: 'resource_gold', path: 'assets/images/resources/gold.png' }
            },
            // Construct graphics
            constructs: {
                mana_conduit: { key: 'construct_mana_conduit', path: 'assets/images/constructs/mana_conduit.png' },
                vitality_well: { key: 'construct_vitality_well', path: 'assets/images/constructs/vitality_well.png' },
                arcanum_extractor: { key: 'construct_arcanum_extractor', path: 'assets/images/constructs/arcanum_extractor.png' },
                aether_resonator: { key: 'construct_aether_resonator', path: 'assets/images/constructs/aether_resonator.png' }
            }
        };
        
        // Spritesheets
        this.spritesheets = {
            buttons: { 
                key: 'button_sprites', 
                path: 'assets/images/ui/buttons.png',
                frameConfig: { frameWidth: 190, frameHeight: 49 }
            },
            resourceIcons: {
                key: 'resource_icons',
                path: 'assets/images/ui/resource_icons.png',
                frameConfig: { frameWidth: 32, frameHeight: 32 }
            }
        };
        
        // Audio
        this.audio = {
            music: {
                main: { key: 'music_main', path: 'assets/audio/music/main_theme.mp3' },
                menu: { key: 'music_menu', path: 'assets/audio/music/menu.mp3' }
            },
            sfx: {
                click: { key: 'sfx_click', path: 'assets/audio/sfx/click.mp3' },
                construct: { key: 'sfx_construct', path: 'assets/audio/sfx/construct.mp3' },
                resource: { key: 'sfx_resource', path: 'assets/audio/sfx/resource.mp3' }
            }
        };
    }
    
    /**
     * Preload all assets into the Phaser scene
     * @param {Phaser.Scene} scene - The scene to load assets into
     */
    preloadAll(scene) {
        // Load images
        this.forEachAsset(this.images, (asset) => {
            scene.load.image(asset.key, asset.path);
        });
        
        // Load spritesheets
        Object.values(this.spritesheets).forEach(spritesheet => {
            scene.load.spritesheet(
                spritesheet.key, 
                spritesheet.path, 
                spritesheet.frameConfig
            );
        });
        
        // Load audio
        this.forEachAsset(this.audio, (asset) => {
            scene.load.audio(asset.key, asset.path);
        });
    }
    
    /**
     * Preload specific categories or individual assets
     * @param {Phaser.Scene} scene - The scene to load assets into
     * @param {Array} categories - Array of category strings (e.g. ['ui', 'resources'])
     */
    preloadCategories(scene, categories) {
        categories.forEach(category => {
            if (this.images[category]) {
                this.forEachAsset(this.images[category], (asset) => {
                    scene.load.image(asset.key, asset.path);
                });
            }
            
            // Add similar handling for spritesheets and audio if needed
        });
    }
    
    /**
     * Helper function to iterate through nested asset objects
     * @param {Object} obj - The object to iterate through
     * @param {Function} callback - Function to call for each asset
     */
    forEachAsset(obj, callback) {
        Object.values(obj).forEach(item => {
            if (item.key && item.path) {
                callback(item);
            } else {
                this.forEachAsset(item, callback);
            }
        });
    }
    
    /**
     * Generate temporary placeholder assets for development
     * @param {Phaser.Scene} scene - The scene to generate assets in
     */
    generatePlaceholders(scene) {
        // Create placeholder territory hexes
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.lineStyle(2, 0xFFFFFF, 1);
        graphics.fillStyle(0xFFFFFF, 1);
        
        // Create a hex outline
        const hexSize = 100;
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i;
            points.push({
                x: hexSize + Math.cos(angle) * hexSize,
                y: hexSize + Math.sin(angle) * hexSize
            });
        }
        
        graphics.beginPath();
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 6; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.closePath();
        graphics.strokePath();
        
        graphics.generateTexture('hex_outline', hexSize * 2, hexSize * 2);
        graphics.clear();
        
        // Create resource icons as colored circles
        const resourceColors = {
            mana: 0x8080FF,      // Blue/purple
            vitality: 0x80FF80,  // Green
            arcanum: 0xFF8080,   // Red
            aether: 0xFFFF80     // Yellow
        };
        
        Object.entries(resourceColors).forEach(([resource, color]) => {
            graphics.fillStyle(color, 1);
            graphics.lineStyle(2, 0xFFFFFF, 1);
            graphics.fillCircle(16, 16, 14);
            graphics.strokeCircle(16, 16, 14);
            
            graphics.generateTexture(`resource_${resource}`, 32, 32);
            graphics.clear();
        });
        
        // Create placeholder buttons
        graphics.fillStyle(0x444466, 1);
        graphics.fillRect(0, 0, 190, 49);
        graphics.lineStyle(2, 0x666699, 1);
        graphics.strokeRect(0, 0, 190, 49);
        
        graphics.generateTexture('button', 190, 49);
        graphics.clear();
        
        // Create placeholder panel
        graphics.fillStyle(0x222244, 0.8);
        graphics.fillRect(0, 0, 400, 600);
        graphics.lineStyle(2, 0x444466, 1);
        graphics.strokeRect(0, 0, 400, 600);
        
        graphics.generateTexture('panel', 400, 600);
        graphics.clear();
        
        // Placeholder logo
        const text = scene.add.text(200, 100, 'MAGICAL FRONTIERS', {
            fontFamily: 'Georgia, serif',
            fontSize: 48,
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 5
        });
        text.setOrigin(0.5);
        
        const rt = scene.add.renderTexture(0, 0, 400, 200);
        rt.draw(text, 200, 100);
        rt.saveTexture('logo');
        
        rt.destroy();
        text.destroy();
    }
}