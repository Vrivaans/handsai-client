const jwt = require('jsonwebtoken');

async function main() {
    require('dotenv').config({path: '/Users/ivanv/Desktop/VIDAL/programacion/handsai-client/.env'});
    const secret = process.env.CREDS_KEY || process.env.JWT_SECRET;
    if (!secret) {
        console.error("No secret found.");
        process.exit(1);
    }
    const token = jwt.sign({ id: '69a62dc109899b943c825e56' }, secret, { expiresIn: '1h' });

    console.log('Fetching /api/agents...');
    try {
        const resAgents = await fetch('http://localhost:3080/api/agents', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const agents = await resAgents.json();
        console.log('Agents count:', agents?.data?.length, typeof agents.data);
        console.log('First Agent from API:', agents?.data?.[0]?.id);

        console.log('Patching Objective config...');
        const resObj = await fetch('http://localhost:3080/api/objectives/69a6fa0a71ef946bfdd6d6f1', {
            method: 'PATCH',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agentId: '69a6fa0a71ef946bfdd6d6f1',
                title: 'Moltbook Error Test',
                description: 'test',
                runner: { enabled: true, cronExpression: '' }
            })
        });
        
        console.log('Status code:', resObj.status);
        const text = await resObj.text();
        console.log('Response body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

main().catch(console.error);
