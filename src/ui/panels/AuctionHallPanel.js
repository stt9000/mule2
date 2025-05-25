/**
 * AuctionHallPanel
 * Main auction interface showing price scales and player positions
 */
export default class AuctionHallPanel {
    constructor(scene, config = {}) {
        this.scene = scene;
        // Get references from scene
        this.auctionManager = null;
        this.marketDataService = null;
        this.gameStateManager = null;
        
        // Panel configuration
        this.x = config.x || 100;
        this.y = config.y || 100;
        this.width = config.width || 800;
        this.height = config.height || 600;
        
        // Visual configuration
        this.backgroundColor = config.backgroundColor || 0x2c3e50;
        this.borderColor = config.borderColor || 0x34495e;
        this.borderWidth = config.borderWidth || 3;
        
        // Price scale configuration
        this.scaleHeight = 400;
        this.scaleWidth = 120;
        this.scalePadding = 40;
        
        // Player marker configuration
        this.markerSize = 30;
        this.markerColors = {
            buy: 0x27ae60,  // Green
            sell: 0xe74c3c  // Red
        };
        
        // UI elements
        this.container = null;
        this.background = null;
        this.priceScales = new Map(); // resource -> scale graphics
        this.playerMarkers = new Map(); // playerId -> marker graphics
        this.infoTexts = new Map();
        
        // Animation
        this.animationSpeed = 0.3;
        
        this.create();
    }
    
    create() {
        console.log('AuctionHallPanel.create() called with dimensions:', {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        });
        
        // Create container
        this.container = this.scene.add.container(this.x, this.y);
        this.container.setDepth(1000); // Ensure it appears above everything
        this.container.setSize(this.width, this.height); // Set container size
        
        // Initially hide the container
        this.container.setVisible(false);
        this.container.setAlpha(0);
        
        // Create background
        this.background = this.scene.add.graphics();
        this.background.fillStyle(this.backgroundColor, 1); // Ensure full opacity
        this.background.fillRoundedRect(0, 0, this.width, this.height, 10);
        this.background.lineStyle(this.borderWidth, this.borderColor, 1);
        this.background.strokeRoundedRect(0, 0, this.width, this.height, 10);
        this.container.add(this.background);
        
        console.log('Background created with color:', this.backgroundColor.toString(16));
        
        // Create title
        const title = this.scene.add.text(this.width / 2, 20, 'AUCTION HALL', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5, 0);
        this.container.add(title);
        
        // Create resource tabs
        this.createResourceTabs();
        
        // Create price scale
        this.createPriceScale();
        
        // Create info panel
        this.createInfoPanel();
        
        // Create player inventory panel
        this.createPlayerInventoryPanel();
        
        // Initially hide
        this.hide();
    }
    
    createResourceTabs() {
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        const tabWidth = 120;
        const tabHeight = 40;
        const tabY = 60;
        const startX = (this.width - (resources.length * tabWidth)) / 2;
        
        this.resourceTabs = new Map();
        
        resources.forEach((resource, index) => {
            const tabX = startX + (index * tabWidth);
            
            // Tab background
            const tabBg = this.scene.add.graphics();
            tabBg.fillStyle(0x34495e);
            tabBg.fillRoundedRect(tabX, tabY, tabWidth - 5, tabHeight, 5);
            this.container.add(tabBg);
            
            // Tab text
            const tabText = this.scene.add.text(
                tabX + tabWidth / 2 - 2.5,
                tabY + tabHeight / 2,
                resource.toUpperCase(),
                {
                    fontSize: '16px',
                    fontFamily: 'Arial',
                    color: '#ffffff'
                }
            );
            tabText.setOrigin(0.5);
            this.container.add(tabText);
            
            // Store tab elements
            this.resourceTabs.set(resource, {
                background: tabBg,
                text: tabText,
                x: tabX,
                y: tabY,
                width: tabWidth - 5,
                height: tabHeight
            });
        });
    }
    
