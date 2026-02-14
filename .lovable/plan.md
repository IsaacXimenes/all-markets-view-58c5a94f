

# Integracao Garantia - Assistencia, Emprestimos e Trocas

## Resumo

Este plano implementa a integracao automatica entre o modulo de Garantias e os modulos de Assistencia (OS) e Estoque, cobrindo 4 cenarios: criacao automatica de OS, gestao de emprestimos com rastreabilidade, fluxo de troca com status correto, e validacoes de interface com timeline unificada.

---

## 1. Criacao Automatica de OS ao Registrar Tratativa

**Onde:** `src/pages/GarantiaDetalhes.tsx` (funcao `handleRegistrarTratativa`)

Atualmente, quando o tipo e "Encaminhado Assistencia" ou "Assistencia + Emprestimo", o sistema define `osId: 'OS-AUTO'` como placeholder. Sera alterado para:

- Chamar `addOrdemServico()` de `assistenciaApi.ts` com:
  - `status`: "Aguardando Analise"
  - `origemOS`: "Garantia"
  - `garantiaId`: ID da garantia
  - `clienteId`, `modeloAparelho`, `imeiAparelho`: dados importados da garantia
  - `descricao`: descricao do problema informada pelo usuario
  - `proximaAtuacao`: "Tecnico: Avaliar/Executar"
  - `setor`: "GARANTIA"
  - `lojaId`: loja da garantia
- Atualizar a tratativa com o ID real da OS criada
- Adicionar entrada na timeline da garantia com o ID da OS
- A OS aparecera automaticamente na aba "Analise de Tratativas" por ter status "Aguardando Analise" e origem "Garantia"

---

## 2. Gestao de Emprestimos (Assistencia + Emprestimo)

**Onde:** `src/pages/GarantiaDetalhes.tsx` e `src/utils/estoqueApi.ts`

Quando o tipo for "Assistencia + Emprestimo":

- Alterar o status do aparelho emprestado para `statusEmprestimo: 'Emprestimo - Assistencia'` (campo ja existente na interface `Produto`)
- Preencher os campos de rastreabilidade ja existentes: `emprestimoGarantiaId`, `emprestimoClienteId`, `emprestimoClienteNome`, `emprestimoOsId`, `emprestimoDataHora`
- Adicionar observacao interna na OS criada informando que o cliente possui aparelho de emprestimo (modelo + IMEI)
- Registrar entrada na timeline unificada (`timelineApi.ts`) com tipo 'Colaborador' vinculada ao cliente

---

## 3. Fluxo de Troca de Aparelho

**Onde:** `src/pages/GarantiaDetalhes.tsx`

### Aparelho com Defeito (Entrada):
- Chamar `encaminharParaAnaliseGarantia()` (ja existe em `garantiasApi.ts`) para criar registro na aba "Analise de Tratativas" com:
  - `origem`: "Garantia"
  - `origemId`: ID da garantia
  - `clienteDescricao`: modelo + IMEI do aparelho defeituoso

### Aparelho Novo (Saida):
- **Correcao:** Em vez de zerar a quantidade (`quantidade: 0`), alterar para um novo status intermediario
- Adicionar campo `statusTroca` ao produto no estoqueApi ou reutilizar `bloqueadoEmVendaId` com valor do ID da garantia
- O aparelho ficara com status derivado "Reservado para Troca" via `getStatusAparelho()`
- Validar selecao obrigatoria do aparelho novo via busca de IMEI antes de salvar

---

## 4. Validacoes e Timeline Unificada

### Validacoes de Interface:
- Botao "Registrar Tratativa" desabilitado se tipo "Troca Direta" ou "Assistencia + Emprestimo" sem aparelho selecionado (ja existe parcialmente)
- Para "Troca Direta": exigir selecao do aparelho novo antes de salvar

### Timeline Automatica:
Todas as acoes geram entradas na timeline da garantia (`addTimelineEntry` de `garantiasApi.ts`):
- Criacao da OS (tipo: `os_criada`, com ID da OS)
- Emprestimo de aparelho (tipo: `emprestimo`, com modelo/IMEI)
- Reserva de estoque para troca (tipo: `troca`, com modelo/IMEI do novo)
- Registro do aparelho defeituoso em pendencias

### Atomicidade:
- Encapsular todas as operacoes (criar OS + atualizar estoque + registrar timeline + atualizar garantia) em uma funcao dedicada `processarTratativaGarantia()` no `garantiasApi.ts`
- Se qualquer etapa falhar, exibir toast de erro sem salvar parcialmente

---

## Detalhes Tecnicos

### Arquivos a modificar:

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/garantiasApi.ts` | Nova funcao `processarTratativaGarantia()` que orquestra todas as operacoes atomicamente |
| `src/utils/estoqueApi.ts` | Adicionar campo `bloqueadoEmTrocaGarantiaId` na interface `Produto` e atualizar `getStatusAparelho()` para retornar "Reservado para Troca" |
| `src/pages/GarantiaDetalhes.tsx` | Refatorar `handleRegistrarTratativa` para usar a nova funcao orquestradora, importar `addOrdemServico` |
| `src/utils/timelineApi.ts` | Adicionar funcao `registrarEmprestimoGarantia()` para timeline do cliente |

### Fluxo de dados:

```text
GarantiaDetalhes.tsx
  |
  +-> processarTratativaGarantia() [garantiasApi.ts]
       |
       +-> addTratativa()           -> Registra tratativa
       +-> addTimelineEntry()       -> Timeline da garantia
       +-> addOrdemServico()        -> Cria OS (se Assistencia)
       +-> updateProduto()          -> Emprestimo ou Reserva (estoqueApi)
       +-> addMovimentacao()        -> Registro de movimentacao
       +-> updateGarantia()         -> Status "Em Tratativa"
```

