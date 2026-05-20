const axios = require('axios');
(async () => {
    try {
        const loginRes = await axios.post('https://whatsapp-backend-pro.onrender.com/api/auth/login', { id: 'lucas', password: '198236' });
        const token = loginRes.data.token;

        const tasksRes = await axios.get('https://whatsapp-backend-pro.onrender.com/api/os/tasks?month=5&year=2026', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Admin Tasks fetched:', tasksRes.data.length);
        if (tasksRes.data.length > 0) {
            console.log('Task 1 title:', tasksRes.data[0].title);
        }

        const tLoginRes = await axios.post('https://whatsapp-backend-pro.onrender.com/api/auth/login', { id: 'lucasmariano@gmail.com', password: '198236' });
        const tToken = tLoginRes.data.token;

        const tTasksRes = await axios.get('https://whatsapp-backend-pro.onrender.com/api/os/tasks?month=5&year=2026', {
            headers: { Authorization: `Bearer ${tToken}` }
        });

        console.log('Technician Tasks fetched:', tTasksRes.data.length);
    } catch (err) {
        console.log('ERROR:', err.message);
    }
})();
