---
description: Como instalar e configurar o módulo de contratos no WhatsApp AI Pro
---
Siga estes passos para configurar e ativar o módulo de Contratos e Assinaturas Online:

1. **Executar o SQL de Migração no Supabase**:
   - Acesse o Console do Supabase em `https://supabase.com/dashboard`.
   - Escolha o projeto do seu banco de dados.
   - Vá em **SQL Editor** no painel lateral esquerdo.
   - Crie uma query ou abra as migrações e copie o conteúdo do arquivo localizado em `backend/contracts_schema.sql`.
   - Clique em **Run** para criar a tabela `contracts` com todos os índices e colunas necessários.

2. **Verificar dependências e Inicialização**:
   - O backend já expõe automaticamente o novo módulo sob `/api/contracts`.
   - Reinicie o backend do WhatsApp AI Pro executando `npm run dev` no diretório do backend ou reinicie o container do Docker / serviço no Render/VPS.

3. **Utilização**:
   - Vá para a Dashboard do WhatsApp AI Pro e acesse "Contratos & Assinaturas" no painel principal.
   - Crie um novo rascunho de contrato digitando os termos ou fazendo upload de um anexo PDF existente.
   - Publique-o e compartilhe o link público com o cliente para assinatura.
