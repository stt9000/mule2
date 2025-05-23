/**
 * ProductionMonitorDOM
 * Production monitor implemented as DOM elements to avoid camera scaling issues
 */
export default class ProductionMonitorDOM {
    constructor(scene) {
        this.scene = scene;
        this.isVisible = false;
        this.isExpanded = false;
        this.container = null;
        this.productionData = {};
        
        this.createMonitor();
    }
    
    createMonitor() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'production-monitor';
        this.container.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: calc(100% - 270px);
            max-width: 900px;
            height: 100px;
            background: rgba(26, 26, 58, 0.95);
            border: 3px solid #5555ff;
            border-radius: 8px;
            display: none;
            z-index: 1000;
            font-family: Arial, sans-serif;
            color: white;
            padding: 10px 15px;
            box-sizing: border-box;
        `;
        
        // Create inner layout with two rows
        this.container.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <h3 style="margin: 0; font-size: 15px; color: #ffffff;">📊 Production Monitor</h3>
                        <div id="pm-cycle" style="font-size: 13px; color: #aaaaaa;">Cycle 0 of 0</div>
                    </div>
                    <button id="pm-expand" style="
                        background: #4466aa;
                        border: none;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    ">⬇</button>
                </div>
                <div id="pm-resources" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px;">
                    <div style="display: flex; gap: 15px;">
                        ${this.createResourceHTML('mana', '💎', '#8888ff')}
                        ${this.createResourceHTML('vitality', '🌿', '#88ff88')}
                    </div>
                    <div style="display: flex; gap: 15px;">
                        ${this.createResourceHTML('arcanum', '⚗️', '#ff8888')}
                        ${this.createResourceHTML('aether', '✨', '#ff88ff')}
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(this.container);
        
        // Add event listeners
        document.getElementById('pm-expand').addEventListener('click', () => {
            this.toggleExpanded();
        });
    }
    
    createResourceHTML(resource, icon, color) {
        return `
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <span style="font-size: 14px;">${icon}</span>
                <span style="font-size: 11px; text-transform: capitalize; min-width: 45px;">${resource}</span>
                <div style="position: relative; flex: 1; height: 16px; background: #333333; border-radius: 3px;">
                    <div id="pm-bar-${resource}" style="
                        position: absolute;
                        left: 0;
                        top: 0;
                        height: 100%;
                        width: 0%;
                        background: ${color};
                        border-radius: 3px;
                        transition: width 0.5s ease;
                    "></div>
                </div>
                <span id="pm-amount-${resource}" style="font-size: 11px; min-width: 35px; text-align: right;">0/c</span>
            </div>
        `;
    }
    
    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
        this.scene.events.emit('production-monitor-opened');
    }
    
    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
        this.scene.events.emit('production-monitor-closed');
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
            this.container.style.height = '250px';
            document.getElementById('pm-expand').textContent = '⬆';
            // TODO: Add expanded content
        } else {
            this.container.style.height = '100px';
            document.getElementById('pm-expand').textContent = '⬇';
        }
    }
    
    updateProduction(productionData) {
        if (!productionData) return;
        
        // Update cycle text
        const cycleText = `Cycle ${productionData.currentCycle || 1} of ${productionData.totalCycles || 12}`;
        const cycleElement = document.getElementById('pm-cycle');
        if (cycleElement) cycleElement.textContent = cycleText;
        
        // Update production bars
        const production = productionData.production || {};
        const maxProduction = productionData.maxProduction || {};
        
        ['mana', 'vitality', 'arcanum', 'aether'].forEach(resource => {
            const amount = production[resource] || 0;
            const max = maxProduction[resource] || 100;
            const percentage = Math.min((amount / max) * 100, 100);
            
            const bar = document.getElementById(`pm-bar-${resource}`);
            if (bar) bar.style.width = percentage + '%';
            
            const amountText = document.getElementById(`pm-amount-${resource}`);
            if (amountText) amountText.textContent = `${amount}/c`;
        });
    }
    
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}