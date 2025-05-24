/**
 * InstallationAnimator
 * Handles the magical binding ritual animation and installation process
 */
import { CONSTRUCT_DEFINITIONS } from '../config/gameConfig.js';

export default class InstallationAnimator {
    constructor(scene) {
        this.scene = scene;
        this.currentAnimation = null;
        this.ritualGraphics = [];
        this.particles = [];
        this.installationModal = null;
        this.progressBar = null;
        this.isAnimating = false;
    }

    /**
     * Play the installation animation for a construct
     * @param {Object} installation - Installation object from ConstructManager
     */
    playInstallation(installation) {
        if (this.isAnimating) {
            console.warn('Installation animation already in progress');
            return;
        }

        this.isAnimating = true;
        this.currentAnimation = installation;
        
        console.log(`Starting installation animation for ${installation.construct.type}`);
        
        // Create the installation modal
        this.createInstallationModal(installation);
        
        // Get territory position - handle both direct coordinates and hex coordinates
        let x, y;
        if (installation.territory.x !== undefined && installation.territory.y !== undefined) {
            x = installation.territory.x;
            y = installation.territory.y;
        } else if (installation.territory.q !== undefined && installation.territory.r !== undefined) {
            // Convert hex coordinates to pixel coordinates
            const hexUtils = this.scene.hexUtils;
            if (hexUtils) {
                const pos = hexUtils.axialToPixel(installation.territory.q, installation.territory.r);
                x = pos.x;
                y = pos.y;
            } else {
                // Fallback calculation
                const hexSize = 40;
                x = hexSize * (Math.sqrt(3) * installation.territory.q + Math.sqrt(3) / 2 * installation.territory.r);
                y = hexSize * (3 / 2 * installation.territory.r);
            }
        } else {
            // Default to center if no coordinates available
            x = this.scene.cameras.main.width / 2;
            y = this.scene.cameras.main.height / 2;
        }
        
        // Create magical binding animation at territory location
        this.createRitualAnimation(x, y);
        
        // Create and animate progress bar
        this.animateProgress(installation);
        
        // Create particle effects
        this.createMagicalParticles(installation.territory);
        
        // Play sound effects if available
        this.playInstallationSounds();
    }

