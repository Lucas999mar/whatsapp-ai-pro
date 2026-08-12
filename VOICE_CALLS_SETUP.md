# 📞 Configuração de Ligações de Voz com IA (Pipecat + Telnyx)

Este guia ensina como conectar a plataforma de telefonia **Telnyx** e o orquestrador **Pipecat** (ou o simulador integrado) ao módulo de ligações de voz da plataforma.

---

## 🚀 1. O Simulador Integrado (Sem Custos Iniciais)

Para permitir testes imediatos sem precisar de contratação física no primeiro momento, incluímos um **Simulador de Linha Conversacional** em tempo real no sistema:
1. Vá em **Disparo em Massa**.
2. Clique na aba **📞 Ligações de IA**.
3. Crie uma nova campanha com seu **Script** (prompt do comportamento da IA) e adicione números de teste.
4. Clique em **Disparar** (ex: botão play).
5. O simulador processará cada ligação simulando tempos de ring reais, gerando áudio e gerando transcrições dinâmicas realistas baseando-se no comportamento que você instruiu seu script a ter. Se o cliente simulado aceitar, a integração chamará o WhatsApp real dele enviando o follow-up configurado na tela!

---

## 🛠️ 2. Ativação Real: Configuração do Telnyx (Operadora VoIP)

Quando decidir ligar para telefones reais das pessoas de forma automatizada, siga os seguintes passos:

### Passo A: Criar Conta e Token Telnyx
1. Crie uma conta em [Telnyx.com](https://telnyx.com).
2. Adicione fundos de teste (eles costumam dar de US$ 5 a 10 de crédito inicial ao verificar e-mail/celular).
3. Vá ao menu **API Keys** e crie uma nova API Key (chave privada). Copie ela.

### Passo B: Comprar um Número Virtual (DDI +55)
1. No menu lateral, acesse **Numbers** > **Search & Buy**.
2. Escolha **Brazil (+55)**, escolha a região/cidade (ex: São Paulo - DD11, Rio - DD21) e compre um número (custa cerca de R$4,00 a R$6,00/mês).

### Passo C: Configurar Conexão SIP (SIP Connection)
1. Vá em **Voice** > **SIP Connections** > **Create SIP Connection**.
2. Nomeie-a (ex: `whatsapp-ai-agent`).
3. Nas propriedades de entrada do número comprado, associe-o a esta SIP Connection.
4. Defina o domínio SIP correspondente (ex: `sip.telnyx.com` ou o subdomínio gerado para sua conexão).

### Passo D: Configurar credenciais no Painel
1. Na plataforma, acesse **Disparo em Massa** > **📞 Ligações de IA** > **Configurar Telnyx** (canto superior direito).
2. Insira a **API Key**, o **Domínio SIP** e o **Número Originador** (ex: o número comprado no formato internacional `+5511999999999`).
3. Clique em **Salvar**.

---

## 🤖 3. Conectando o Pipecat (Orquestrador)

O **Pipecat** (pipecat.ai) é o motor open-source de processamento de áudio em tempo real (STT + LLM + TTS). A arquitetura do sistema funciona da seguinte forma:

```
[Telnyx SIP Call] ──► [WebSocket bidirecional] ──► [Servidor Pipecat] ──► [Whisper & GPT-4o-mini]
```

### Rodando o Pipecat (Self-Hosted Grátis)

Você pode hospedar o pipeline do Pipecat no mesmo VPS ou máquina local. Um modelo básico configurado é disponibilizado assim:

1. Clone a biblioteca Python do Pipecat:
   ```bash
   git clone https://github.com/pipecat-ai/pipecat.git
   cd pipecat
   ```
2. Instale dependências:
   ```bash
   pip install pipecat-ai[openai,deepgram,daily]
   ```
3. Aponte a URL do webhook do seu backend Node para disparar ações ou recolher as transcrições detalhadas.

### 🌟 Dica de Ativação Rápida
Se não quiser ter o trabalho de subir infraestrutura para o Pipecat em Python, você pode apenas habilitar o serviço em plataformas gerenciadas como o **Vapi.ai** (vapi.ai) ou **Retell AI**, inserindo o prompt da sua campanha diretamente por fora e integrando o webhook deles no nosso banco de dados.

---

O sistema já está 100% pronto no ar, vá na aba **Ligações de IA** e comece a rodar seus testes! 📞🔥
