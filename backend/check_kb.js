const { getSupabase } = require('./src/db/supabase');
require('dotenv').config();

async function check() {
    const supabase = getSupabase();
    console.log('🔍 Buscando conteúdo de Jet Turbo...');
    const { data, error } = await supabase
        .from('knowledge_items')
        .select('title, content, metadata')
        .ilike('title', '%Jet Turbo%');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    if (data.length === 0) {
        console.log('❌ Nenhum item encontrado com "Jet Turbo" no título.');
    } else {
        data.forEach(item => {
            console.log(`\n📌 Título: ${item.title}`);
            console.log(`📝 Conteúdo (primeiros 200 caracteres): ${item.content.substring(0, 200)}...`);
            console.log(`📊 Metadados:`, item.metadata);
        });
    }
    process.exit(0);
}

check();
