const axios = require('axios');

(async () => {
    try {
        const loginRes = await axios.post('https://whatsapp-backend-pro.onrender.com/api/auth/login', {
            id: 'lucas',
            password: '198236'
        });
        const token = loginRes.data.token;

        // Lets fetch clients and techs using API and use the FIRST one
        const techsRes = await axios.get('https://whatsapp-backend-pro.onrender.com/api/os/technicians', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const clientsRes = await axios.get('https://whatsapp-backend-pro.onrender.com/api/os/clients', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Got techs:', techsRes.data.length, 'Clients:', clientsRes.data.length);
        if (clientsRes.data.length === 0 || techsRes.data.length === 0) {
            console.log('No clients or techs, cant test.');
            return;
        }

        const taskRes = await axios.post('https://whatsapp-backend-pro.onrender.com/api/os/tasks', {
            client_id: clientsRes.data[0].id,
            technician_id: techsRes.data[0].id,
            title: 'Test OS Valid',
            description: 'This is a valid task creation',
            scheduled_date: '2026-05-19',
            scheduled_time: '15:00',
            status: 'pendente'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Task created IDEAL!');
    } catch (err) {
        console.log('ERROR:');
        console.log(err.response ? JSON.stringify(err.response.data) : err.message);
    }
})();
