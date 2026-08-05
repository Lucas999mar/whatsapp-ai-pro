const express = require('express');
const { getSupabase } = require('../db/supabase');
const { authMiddleware } = require('./auth');
const crypto = require('crypto');

const router = express.Router();

// ── PROTECTED ROUTES (AUTH REQUIRED) ──────────────────────────

// List contracts for the tenant
router.get('/', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erro ao listar contratos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get a single contract details
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { id } = req.params;

        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Contrato não encontrado' });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new contract
router.post('/', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const {
            title,
            content,
            file_url,
            client_name,
            client_email,
            client_document,
            status
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Título é obrigatório' });
        }

        const newContract = {
            tenant_id: tenantId,
            title,
            content: content || null,
            file_url: file_url || null,
            client_name: client_name || null,
            client_email: client_email || null,
            client_document: client_document || null,
            status: status || 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('contracts')
            .insert(newContract)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao criar contrato:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update a contract metadata/content
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { id } = req.params;
        const {
            title,
            content,
            file_url,
            client_name,
            client_email,
            client_document,
            status
        } = req.body;

        // Garante que o contrato pertence ao tenant
        const { data: existingContract, error: fetchError } = await supabase
            .from('contracts')
            .select('id, status')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (fetchError || !existingContract) {
            return res.status(404).json({ error: 'Contrato não encontrado' });
        }

        // Se já estiver assinado, bloqueia modificações profundas
        if (existingContract.status === 'signed' && status !== 'canceled') {
            return res.status(400).json({ error: 'Não é possível modificar um contrato que já foi assinado.' });
        }

        const updates = {
            updated_at: new Date().toISOString()
        };

        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (file_url !== undefined) updates.file_url = file_url;
        if (client_name !== undefined) updates.client_name = client_name;
        if (client_email !== undefined) updates.client_email = client_email;
        if (client_document !== undefined) updates.client_document = client_document;
        if (status !== undefined) updates.status = status;

        const { data, error } = await supabase
            .from('contracts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao editar contrato:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Delete a contract
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { id } = req.params;

        const { error } = await supabase
            .from('contracts')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Erro ao deletar contrato:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// ── PUBLIC ROUTES (NO AUTH REQUIRED FOR CLIENT SIGNATURE) ──────

// Get details for public signing page
router.get('/public/:id', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { id } = req.params;

        const { data, error } = await supabase
            .from('contracts')
            .select('id, title, content, file_url, status, client_name, client_email, client_document, signed_at, signature_url, signed_hash, tenant_id, provider_logo')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Contrato não encontrado ou indisponível.' });
        }

        // Opcional: Busca nome/logo da empresa (tenant) para expor na página pública
        let companyName = 'Evoluir Mais';
        let companyLogo = data.provider_logo || null;

        if (!companyLogo) {
            try {
                const { findTenantById } = require('../db/repository');
                const tenant = await findTenantById(data.tenant_id);
                if (tenant) {
                    companyName = tenant.name || companyName;
                    companyLogo = tenant.logo || companyLogo;
                }
            } catch (e) {
                // Ignora erro de fetch do tenant
            }
        } else {
            // Se já tem logo do provedor, tenta buscar o nome do tenant apenas para atualizar se necessário
            try {
                const { findTenantById } = require('../db/repository');
                const tenant = await findTenantById(data.tenant_id);
                if (tenant) {
                    companyName = tenant.name || companyName;
                }
            } catch (e) { }
        }

        res.json({
            ...data,
            company_name: companyName,
            company_logo: companyLogo
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit signature (online signing)
router.post('/public/:id/sign', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { id } = req.params;
        const { client_name, client_document, client_email, signature_data } = req.body;

        if (!client_name || !client_document || !signature_data) {
            return res.status(400).json({ error: 'Nome, documento (CPF/CNPJ) e assinatura desenhada são obrigatórios.' });
        }

        // Busca o contrato
        const { data: contract, error: findError } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', id)
            .single();

        if (findError || !contract) {
            return res.status(404).json({ error: 'Contrato não encontrado.' });
        }

        if (contract.status === 'signed') {
            return res.status(400).json({ error: 'Este contrato já foi assinado.' });
        }

        if (contract.status === 'canceled') {
            return res.status(400).json({ error: 'Este contrato foi cancelado e não pode ser assinado.' });
        }

        // Processa a imagem da assinatura base64 para Buffer
        // Exemplo de formato: "data:image/png;base64,iVBORw0KGgo..."
        const base64Data = signature_data.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const fileName = `signatures/${id}_${Date.now()}.png`;

        // Sobe a imagem de assinatura para o bucket "knowledge-files" no Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('knowledge-files')
            .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) {
            console.error('❌ Erro no Storage ao enviar assinatura:', uploadError.message);
            throw new Error(`Falha ao salvar imagem de assinatura: ${uploadError.message}`);
        }

        // Pega a URL pública da assinatura
        const { data: { publicUrl } } = supabase.storage
            .from('knowledge-files')
            .getPublicUrl(fileName);

        // Gera o Hash SHA256 de Auditoria
        const signedAt = new Date().toISOString();
        const visitorIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP desconhecido';
        const visitorUa = req.headers['user-agent'] || 'User-Agent desconhecido';

        const rawDataToHash = `${id}|${client_name}|${client_document}|${signedAt}|${visitorIp}`;
        const signedHash = crypto
            .createHash('sha256')
            .update(rawDataToHash)
            .digest('hex')
            .toUpperCase();

        // Atualiza contrato no Supabase
        const { data: updatedContract, error: updateError } = await supabase
            .from('contracts')
            .update({
                status: 'signed',
                client_name,
                client_document,
                client_email: client_email || contract.client_email,
                signature_url: publicUrl,
                signed_at: signedAt,
                signed_ip: visitorIp,
                signed_user_agent: visitorUa,
                signed_hash: signedHash,
                updated_at: signedAt
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({
            success: true,
            message: 'Contrato assinado com sucesso!',
            contract: updatedContract
        });

    } catch (err) {
        console.error('❌ Erro ao assinar contrato:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// ── CONTRACT GENERATOR: PROVIDER PROFILES ────────────────────
// ══════════════════════════════════════════════════════════════

// Get provider profile for the tenant
router.get('/provider-profile', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        const { data, error } = await supabase
            .from('contract_provider_profiles')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('is_default', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        res.json(data || null);
    } catch (err) {
        console.error('❌ Erro ao buscar perfil do prestador:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Save/Update provider profile (upsert)
router.post('/provider-profile', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const {
            company_name, cnpj_cpf, address, city, state, zip_code,
            phone, email, website, representative_name, representative_cpf, representative_role, logo_url
        } = req.body;

        if (!company_name) {
            return res.status(400).json({ error: 'Nome da empresa/profissional é obrigatório.' });
        }

        // Check if profile exists
        const { data: existing } = await supabase
            .from('contract_provider_profiles')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('is_default', true)
            .single();

        const profileData = {
            tenant_id: tenantId,
            company_name,
            cnpj_cpf: cnpj_cpf || null,
            address: address || null,
            city: city || null,
            state: state || null,
            zip_code: zip_code || null,
            phone: phone || null,
            email: email || null,
            website: website || null,
            representative_name: representative_name || null,
            representative_cpf: representative_cpf || null,
            representative_role: representative_role || null,
            logo_url: logo_url || null,
            is_default: true,
            updated_at: new Date().toISOString()
        };

        let data, error;

        if (existing) {
            ({ data, error } = await supabase
                .from('contract_provider_profiles')
                .update(profileData)
                .eq('id', existing.id)
                .select()
                .single());
        } else {
            profileData.created_at = new Date().toISOString();
            ({ data, error } = await supabase
                .from('contract_provider_profiles')
                .insert(profileData)
                .select()
                .single());
        }

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao salvar perfil do prestador:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// ── CONTRACT GENERATOR: SERVICES CATALOG ─────────────────────
// ══════════════════════════════════════════════════════════════

// List services for the tenant
router.get('/services', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        const { data, error } = await supabase
            .from('contract_services')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erro ao listar serviços:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Create a service
router.post('/services', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { name, description, price, price_type } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nome do serviço é obrigatório.' });
        }

        const { data, error } = await supabase
            .from('contract_services')
            .insert({
                tenant_id: tenantId,
                name,
                description: description || null,
                price: price || 0,
                price_type: price_type || 'fixed',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('❌ Erro ao criar serviço:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update a service
router.put('/services/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const { name, description, price, price_type } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (price !== undefined) updates.price = price;
        if (price_type !== undefined) updates.price_type = price_type;

        const { data, error } = await supabase
            .from('contract_services')
            .update(updates)
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a service
router.delete('/services/:id', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;

        const { error } = await supabase
            .from('contract_services')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ══════════════════════════════════════════════════════════════
// ── CONTRACT GENERATOR ENGINE ────────────────────────────────
// ══════════════════════════════════════════════════════════════

router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const supabase = getSupabase();
        const tenantId = req.user.tenant_id || req.user.id;
        const {
            client_name, client_email, client_document,
            client_address, client_city, client_state,
            selected_services, // Array of { id, name, description, price, price_type }
            payment_method, // 'pix', 'boleto', 'cartao', 'transferencia'
            payment_installments, // Número de parcelas
            contract_duration, // Duração em meses
            start_date, // Data de início
            additional_clauses, // Cláusulas adicionais livres
            warranty_days, // Dias de garantia (padrão: 30)
            status // 'draft' ou 'pending'
        } = req.body;

        if (!client_name || !selected_services || selected_services.length === 0) {
            return res.status(400).json({ error: 'Nome do cliente e pelo menos um serviço são obrigatórios.' });
        }

        // Busca o perfil do prestador
        const { data: provider } = await supabase
            .from('contract_provider_profiles')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('is_default', true)
            .single();

        if (!provider) {
            return res.status(400).json({ error: 'Cadastre seu perfil de prestador antes de gerar um contrato.' });
        }

        // Calcula o valor total
        const totalValue = selected_services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
        const formattedTotal = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const formattedDate = start_date
            ? new Date(start_date).toLocaleDateString('pt-BR')
            : new Date().toLocaleDateString('pt-BR');

        const durationMonths = contract_duration || 12;
        const warrantyDays = warranty_days || 30;

        // Mapeamento do método de pagamento
        const paymentMethodMap = {
            'pix': 'PIX',
            'boleto': 'Boleto Bancário',
            'cartao': 'Cartão de Crédito',
            'transferencia': 'Transferência Bancária',
            'dinheiro': 'Dinheiro',
        };
        const paymentLabel = paymentMethodMap[payment_method] || payment_method || 'A definir';

        // Mapeamento de tipo de preço
        const priceTypeMap = {
            'fixed': 'valor fixo (pagamento único)',
            'monthly': 'mensalidade recorrente',
            'hourly': 'valor por hora trabalhada',
            'per_project': 'valor por projeto'
        };

        // Lista de serviços formatada
        const servicesList = selected_services.map((s, i) => {
            const p = parseFloat(s.price) || 0;
            const formattedPrice = p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const typeLabel = priceTypeMap[s.price_type] || s.price_type;
            return `${i + 1}. ${s.name}${s.description ? ` — ${s.description}` : ''}\n   Valor: ${formattedPrice} (${typeLabel})`;
        }).join('\n');

        // Texto por extenso (simplificado)
        const installmentInfo = payment_installments && payment_installments > 1
            ? `\nAs parcelas mensais serão de ${(totalValue / payment_installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} cada, em ${payment_installments}x iguais.`
            : '';

        // ── GERAÇÃO DO CONTRATO ──────────────────────────────

        const contractContent = `
═══════════════════════════════════════════════════
           CONTRATO DE PRESTAÇÃO DE SERVIÇOS
═══════════════════════════════════════════════════

Contrato nº: [GERADO AUTOMATICAMENTE]
Data: ${formattedDate}

───────────────────────────────────────────────────
                  PARTES CONTRATANTES
───────────────────────────────────────────────────

CONTRATADA (Prestador de Serviço):
• Razão Social / Nome: ${provider.company_name}
${provider.cnpj_cpf ? `• CNPJ/CPF: ${provider.cnpj_cpf}` : ''}
${provider.address ? `• Endereço: ${provider.address}${provider.city ? `, ${provider.city}` : ''}${provider.state ? ` - ${provider.state}` : ''}${provider.zip_code ? `, CEP: ${provider.zip_code}` : ''}` : ''}
${provider.phone ? `• Telefone: ${provider.phone}` : ''}
${provider.email ? `• E-mail: ${provider.email}` : ''}
${provider.representative_name ? `• Representante Legal: ${provider.representative_name}${provider.representative_cpf ? ` (CPF: ${provider.representative_cpf})` : ''}${provider.representative_role ? ` — ${provider.representative_role}` : ''}` : ''}

CONTRATANTE (Cliente):
• Nome / Razão Social: ${client_name}
${client_document ? `• CPF/CNPJ: ${client_document}` : ''}
${client_email ? `• E-mail: ${client_email}` : ''}
${client_address ? `• Endereço: ${client_address}${client_city ? `, ${client_city}` : ''}${client_state ? ` - ${client_state}` : ''}` : ''}


───────────────────────────────────────────────────
           CLÁUSULA 1ª — DO OBJETO
───────────────────────────────────────────────────

O presente contrato tem como objeto a prestação dos seguintes serviços pela CONTRATADA ao CONTRATANTE:

${servicesList}


───────────────────────────────────────────────────
           CLÁUSULA 2ª — DO PRAZO
───────────────────────────────────────────────────

O presente contrato terá vigência de ${durationMonths} (${durationMonths === 1 ? 'um' : durationMonths === 6 ? 'seis' : durationMonths === 12 ? 'doze' : durationMonths}) ${durationMonths === 1 ? 'mês' : 'meses'}, com início em ${formattedDate}, podendo ser renovado por igual período mediante acordo mútuo entre as partes, formalizado por escrito com antecedência mínima de 30 (trinta) dias do término.


───────────────────────────────────────────────────
           CLÁUSULA 3ª — DO VALOR E PAGAMENTO
───────────────────────────────────────────────────

Pela prestação dos serviços descritos na Cláusula 1ª, o CONTRATANTE pagará à CONTRATADA o valor total de ${formattedTotal} (${totalValue > 0 ? 'valor acordado entre as partes' : 'a definir'}).

Forma de pagamento: ${paymentLabel}${installmentInfo}

Parágrafo Único: O não pagamento na data estipulada acarretará multa de 2% (dois por cento) sobre o valor em atraso, acrescido de juros de mora de 1% (um por cento) ao mês, sem prejuízo da atualização monetária pelo índice IPCA/IBGE.


───────────────────────────────────────────────────
           CLÁUSULA 4ª — DAS OBRIGAÇÕES DA CONTRATADA
───────────────────────────────────────────────────

A CONTRATADA se compromete a:
a) Executar os serviços contratados com diligência, qualidade e dentro dos prazos acordados;
b) Manter sigilo sobre todas as informações do CONTRATANTE obtidas em razão deste contrato;
c) Comunicar prontamente ao CONTRATANTE qualquer impedimento ou atraso na execução;
d) Fornecer relatórios de progresso quando solicitado;
e) Garantir a qualidade técnica e profissional na entrega dos serviços.


───────────────────────────────────────────────────
           CLÁUSULA 5ª — DAS OBRIGAÇÕES DO CONTRATANTE
───────────────────────────────────────────────────

O CONTRATANTE se compromete a:
a) Efetuar os pagamentos nas datas estipuladas;
b) Fornecer todas as informações e materiais necessários para a execução dos serviços;
c) Designar um responsável para validar entregas e aprovar etapas;
d) Respeitar os prazos acordados para feedback e aprovação;
e) Não compartilhar, copiar ou redistribuir materiais produzidos pela CONTRATADA sem autorização prévia.


───────────────────────────────────────────────────
           CLÁUSULA 6ª — DA GARANTIA
───────────────────────────────────────────────────

A CONTRATADA oferece garantia de ${warrantyDays} (${warrantyDays === 30 ? 'trinta' : warrantyDays === 60 ? 'sessenta' : warrantyDays === 90 ? 'noventa' : warrantyDays}) dias sobre os serviços executados, contados a partir da entrega final. A garantia cobre correções de falhas ou vícios decorrentes da execução, não abrangendo alterações de escopo ou mudanças solicitadas após a entrega.


───────────────────────────────────────────────────
           CLÁUSULA 7ª — DA CONFIDENCIALIDADE
───────────────────────────────────────────────────

As partes se comprometem a manter em sigilo todas as informações confidenciais trocadas em razão deste contrato, sendo vedada sua divulgação a terceiros sem autorização expressa da outra parte, sob pena de responder por perdas e danos.


───────────────────────────────────────────────────
           CLÁUSULA 8ª — DA RESCISÃO
───────────────────────────────────────────────────

O presente contrato poderá ser rescindido:
a) Por mútuo acordo entre as partes, formalizado por escrito;
b) Por descumprimento de qualquer cláusula, mediante notificação prévia de 15 (quinze) dias;
c) Pela impossibilidade comprovada de execução dos serviços;
d) Por atraso no pagamento superior a 30 (trinta) dias.

Parágrafo Único: Em caso de rescisão antecipada por parte do CONTRATANTE sem justa causa, será devido o pagamento proporcional pelos serviços já executados, acrescido de multa rescisória de 20% (vinte por cento) sobre o valor remanescente do contrato.


───────────────────────────────────────────────────
           CLÁUSULA 9ª — DA PROPRIEDADE INTELECTUAL
───────────────────────────────────────────────────

Todos os materiais, criações e propriedade intelectual produzidos em decorrência deste contrato serão de propriedade do CONTRATANTE, após a quitação integral dos valores devidos. Até o pagamento completo, a CONTRATADA retém todos os direitos sobre os materiais produzidos.

${additional_clauses ? `
───────────────────────────────────────────────────
           CLÁUSULA 10ª — DISPOSIÇÕES ADICIONAIS
───────────────────────────────────────────────────

${additional_clauses}
` : ''}

───────────────────────────────────────────────────
           CLÁUSULA ${additional_clauses ? '11ª' : '10ª'} — DO FORO
───────────────────────────────────────────────────

As partes elegem o foro da comarca de ${provider.city || '[Cidade da Contratada]'} — ${provider.state || '[UF]'}, para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.


───────────────────────────────────────────────────
              ASSINATURAS
───────────────────────────────────────────────────

E, por estarem justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença de 2 (duas) testemunhas.

${provider.city || '[Local]'}, ${formattedDate}.


_____________________________________________
CONTRATADA: ${provider.company_name}
${provider.representative_name ? `Representante: ${provider.representative_name}` : ''}


_____________________________________________
CONTRATANTE: ${client_name}
${client_document ? `Documento: ${client_document}` : ''}


═══════════════════════════════════════════════════
  Documento gerado automaticamente pela Evoluir Mais
  Sistema de Gestão Inteligente de Contratos
═══════════════════════════════════════════════════
`.trim();

        // Gera o título do contrato
        const mainService = selected_services[0]?.name || 'Serviço';
        const contractTitle = `Contrato de Prestação — ${mainService} — ${client_name}`;

        // Cria o contrato no banco
        const { data: newContract, error: insertError } = await supabase
            .from('contracts')
            .insert({
                tenant_id: tenantId,
                title: contractTitle,
                content: contractContent,
                client_name,
                client_email: client_email || null,
                client_document: client_document || null,
                status: status || 'draft',
                provider_logo: provider.logo_url || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) throw insertError;

        console.log(`✅ Contrato gerado automaticamente: "${contractTitle}" para tenant ${tenantId}`);
        res.json(newContract);
    } catch (err) {
        console.error('❌ Erro ao gerar contrato:', err.message);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
