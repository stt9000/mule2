// Test script to verify Player 1 can claim territories and place constructs
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Territory') || text.includes('Player') || text.includes('construct') || 
            text.includes('phase') || text.includes('turn') || text.includes('Resolving')) {
            console.log('Browser console:', text);
        }
    });
    
    console.log('1. Loading game...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    
    // Wait for game to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('2. Starting game flow...');
    
    // Phase 1: Territory Selection
    console.log('\n=== TERRITORY SELECTION PHASE ===');
    
    // Click Buy Land button
    console.log('3. Clicking Buy Land button...');
    await page.click('#buy-land-btn');
    await page.waitForTimeout(500);
    
    // Click on a territory (center of map)
    console.log('4. Selecting a territory for Player 1...');
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
    await page.waitForTimeout(1000);
    
    // End Player 1's turn
    console.log('5. Ending Player 1 turn...');
    await page.click('#end-turn-btn');
    await page.waitForTimeout(1000);
    
    // Wait for AI players to take their turns
    console.log('6. Waiting for AI players to select territories...');
    await page.waitForTimeout(5000);
    
    // Phase should advance to construct_outfitting
    console.log('\n=== CONSTRUCT OUTFITTING PHASE ===');
    
    // Check current phase
    const phaseText = await page.$eval('#game-phase', el => el.textContent);
    console.log('7. Current phase:', phaseText);
    
    // Get Player 1's status
    const playerName = await page.$eval('#player-name', el => el.textContent);
    const goldAmount = await page.$eval('#gold-display', el => el.textContent);
    console.log(`8. Current player: ${playerName}, Gold: ${goldAmount}`);
    
    // Check if it's Player 1's turn
    if (playerName.includes('Player 1')) {
        console.log('9. Player 1 turn confirmed - attempting to place construct...');
        
        // Click Upgrade Territory button
        console.log('10. Clicking Upgrade Territory button...');
        await page.click('#upgrade-btn');
        await page.waitForTimeout(500);
        
        // Click on a territory (try multiple locations)
        console.log('11. Clicking on territories to place construct...');
        
        // Try clicking in different areas of the map
        const positions = [
            { x: box.x + box.width/2, y: box.y + box.height/2 },
            { x: box.x + box.width/3, y: box.y + box.height/3 },
            { x: box.x + box.width*2/3, y: box.y + box.height*2/3 }
        ];
        
        for (const pos of positions) {
            await page.mouse.click(pos.x, pos.y);
            await page.waitForTimeout(1000);
            
            // Check if gold decreased (construct was placed)
            const newGold = await page.$eval('#gold-display', el => el.textContent);
            if (parseInt(newGold) < parseInt(goldAmount)) {
                console.log(`12. SUCCESS! Construct placed. Gold changed from ${goldAmount} to ${newGold}`);
                break;
            }
        }
        
        // Check final gold amount
        const finalGold = await page.$eval('#gold-display', el => el.textContent);
        console.log('13. Final gold amount:', finalGold);
        
        // End turn
        console.log('14. Ending Player 1 turn...');
        await page.click('#end-turn-btn');
        await page.waitForTimeout(1000);
    } else {
        console.log('ERROR: Not Player 1\'s turn in construct phase!');
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
    // Keep browser open for inspection
    console.log('Browser will remain open for inspection. Close manually when done.');
    
})().catch(console.error);