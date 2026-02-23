

# Ajustes em Nota de Entrada, Aparelhos Pendentes, Acessorios e Rastreabilidade

## Escopo

6 frentes de trabalho cobrindo melhorias em Notas de Entrada, Aparelhos Pendentes, Acessorios, Movimentacao de Pecas e Rastreabilidade de Estoque.

---

## 1. Nota de Entrada: Campos PIX Obrigatorios (1.1)

### Situacao Atual
Em `EstoqueNotaCadastrar.tsx`, o pagamento tem apenas `formaPagamento` (Dinheiro/Pix), `tipoPagamento` e `observacaoPagamento`. Nao ha campos para Banco, Recebedor ou Chave PIX.

### Acao
- Adicionar 3 novos states: `pixBanco`, `pixRecebedor`, `pixChave`
- Quando `formaPagamento === 'Pix'`, renderizar os 3 campos abaixo do RadioGroup (Banco, Nome do Recebedor, Chave PIX)
- Na funcao `handleSalvar`, validar que os 3 campos estao preenchidos quando forma = Pix
- Incluir os campos PIX no draft (localStorage) e no payload de `criarNotaEntrada`
- Salvar no draft para persistencia

### Arquivo
- `src/pages/EstoqueNotaCadastrar.tsx`

---

## 2. Nota de Entrada: Inativacao de IMEI por Quantidade (1.2)

### Situacao Atual
No modo nao-simplificado (Pagamento Pos), o campo IMEI aparece para todos os itens, mesmo quando quantidade > 1.

### Acao
- Na celula de IMEI (linha ~660), adicionar condicao: se `produto.quantidade > 1`, desabilitar o campo e exibir tooltip "IMEI sera preenchido na conferencia (explosao)"
- Se `produto.quantidade === 1`, manter o campo habilitado normalmente
- Ao alterar quantidade de 1 para > 1, limpar o valor IMEI automaticamente

### Arquivo
- `src/pages/EstoqueNotaCadastrar.tsx`

---

## 3. Aparelhos Pendentes: Classificacao por SLA (2.1)

### Situacao Atual
`OSAparelhosPendentes.tsx` ordena por data decrescente (mais recentes primeiro). Nao tem indicadores de SLA.

### Acao
- Inverter a ordenacao padrao para mais antigos primeiro (mais urgentes no topo)
- Adicionar coluna "Tempo em Pendencia" calculada como diferenca entre `new Date()` e `os.dataHora`
- Exibir badges coloridos:
  - Verde: ate 3 dias
  - Amarelo: 4-7 dias
  - Vermelho: > 7 dias (SLA excedido)
- Adicionar filtro/select para ordenar por "Mais antigo" ou "Mais recente"

### Arquivo
- `src/pages/OSAparelhosPendentes.tsx`

---

## 4. Nota de Entrada: Coluna Categoria Mais Larga (2.2)

### Situacao Atual
A coluna Categoria tem `className="w-24"` no SelectTrigger (linha 700), truncando o texto.

### Acao
- Alterar o `className` do SelectTrigger da categoria de `w-24` para `w-32` ou `min-w-[120px]`
- Ja existe `min-w-[120px]` no TableHead (linha 594), mas o SelectTrigger interno limita - corrigir para acompanhar

### Arquivo
- `src/pages/EstoqueNotaCadastrar.tsx`

---

## 5. Acessorios: Cor da Linha por Quantidade (3.1)

### Situacao Atual
`EstoqueAcessorios.tsx` ja exibe icone de alerta e texto vermelho quando `quantidadeTotal < 10`, mas nao tem cores de fundo na linha.

### Acao
- Na `TableRow` dos acessorios (linha 347), adicionar classes condicionais:
  - `quantidadeTotal === 0`: fundo vermelho claro (`bg-red-500/10`) + Badge "Esgotado"
  - `quantidadeTotal > 0 && quantidadeTotal < 5`: fundo amarelo claro (`bg-yellow-500/10`) + Badge "Baixo Estoque"
  - Caso contrario: sem cor especial
- Adicionar Badge na coluna de estoque indicando "Esgotado" ou "Baixo Estoque"

### Arquivo
- `src/pages/EstoqueAcessorios.tsx`

---

## 6. Movimentacao de Pecas: Redimensionar Modal de Busca (3.2)

### Situacao Atual
`OSMovimentacaoPecas.tsx` possui modal de busca de pecas. O DialogContent pode estar com largura padrao causando scroll horizontal.

### Acao
- No DialogContent do modal de busca, adicionar `className="max-w-4xl w-full"` ou `max-w-5xl` para ampliar a largura
- Garantir que a tabela de resultados use `overflow-x-auto` adequado dentro do espaco ampliado

### Arquivo
- `src/pages/OSMovimentacaoPecas.tsx`

---

## 7. Rastreabilidade: Saida de "Em Movimentacao" (4.1)

### Situacao Atual
`confirmarRecebimentoMovimentacao` em `estoqueApi.ts` (linhas 1150-1171) ja:
- Atualiza `mov.status = 'Recebido'`
- Atualiza `produto.loja = mov.destino`
- Limpa `produto.statusMovimentacao = null`
- Limpa `produto.movimentacaoId = undefined`

O fluxo ja esta implementado corretamente. Sera validado e, se necessario, adicionado registro na timeline do produto.

### Acao
- Adicionar registro na timeline do produto com descricao da movimentacao finalizada (origem, destino, responsavel, data)
- Garantir que o produto fique habilitado para venda apos recebimento

### Arquivo
- `src/utils/estoqueApi.ts`

---

## 8. Anexo de Video no Detalhamento do Aparelho (4.2)

### Situacao Atual
`EstoqueProdutoDetalhes.tsx` ja tem sistema de imagens temporarias (blob URLs), mas nao suporta videos.

### Acao
- Adicionar secao "Anexos de Video" no detalhamento do produto
- Permitir upload de arquivos MP4/MOV com limite de 50MB
- Armazenar em estado local (mock, sem Supabase Storage), com blob URLs para preview
- Exibir player de video inline para cada anexo
- Registrar na timeline do produto: "Video anexado por [usuario] em [data]"
- Condicionar visibilidade: apenas usuarios com `eh_estoquista` ou `eh_gestor`

### Arquivo
- `src/pages/EstoqueProdutoDetalhes.tsx`

---

## Detalhes Tecnicos

### Arquivos a modificar
1. `src/pages/EstoqueNotaCadastrar.tsx` -- campos PIX, inativacao IMEI, coluna categoria
2. `src/pages/OSAparelhosPendentes.tsx` -- SLA badges, ordenacao, coluna tempo
3. `src/pages/EstoqueAcessorios.tsx` -- cores de linha por quantidade
4. `src/pages/OSMovimentacaoPecas.tsx` -- redimensionar modal de busca
5. `src/utils/estoqueApi.ts` -- timeline na confirmacao de recebimento
6. `src/pages/EstoqueProdutoDetalhes.tsx` -- secao de anexo de video

### Ordem de implementacao
1. Nota de Entrada: campos PIX + IMEI inativo + coluna categoria (items 1, 2, 4)
2. Aparelhos Pendentes com SLA (item 3)
3. Acessorios: cores de linha (item 5)
4. Modal de busca redimensionado (item 6)
5. Timeline na movimentacao + anexo de video (items 7, 8)

