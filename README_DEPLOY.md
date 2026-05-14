# 🚀 Guia de Deploy - WhatsApp AI Pro

Este guia explica como colocar seu sistema em produção dividindo-o entre **Vercel (Frontend)** e **VPS (Backend)**.

## 1. Preparação (Git)
O repositório já foi inicializado. Para subir no seu GitHub:
1. Crie um repositório vazio no GitHub.
2. Rode:
   ```bash
   git add .
   git commit -m "Initial production ready commit"
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```

## 2. Deploy do Frontend (Vercel)
O Vercel é excelente para o Frontend (React).
1. Conecte seu GitHub no Vercel.
2. Selecione a pasta `frontend` como o diretório base.
3. Adicione a Variável de Ambiente:
   - `VITE_API_URL`: A URL onde seu backend estará rodando (ex: `https://api.seudominio.com`).
4. Clique em Deploy.

## 3. Deploy do Backend (VPS Hostinger)
O WhatsApp Bot exige um processo persistente, por isso **não funciona no Vercel**. Use uma VPS:
1. No terminal da sua VPS, clone o repositório.
2. Instale o Node.js e o PM2: `npm install -g pm2`.
3. Na pasta do backend, crie o arquivo `.env` baseado no `.env.example`.
4. Inicie o sistema com:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```
5. Salve a configuração para reiniciar com o servidor: `pm2 save`.

## 4. Banco de Dados e Storage
Como você está usando o **Supabase**, ele já está em produção na nuvem! Basta garantir que as chaves no `.env` da VPS sejam as mesmas que você usa localmente.

---
**Nota:** Para o WhatsApp funcionar 24h, a VPS é obrigatória. O Vercel "desliga" processos após alguns segundos, o que desconectaria o bot.
