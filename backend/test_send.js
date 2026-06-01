const { sendDirectMessage, startWhatsAppBot, agents } = require('./src/whatsapp/bot');
require('dotenv').config();

async function test() {
    console.log('Testing sendDirectMessage...');
    // We need a connected agent. Let's see what's in agents Map
    console.log('Agents in Map:', agents.keys());

    const agentId = 'default'; // or any id from your agents.json
    const number = '5511999999999'; // REPLACE WITH A VALID NUMBER FOR TESTING
    const message = 'Teste de disparo em massa';

    try {
        await sendDirectMessage(agentId, number, message);
        console.log('✅ Success');
    } catch (err) {
        console.error('❌ Failed:', err.message);
    }
}

// Since bots are started async, we might need to wait or start one manually
// but we want to test the EXISTING running state if possible. 
// Actually, this script will be a NEW process, so agents Map will be empty.
// This confirms my theory: if the process restarts, the Map is empty until startFleet finishes.

test();