    createPriceScale() {
        const scaleX = this.width / 2 - this.scaleWidth / 2;
        const scaleY = 120;
        
        // Scale background
        const scaleBg = this.scene.add.graphics();
        scaleBg.fillStyle(0x1a252f);
        scaleBg.fillRect(scaleX, scaleY, this.scaleWidth, this.scaleHeight);
        this.container.add(scaleBg);
        
        // Price markers
        const priceRange = this.auctionManager?.priceRange || { min: 10, max: 100 };
        const priceStep = 10;
        
        for (let price = priceRange.min; price <= priceRange.max; price += priceStep) {
            const yPos = this.getPriceYPosition(price, scaleY);
            
            // Price line
            const line = this.scene.add.graphics();
            line.lineStyle(1, 0x7f8c8d);
            line.moveTo(scaleX - 10, yPos);
            line.lineTo(scaleX + this.scaleWidth + 10, yPos);
            line.strokePath();
            this.container.add(line);
            
            // Price label
            const label = this.scene.add.text(scaleX - 15, yPos, `${price}`, {
                fontSize: '12px',
                fontFamily: 'Arial',
                color: '#95a5a6'
            });
            label.setOrigin(1, 0.5);
            this.container.add(label);
        }
        
        // Current market price indicator
        this.marketPriceIndicator = this.scene.add.graphics();
        this.container.add(this.marketPriceIndicator);
        
        // Buy/Sell zones
        this.createBuySellZones(scaleX, scaleY);
        
        // Store scale info
        this.scaleInfo = {
            x: scaleX,
            y: scaleY,
            width: this.scaleWidth,
            height: this.scaleHeight
        };
    }
    
    createBuySellZones(scaleX, scaleY) {
        // Buy zone (left)
        const buyZone = this.scene.add.graphics();
        buyZone.fillStyle(this.markerColors.buy, 0.1);
        buyZone.fillRect(scaleX - 150, scaleY, 140, this.scaleHeight);
        this.container.add(buyZone);
        
        const buyLabel = this.scene.add.text(scaleX - 80, scaleY - 20, 'BUYERS', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#27ae60',
            fontStyle: 'bold'
        });
        buyLabel.setOrigin(0.5);
        this.container.add(buyLabel);
        
        // Sell zone (right)
        const sellZone = this.scene.add.graphics();
        sellZone.fillStyle(this.markerColors.sell, 0.1);
        sellZone.fillRect(scaleX + this.scaleWidth + 10, scaleY, 140, this.scaleHeight);
        this.container.add(sellZone);
        
