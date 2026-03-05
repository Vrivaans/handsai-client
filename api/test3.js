const jwt = require('jsonwebtoken');

(async () => {
    require('dotenv').config({path: '/Users/ivanv/Desktop/VIDAL/programacion/handsai-client/.env'});
    const token = jwt.sign({ id: '69a62dc109899b943c825e56' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    try {
        const resAgents = await fetch('http://127.0.0.1:3080/api/agents', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const agents = await resAgents.json();
        console.log('Agents response:', JSON.stringify(agents).slice(0, 300));
    } catch (e) { console.error(e); }
})();
