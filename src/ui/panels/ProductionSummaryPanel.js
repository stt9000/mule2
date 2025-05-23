export default class ProductionSummaryPanel {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.isVisible = false;
        this.createPanel();
    }
    
    createPanel() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'production-summary-panel';
        this.container.className = 'ui-panel production-summary';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #FFD700;
            border-radius: 10px;
            padding: 20px;
            min-width: 400px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
            display: none;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.style.cssText = `
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: #FFD700;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #FFD700;
        `;
        header.textContent = 'Resource Production Summary';
        this.container.appendChild(header);
        
        // Create content area
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'panel-content';
        this.contentArea.style.cssText = `
            margin-bottom: 20px;
        `;
        this.container.appendChild(this.contentArea);
        
        // Create continue button
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            text-align: center;
            margin-top: 20px;
        `;
        
        const continueBtn = document.createElement('button');
        continueBtn.textContent = 'Continue';
        continueBtn.className = 'ui-button continue-button';
        continueBtn.style.cssText = `
            background: #FFD700;
            color: #000;
            border: none;
            padding: 10px 30px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        `;
        
        continueBtn.addEventListener('mouseover', () => {
            continueBtn.style.background = '#FFF';
            continueBtn.style.transform = 'scale(1.05)';
        });
        
        continueBtn.addEventListener('mouseout', () => {
            continueBtn.style.background = '#FFD700';
            continueBtn.style.transform = 'scale(1)';
        });
        
        continueBtn.addEventListener('click', () => {
            this.hide();
        });
        
        buttonContainer.appendChild(continueBtn);
        this.container.appendChild(buttonContainer);
        
        // Add to game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.container);
        }
    }
    
    show(productionData) {
        if (!productionData) return;
        
        // Clear existing content
        this.contentArea.innerHTML = '';
        
        // Create cycle header
        const cycleHeader = document.createElement('div');
        cycleHeader.style.cssText = `
            text-align: center;
            font-size: 18px;
            color: #87CEEB;
            margin-bottom: 15px;
        `;
        cycleHeader.textContent = `Cycle ${productionData.cycleNumber || 1} Production`;
        this.contentArea.appendChild(cycleHeader);
        
        // Process player totals
        if (productionData.playerTotals) {
            productionData.playerTotals.forEach(playerData => {
                this.createPlayerSection(playerData);
            });
        }
        
        // Show total production
        if (productionData.totalProduction) {
            this.createTotalSection(productionData.totalProduction);
        }
        
        // Show the panel with animation
        this.container.style.display = 'block';
        this.isVisible = true;
        
        // Animate in
        requestAnimationFrame(() => {
            this.container.style.opacity = '0';
            this.container.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            requestAnimationFrame(() => {
                this.container.style.transition = 'all 0.3s ease-out';
                this.container.style.opacity = '1';
                this.container.style.transform = 'translate(-50%, -50%) scale(1)';
            });
        });
    }
    
    createPlayerSection(playerData) {
        const section = document.createElement('div');
        section.className = 'player-section';
        section.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
        `;
        
        // Player name
        const nameHeader = document.createElement('h3');
        nameHeader.style.cssText = `
            color: #FFD700;
            margin: 0 0 10px 0;
            font-size: 18px;
        `;
        nameHeader.textContent = playerData.playerName;
        section.appendChild(nameHeader);
        
        // Resource grid
        const resourceGrid = document.createElement('div');
        resourceGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        `;
        
        // Add each resource
        const resources = playerData.resources;
        Object.entries(resources).forEach(([resource, amount]) => {
            if (amount > 0) {
                const resourceItem = this.createResourceItem(resource, amount);
                resourceGrid.appendChild(resourceItem);
            }
        });
        
        section.appendChild(resourceGrid);
        
        // Territory breakdown if available
        if (playerData.territories && playerData.territories.length > 0) {
            const territoryList = document.createElement('div');
            territoryList.style.cssText = `
                margin-top: 10px;
                font-size: 12px;
                color: #999;
            `;
            
            const territoryHeader = document.createElement('div');
            territoryHeader.textContent = `${playerData.territories.length} territories producing`;
            territoryList.appendChild(territoryHeader);
            
            section.appendChild(territoryList);
        }
        
        this.contentArea.appendChild(section);
    }
    
    createResourceItem(resource, amount) {
        const item = document.createElement('div');
        item.className = 'resource-item';
        item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        // Resource icon
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 24px;
            height: 24px;
            background: ${this.getResourceColor(resource)};
            border-radius: 50%;
            flex-shrink: 0;
        `;
        
        // Resource text
        const text = document.createElement('div');
        text.style.cssText = `
            color: white;
            font-size: 16px;
        `;
        text.innerHTML = `<span style="color: ${this.getResourceColor(resource)}">${this.formatResourceName(resource)}:</span> +${amount}`;
        
        item.appendChild(icon);
        item.appendChild(text);
        
        return item;
    }
    
    createTotalSection(totalProduction) {
        const section = document.createElement('div');
        section.className = 'total-section';
        section.style.cssText = `
            background: rgba(255, 215, 0, 0.2);
            border: 2px solid #FFD700;
            border-radius: 5px;
            padding: 15px;
            margin-top: 20px;
            text-align: center;
        `;
        
        const header = document.createElement('h3');
        header.style.cssText = `
            color: #FFD700;
            margin: 0 0 10px 0;
            font-size: 20px;
        `;
        header.textContent = 'Total Production';
        section.appendChild(header);
        
        const totalGrid = document.createElement('div');
        totalGrid.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        `;
        
        Object.entries(totalProduction).forEach(([resource, amount]) => {
            if (amount > 0) {
                const totalItem = document.createElement('div');
                totalItem.style.cssText = `
                    font-size: 18px;
                    color: ${this.getResourceColor(resource)};
                `;
                totalItem.textContent = `${amount} ${this.formatResourceName(resource)}`;
                totalGrid.appendChild(totalItem);
            }
        });
        
        section.appendChild(totalGrid);
        this.contentArea.appendChild(section);
    }
    
    hide() {
        if (!this.isVisible) return;
        
        // Animate out
        this.container.style.transition = 'all 0.3s ease-in';
        this.container.style.opacity = '0';
        this.container.style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        setTimeout(() => {
            this.container.style.display = 'none';
            this.isVisible = false;
        }, 300);
    }
    
    getResourceColor(resource) {
        const colors = {
            mana: '#0080ff',
            vitality: '#00ff00',
            arcanum: '#ff8000',
            aether: '#ff00ff'
        };
        return colors[resource] || '#ffffff';
    }
    
    formatResourceName(resource) {
        return resource.charAt(0).toUpperCase() + resource.slice(1);
    }
    
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}