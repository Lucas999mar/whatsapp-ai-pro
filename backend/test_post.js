const axios = require('axios');

(async () => {
    try {
        console.log('Logging in as admin...');
        const loginRes = await axios.post('https://whatsapp-backend-pro.onrender.com/api/auth/login', {
            id: 'lucas',
            password: '198236'
        });
        const token = loginRes.data.token;
        console.log('Login success.');

        console.log('Sending task creation request...');
        const taskRes = await axios.post('https://whatsapp-backend-pro.onrender.com/api/os/tasks', {
            client_id: 'feac121a-a5da-4c14-a20c-c60f27914041', // Example existing client from previous logs
            technician_id: null, // Let's try without technician or hardcode it
            task_type_id: null,
            title: 'Test OS Auto',
            description: 'Automated test task',
            address: 'Rua de Teste',
            lat: -21.6467054,
            lng: -42.0628318,
            scheduled_date: '2026-05-19',
            scheduled_time: '14:00',
            status: 'pendente'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Task created successfully:', taskRes.data);
    } catch (err) {
        console.error('Task creation failed!');
        console.error(err.response ? JSON.stringify(err.response.data) : err.message);
    }
})();