        const sellLabel = this.scene.add.text(scaleX + this.scaleWidth + 80, scaleY - 20, 'SELLERS', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#e74c3c',
            fontStyle: 'bold'
        });
        sellLabel.setOrigin(0.5);
        this.container.add(sellLabel);
    }
    
    createInfoPanel() {
        const infoX = 40;
        const infoY = this.height - 100;
        
        // Timer
        this.timerText = this.scene.add.text(infoX, infoY, 'Time: --:--', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        this.container.add(this.timerText);
        
        // Market info
        this.marketInfoText = this.scene.add.text(infoX, infoY + 30, 'Market Price: --', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#bdc3c7'
        });
        this.container.add(this.marketInfoText);
        
        // Trade count
        this.tradeCountText = this.scene.add.text(infoX, infoY + 55, 'Pending Trades: 0', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#bdc3c7'
        });
        this.container.add(this.tradeCountText);
        
        // Market events display
        this.createMarketEventsDisplay();
        
        // Set Position button
        this.createSetPositionButton();
        
        // Create player status indicators
        this.createPlayerStatusIndicators();
        
        // Create debug display
        this.createDebugDisplay();
    }
    
    createMarketEventsDisplay() {
        // Market events panel
        const eventsX = this.width - 300;
        const eventsY = 100;
        const eventsWidth = 250;
        const eventsHeight = 150;
        
        // Panel background
        const eventsBg = this.scene.add.graphics();
        eventsBg.fillStyle(0x000000, 0.7);
        eventsBg.fillRoundedRect(eventsX, eventsY, eventsWidth, eventsHeight, 10);
        eventsBg.lineStyle(2, 0xFFD700);
        eventsBg.strokeRoundedRect(eventsX, eventsY, eventsWidth, eventsHeight, 10);
        this.container.add(eventsBg);
        
        // Title
        const eventsTitle = this.scene.add.text(eventsX + eventsWidth/2, eventsY + 20, 'Market Events', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#FFD700',
            fontStyle: 'bold'
        });
        eventsTitle.setOrigin(0.5);
        this.container.add(eventsTitle);
        
        // Events text
        this.marketEventsText = this.scene.add.text(eventsX + 10, eventsY + 45, 'No active events', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            wordWrap: { width: eventsWidth - 20 }
        });
        this.container.add(this.marketEventsText);
    }
    
    createSetPositionButton() {
        // Create multiple control buttons for better visibility
        this.createBuyButton();
        this.createSellButton();
        
        // Also keep the original SET POSITION button
        const buttonX = this.width - 200;
        const buttonY = this.height - 50;
        const buttonWidth = 160;
        const buttonHeight = 40;
        
        const button = this.scene.add.container(buttonX, buttonY);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x3498db, 0.8);
        bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        bg.lineStyle(2, 0x2980b9);
        bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        button.add(bg);
        
        // Text
        const text = this.scene.add.text(buttonWidth / 2, buttonHeight / 2, 'SET POSITION', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);
        button.add(text);
        
        // Make interactive
        bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        
        // Hover effect
        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x3498db, 1);
            bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
            bg.lineStyle(2, 0xffffff);
            bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        });
        
        bg.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x3498db, 0.8);
            bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
            bg.lineStyle(2, 0x2980b9);
            bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        });
        
        // Click handler
        bg.on('pointerdown', () => {
            this.updateDebug('Set Position clicked!');
            this.onSetPositionClick();
        });
        
        this.container.add(button);
        this.setPositionButton = button;
    }
    
    createBuyButton() {
        const buttonX = this.width / 2 - 170;
        const buttonY = this.height - 50;
        const buttonWidth = 120;
        const buttonHeight = 40;
        
        const button = this.scene.add.container(buttonX, buttonY);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x27ae60, 0.8);
        bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        bg.lineStyle(2, 0x229954);
        bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        button.add(bg);
        
        // Text
        const text = this.scene.add.text(buttonWidth / 2, buttonHeight / 2, 'BUY', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);
        button.add(text);
        
        // Make interactive
        bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        
        // Hover effect
        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x27ae60, 1);
            bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
            bg.lineStyle(2, 0xffffff);
            bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        });
        
        bg.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x27ae60, 0.8);
            bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
            bg.lineStyle(2, 0x229954);
            bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        });
        
        // Click handler
        bg.on('pointerdown', () => {
            this.updateDebug('Buy button clicked!');
            this.onBuyClick();
        });
        
        this.container.add(button);
        this.buyButton = button;
    }
    
    createSellButton() {
        const buttonX = this.width / 2 - 40;
        const buttonY = this.height - 50;
        const buttonWidth = 120;
        const buttonHeight = 40;
        
        const button = this.scene.add.container(buttonX, buttonY);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0xe74c3c, 0.8);
        bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        bg.lineStyle(2, 0xc0392b);
        bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        button.add(bg);
        
        // Text
        const text = this.scene.add.text(buttonWidth / 2, buttonHeight / 2, 'SELL', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);
        button.add(text);
        
        // Make interactive
        bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        
        // Hover effect
        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0xe74c3c, 1);
            bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
            bg.lineStyle(2, 0xffffff);
            bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        });
        
        bg.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0xe74c3c, 0.8);
            bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
            bg.lineStyle(2, 0xc0392b);
            bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
        });
        
        // Click handler
        bg.on('pointerdown', () => {
            this.updateDebug('Sell button clicked!');
            this.onSellClick();
        });
        
        this.container.add(button);
        this.sellButton = button;
    }
    
    createPlayerStatusIndicators() {
        // Player status panel showing who has set positions
        const statusX = this.width - 300;
        const statusY = 270;
        const statusWidth = 250;
        const statusHeight = 120;
        
        // Panel background
        const statusBg = this.scene.add.graphics();
        statusBg.fillStyle(0x1a252f, 0.9);
        statusBg.fillRoundedRect(statusX, statusY, statusWidth, statusHeight, 10);
        statusBg.lineStyle(2, 0x95a5a6);
        statusBg.strokeRoundedRect(statusX, statusY, statusWidth, statusHeight, 10);
        this.container.add(statusBg);
        
        // Title
        const statusTitle = this.scene.add.text(statusX + statusWidth/2, statusY + 15, 'Player Positions', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#95a5a6',
            fontStyle: 'bold'
        });
        statusTitle.setOrigin(0.5);
        this.container.add(statusTitle);
        
        // Player status text
        this.playerStatusText = this.scene.add.text(statusX + 10, statusY + 40, 'Waiting for players...', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            wordWrap: { width: statusWidth - 20 }
        });
        this.container.add(this.playerStatusText);
        
        this.playerStatusPanel = {
            background: statusBg,
            title: statusTitle,
            text: this.playerStatusText
        };
    }
    
    createDebugDisplay() {
        // Debug info display at top of panel
        this.debugText = this.scene.add.text(this.width / 2, 5, 'Debug: Ready', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 5, y: 2 }
        });
        this.debugText.setOrigin(0.5, 0);
        this.container.add(this.debugText);
    }
    
    updateDebug(message) {
        if (this.debugText) {
            this.debugText.setText(`Debug: ${message}`);
            // Also show as floating text
            const floatText = this.scene.add.text(this.width / 2, 100, message, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffff00',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            });
            floatText.setOrigin(0.5);
            this.container.add(floatText);
            
            // Remove after 3 seconds
            this.scene.time.delayedCall(3000, () => {
                floatText.destroy();
            });
        }
    }
    
    createPlayerInventoryPanel() {
        // Player inventory panel
        const invX = 40;
        const invY = 120;
        const invWidth = 200;
        const invHeight = 180;
        
        // Panel background
        const invBg = this.scene.add.graphics();
        invBg.fillStyle(0x1a252f, 0.9);
        invBg.fillRoundedRect(invX, invY, invWidth, invHeight, 10);
        invBg.lineStyle(2, 0x3498db);
        invBg.strokeRoundedRect(invX, invY, invWidth, invHeight, 10);
        this.container.add(invBg);
        
        // Title
        const invTitle = this.scene.add.text(invX + invWidth/2, invY + 15, 'Your Resources', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#3498db',
            fontStyle: 'bold'
        });
        invTitle.setOrigin(0.5);
        this.container.add(invTitle);
        
        // Resource displays
        this.resourceDisplays = new Map();
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        const resourceColors = {
            mana: '#3498db',
            vitality: '#27ae60',
            arcanum: '#e74c3c',
            aether: '#9b59b6'
        };
        
        resources.forEach((resource, index) => {
            const yOffset = invY + 45 + (index * 30);
            
            // Resource icon placeholder
            const icon = this.scene.add.graphics();
            icon.fillStyle(Phaser.Display.Color.HexStringToColor(resourceColors[resource]).color);
            icon.fillCircle(invX + 20, yOffset, 8);
            this.container.add(icon);
            
            // Resource name
            const name = this.scene.add.text(invX + 35, yOffset, resource.charAt(0).toUpperCase() + resource.slice(1), {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: resourceColors[resource]
            });
            name.setOrigin(0, 0.5);
            this.container.add(name);
            
            // Resource amount
            const amount = this.scene.add.text(invX + invWidth - 20, yOffset, '0', {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                fontStyle: 'bold'
            });
            amount.setOrigin(1, 0.5);
            this.container.add(amount);
            
            this.resourceDisplays.set(resource, {
                icon: icon,
                name: name,
                amount: amount
            });
        });
        
        // Gold display
        const goldY = invY + invHeight - 25;
        
        // Gold icon
        const goldIcon = this.scene.add.graphics();
        goldIcon.fillStyle(0xFFD700);
        goldIcon.fillCircle(invX + 20, goldY, 8);
        this.container.add(goldIcon);
        
        // Gold label
        const goldLabel = this.scene.add.text(invX + 35, goldY, 'Gold', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#FFD700',
            fontStyle: 'bold'
        });
        goldLabel.setOrigin(0, 0.5);
        this.container.add(goldLabel);
        
        // Gold amount
        this.goldAmountText = this.scene.add.text(invX + invWidth - 20, goldY, '0', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#FFD700',
            fontStyle: 'bold'
        });
        this.goldAmountText.setOrigin(1, 0.5);
        this.container.add(this.goldAmountText);
        
        // Store panel info
        this.inventoryPanel = {
            background: invBg,
            title: invTitle,
            resourceDisplays: this.resourceDisplays,
            goldIcon: goldIcon,
            goldLabel: goldLabel,
            goldAmount: this.goldAmountText
        };
    }
    
    onSetPositionClick() {
        this.updateDebug('Getting player...');
        
        // During auction phase, we need to determine which player is acting
        let currentPlayer = null;
        
        // First try to get the current turn player
        currentPlayer = this.scene.gameFlowController?.turnManager?.getCurrentPlayer();
        
        // If no current player (common in auction phase), try to get the first human player
        if (!currentPlayer && this.scene.gameFlowController?.stateManager) {
            const gameState = this.scene.gameFlowController.stateManager.gameState;
            const players = gameState?.players || [];
            // Find the first human player
            currentPlayer = players.find(p => !p.isAI) || players[0];
        }
        
        if (!currentPlayer) {
            this.updateDebug('ERROR: No player found!');
            return;
        }
        
        this.updateDebug(`Player: ${currentPlayer.name || currentPlayer.id}`);
        
        // Use inline panel since PlayerActionPanel is not available
        this.showInlineActionPanel(currentPlayer, 'buy');
    }
    
    onBuyClick() {
        this.updateDebug('Getting player...');
        
        // During auction phase, we need to determine which player is acting
        // This could be based on UI interaction or player selection
        let currentPlayer = null;
        
        // First try to get the current turn player
        currentPlayer = this.scene.gameFlowController?.turnManager?.getCurrentPlayer();
        
        // If no current player (common in auction phase), try to get the first human player
        if (!currentPlayer && this.scene.gameFlowController?.stateManager) {
            const gameState = this.scene.gameFlowController.stateManager.gameState;
            const players = gameState?.players || [];
            this.updateDebug(`Found ${players.length} players`);
            // Find the first human player
            currentPlayer = players.find(p => !p.isAI) || players[0];
        }
        
        if (!currentPlayer) {
            this.updateDebug('ERROR: No player found!');
            return;
        }
        
        this.updateDebug(`Player: ${currentPlayer.name || currentPlayer.id}`);
        
        // Check if player action panel exists
        if (!this.scene.playerActionPanel) {
            // Try to create it if it doesn't exist
            this.updateDebug('Creating PlayerActionPanel...');
            try {
                const PlayerActionPanel = this.scene.sys.cache.custom.entries.get('PlayerActionPanel') || 
                                        window.PlayerActionPanel || 
                                        this.scene.constructor.PlayerActionPanel;
                
                if (!PlayerActionPanel) {
                    // Create a temporary action panel inline
                    this.showInlineActionPanel(currentPlayer, 'buy');
                    return;
                }
                
                this.scene.playerActionPanel = new PlayerActionPanel(this.scene, {
                    x: 250,
                    y: 300,
                    width: 300,
                    height: 200
                });
                this.updateDebug('PlayerActionPanel created!');
            } catch (error) {
                this.updateDebug('ERROR: Cannot create panel!');
                // Fall back to inline panel
                this.showInlineActionPanel(currentPlayer, 'buy');
                return;
            }
        }
        
        // Show player action panel with buy mode pre-selected
        this.updateDebug('Opening buy panel...');
        this.scene.playerActionPanel.show(currentPlayer, this.auctionManager);
        this.scene.playerActionPanel.setMode('buy');
    }
    
    onSellClick() {
        this.updateDebug('Getting player for sell...');
        
        // During auction phase, we need to determine which player is acting
        let currentPlayer = null;
        
        // First try to get the current turn player
        currentPlayer = this.scene.gameFlowController?.turnManager?.getCurrentPlayer();
        
        // If no current player (common in auction phase), try to get the first human player
        if (!currentPlayer && this.scene.gameFlowController?.stateManager) {
            const gameState = this.scene.gameFlowController.stateManager.gameState;
            const players = gameState?.players || [];
            // Find the first human player
            currentPlayer = players.find(p => !p.isAI) || players[0];
        }
        
        if (!currentPlayer) {
            this.updateDebug('ERROR: No player found!');
            return;
        }
        
        this.updateDebug(`Player: ${currentPlayer.name || currentPlayer.id}`);
        
        // Use inline panel since PlayerActionPanel is not available
        this.showInlineActionPanel(currentPlayer, 'sell');
    }
    
    getPriceYPosition(price, baseY) {
        const priceRange = this.auctionManager?.priceRange || { min: 10, max: 100 };
        const normalized = (price - priceRange.min) / (priceRange.max - priceRange.min);
        // Invert Y so higher prices are at top
        return baseY + this.scaleHeight * (1 - normalized);
    }
    
    update() {
        if (!this.auctionManager || this.auctionManager.auctionPhase === 'inactive') {
            return;
        }
        
        // Update phase display
        const phase = this.auctionManager.auctionPhase;
        const currentResource = this.auctionManager.currentResource;
        
        // Update timer
        const timeRemaining = this.auctionManager.timeRemaining || 0;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = Math.floor(timeRemaining % 60);
        
        if (phase === 'setup') {
            this.timerText.setText(`Setup Phase: ${minutes}:${seconds.toString().padStart(2, '0')}`);
            this.marketInfoText.setText('Preparing auction...');
        } else if (phase === 'active' && currentResource) {
            this.timerText.setText(`${currentResource.charAt(0).toUpperCase() + currentResource.slice(1)}: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
            this.timerText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
        
        // Update current resource tab highlight
        this.updateResourceTabs();
        
        // Update market price indicator
        this.updateMarketPrice();
        
        // Update player positions
        this.updatePlayerPositions();
        
        // Update trade count
        const pendingTrades = this.auctionManager.pendingTrades?.length || 0;
        this.tradeCountText.setText(`Pending Trades: ${pendingTrades}`);
        
        // Update market events
        this.updateMarketEvents();
        
        // Update player inventory
        this.updatePlayerInventory();
        
        // Update player status
        this.updatePlayerStatus();
    }
    
    updateResourceTabs() {
        const currentResource = this.auctionManager.currentResource;
        
        this.resourceTabs.forEach((tab, resource) => {
            if (resource === currentResource) {
                tab.background.clear();
                tab.background.fillStyle(0x3498db);
                tab.background.fillRoundedRect(tab.x, tab.y, tab.width, tab.height, 5);
                tab.text.setColor('#ffffff');
            } else {
                tab.background.clear();
                tab.background.fillStyle(0x34495e);
                tab.background.fillRoundedRect(tab.x, tab.y, tab.width, tab.height, 5);
                tab.text.setColor('#95a5a6');
            }
        });
    }
    
    updateMarketPrice() {
        if (!this.marketDataService || !this.auctionManager.currentResource) return;
        
        const marketPrice = this.marketDataService.getCurrentPrice(this.auctionManager.currentResource);
        const lastTradePrice = this.auctionManager.lastTradePrice;
        
        this.marketInfoText.setText(`Market Price: ${marketPrice} GP`);
        
        // Draw market price line
        this.marketPriceIndicator.clear();
        this.marketPriceIndicator.lineStyle(2, 0xf39c12);
        
        const yPos = this.getPriceYPosition(marketPrice, this.scaleInfo.y);
        this.marketPriceIndicator.moveTo(this.scaleInfo.x - 20, yPos);
        this.marketPriceIndicator.lineTo(this.scaleInfo.x + this.scaleInfo.width + 20, yPos);
        this.marketPriceIndicator.strokePath();
    }
    
    updateMarketEvents() {
        if (!this.auctionManager || !this.marketEventsText) return;
        
        const marketEvents = this.auctionManager.getActiveMarketEvents();
        
        if (marketEvents.length === 0) {
            this.marketEventsText.setText('No active events');
        } else {
            let eventsText = '';
            marketEvents.forEach((event, index) => {
                if (index > 0) eventsText += '\n';
                eventsText += `• ${event.name}`;
                if (event.effects.priceModifier && event.effects.priceModifier !== 1) {
                    const modifier = Math.round((event.effects.priceModifier - 1) * 100);
                    eventsText += ` (${modifier > 0 ? '+' : ''}${modifier}%)`;
                }
            });
            this.marketEventsText.setText(eventsText);
        }
    }
    
    updatePlayerPositions() {
        const positions = this.auctionManager.playerPositions;
        
        positions.forEach((position, playerId) => {
            let marker = this.playerMarkers.get(playerId);
            
            if (!marker) {
                // Create new marker
                marker = this.createPlayerMarker(playerId, position);
                this.playerMarkers.set(playerId, marker);
            }
            
            // Update position
            const targetY = this.getPriceYPosition(position.price, this.scaleInfo.y);
            const targetX = position.mode === 'buy' ? 
                this.scaleInfo.x - 80 : 
                this.scaleInfo.x + this.scaleInfo.width + 80;
            
            // Animate to new position
            this.scene.tweens.add({
                targets: marker.container,
                x: targetX,
                y: targetY,
                duration: 300,
                ease: 'Power2'
            });
            
            // Update marker text
            marker.priceText.setText(`${position.price}`);
            marker.quantityText.setText(`x${position.quantity || 5}`);
        });
        
        // Remove markers for players no longer in auction
        this.playerMarkers.forEach((marker, playerId) => {
            if (!positions.has(playerId)) {
                marker.container.destroy();
                this.playerMarkers.delete(playerId);
            }
        });
    }
    
    updatePlayerInventory() {
        if (!this.inventoryPanel || !this.resourceDisplays) return;
        
        // Get current player
        const currentPlayer = this.scene.gameFlowController?.turnManager?.getCurrentPlayer();
        if (!currentPlayer) return;
        
        // Update resource amounts
        const resources = ['mana', 'vitality', 'arcanum', 'aether'];
        resources.forEach(resource => {
            const display = this.resourceDisplays.get(resource);
            if (display && currentPlayer.resources) {
                const amount = currentPlayer.resources[resource] || 0;
                display.amount.setText(amount.toString());
                
                // Highlight current auction resource
                if (resource === this.auctionManager?.currentResource) {
                    display.name.setColor('#ffffff');
                    display.amount.setColor('#ffffff');
                } else {
                    const resourceColors = {
                        mana: '#3498db',
                        vitality: '#27ae60',
                        arcanum: '#e74c3c',
                        aether: '#9b59b6'
                    };
                    display.name.setColor(resourceColors[resource]);
                    display.amount.setColor('#ffffff');
                }
            }
        });
        
        // Update gold amount
        if (this.goldAmountText) {
            const goldAmount = currentPlayer.gold || 0;
            this.goldAmountText.setText(goldAmount.toString());
        }
    }
    
    updatePlayerStatus() {
        if (!this.playerStatusText || !this.auctionManager) return;
        
        const positions = this.auctionManager.playerPositions;
        const players = this.scene.gameFlowController?.stateManager?.getState?.()?.players || [];
        
        if (positions.size === 0) {
            this.playerStatusText.setText('No positions set yet');
            return;
        }
        
        let statusText = '';
        positions.forEach((position, playerId) => {
            const player = this.gameStateManager?.getPlayer?.(playerId) || 
                          this.scene.gameFlowController?.stateManager?.getPlayer?.(playerId);
            const playerName = player?.name || `Player ${playerId}`;
            const modeIcon = position.mode === 'buy' ? '🟢' : '🔴';
            statusText += `${modeIcon} ${playerName}: ${position.price}GP (x${position.quantity})\n`;
        });
        
        this.playerStatusText.setText(statusText.trim());
    }
    
    createPlayerMarker(playerId, position) {
        const container = this.scene.add.container(0, 0);
        
        // Marker background
        const bg = this.scene.add.graphics();
        bg.fillStyle(this.markerColors[position.mode], 0.8);
        bg.fillCircle(0, 0, this.markerSize);
        container.add(bg);
        
        // Player name
        const player = this.gameStateManager?.getPlayer?.(playerId) || 
                      this.scene.gameFlowController?.stateManager?.getPlayer?.(playerId);
        const playerName = player?.name || `Player ${playerId}`;
        const nameText = this.scene.add.text(0, -this.markerSize - 10, playerName, {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        nameText.setOrigin(0.5);
        container.add(nameText);
        
        // Price text
        const priceText = this.scene.add.text(0, 0, `${position.price}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        priceText.setOrigin(0.5);
        container.add(priceText);
        
        // Quantity text
        const quantityText = this.scene.add.text(0, this.markerSize + 10, `x${position.quantity || 5}`, {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        quantityText.setOrigin(0.5);
        container.add(quantityText);
        
        this.container.add(container);
        
        return {
            container,
            background: bg,
            nameText,
            priceText,
            quantityText
        };
    }
    
    setAuctionSystem(auctionManager, marketDataService, gameStateManager) {
        this.auctionManager = auctionManager;
        this.marketDataService = marketDataService;
        this.gameStateManager = gameStateManager;
    }
    
    show() {
        console.log('AuctionHallPanel.show() called');
        
        // Get latest references from scene
        if (this.scene.auctionManager) {
            this.auctionManager = this.scene.auctionManager;
        }
        if (this.scene.marketDataService) {
            this.marketDataService = this.scene.marketDataService;
        }
        if (this.scene.gameFlowController?.stateManager) {
            this.gameStateManager = this.scene.gameFlowController.stateManager;
        }
        
        console.log('Container exists:', !!this.container);
        console.log('Container visible before:', this.container?.visible);
        
        this.container.setVisible(true);
        this.container.setAlpha(0);
        
        console.log('Container visible after:', this.container?.visible);
        console.log('Creating tween animation...');
        
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                console.log('Auction hall fade-in complete');
            }
        });
    }
    
    hide() {
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.container.setVisible(false);
            }
        });
    }
    
    destroy() {
        this.playerMarkers.forEach(marker => marker.container.destroy());
        this.playerMarkers.clear();
        this.resourceTabs.clear();
        this.container.destroy();
    }
    
    showInlineActionPanel(player, mode = 'buy') {
        this.updateDebug('Showing inline action panel');
        
        // Create a simple inline panel
        if (this.inlinePanel) {
            this.inlinePanel.destroy();
        }
        
        const panelX = this.width / 2 - 150;
        const panelY = 200;
        
        this.inlinePanel = this.scene.add.container(panelX, panelY);
        this.container.add(this.inlinePanel);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x1a1a1a, 0.95);
        bg.fillRoundedRect(0, 0, 300, 250, 8);
        bg.lineStyle(2, 0x3498db);
        bg.strokeRoundedRect(0, 0, 300, 250, 8);
        this.inlinePanel.add(bg);
        
        // Title
        const title = this.scene.add.text(150, 15, `${mode.toUpperCase()} ${this.auctionManager?.currentResource || 'RESOURCE'}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5, 0);
        this.inlinePanel.add(title);
        
        // Price display
        let currentPrice = 50;
        const priceText = this.scene.add.text(150, 60, `Price: ${currentPrice} GP`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        priceText.setOrigin(0.5);
        this.inlinePanel.add(priceText);
        
        // Price buttons
        const createPriceButton = (x, y, text, delta) => {
            const btn = this.scene.add.rectangle(x, y, 60, 30, 0x3498db);
            btn.setInteractive();
            const btnText = this.scene.add.text(x, y, text, {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ffffff'
            });
            btnText.setOrigin(0.5);
            
            btn.on('pointerdown', () => {
                currentPrice = Math.max(10, Math.min(100, currentPrice + delta));
                priceText.setText(`Price: ${currentPrice} GP`);
            });
            
            this.inlinePanel.add(btn);
            this.inlinePanel.add(btnText);
        };
        
        createPriceButton(80, 100, '-10', -10);
        createPriceButton(150, 100, '-1', -1);
        createPriceButton(220, 100, '+1', 1);
        createPriceButton(80, 140, '+10', 10);
        
        // Quantity
        let quantity = 5;
        const qtyText = this.scene.add.text(150, 140, `Quantity: ${quantity}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        qtyText.setOrigin(0.5);
        this.inlinePanel.add(qtyText);
        
        createPriceButton(220, 140, '+5', 0); // Reuse for quantity
        const qtyBtn = this.inlinePanel.list[this.inlinePanel.list.length - 2];
        qtyBtn.off('pointerdown');
        qtyBtn.on('pointerdown', () => {
            quantity = Math.min(20, quantity + 1);
            qtyText.setText(`Quantity: ${quantity}`);
        });
        
        // Confirm button
        const confirmBtn = this.scene.add.rectangle(150, 200, 100, 35, 0x27ae60);
        confirmBtn.setInteractive();
        const confirmText = this.scene.add.text(150, 200, 'CONFIRM', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        confirmText.setOrigin(0.5);
        
        confirmBtn.on('pointerdown', () => {
            this.updateDebug(`Setting ${mode} @ ${currentPrice}GP x${quantity}`);
            if (this.auctionManager) {
                this.auctionManager.updatePlayerPosition(player.id, currentPrice, mode, quantity);
            }
            this.inlinePanel.destroy();
            this.inlinePanel = null;
        });
        
        this.inlinePanel.add(confirmBtn);
        this.inlinePanel.add(confirmText);
        
        // Cancel button
        const cancelBtn = this.scene.add.graphics();
        cancelBtn.fillStyle(0xe74c3c);
        cancelBtn.fillCircle(280, 20, 12);
        cancelBtn.setInteractive(new Phaser.Geom.Circle(280, 20, 12), Phaser.Geom.Circle.Contains);
        const cancelText = this.scene.add.text(280, 20, 'X', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        cancelText.setOrigin(0.5);
        
        cancelBtn.on('pointerdown', () => {
            this.inlinePanel.destroy();
            this.inlinePanel = null;
        });
        
        this.inlinePanel.add(cancelBtn);
        this.inlinePanel.add(cancelText);
    }
}