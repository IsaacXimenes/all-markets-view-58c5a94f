

# Plano: Anexo de Comprovante por Metodo de Pagamento

## Resumo

Adicionar um campo de anexo (comprovante) em cada registro de pagamento na tela de Nova Venda / Editar Venda, armazenando temporariamente em memoria (Base64). Esses anexos serao visiveis nas telas de Conferencia Lancamento, Conferencia Gestor e Conferencia Financeiro.

## Alteracoes

### 1. Interface `Pagamento` (`src/utils/vendasApi.ts`)

Adicionar 2 campos opcionais na interface `Pagamento`:

```text
comprovante?: string;       // Base64 ou URL do comprovante
comprovanteNome?: string;   // Nome do arquivo anexado
```

### 2. Modal de Pagamento (`src/components/vendas/PagamentoQuadro.tsx`)

**No modal "Adicionar Pagamento":**
- Adicionar area de upload de comprovante antes do botao "Adicionar", usando o componente `FileUploadComprovante` ja existente no projeto
- O comprovante fica armazenado no estado `novoPagamento` como Base64 (temporario)
- Ao clicar "Adicionar", o comprovante e persistido no objeto `Pagamento`

**Na tabela de pagamentos:**
- Adicionar coluna "Comprovante" entre "Descricao" e o botao de remover
- Exibir icone clicavel (miniatura para imagens, icone de arquivo para PDFs) que abre um modal/dialog de visualizacao
- Se nao houver comprovante, exibir "-"

**Alteracoes especificas:**
- Import de `FileUploadComprovante` e icones `Paperclip`, `Image`
- Novos campos em `NovoPagamentoState`: `comprovante`, `comprovanteNome`
- Na funcao `handleAddPagamento`: copiar `comprovante` e `comprovanteNome` para o objeto `Pagamento`
- Novo estado para modal de visualizacao do comprovante
- Nova coluna na tabela com preview clicavel

### 3. Conferencia Lancamento (`src/pages/VendasConferenciaLancamento.tsx`)

**No modal de aprovacao** (quando o usuario clica "Conferir"):
- Exibir secao "Comprovantes de Pagamento" listando cada pagamento com seu comprovante
- Para cada pagamento: meio, valor, e miniatura/link do comprovante
- Se o pagamento nao tiver comprovante, exibir alerta amarelo "Sem comprovante"

### 4. Conferencia Gestor (`src/pages/VendasConferenciaGestorDetalhes.tsx`)

**No card de Pagamentos** (linhas 154-169):
- Adicionar coluna "Comprovante" na tabela de pagamentos
- Exibir miniatura clicavel ou icone de arquivo
- Ao clicar, abrir dialog com imagem em tamanho maior ou link para PDF

### 5. Conferencia Financeiro (`src/pages/FinanceiroConferencia.tsx`)

**Na interface `LinhaConferencia`:**
- Adicionar campos `comprovante?` e `comprovanteNome?`

**Na tabela de conferencia:**
- Adicionar coluna "Comprovante" com icone clicavel
- Ao clicar, abrir dialog de visualizacao

**Na montagem das linhas:**
- Propagar `comprovante` e `comprovanteNome` do pagamento original da venda para a `LinhaConferencia`

## Detalhes Tecnicos

### Armazenamento
- Base64 em memoria, mesmo padrao usado pelo `AnexoTradeIn` e pelo Buffer de Anexos do Estoque
- Volatil: perdido ao recarregar a pagina (F5)
- Tipos aceitos: image/jpeg, image/png, image/webp, application/pdf
- Limite: 5MB por arquivo

### Componente Reutilizado
- `FileUploadComprovante` de `src/components/estoque/FileUploadComprovante.tsx` - ja suporta drag-and-drop, URL externa, preview de imagem e PDF

### Visualizacao nas Conferencias
- Imagens: exibidas em `<img>` dentro de um Dialog com zoom
- PDFs: exibidos como link "Abrir PDF" que abre em nova aba via `window.open(dataUrl)`
- Sem comprovante: badge amarelo "Sem anexo"

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/vendasApi.ts` | Adicionar `comprovante?` e `comprovanteNome?` na interface `Pagamento` |
| `src/components/vendas/PagamentoQuadro.tsx` | Upload no modal + coluna na tabela + dialog de preview |
| `src/pages/VendasConferenciaLancamento.tsx` | Exibir comprovantes no modal de aprovacao |
| `src/pages/VendasConferenciaGestorDetalhes.tsx` | Coluna de comprovante na tabela de pagamentos |
| `src/pages/FinanceiroConferencia.tsx` | Coluna de comprovante na tabela + propagacao dos dados |

## Fluxo do Usuario

```text
1. Vendedor abre "Nova Venda" > Quadro de Pagamentos
   |
   v
2. Clica "Adicionar Pagamento" > Preenche meio, valor, conta
   |
   v
3. Faz upload do comprovante (drag-and-drop ou clique)
   |  - Aceita JPG, PNG, WebP, PDF (max 5MB)
   |  - Preview exibido no modal antes de confirmar
   |
   v
4. Clica "Adicionar" > Pagamento salvo com comprovante em Base64
   |
   v
5. Na tabela de pagamentos, coluna "Comprovante" mostra miniatura
   |
   v
6. Conferencia Lancamento: modal exibe comprovantes de cada pagamento
   |
   v
7. Conferencia Gestor: tabela de pagamentos com coluna comprovante
   |
   v
8. Conferencia Financeiro: tabela com coluna comprovante por linha
```
