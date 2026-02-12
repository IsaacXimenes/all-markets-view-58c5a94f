

# Plano - Correcoes em Solicitacoes de Pecas e Notas Pendentes Assistencia

## Problema 1: Lote desaparece ao enviar para o Financeiro

**Causa raiz:** A aba "Lotes Pendentes" filtra apenas lotes com `status === 'Pendente'` (linha 341 de `OSSolicitacoesPecas.tsx`). Ao clicar "Enviar Lote", a funcao `enviarLote` altera o status para `'Enviado'`, fazendo o lote sumir da listagem.

**Correcao em `src/pages/OSSolicitacoesPecas.tsx`:**
- Alterar a aba "Lotes Pendentes" para exibir TODOS os lotes (pendentes e enviados), nao apenas os pendentes
- Renomear a aba para "Lotes" (removendo "Pendentes")
- Exibir badge de status diferenciado: amarelo para "Pendente", roxo para "Enviado", verde para "Finalizado"
- Desabilitar o botao "Enviar Lote" quando o status ja for "Enviado", mantendo visivel com texto "Enviado"
- Atualizar o contador no tab para refletir todos os lotes ativos (Pendente + Enviado)

---

## Problema 2: Coluna "Loja Solicitante" mostra UUID

**Causa raiz:** Na funcao `enviarLote` (linha 490 de `solicitacaoPecasApi.ts`), o campo `lojaSolicitante` da nota recebe o UUID direto da solicitacao (`solicitacoesDoLote[0]?.lojaSolicitante`). Na tela `FinanceiroNotasAssistencia.tsx` (linha 320), o valor e renderizado diretamente sem resolver o nome.

**Correcao em `src/pages/FinanceiroNotasAssistencia.tsx`:**
- Na coluna "Loja Solicitante" da tabela (linha 320), usar `obterNomeLoja(nota.lojaSolicitante)` para resolver o UUID para o nome da loja
- O `obterNomeLoja` ja esta importado do `useCadastroStore` (linha 29)
- Tambem corrigir o filtro de loja solicitante para usar UUIDs em vez de nomes

---

## Problema 3: Layout da aba "Notas Pendentes - Assistencia" esta feio

**Correcao em `src/pages/FinanceiroNotasAssistencia.tsx`:**
- Aplicar o mesmo padrao visual da Nova Assistencia: cards com `ResponsiveCardGrid`, filtros com `ResponsiveFilterGrid`, tabela com cores de linha por status usando `getStatusRowClass`
- Usar `AutocompleteLoja` no filtro de loja solicitante (em vez de Select com nomes hardcoded)
- Usar `AutocompleteFornecedor` no filtro de fornecedor
- Melhorar o espacamento e a apresentacao geral dos cards de resumo e da tabela

---

## Secao Tecnica

| Arquivo | Alteracoes |
|---------|-----------|
| `src/pages/OSSolicitacoesPecas.tsx` | Exibir todos os lotes (nao apenas pendentes) na aba de lotes; badge de status; desabilitar botao apos envio |
| `src/pages/FinanceiroNotasAssistencia.tsx` | Resolver UUID da loja para nome via `obterNomeLoja`; melhorar layout com componentes responsivos e autocompletes |

