/**
 * Add debug display directly to the game screen
 * This avoids needing to open the browser console
 */

// Create a debug display that shows on screen
function addDebugDisplay() {
    // Create debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 300px;
        max-height: 400px;
        background: rgba(0, 0, 0, 0.9);
        color: #00ff00;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        border: 2px solid #00ff00;
        border-radius: 5px;
        overflow-y: auto;
        z-index: 10000;
    `;
    
    debugPanel.innerHTML = `
        <div style="color: #ffff00; font-weight: bold; margin-bottom: 10px;">
            DEBUG PANEL
        </div>
        <div id="debug-content">
            Waiting for clicks...
        </div>
        <button onclick="clearDebug()" style="
            margin-top: 10px;
            background: #ff0000;
            color: white;
            border: none;
            padding: 5px 10px;
            cursor: pointer;
        ">Clear</button>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Override console.log to also show in debug panel
    const originalLog = console.log;
    const debugContent = document.getElementById('debug-content');
    const logs = [];
    
    console.log = function(...args) {
        originalLog.apply(console, args);
        
        // Add to debug display
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(' ');
        
        logs.push(message);
        if (logs.length > 50) logs.shift(); // Keep last 50 messages
        
        debugContent.innerHTML = logs.map((log, i) => 
            `<div style="border-bottom: 1px solid #333; padding: 2px 0;">
                <span style="color: #888;">[${i}]</span> ${log}
            </div>`
        ).join('');
        
        // Auto scroll to bottom
        debugContent.scrollTop = debugContent.scrollHeight;
    };
    
    // Clear function
    window.clearDebug = function() {
        logs.length = 0;
        debugContent.innerHTML = 'Debug cleared';
    };
    
    console.log('Debug panel added! All console.log messages will appear here.');
    console.log('Click the auction buttons to see debug info.');
}

// Auto-run when script loads
addDebugDisplay();