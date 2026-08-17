# Base de Conhecimento — Diagramação do Módulo Foto com Candidato

## 1. Contexto e Especificações Visuais
Este documento serve como a base de conhecimento permanente para o processamento de imagens do módulo "Foto com Candidato" (Apoio de Campanhas). O design tem como objetivo criar montagens de estúdio profissionais onde o apoiador (eleitor) aparece lado a lado com o candidato, sem distorções e com a máxima originalidade.

## 2. Padrão de Composição ("Estilo Canva/ChatGPT")
Para manter a originalidade e o padrão visual da marca da campanha:

*   **Tamanho do Canvas Fixo:** O canvas deve manter exatamente o tamanho (`W` x `H`) e a proporção de aspecto do template original (geralmente formato retrato vertical de uma única coluna, ex: `9:16` ou similar). Nenhuma alteração de largura ou altura final deve ser feita.
*   **Posicionamento Lado a Lado (Horizontal):**
    *   O candidato fica na sua posição original (geralmente na esquerda).
    *   O apoiador (eleitor) é posicionado no espaço vazio lateral (à direita se o candidato está na esquerda, ou vice-versa).
*   **Enquadramento de Retrato (Close-Up / Heads Alinhados):**
    *   A cabeça do eleitor deve ser alinhada verticalmente com a cabeça do candidato (topo iniciando a **8% do topo do Canvas**).
    *   A altura da silhueta do eleitor deve ser de **82% da altura total do Canvas**.
    *   A largura é proporcional, utilizando a proporção real da silhueta (`dw = dh * voterAspect`).
    *   Isso evita que o eleitor fique parecendo pequeno ou flutuando no rodapé.
*   **Rodapé Protetor (Layer de Banner Superior):**
    *   A faixa de rodapé original do template do candidato (correspondendo aos **22% inferiores da altura**) deve ser recortada do template e carimbada/desenhada por cima do eleitor.
    *   Isso esconde qualquer corte na cintura do eleitor e protege os logos, números e textos do candidato de sobreposição.
*   **Título de Apoio Dinâmico no Topo:**
    *   Se um nome de apoiador for fornecido (diferente de 'Anônimo'), o sistema renderizará no topo da imagem, de forma centralizada e em letras maiúsculas, o seguinte texto formatado em branco:
        ```text
        "[NOME_DO_ELEITOR]  APOIA"
        ```
    *   A fonte deve ser sans-serif em tamanho de **3% da altura do canvas**, com sombreamento preto para garantir legibilidade perfeita contra qualquer fundo.

## 3. Fluxo de Processamento de Imagem (Backend Engine)
1. **Passo 1:** O fundo da foto do eleitor é removido usando o Inspyrenet/BRIA.
2. **Passo 2:** As bordas transparentes da silhueta são recortadas (aprimoramento `trimTransparentBorders`) para isolar o corpo do eleitor e evitar miniaturização devido a enquadramentos de paisagem.
3. **Passo 3:** O Canvas desenha o template inicial, depois a silhueta do eleitor no lado correto com sombra projetada (`rgba(0,0,0,0.45)`).
4. **Passo 4:** O rodapé é restaurado sobrepondo o eleitor.
5. **Passo 5:** O título superior dinâmico "`[ELEITOR] APOIA`" é impresso.
