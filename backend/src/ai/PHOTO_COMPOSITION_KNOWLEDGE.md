# Base de Conhecimento — Diagramação do Módulo Foto com Candidato

## 1. Contexto e Especificações Visuais
Este documento serve como a base de conhecimento permanente para o processamento de imagens do módulo "Foto com Candidato" (Apoio de Campanhas). O design tem como objetivo criar montagens de estúdio profissionais onde o apoiador (eleitor) aparece lado a lado com o candidato, sem distorções e com a máxima originalidade.

## 2. Padrão de Composição ("Estilo Canva/ChatGPT")
Para manter a originalidade e o padrão visual da marca da campanha:

*   **Tamanho do Canvas Fixo:** O canvas deve manter exatamente o tamanho (`W` x `H`) e a proporção de aspecto do template original (geralmente formato retrato vertical de uma única coluna, ex: `9:16` ou similar). Nenhuma alteração de largura ou altura final deve ser feita.
*   **Posicionamento Lado a Lado & Profundidade (Apoia por Trás):**
    *   O apoiador (eleitor) deve ser desenhado **atrás** do ombro do candidato se houver sobreposição espacial, exatamente como nas montagens profissionais do Canva.
    *   Para que isso ocorra em uma imagem de template plana (flat), o sistema identifica a cor de fundo original do template (amostrando um pixel próximo do canto superior direito), preenche o fundo do canvas com essa cor sólida, desenha o eleitor por cima do fundo, e depois sobrepõe com a silhueta recortada (via chroma key dinâmico) do candidato e das escritas do template.
*   **Enquadramento de Retrato (Close-Up / Heads Alinhados):**
    *   Para garantir que o eleitor apareça na mesma proporção física e tamanho de cabeça que o candidato, limitamos a silhueta em uma **Bounding Box** lateral.
    *   A cabeça do eleitor deve ser alinhada verticalmente com a cabeça do candidato (topo iniciando a **8% do topo do Canvas**).
    *   A Bounding Box limita o eleitor a no máximo **52% da largura do canvas** e **80% da altura de canvas**.
    *   A largura é proporcional, utilizando a proporção real da silhueta (`dw = dh * voterAspect`).
    *   Isso evita cabeças desproporcionais (gigantes) ou encolhimento, garantindo aspecto lado-a-lado profissional.
*   **Rodapé Protetor (Layer de Banner Superior):**
    *   A faixa de rodapé e banner de nome original do template do candidato (correspondendo aos **45% inferiores da altura**) deve ser recortada do template e carimbada/desenhada por cima do eleitor.
    *   Isso esconde qualquer corte na cintura do eleitor, oculta o corte horizontal reto da camisa do candidato e protege os logos, números e textos do candidato de sobreposição.
*   **Texto superior:** A pedido expresso do usuário, o título "[ELEITOR] APOIA" foi inteiramente descontinuado/removido na parte superior, permitindo o design original limpo do template no topo.

## 3. Fluxo de Processamento de Imagem (Backend Engine)
1. **Passo 1:** O fundo da foto do eleitor é removido usando o Inspyrenet/BRIA.
2. **Passo 2:** As bordas transparentes da silhueta do eleitor são recortadas (aprimoramento `trimTransparentBorders`) para isolar o corpo do eleitor e evitar miniaturização devido a enquadramentos de paisagem.
3. **Passo 3:** O sistema amostra a cor de fundo do template original e preenche o canvas.
4. **Passo 4:** Desenha a silhueta do eleitor no lado correto (esquerdas ou direita) com sombra projetada (`rgba(0,0,0,0.45)`).
5. **Passo 5 (Chroma Key Dinâmico):** Cria uma versão transparente do template isolando o candidato e os textos do fundo (utilizando tolerância Euclidiana de cores), desenhando-a por cima do eleitor.
6. **Passo 6:** O rodapé/banner (45% inferior do canvas) é restaurado sobrepondo o eleitor e candidato.