    /**
     * Create the installation modal overlay
     */
    createInstallationModal(installation) {
        const modal = this.scene.add.container(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2
        );
        modal.setDepth(1100);
        this.installationModal = modal;
        
        // Semi-transparent background
        const backdrop = this.scene.add.rectangle(
            0, 0,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x000000, 0.7
        );
        backdrop.setOrigin(0.5);
        modal.add(backdrop);
        
        // Modal panel
        const panel = this.scene.add.container(0, 0);
        modal.add(panel);
        
        // Panel background
        const panelBg = this.scene.add.rectangle(0, 0, 450, 300, 0x1a1a3a, 0.95);
        panelBg.setStrokeStyle(3, 0x6666ff);
        panel.add(panelBg);
        
        // Title
        const title = this.scene.add.text(0, -120, '⚡ Magical Binding Ritual in Progress', {
            fontSize: '22px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        panel.add(title);
        
        // Construct info
        const def = CONSTRUCT_DEFINITIONS[installation.construct.type];
        const constructText = this.scene.add.text(0, -80,
            `Installing: ${def.icon} ${def.name}`,
            {
                fontSize: '18px',
                color: '#ffcc00',
                fontFamily: 'Arial'
            }
        );
        constructText.setOrigin(0.5);
        panel.add(constructText);
        
        // Territory info
        const territoryText = this.scene.add.text(0, -50,
            `Territory: ${installation.territory.terrainType || installation.territory.type}`,
            {
                fontSize: '14px',
                color: '#aaaaaa',
                fontFamily: 'Arial'
            }
        );
        territoryText.setOrigin(0.5);
        panel.add(territoryText);
        
        // Ritual visualization
        this.createRitualVisualization(panel);
        
        // Progress text
        this.progressText = this.scene.add.text(0, 60,
            'Binding magical energies...',
            {
                fontSize: '16px',
                color: '#88ccff',
                fontFamily: 'Arial'
            });
        this.progressText.setOrigin(0.5);
        panel.add(this.progressText);
        
        // Progress bar container
        const progressContainer = this.scene.add.container(0, 90);
        panel.add(progressContainer);
        
        // Progress bar background
        const progressBg = this.scene.add.rectangle(0, 0, 300, 20, 0x333333);
        progressBg.setStrokeStyle(2, 0x666666);
        progressContainer.add(progressBg);
        
        // Progress bar fill
        this.progressBar = this.scene.add.rectangle(-150, 0, 0, 16, 0x4488ff);
        this.progressBar.setOrigin(0, 0.5);
        progressContainer.add(this.progressBar);
        
        // Progress percentage
        this.progressPercent = this.scene.add.text(0, 0, '0%', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        this.progressPercent.setOrigin(0.5);
        progressContainer.add(this.progressPercent);
        
        // Warning text
        const warning = this.scene.add.text(0, 120,
            '⚠️ Do not interrupt the ritual!',
            {
                fontSize: '14px',
                color: '#ffaa00',
                fontFamily: 'Arial'
            });
        warning.setOrigin(0.5);
        panel.add(warning);
        
        // Emergency cancel button (with penalty)
        const cancelBtn = this.createEmergencyCancelButton(0, 150);
        panel.add(cancelBtn);
        
        // Fade in animation
        modal.setAlpha(0);
        this.scene.tweens.add({
            targets: modal,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
    }

    /**
     * Create ritual visualization in the modal
     */
    createRitualVisualization(container) {
        const symbols = [];
        const radius = 50;
        
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            // Create magical symbol
            const symbol = this.scene.add.text(x, y - 10, '✦', {
                fontSize: '24px',
                color: '#8888ff'
            });
            symbol.setOrigin(0.5);
            container.add(symbol);
            
            // Animate rotation
            this.scene.tweens.add({
                targets: symbol,
                rotation: Math.PI * 2,
                duration: 3000,
                repeat: -1,
                ease: 'Linear'
            });
            
            // Animate scale
            this.scene.tweens.add({
                targets: symbol,
                scale: { from: 0.8, to: 1.2 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 250
            });
            
            symbols.push(symbol);
        }
        
        // Central construct icon
        const def = CONSTRUCT_DEFINITIONS[this.currentAnimation.construct.type];
        const centralIcon = this.scene.add.text(0, -10, def.icon, {
            fontSize: '32px'
        });
        centralIcon.setOrigin(0.5);
        container.add(centralIcon);
        
        // Pulse animation for central icon
        this.scene.tweens.add({
            targets: centralIcon,
            scale: { from: 1, to: 1.3 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Create magical animation at the territory location
     */
    createRitualAnimation(x, y) {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(500);
        this.ritualGraphics.push(graphics);
        
        // Create rotating magical circles
        const circles = [];
        for (let i = 0; i < 3; i++) {
            const radius = 40 + i * 20;
            const circle = this.scene.add.graphics();
            circle.setDepth(500 + i);
            
            // Draw circle with dashed line effect
            const segments = 32;
            const dashLength = (Math.PI * 2 * radius) / (segments * 2);
            
            for (let j = 0; j < segments; j += 2) {
                const startAngle = (j / segments) * Math.PI * 2;
                const endAngle = ((j + 1) / segments) * Math.PI * 2;
                
                circle.lineStyle(2, 0x4488ff + i * 0x001122, 0.8);
                circle.beginPath();
                circle.arc(x, y, radius, startAngle, endAngle);
                circle.strokePath();
            }
            
            circles.push(circle);
            this.ritualGraphics.push(circle);
            
            // Rotate animation
            this.scene.tweens.add({
                targets: circle,
                rotation: i % 2 === 0 ? Math.PI * 2 : -Math.PI * 2,
                duration: 5000 - i * 1000,
                repeat: -1,
                ease: 'Linear'
            });
            
            // Fade in
            circle.setAlpha(0);
            this.scene.tweens.add({
                targets: circle,
                alpha: 0.8,
                duration: 500,
                delay: i * 200
            });
        }
        
        // Create energy beams
        const beamCount = 8;
        for (let i = 0; i < beamCount; i++) {
            const angle = (Math.PI * 2 / beamCount) * i;
            const beam = this.scene.add.graphics();
            beam.setDepth(499);
            
            // Draw beam
            beam.lineStyle(3, 0x88ccff, 0.6);
            beam.beginPath();
            beam.moveTo(x, y);
            beam.lineTo(
                x + Math.cos(angle) * 100,
                y + Math.sin(angle) * 100
            );
            beam.strokePath();
            
            this.ritualGraphics.push(beam);
            
            // Pulse animation
            this.scene.tweens.add({
                targets: beam,
                alpha: { from: 0.2, to: 0.8 },
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 125
            });
        }
    }

    /**
     * Create magical particle effects
     */
    createMagicalParticles(territory) {
        const def = CONSTRUCT_DEFINITIONS[this.currentAnimation.construct.type];
        const particleColor = this.getParticleColor(def.resourceType);
        
        // Get territory position
        let x, y;
        if (territory.x !== undefined && territory.y !== undefined) {
            x = territory.x;
            y = territory.y;
        } else if (territory.q !== undefined && territory.r !== undefined) {
            const hexUtils = this.scene.hexUtils;
            if (hexUtils) {
                const pos = hexUtils.axialToPixel(territory.q, territory.r);
                x = pos.x;
                y = pos.y;
            } else {
                const hexSize = 40;
                x = hexSize * (Math.sqrt(3) * territory.q + Math.sqrt(3) / 2 * territory.r);
                y = hexSize * (3 / 2 * territory.r);
            }
        } else {
            x = this.scene.cameras.main.width / 2;
            y = this.scene.cameras.main.height / 2;
        }
        
        // Create particle emitter configuration
        const particleConfig = {
            x: x,
            y: y,
            speed: { min: 50, max: 150 },
            scale: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            lifespan: 2000,
            quantity: 2,
            frequency: 100
        };
        
        // Create particles using graphics
        const createParticle = () => {
            const particle = this.scene.add.circle(
                x + (Math.random() - 0.5) * 60,
                y + (Math.random() - 0.5) * 60,
                3,
                particleColor
            );
            particle.setDepth(510);
            this.particles.push(particle);
            
            // Animate particle
            const targetX = x + (Math.random() - 0.5) * 200;
            const targetY = y + (Math.random() - 0.5) * 200;
            
            this.scene.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                scale: 0,
                alpha: 0,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                    const index = this.particles.indexOf(particle);
                    if (index > -1) {
                        this.particles.splice(index, 1);
                    }
                }
            });
        };
        
        // Create particles periodically
        this.particleTimer = this.scene.time.addEvent({
            delay: 100,
            callback: createParticle,
            repeat: -1
        });
    }

    /**
     * Get particle color based on resource type
     */
    getParticleColor(resourceType) {
        const colors = {
            mana: 0x8888ff,
            vitality: 0x88ff88,
            arcanum: 0xff8888,
            aether: 0xff88ff
        };
        return colors[resourceType] || 0xffffff;
    }

    /**
     * Animate the progress bar
     */
    animateProgress(installation) {
        const duration = installation.duration * 1000; // Convert to milliseconds
        
        // Animate progress bar fill
        this.scene.tweens.add({
            targets: this.progressBar,
            width: 300,
            duration: duration,
            ease: 'Linear',
            onUpdate: (tween) => {
                // Check if elements still exist before updating
                if (!this.progressPercent || !this.progressPercent.active || 
                    !this.progressText || !this.progressText.active) {
                    return;
                }
                
                const progress = tween.progress;
                this.progressPercent.setText(`${Math.floor(progress * 100)}%`);
                
                // Update progress text
                if (progress < 0.25) {
                    this.progressText.setText('Channeling magical energy...');
                } else if (progress < 0.5) {
                    this.progressText.setText('Stabilizing ley line connections...');
                } else if (progress < 0.75) {
                    this.progressText.setText('Binding construct to territory...');
                } else if (progress < 0.95) {
                    this.progressText.setText('Finalizing magical seal...');
                } else {
                    this.progressText.setText('Rolling for installation success...');
                }
            },
            onComplete: () => {
                this.completeInstallation(installation);
            }
        });
    }

    /**
     * Complete the installation and show results
     */
    completeInstallation(installation) {
        // Show dice rolling animation
        this.showDiceRoll(() => {
            // Roll dice and determine result
            const roll = Math.floor(Math.random() * 6) + 1;
            const result = this.determineInstallationResult(roll, installation);
            
            // Apply the result
            if (result.success) {
                installation.construct.status = 'active';
                installation.construct.efficiency = result.efficiency;
                if (installation.territory) {
                    installation.territory.construct = installation.construct;
                }
            } else {
                installation.construct.status = 'damaged';
                installation.construct.efficiency = 0;
            }
            
            // Add roll value to result
            result.rollValue = roll;
            
            // Show result
            this.showInstallationResult(result, installation);
        });
    }
    
    /**
     * Determine installation result based on dice roll
     */
    determineInstallationResult(roll, installation) {
        let outcome;
        let efficiency = 1.0;
        let success = true;
        let message;
        let bonus;
        let penalty;
        
        switch(roll) {
            case 1:
                outcome = 'Critical Failure';
                success = false;
                efficiency = 0;
                message = 'The magical binding completely failed! The construct is lost.';
                penalty = 'Construct destroyed';
                break;
            case 2:
                outcome = 'Failure';
                success = false;
                efficiency = 0;
                message = 'The ritual failed. The construct is damaged and non-functional.';
                penalty = 'Construct damaged';
                break;
            case 3:
                outcome = 'Partial Success';
                success = true;
                efficiency = 0.7;
                message = 'The binding is weak but holding. Reduced efficiency.';
                penalty = '-30% production';
                break;
            case 4:
                outcome = 'Success';
                success = true;
                efficiency = 1.0;
                message = 'The construct is successfully bound to the territory.';
                break;
            case 5:
                outcome = 'Great Success';
                success = true;
                efficiency = 1.2;
                message = 'Strong magical resonance! Enhanced production.';
                bonus = '+20% production';
                break;
            case 6:
                outcome = 'Critical Success';
                success = true;
                efficiency = 1.5;
                message = 'Perfect attunement! The construct thrives in this location.';
                bonus = '+50% production';
                break;
        }
        
        return {
            success,
            outcome,
            efficiency,
            message,
            bonus,
            penalty
        };
    }

    /**
     * Show dice rolling animation
     */
    showDiceRoll(callback) {
        // Update progress text
        this.progressText.setText('🎲 Rolling dice...');
        
        // Create dice display
        const dice = this.scene.add.text(0, 20, '?', {
            fontSize: '48px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        dice.setOrigin(0.5);
        this.installationModal.add(dice);
        
        // Animate random numbers
        let rollCount = 0;
        const rollTimer = this.scene.time.addEvent({
            delay: 100,
            callback: () => {
                rollCount++;
                
                if (rollCount >= 10) {
                    // Final roll
                    rollTimer.destroy();
                    dice.destroy();
                    if (callback) callback();
                } else {
                    // Only update text if dice still exists
                    if (dice && dice.active) {
                        dice.setText(String(Math.floor(Math.random() * 6) + 1));
                    }
                }
            },
            repeat: 9
        });
    }

    /**
     * Show installation result
     */
    showInstallationResult(result, installation) {
        // Clean up installation animation
        this.cleanupAnimation();
        
        // Create result modal
        const resultModal = new InstallationResultModal(this.scene, {
            result: result,
            construct: installation.construct,
            territory: installation.territory,
            onContinue: () => {
                this.cleanup();
                
                // Emit completion event
                this.scene.events.emit('installation-completed', {
                    result: result,
                    installation: installation
                });
            }
        });
        
        resultModal.show();
    }

    /**
     * Emergency cancel button
     */
    createEmergencyCancelButton(x, y) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.rectangle(0, 0, 200, 30, 0x881111);
        bg.setStrokeStyle(2, 0xaa3333);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, 'Emergency Cancel - Lose Construct', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        bg.on('pointerover', () => {
            bg.setFillStyle(0xaa2222);
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(0x881111);
        });
        
        bg.on('pointerup', () => {
            this.showCancelConfirmation();
        });
        
        return button;
    }

    /**
     * Show cancel confirmation dialog
     */
    showCancelConfirmation() {
        // Stop any ongoing animations
        this.scene.tweens.killTweensOf(this.progressBar);
        
        // Create confirmation overlay
        const confirmOverlay = this.scene.add.container(0, 0);
        confirmOverlay.setDepth(1200);
        this.installationModal.add(confirmOverlay);
        
        // Darken background
        const darkBg = this.scene.add.rectangle(0, 0, 500, 350, 0x000000, 0.8);
        confirmOverlay.add(darkBg);
        
        // Confirmation box
        const confirmBox = this.scene.add.container(0, 0);
        confirmOverlay.add(confirmBox);
        
        const boxBg = this.scene.add.rectangle(0, 0, 300, 150, 0x220000, 0.95);
        boxBg.setStrokeStyle(3, 0xff0000);
        confirmBox.add(boxBg);
        
        // Warning text
        const warningText = this.scene.add.text(0, -40, '⚠️ WARNING', {
            fontSize: '20px',
            color: '#ff4444',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        warningText.setOrigin(0.5);
        confirmBox.add(warningText);
        
        const messageText = this.scene.add.text(0, -10, 'Cancel installation?', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        messageText.setOrigin(0.5);
        confirmBox.add(messageText);
        
        const lossText = this.scene.add.text(0, 15, 'The construct will be LOST!', {
            fontSize: '14px',
            color: '#ffaa44',
            fontFamily: 'Arial'
        });
        lossText.setOrigin(0.5);
        confirmBox.add(lossText);
        
        // Buttons
        const yesBtn = this.createConfirmButton('Yes, Cancel', -70, 50, () => {
            confirmOverlay.destroy();
            this.cancelInstallation();
        });
        confirmBox.add(yesBtn);
        
        const noBtn = this.createConfirmButton('No, Continue', 70, 50, () => {
            confirmOverlay.destroy();
            // Resume animation if not cancelled
            if (this.progressBar && this.scene.tweens.isTweening(this.progressBar) === false) {
                // Animation was paused, just continue
            }
        });
        confirmBox.add(noBtn);
    }
    
    /**
     * Create confirmation button
     */
    createConfirmButton(text, x, y, callback) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.rectangle(0, 0, 120, 30, 0x444444);
        bg.setStrokeStyle(2, 0x666666);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, text, {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        bg.on('pointerover', () => bg.setFillStyle(0x666666));
        bg.on('pointerout', () => bg.setFillStyle(0x444444));
        bg.on('pointerup', callback);
        
        return button;
    }
    
    /**
     * Cancel the installation
     */
    cancelInstallation() {
        if (this.currentAnimation) {
            // Immediately stop all tweens
            this.scene.tweens.killAll();
            
            // Mark construct as lost
            this.currentAnimation.construct.status = 'lost';
            
            // Remove from installation queue
            const constructManager = this.scene.gameFlowController?.constructManager;
            if (constructManager) {
                const index = constructManager.installationQueue.indexOf(this.currentAnimation);
                if (index > -1) {
                    constructManager.installationQueue.splice(index, 1);
                }
            }
            
            // Show cancellation message if progress text still exists
            if (this.progressText && this.progressText.active) {
                this.progressText.setText('Installation cancelled - Construct lost!');
                this.progressText.setColor('#ff4444');
            }
            
            // Clean up after delay
            this.scene.time.delayedCall(2000, () => {
                this.cleanup();
                
                this.scene.events.emit('installation-cancelled', {
                    installation: this.currentAnimation
                });
            });
        }
    }

    /**
     * Clean up animation elements
     */
    cleanupAnimation() {
        // Stop particle timer
        if (this.particleTimer) {
            this.particleTimer.destroy();
            this.particleTimer = null;
        }
        
        // Clean up ritual graphics
        this.ritualGraphics.forEach(graphic => {
            this.scene.tweens.killTweensOf(graphic);
            graphic.destroy();
        });
        this.ritualGraphics = [];
        
        // Clean up particles
        this.particles.forEach(particle => {
            this.scene.tweens.killTweensOf(particle);
            particle.destroy();
        });
        this.particles = [];
    }

    /**
     * Full cleanup
     */
    cleanup() {
        this.cleanupAnimation();
        
        // Clean up modal
        if (this.installationModal) {
            this.scene.tweens.killTweensOf(this.installationModal);
            this.installationModal.destroy();
            this.installationModal = null;
        }
        
        // Reset state
        this.currentAnimation = null;
        this.isAnimating = false;
        this.progressBar = null;
        this.progressText = null;
        this.progressPercent = null;
    }

    /**
     * Play installation sounds
     */
    playInstallationSounds() {
        // Placeholder for sound effects
        // Would play magical charging/binding sounds if audio system is available
        if (this.scene.sound) {
            // this.scene.sound.play('magical_binding');
        }
    }
}

/**
 * Installation Result Modal
 */
class InstallationResultModal {
    constructor(scene, config) {
        this.scene = scene;
        this.result = config.result;
        this.construct = config.construct;
        this.territory = config.territory;
        this.onContinue = config.onContinue;
        this.modal = null;
    }

    show() {
        const modal = this.scene.add.container(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2
        );
        modal.setDepth(1200);
        this.modal = modal;
        
        // Background
        const bg = this.scene.add.rectangle(0, 0, 400, 300, 0x000000, 0.9);
        bg.setStrokeStyle(3, this.result.success ? 0x44ff44 : 0xff4444);
        modal.add(bg);
        
        // Title
        const title = this.scene.add.text(0, -120, 
            this.result.success ? '✅ Installation Successful!' : '❌ Installation Failed!',
            {
                fontSize: '24px',
                color: this.result.success ? '#44ff44' : '#ff4444',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }
        );
        title.setOrigin(0.5);
        modal.add(title);
        
        // Dice roll result
        const rollText = this.scene.add.text(0, -80,
            `Rolled: ${this.result.rollValue} (${this.result.outcome})`,
            {
                fontSize: '20px',
                color: '#ffffff',
                fontFamily: 'Arial'
            }
        );
        rollText.setOrigin(0.5);
        modal.add(rollText);
        
        // Construct info
        const def = CONSTRUCT_DEFINITIONS[this.construct.type];
        const constructText = this.scene.add.text(0, -40,
            `${def.icon} ${def.name}`,
            {
                fontSize: '18px',
                color: '#ffcc00',
                fontFamily: 'Arial'
            }
        );
        constructText.setOrigin(0.5);
        modal.add(constructText);
        
        // Result message
        const messageText = this.scene.add.text(0, 0,
            this.result.message,
            {
                fontSize: '14px',
                color: '#ffffff',
                fontFamily: 'Arial',
                wordWrap: { width: 350 },
                align: 'center'
            }
        );
        messageText.setOrigin(0.5);
        modal.add(messageText);
        
        // Bonus/Penalty info
        if (this.result.bonus || this.result.penalty) {
            const effectText = this.scene.add.text(0, 50,
                this.result.bonus || this.result.penalty,
                {
                    fontSize: '16px',
                    color: this.result.bonus ? '#44ff44' : '#ff8844',
                    fontFamily: 'Arial'
                }
            );
            effectText.setOrigin(0.5);
            modal.add(effectText);
        }
        
        // Production estimate (if successful)
        if (this.result.success && this.result.efficiency > 0) {
            const production = this.calculateEstimatedProduction();
            const prodText = this.scene.add.text(0, 80,
                `Estimated Production: ${production} ${def.resourceType}/cycle`,
                {
                    fontSize: '14px',
                    color: '#88ccff',
                    fontFamily: 'Arial'
                }
            );
            prodText.setOrigin(0.5);
            modal.add(prodText);
        }
        
        // Continue button
        const continueBtn = this.createButton('Continue', 0, 120, () => {
            modal.destroy();
            if (this.onContinue) this.onContinue();
        });
        modal.add(continueBtn);
        
        // Animate appearance
        modal.setScale(0);
        this.scene.tweens.add({
            targets: modal,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    calculateEstimatedProduction() {
        const def = CONSTRUCT_DEFINITIONS[this.construct.type];
        const baseProduction = (def.baseProduction.min + def.baseProduction.max) / 2;
        const levelMultiplier = this.construct.getProductionMultiplier();
        const efficiency = this.result.efficiency;
        
        return Math.floor(baseProduction * levelMultiplier * efficiency);
    }

    createButton(text, x, y, callback) {
        const button = this.scene.add.container(x, y);
        
        const bg = this.scene.add.rectangle(0, 0, 120, 40, 0x4466aa);
        bg.setStrokeStyle(2, 0x6688cc);
        bg.setInteractive();
        
        const label = this.scene.add.text(0, 0, text, {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        label.setOrigin(0.5);
        
        button.add([bg, label]);
        
        bg.on('pointerup', () => {
            if (callback) callback();
        });
        
        return button;
    }
}