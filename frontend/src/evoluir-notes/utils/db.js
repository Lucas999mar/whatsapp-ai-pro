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
  }
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
}

export default db
