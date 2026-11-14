import Dexie from 'dexie'

export const db = new Dexie('EvoluirNotesDB')

db.version(1).stores({
  notes: 'id, title, folderId, *tags, createdAt, updatedAt, starred, isTrash',
  folders: 'id, name, parentId, createdAt'
})

const initialFolders = [
  {
    id: 'welcome-folder',
    name: 'Boas-vindas',
    parentId: null,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'projects-folder',
    name: 'Projetos',
    parentId: null,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 'cesinha-ia-folder',
    name: 'CESINHA IA',
    parentId: null,
    isAiKnowledgeBase: true,
    aiAgentId: 'global',
    createdAt: new Date().toISOString()
  }
]

export const cesinhaFolderData = {
  id: 'cesinha-ia-folder',
  name: 'CESINHA IA',
  parentId: null,
  isAiKnowledgeBase: true,
  aiAgentId: 'global',
  createdAt: new Date().toISOString()
}

export const cesinhaNotes = [
  {
    id: 'cesinha-visao-geral',
    title: 'Visão Geral - Vereador Cesinha (Macaé)',
    folderId: 'cesinha-ia-folder',
    tags: ['cesinha', 'vereador', 'macae', 'lideranca', 'visao-geral', 'base-ia'],
    starred: 1,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Visão Geral - Vereador Cesinha (Macaé) 🏛️

**Nilton César Pereira Moreira**, amplamente conhecido pela população como **Cesinha** ou **Cesinha Com Todo Gás**, é uma das lideranças políticas mais expressivas, votadas e atuantes do município de **Macaé (RJ)**.

---

## 📌 Perfil e Informações Institucionais

| Informação | Detalhe |
| :--- | :--- |
| **Nome Completo** | Nilton César Pereira Moreira |
| **Nome Parlamentar / Urna** | Cesinha / Cesinha Com Todo Gás |
| **Data de Nascimento** | 18 de dezembro de 1972 (51 anos) |
| **Naturalidade** | São Pedro da Aldeia (RJ) - radicado em Macaé desde os 14 anos |
| **Bairro de Residência** | Bairro Aroeira (desde 1994) |
| **Família** | Casado com Rosileny Moreira; pai de Matheus e Lucas; avô de Miguel |
| **Mandatos como Vereador** | 4 mandatos consecutivos: 2012, 2016, 2020 e 2024 |
| **Cargos no Legislativo** | Ex-Presidente da Câmara de Macaé (2021-2022 e 2023-2024 reconduzido por unanimidade), Líder do Governo e 2º Vice-Presidente da Mesa Diretora |

---

## 🏆 Desempenho Eleitoral Histórico

- **Eleições 2012:** Eleito vereador pela 1ª vez com expressiva representatividade popular.
- **Eleições 2016:** Reeleito com **3.390 votos** (pelo PROS).
- **Eleições 2020:** O **vereador mais votado de Macaé**, com **2.856 votos** em plena pandemia.
- **Eleições 2024:** Bateu o **recorde histórico** de todas as eleições municipais de Macaé, sagrando-se o vereador mais votado da história da cidade com **5.476 votos** (pelo Cidadania).
- **Eleições Estaduais 2026 (ALERJ):** Concorreu a Deputado Estadual pelo PSB, conquistando **30.257 votos** em todo o estado do Rio de Janeiro e obtendo a suplência legislativa.

---

## 🧭 Pilares de Atuação Parlamentar

1. **Causa Autista e PcD:** Reconhecido como o maior defensor das famílias atípicas e pessoas com deficiência na história do município. Veja a legislação detalhada em [[Causa Autista e PcD - Marco Legislativo]].
2. **Infraestrutura e Zeladoria nos Bairros:** Requerimentos contínuos para drenagem, pavimentação asfáltica, saneamento e iluminação pública na Aroeira, Lagomar, Aeroporto e interior. Consulte [[Requerimentos e Atuação nos Bairros]].
3. **Gestão e Sustentabilidade:** Como presidente da Câmara, transformou o Legislativo em modelo de autossuficiência ecológica com usina de energia solar e processo 100% digital. Confira em [[Presidência da Câmara e Gestão do Legislativo]].
4. **Projetos Sociais e Juventude:** Apoio ao esporte de base, formação técnica de jovens para o setor offshore e campanhas comunitárias permanentes. Leia mais em [[Pautas Principais e Leis Aprovadas]].

---

## 🔍 Consulta Rápida para IA e RAG
Para respostas diretas a perguntas frequentes e dados prontos para assistentes de inteligência artificial, consulte a nota estruturada em [[Perguntas Frequentes e Posicionamentos (Base IA)]] e a trajetória de superação em [[Biografia e Origens - Cesinha]].`
  },
  {
    id: 'cesinha-biografia-origens',
    title: 'Biografia e Origens - Cesinha',
    folderId: 'cesinha-ia-folder',
    tags: ['biografia', 'historia', 'aroeira', 'serra-macaense', 'trajetoria', 'superacao'],
    starred: 0,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Biografia e Origens - Cesinha 📖

A história de **Nilton César Pereira Moreira (Cesinha)** é marcada pelo trabalho honesto desde muito jovem, pela superação de adversidades e pela profunda ligação de proximidade com o povo macaense.

Retorne à [[Visão Geral - Vereador Cesinha (Macaé)]].

---

## 🌿 Raízes e Chegada a Macaé

- Nascido em 18 de dezembro de 1972 em São Pedro da Aldeia (RJ).
- Aos 14 anos, transferiu-se com a família para a **Região Serrana de Macaé**, vivenciando de perto a realidade das comunidades do interior (Córrego do Ouro, Sana, Glicério e Trapiche).
- Na juventude, exerceu diversas atividades humildes para auxiliar nas contas de casa: atuou em serviços de hotelaria e trabalhou como **frentista em posto de combustível**. Essa experiência no atendimento direto ao público fortaleceu sua escuta atenta às dificuldades do cidadão comum.

---

## 🚛 O Bairro Aroeira e o "Com Todo Gás"

- Em 1994, Cesinha fixou residência no **bairro Aroeira**, um dos mais tradicionais e populosos bairros de Macaé.
- Empreendeu no setor de distribuição de gás de cozinha (GLP). A agilidade, atenção e prontidão em socorrer as famílias nos momentos mais urgentes deram origem ao apelido popular: **"Cesinha Com Todo Gás"**.
- Como líder comunitário natural, promovia mutirões, organizava eventos esportivos e prestava apoio social às famílias em vulnerabilidade muito antes de ingressar formalmente na vida pública.

---

## 👨‍👩‍👦 Família e Valores

Cesinha é casado com **Rosileny Moreira**, com quem construiu uma união sólida e participativa em Macaé. É pai de dois filhos, **Matheus** e **Lucas**, e avô de **Miguel**. Declara com frequência que os valores cristãos, a família e a lealdade comunitária são seus maiores guias na atividade política.

---

## 📈 Trajetória Eleitoral Ascendente

1. **Década de 1990/2000:** Atuação em coordenações e bases partidárias.
2. **2012:** Eleito vereador pela primeira vez.
3. **2016:** Reeleito com 3.390 votos (PROS).
4. **2020:** O vereador mais votado da cidade com 2.856 votos.
5. **2024:** Recorde absoluto em Macaé com 5.476 votos (Cidadania).
6. **2026:** Conquistou 30.257 votos para deputado estadual (PSB), conquistando a suplência na ALERJ.

Conheça sua atuação no comando da Casa Legislativa em [[Presidência da Câmara e Gestão do Legislativo]] e seus projetos sociais em [[Pautas Principais e Leis Aprovadas]].`
  },
  {
    id: 'cesinha-autismo-pcd',
    title: 'Causa Autista e PcD - Marco Legislativo',
    folderId: 'cesinha-ia-folder',
    tags: ['autismo', 'tea', 'pcd', 'inclusao', 'leis', 'saude', 'direitos-humanos'],
    starred: 1,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Causa Autista e PcD - Marco Legislativo 🧩

A defesa intransigente das **Pessoas com Deficiência (PcD)** e, em especial, das pessoas com **Transtorno do Espectro Autista (TEA)** e suas famílias atípicas, consolidou o mandato de Cesinha como referência regional e estadual em inclusão.

Consulte o contexto geral em [[Visão Geral - Vereador Cesinha (Macaé)]] e as demais pautas em [[Pautas Principais e Leis Aprovadas]].

---

## 📜 1. Lei do Laudo Médico Permanente (Validade Indeterminada)

- **Legislação:** Lei Municipal / Projeto nº 099/2023 de autoria do vereador Cesinha.
- **O Problema Histórico:** Mães atípicas e responsáveis por pessoas com autismo ou Síndrome de Down eram submetidos a burocracias desgastantes, tendo que renovar laudos a cada 6 ou 12 meses para garantir terapias, medicamentos e direitos escolares — embora o autismo seja uma condição permanente.
- **A Conquista:** A lei aprovada estabeleceu o **caráter permanente (validade indeterminada)** para laudos médicos que atestam TEA e Síndrome de Down em Macaé, acabando com a via-crúcis documental nas repartições públicas do município.

---

## 👶 2. Triagem Precoce nas Unidades de Saúde e Creches (Escala M-CHAT)

- **Proposta:** Implementação de protocolo obrigatório de triagem do autismo com a aplicação do questionário **M-CHAT** (Modified Checklist for Autism in Toddlers).
- **Âmbito:** Consultas de rotina pediátrica na rede pública básica (ESF/UBS) e acompanhamento periódico em creches municipais para crianças entre 16 e 30 meses.
- **Benefício:** A identificação dos primeiros sinais de atraso no neurodesenvolvimento viabiliza estímulos e intervenções multidisciplinares antes dos 3 anos de idade, mudando o prognóstico de vida da criança.

---

## 📅 3. Política Municipal de Proteção dos Direitos da Pessoa com TEA

- Instituição da **Semana Municipal de Conscientização do Autismo** no calendário oficial da cidade de Macaé.
- Obrigatoriedade do atendimento prioritário e humanizado para autistas e seus acompanhantes em estabelecimentos públicos e privados.
- Inclusão do símbolo do laço do autismo (fita quebra-cabeça) nas placas de prioridade de agências bancárias, mercados e órgãos municipais.

---

## 🏛️ 4. Frente Parlamentar em Defesa dos Direitos das Pessoas com Deficiência

Como presidente da Frente Parlamentar PcD na Câmara de Macaé, Cesinha realiza constantes audiências e reuniões com:
- **MOPAM** (Motivados pelo Autismo de Macaé);
- **APAE Macaé** e **Sociedade Pestalozzi**;
- Secretarias Municipais de Educação, Saúde e Desenvolvimento Social;
- Coletivos de pais e mães atípicas de todos os bairros.

Demandas prioritárias: ampliação de mediadores e profissionais de apoio escolar na sala de aula regular, garantia de terapias (fonoaudiologia, TO, psicologia ABA) e acessibilidade no transporte público coletivo.

Veja os requerimentos de acessibilidade urbana em [[Requerimentos e Atuação nos Bairros]].`
  },
  {
    id: 'cesinha-pautas-leis',
    title: 'Pautas Principais e Leis Aprovadas',
    folderId: 'cesinha-ia-folder',
    tags: ['pautas', 'projetos-de-lei', 'legislacao', 'macae', 'politicas-publicas', 'saude', 'juventude'],
    starred: 0,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Pautas Principais e Leis Aprovadas 📋

Além da marcante bandeira de inclusão (detalhada em [[Causa Autista e PcD - Marco Legislativo]]), o mandato de Cesinha abrange áreas cruciais da administração pública e do dia a dia da população macaense.

Voltar para a [[Visão Geral - Vereador Cesinha (Macaé)]].

---

## 🩺 1. Saúde Pública e Prevenção

- **Diagnóstico Precoce de Fraturas (Sistema FRAX):** Indicação legislativa e requerimento solicitando a adoção da ferramenta de cálculo FRAX (avaliação de risco de fraturas osteoporóticas) nos postos municipais para proteger idosos e mulheres pós-menopausa.
- **Postos de Saúde da Família (ESF):** Cobrança para presença contínua de médicos clínicos, ginecologistas e pediatras nas unidades dos bairros mais afastados.
- **Farmácia Municipal Abastecida:** Acompanhamento e fiscalização dos estoques de remédios essenciais para controle de pressão arterial, diabetes e saúde mental.

---

## 💧 2. Tarifa Social de Água e Saneamento

- Atuação enérgica na cobrança das concessionárias de água e esgoto que operam em Macaé.
- Fiscalização da aplicação irrestrita da **Tarifa Social de Esgoto**, garantindo descontos a famílias de baixa renda inscritas no Cadastro Único (CadÚnico) e beneficiárias do Benefício de Prestação Continuada (BPC).

---

## ⚽ 3. Esporte Comunitário e Cidadania

- Apoio direto a escolinhas esportivas comunitárias nos bairros (Aroeira, Lagomar, Aeroporto, Malvinas e Nova Holanda).
- Incentivo e custeio de transporte para jovens atletas amadores de jiu-jitsu, judô, futebol e atletismo que representam Macaé em campeonatos regionais e nacionais.
- Construção e reforma de quadras poliesportivas com grama sintética e iluminação adequada para a prática noturna.

---

## 👷 4. Juventude e Primeiro Emprego

- Articulação com sindicatos, SENAI e IFRJ para oferta de cursos técnicos gratuitos voltados à cadeia de óleo, gás, energia solar e logística portuária.
- Estímulo para contratação de jovens aprendizes e estagiários do município em empresas prestadoras de serviço da Prefeitura de Macaé.

---

## 🐶 5. Causa Animal e Saúde Pública

- Incentivo às ações de castração gratuita itinerante (castramóvel) nos bairros e na serra para controle populacional de cães e gatos.
- Apoio estrutural ao Centro de Controle de Zoonoses (CCZ) e combate rigoroso aos maus-tratos a animais.

Para ver as intervenções físicas e obras decorrentes dessas pautas, consulte [[Requerimentos e Atuação nos Bairros]].`
  },
  {
    id: 'cesinha-requerimentos-bairros',
    title: 'Requerimentos e Atuação nos Bairros',
    folderId: 'cesinha-ia-folder',
    tags: ['requerimentos', 'obras', 'infraestrutura', 'bairros', 'macae', 'fiscalizacao', 'saneamento'],
    starred: 0,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Requerimentos e Atuação nos Bairros 🏗️

A marca registrada do mandato de Cesinha é a presença nas ruas e o modelo de "Gabinete Itinerante", acolhendo as reivindicações dos moradores e transformando-as formalmente em **Requerimentos (REQ)** e **Indicações (IND)** ao Poder Executivo Municipal.

Consulte também [[Pautas Principais e Leis Aprovadas]] e a [[Visão Geral - Vereador Cesinha (Macaé)]].

---

## 📍 Atuação por Bairros e Regiões de Macaé

### 1. Bairro Aroeira (Berço Comunitário)
- **Pavimentação e Asfalto:** Solicitações constantes de recapeamento e manutenção asfáltica em vias de grande circulação.
- **Drenagem Pluvial:** Intervenções para solucionar pontos históricos de alagamentos que prejudicavam moradores e comerciantes locais em dias de fortes chuvas.
- **Espaços Públicos:** Revitalização da Praça da Aroeira, modernização da iluminação para luminárias de LED de alta potência e sinalização de trânsito.

### 2. Lagomar e Parque Aeroporto
- **Macrodrenagem e Saneamento:** Cobrança constante do cronograma de macrodrenagem pluvial para prevenir enchentes no Lagomar.
- **Postos de Saúde:** Reivindicação de reformas, ampliação de consultórios e médicos plantonistas nas unidades do Lagomar e Parque Aeroporto.
- **Transporte Público:** Pedidos para ampliação e cumprimento pontual dos horários das linhas de ônibus que atendem aos trabalhadores da região.

### 3. Barra de Macaé, Fronteira e Nova Holanda
- **Limpeza de Rios e Canais:** Requerimentos para dragagem preventiva do Rio Macaé e desobstrução de canais pluviais.
- **Segurança Comunitária:** Apoio à iluminação de praças e instalação de totens de monitoramento.

### 4. Região Serrana de Macaé (Sana, Córrego do Ouro, Glicério, Trapiche, Frade)
- **Estradas Vicinais e Pontes:** Manutenção permanente com patrolamento e saibro para garantir o escoamento da produção rural e a circulação segura do transporte escolar.
- **Abastecimento de Água Tratada:** Cobrança por extensão de redes e poços artesianos para famílias do campo.
- **Saúde na Serra:** Apoio para plantão de ambulâncias 24h e atendimento médico regular nos distritos serranos.
- **Fomento ao Ecoturismo:** Apoio aos pequenos produtores, pousadeiros e feiras culturais da serra macaense.

---

## 🧹 Fiscalização Urbana e Zeladoria

- **Terrenos Baldios:** Requerimentos de fiscalização e notificação aos proprietários para limpeza e cercamento de terrenos abandonados, combatendo focos de dengue (*Aedes aegypti*) e pragas urbanas.
- **Operação Tapa-Buracos e Bueiros:** Monitoramento contínuo das secretarias competentes para desobstrução de galerias pluviais antes dos temporais de verão.

Conheça como Cesinha liderou a Casa Legislativa em [[Presidência da Câmara e Gestão do Legislativo]].`
  },
  {
    id: 'cesinha-presidencia-camara',
    title: 'Presidência da Câmara e Gestão do Legislativo',
    folderId: 'cesinha-ia-folder',
    tags: ['presidencia', 'camara-macae', 'gestao', 'sustentabilidade', 'economia', 'energia-solar'],
    starred: 0,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Presidência da Câmara e Gestão do Legislativo 🏛️⚡

Cesinha esteve à frente da presidência da **Câmara Municipal de Macaé (Palácio Natálio Salvador Antunes)** por dois biênios consecutivos (**2021–2022** e **2023–2024**), deixando um legado de modernização administrativa, sustentabilidade ambiental e equilíbrio institucional.

Retorne à [[Visão Geral - Vereador Cesinha (Macaé)]].

---

## ☀️ 1. Energia Solar Fotovoltaica na Câmara

- **Iniciativa Pioneira:** Cesinha viabilizou a implantação de uma moderna usina de **energia solar fotovoltaica** no prédio da Câmara Municipal de Macaé.
- **Resultados:**
  - Redução substancial das contas de consumo elétrico do Legislativo, gerando economia expressiva de recursos públicos.
  - Macaé passou a figurar entre os primeiros parlamentos do Estado do Rio de Janeiro com matriz energética 100% limpa e renovável.
  - Exemplo prático de que sustentabilidade gera economia real aos cofres do município.

---

## 🤝 2. Eleição Inicial e Recondução por Unanimidade

- **Biênio 2021–2022:** Eleito em disputa acirrada (9 votos a 8) no início de 2021, assumiu o desafio de conduzir a Câmara durante os períodos mais críticos da pandemia da COVID-19, assegurando transparência, sessões plenárias funcionais e zelo fiscal.
- **Biênio 2023–2024:** Fruto da postura republicana, do diálogo com todas as bancadas e da gestão transparente, foi **reconduzido à Presidência por UNANIMIDADE** (17 votos favoráveis dos 17 vereadores de Macaé), marco raro na história política do município.

---

## 💻 3. Câmara Sem Papel e Transparência Digital

- Digitalização integral dos trâmites legislativos pelo sistema SAPL, reduzindo drasticamente o consumo de papel, toners e impressões.
- Transmissão ao vivo de 100% das sessões plenárias, audiências públicas e reuniões de comissões em alta definição pelos canais oficiais da Câmara (YouTube e redes sociais), permitindo a participação popular direta.

---

## 🏛️ 4. Articulação Política e Liderança de Governo

- Após a presidência, Cesinha assumiu o papel de **Líder do Governo do prefeito Welberth Rezende** no Legislativo.
- Sua habilidade de mediação permitiu acelerar a votação e aprovação de grandes pacotes de investimentos estruturantes para a cidade, como obras de macrodrenagem, saneamento, revitalização hospitalar e o novo terminal portuário.
- Atualmente, integra a Mesa Diretora da Câmara como **2º Vice-Presidente**.

Para dados rápidos de consulta, consulte [[Perguntas Frequentes e Posicionamentos (Base IA)]].`
  },
  {
    id: 'cesinha-faq-posicionamentos',
    title: 'Perguntas Frequentes e Posicionamentos (Base IA)',
    folderId: 'cesinha-ia-folder',
    tags: ['faq', 'ia', 'pesquisas', 'posicionamento', 'respostas-rapidas', 'base-conhecimento'],
    starred: 1,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Perguntas Frequentes e Posicionamentos (Base IA) 🤖💬

Esta nota foi estruturada em pares de **Pergunta e Resposta Direta** para alimentar o agente de inteligência artificial, pesquisas rápidas e consultas de alta precisão sobre o vereador **Cesinha (Nilton César Pereira Moreira)** de Macaé.

Retorne à [[Visão Geral - Vereador Cesinha (Macaé)]].

---

### ❓ P: Quem é o vereador Cesinha de Macaé?
**R:** Nilton César Pereira Moreira, conhecido popularmente como Cesinha ou "Cesinha Com Todo Gás", é um líder comunitário, empresário e político de Macaé (RJ). Exerce atualmente seu 4º mandato consecutivo como vereador, tendo sido eleito o mais votado da história da cidade.

### ❓ P: Qual foi a votação de Cesinha nas eleições de 2024?
**R:** Cesinha obteve **5.476 votos** na eleição municipal de 2024 (pelo partido Cidadania), batendo o recorde histórico absoluto de maior votação nominal para vereador em toda a história de Macaé.

### ❓ P: Qual a principal lei de Cesinha em defesa dos autistas?
**R:** A **Lei Municipal nº 099/2023**, de sua autoria, que conferiu **validade indeterminada (caráter permanente)** aos laudos médicos que atestam o Transtorno do Espectro Autista (TEA) e a Síndrome de Down no município de Macaé, extinguindo a burocracia de renovação periódica para as famílias atípicas. Detalhes em [[Causa Autista e PcD - Marco Legislativo]].

### ❓ P: Cesinha já foi presidente da Câmara Municipal de Macaé?
**R:** Sim. Presidiu o Poder Legislativo de Macaé por dois biênios consecutivos: 2021–2022 e 2023–2024 (neste último, eleito por votação unânime de todos os 17 vereadores). Durante sua administração, instalou usina de energia solar fotovoltaica no prédio da Câmara. Veja em [[Presidência da Câmara e Gestão do Legislativo]].

### ❓ P: Quais são os principais bairros e regiões de atuação do vereador?
**R:** Sua base histórica comunitária é o bairro **Aroeira**, além de forte presença no **Lagomar**, **Parque Aeroporto**, **Barra de Macaé**, **Nova Holanda** e em todos os distritos da **Região Serrana de Macaé** (Sana, Córrego do Ouro, Glicério, Trapiche e Frade). Consulte [[Requerimentos e Atuação nos Bairros]].

### ❓ P: De onde surgiu o apelido "Cesinha Com Todo Gás"?
**R:** Nos anos 1990, Cesinha empreendeu abrindo uma distribuidora de botijões de gás no bairro Aroeira. Sua prontidão, agilidade no atendimento e prestatividade com os vizinhos geraram o apelido que mais tarde virou seu nome oficial de campanha. Mais detalhes em [[Biografia e Origens - Cesinha]].

### ❓ P: Qual o papel de Cesinha junto ao Governo Municipal de Macaé?
**R:** Atua como elo de conciliação institucional, tendo desempenhado a função de **Líder do Governo do prefeito Welberth Rezende** na Câmara de Macaé para acelerar a aprovação de projetos de infraestrutura, saúde e atração de empresas para a cidade.

### ❓ P: Como Cesinha atua nas áreas de juventude e esporte?
**R:** Apoia projetos comunitários de escolinhas de futebol, academias de artes marciais (jiu-jitsu e judô) e atletas locais, além de defender parcerias com o SENAI e IFRJ para qualificação de jovens e programas de primeiro emprego no setor de energia. Detalhes em [[Pautas Principais e Leis Aprovadas]].

---

> Base de conhecimento estruturada e integrada ao **Evoluir Notes / WhatsApp AI Pro**. Pronta para consumo por agentes e RAG.`
  }
]

const initialNotes = [
  {
    id: 'getting-started',
    title: 'Começando com o Evoluir Notes',
    folderId: 'welcome-folder',
    tags: ['bem-vindo', 'guia', 'produtividade'],
    starred: 1,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Bem-vindo ao Evoluir Notes ✨

O **Evoluir Notes** é o seu ambiente de pensamento conectado inspirado no Obsidian, projetado para organizar suas ideias com elegância, rapidez e foco total.

---

## 🔗 Wiki-Links Bidirecionais
Conecte suas notas de forma natural utilizando a sintaxe de colchetes duplos:
- Conheça nossa [[Sintaxe Markdown]] para formatar textos perfeitamente.
- Visualize como seus pensamentos se entrelaçam através da [[Visão em Grafo]].
- Domine os [[Atalhos de Teclado]] para navegar sem tirar as mãos das teclas.

Ao clicar em um wiki-link como [[Visão em Grafo]], você navega instantaneamente para a nota correspondente!

---

## 🏷️ Tags Dinâmicas
Adicione tags em qualquer lugar do seu texto com a cerquilha \`#\`:
#produtividade #conhecimento #segundo-cerebro #estudos

Todas as tags são indexadas automaticamente e permitem filtrar notas na barra lateral e colorir nós no grafo.

---

## ⚡ Atalhos Rápidos
- **Ctrl + N** : Nova Nota
- **Ctrl + P** : Paleta de Comandos
- **Ctrl + Shift + G** : Alternar Visão em Grafo
- **Ctrl + S** : Salvar manualmente (o app já salva automaticamente!)
- **Ctrl + F** : Focar na busca

---

## 📝 Suporte Completo a Markdown & Matemática
Listas de tarefas interativas:
- [x] Experimentar a alternância entre Modos (Editar, Visualizar, Dividido)
- [x] Testar a criação de um [[Novo Tópico]]
- [ ] Explorar os nós na Visão em Grafo

Fórmulas matemáticas com KaTeX:
$$f(x) = \\int_{-\\infty}^\\infty \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi$$

Blocos de código destacados:
\`\`\`javascript
const evoluir = {
  knowledge: 'connected',
  theme: 'catppuccin-mocha',
  offlineFirst: true
};
console.log('Ideias fluindo livremente!');
\`\`\`

> *"A clareza mental começa na organização dos pensamentos."*
`
  },
  {
    id: 'markdown-syntax',
    title: 'Sintaxe Markdown',
    folderId: 'welcome-folder',
    tags: ['markdown', 'dicas', 'produtividade'],
    starred: 0,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Sintaxe Markdown no Evoluir Notes ✍️

O editor suporta formatação rica com Markdown padrão e extensões do GitHub (GFM).

Retorne para a página inicial em [[Começando com o Evoluir Notes]].

### Formatação de Texto
- **Negrito**: \`**texto**\`
- *Itálico*: \`*texto*\` ou \`_texto_\`
- ~~Tachado~~: \`~~texto~~\`
- Código inline: \`\`código\`\`

### Tabelas Elegantes

| Recurso | Suportado | Detalhes |
| :--- | :---: | :--- |
| Wiki-links | ✅ | Sintaxe \`[[Nome da Nota]]\` |
| Tags | ✅ | Sintaxe \`#tag\` |
| Equações KaTeX | ✅ | Inline \`$x^2$\` ou bloco \`$$\` |
| Grafo Interativo | ✅ | Renderizado com D3.js |

Veja também a [[Visão em Grafo]] para explorar as conexões desta nota.`
  },
  {
    id: 'graph-view-guide',
    title: 'Visão em Grafo',
    folderId: 'welcome-folder',
    tags: ['grafo', 'visualizacao', 'conhecimento'],
    starred: 0,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Visão em Grafo 🌐

A Visão em Grafo do **Evoluir Notes** mapeia a rede neural de todas as suas anotações.

### Como funciona?
1. Cada nota se torna um nó dinâmico no espaço.
2. Cada wiki-link (como [[Começando com o Evoluir Notes]]) gera uma aresta conectando os nós.
3. Você pode dar zoom, arrastar os nós e clicar diretamente neles para abrir a nota.
4. Experimente pressionar **Ctrl + Shift + G** para abrir o Grafo em tela cheia!

Descubra mais dicas em [[Atalhos de Teclado]].`
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Atalhos de Teclado',
    folderId: 'welcome-folder',
    tags: ['atalhos', 'produtividade'],
    starred: 0,
    isTrash: 0,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Atalhos de Teclado ⌨️

Acelere seu fluxo de trabalho no Evoluir Notes:

| Atalho | Ação |
| :--- | :--- |
| **Ctrl + N** / **Cmd + N** | Criar nova nota instantaneamente |
| **Ctrl + P** / **Cmd + P** | Abrir Paleta de Comandos rápida |
| **Ctrl + Shift + G** | Abrir/Fechar a Visão em Grafo |
| **Ctrl + S** / **Cmd + S** | Forçar salvamento da nota ativa |
| **Ctrl + F** / **Cmd + F** | Focar no campo de busca |
| **Esc** | Fechar modais (Grafo, Paleta de Comandos) |

Voltar para [[Começando com o Evoluir Notes]].`
  },
  ...cesinhaNotes
]

export async function seedDatabase() {
  const folderCount = await db.folders.count()
  const noteCount = await db.notes.count()

  if (folderCount === 0) {
    await db.folders.bulkAdd(initialFolders)
  }

  if (noteCount === 0) {
    await db.notes.bulkAdd(initialNotes)
  }

  // Garante que a pasta 'CESINHA IA' e todas as suas notas estejam disponíveis
  try {
    const existingFolder =
      (await db.folders.get('cesinha-ia-folder')) ||
      (await db.folders.where('name').equalsIgnoreCase('CESINHA IA').first())

    const folderId = existingFolder ? existingFolder.id : 'cesinha-ia-folder'

    if (!existingFolder) {
      await db.folders.add({
        id: 'cesinha-ia-folder',
        name: 'CESINHA IA',
        parentId: null,
        isAiKnowledgeBase: true,
        aiAgentId: 'global',
        createdAt: new Date().toISOString()
      })
    }

    for (const note of cesinhaNotes) {
      const existing = await db.notes.get(note.id)
      if (!existing) {
        await db.notes.add({
          ...note,
          folderId
        })
      }
    }
  } catch (err) {
    console.warn('[seedDatabase] Verificação da pasta CESINHA IA:', err)
  }
}

export default db
