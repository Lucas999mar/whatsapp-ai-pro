const axios = require('axios');

(async () => {
    try {
        console.log('--- TESTE ADMIN ---');
        const loginRes = await axios.post('https://whatsapp-backend-pro.onrender.com/api/auth/login', {
            id: 'Lucas',
            password: '198236'
        });
        const token = loginRes.data.token;
        console.log('✅ Admin login OK');

        const tasksRes = await axios.get('https://whatsapp-backend-pro.onrender.com/api/os/tasks', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Buscou OS: ${tasksRes.data.length} tarefas encontradas.`);
        if (tasksRes.data.length > 0) {
            console.log(tasksRes.data[0].title);
        }

        console.log('\n--- TESTE TÉCNICO ---');
        const techLoginRes = await axios.post('https://whatsapp-backend-pro.onrender.com/api/auth/login', {
            id: 'lucasmariano@gmail.com',
            password: '198236'
        });
        console.log('✅ Técnico login OK:', techLoginRes.data.user.name);

    } catch (err) {
        console.error('❌ Erro:', err.response ? err.response.data : err.message);
    }
})();
