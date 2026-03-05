const jwt = require('jsonwebtoken');

(async () => {
    require('dotenv').config({path: '/Users/ivanv/Desktop/VIDAL/programacion/handsai-client/.env'});
    const token = jwt.sign({ id: '69a62dc109899b943c825e56' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    try {
        const resObj = await fetch('http://127.0.0.1:3080/api/objectives/69a6fa0a71ef946bfdd6d6f1', {
            method: 'PATCH',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agentId: '69a6fa0a71ef946bfdd6d6f1',
                title: 'Moltbook Error Test'
            })
        });
        console.log('Status code:', resObj.status);
        console.log('Response body:', await resObj.text());
    } catch (e) { console.error(e); }
})();
