

## Fluxo de Encaminhamento de Lote de Nota de Entrada para Assistencia

### Resumo

Implementar um fluxo completo que permite ao Estoque selecionar uma Nota de Entrada, marcar aparelhos defeituosos individualmente, gerar um Lote de Revisao (REV-NOTA-XXX), encaminhar para a Assistencia como OS de origem 'Estoque', e ao finalizar o lote, calcular automaticamente o abatimento no valor da nota para o Financeiro.

---

### 1. Nova API: Lote de Revisao

**Novo arquivo: `src/utils/loteRevisaoApi.ts`**

Interface e funcoes para gerenciar lotes de revisao:

```text
LoteRevisao {
  id: string              // REV-NOTA-XXXXX
  notaEntradaId: string   // ID da nota de entrada vinculada
  numeroNota: string      // Numero da nota (exibicao)
  fornecedor: string
  valorOriginalNota: number
  status: 'Em Revisao' | 'Encaminhado' | 'Em Andamento' | 'Finalizado'
  itens: ItemRevisao[]
  dataCriacao: string
  responsavelCriacao: string
  dataFinalizacao?: string
  custoTotalReparos: number
  valorLiquidoSugerido: number
  osIds: string[]         // IDs das OS geradas
}

ItemRevisao {
  id: string
  produtoNotaId: string   // ID do produto na nota
  produtoId?: string      // ID do produto no estoque (PROD-XXXX)
  marca: string
  modelo: string
  imei?: string
  motivoAssistencia: string
  observacao?: string
  responsavelRegistro: string
  dataRegistro: string
  osId?: string           // OS gerada para este item
  custoReparo: number     // Custo acumulado das pecas usadas
  statusReparo: 'Pendente' | 'Em Andamento' | 'Concluido'
}
```

Funcoes:
- `criarLoteRevisao(notaEntradaId, itens[], responsavel)`
- `getLotesRevisao()`, `getLoteRevisaoById(id)`
- `getLoteRevisaoByNotaId(notaId)`
- `atualizarItemRevisao(loteId, itemId, updates)`
- `finalizarLoteRevisao(loteId, responsavel)`
- `calcularAbatimento(loteId)` -- retorna { valorNota, custoReparos, valorLiquido, percentualReparo }

---

### 2. Nova Pagina: Encaminhar Nota para Assistencia

**Novo arquivo: `src/pages/EstoqueEncaminharAssistencia.tsx`**

Tela acessivel via botao na aba "Notas de Entrada" do Estoque.

#### Layout:
1. **Seletor de Nota**: Dropdown com formato `[No Nota] - [Fornecedor] - [Data]`, filtrando apenas notas com produtos cadastrados e status de conferencia concluida ou em andamento
2. **Quadro 1 -- Relacao Original da Nota**: Tabela com todos os produtos da nota selecionada (Marca, Modelo, IMEI, Cor, Categoria, Status). Cada linha tem um botao "Reportar Defeito" que abre modal
3. **Modal de Registro de Defeito**:
   - Motivo da Assistencia (campo texto obrigatorio)
   - Data/Hora do Registro (automatico, read-only)
   - Responsavel (automatico via useAuthStore, read-only)
   - Confirmacao em duas etapas (checkbox + botao)
   - Ao confirmar, move o item para o Quadro 2
4. **Quadro 2 -- Relacao de Produtos para Assistencia**: Tabela com os itens marcados. Botao "Remover" para devolver ao Quadro 1
5. **Finalizacao do Lote**: Botao "Encaminhar para Assistencia" com confirmacao em duas etapas. Gera o ID `REV-NOTA-XXXXX` e cria OS individuais na Assistencia

#### Rota: `/estoque/encaminhar-assistencia`

---

### 3. Rota e Navegacao

**Arquivo: `src/App.tsx`**
- Adicionar rota `/estoque/encaminhar-assistencia` -> `EstoqueEncaminharAssistencia`

**Arquivo: `src/pages/EstoqueNotasPendencias.tsx`**
- Adicionar botao "Encaminhar para Assistencia" ao lado do botao "Cadastrar Nova Nota"

---

### 4. Geracao de OS na Assistencia

Ao finalizar o lote, para cada item do Quadro 2:
- Criar OS via `addOrdemServico` com:
  - `origemOS: 'Estoque'`
  - `descricao: 'Nota de Entrada - [No Nota]'`
  - `status: 'Aguardando Analise'`
  - `proximaAtuacao: 'Tecnico: Avaliar/Executar'`
  - `modeloAparelho`, `imeiAparelho` do produto
  - Vincular ao `loteRevisaoId` (novo campo opcional na OS)

**Arquivo: `src/utils/assistenciaApi.ts`**
- Adicionar campo opcional `loteRevisaoId?: string` na interface `OrdemServico`
- Adicionar campo opcional `loteRevisaoItemId?: string` na interface `OrdemServico`

---

### 5. Modulo Assistencia: Identificacao na Analise de Tratativas

**Arquivo: `src/pages/OSAnaliseGarantia.tsx`**
- A coluna "Cliente/Descricao" sera renomeada para "Descricao"
- OS com `origemOS === 'Estoque'` e `loteRevisaoId` exibirao `Nota de Entrada - [No Nota]` na coluna Descricao
- Adicionar badge de origem "Estoque" (ja existe)

---

### 6. Tela de Trabalho do Tecnico (Lote de Revisao)

**Arquivo: `src/pages/OSAssistenciaEditar.tsx`** (ja existente)

Quando a OS tem `loteRevisaoId`:
- Exibir banner informativo: "Esta OS faz parte do Lote de Revisao REV-NOTA-XXXXX"
- O quadro de pecas funciona normalmente (seletor avancado com origem de peca e custo real)
- Campo de observacao individual por aparelho (ja existe na descricao da OS)
- Rastreabilidade cruzada: `origemServico: 'Estoque'` preenchido automaticamente

O tecnico trabalha individualmente em cada OS, usando o mesmo fluxo existente.

---

### 7. Dashboard de Resumo do Lote (Alerta de Custo)

**Novo componente: `src/components/estoque/LoteRevisaoResumo.tsx`**

Exibido na pagina de encaminhamento e acessivel nos detalhes da nota:
- Card "Valor Original da Nota": R$ X
- Card "Custo Total de Reparos (Abatimento)": R$ Y (soma das pecas de todas as OS do lote)
- Card "Valor Liquido Sugerido": R$ (X - Y)
- Se custo > 15% do valor da nota: card em vermelho com icone de alerta

---

### 8. Integracao Financeira

**Arquivo: `src/utils/notaEntradaFluxoApi.ts`**
- Adicionar campo opcional `loteRevisaoId?: string` na interface `NotaEntrada`
- Adicionar campo opcional `valorAbatimento?: number` na interface `NotaEntrada`

**Arquivo: `src/pages/FinanceiroNotasPendencias.tsx`** (Notas Pendentes de Entrada no Financeiro)
- No dialog de conferencia, se a nota possui `loteRevisaoId`:
  - Exibir banner de alerta: "Esta nota possui um abatimento de R$ Y referente ao Lote de Revisao REV-NOTA-XXXXX"
  - Botao "Ver Detalhes do Abatimento" que expande a lista de pecas usadas com suas origens
  - Atualizar o valor pendente para refletir o abatimento

**Arquivo: `src/pages/FinanceiroNotasAssistencia.tsx`**
- Notas de lote de revisao aparecerao aqui com tipo "Lote de Revisao" e link para o detalhamento

---

### 9. Mock Data

**Arquivo: `src/utils/loteRevisaoApi.ts`**
- Criar 1 lote de revisao mock vinculado a uma nota existente com 2-3 itens em diferentes estados de reparo

---

### Sequencia de Implementacao

1. Criar `src/utils/loteRevisaoApi.ts` (interfaces, funcoes, mock data)
2. Atualizar `src/utils/assistenciaApi.ts` (campos loteRevisaoId na OS)
3. Atualizar `src/utils/notaEntradaFluxoApi.ts` (campos loteRevisaoId e valorAbatimento na Nota)
4. Criar `src/components/estoque/LoteRevisaoResumo.tsx` (cards de resumo)
5. Criar `src/pages/EstoqueEncaminharAssistencia.tsx` (pagina principal)
6. Atualizar `src/App.tsx` (nova rota)
7. Atualizar `src/pages/EstoqueNotasPendencias.tsx` (botao de navegacao)
8. Atualizar `src/pages/OSAnaliseGarantia.tsx` (renomear coluna, identificacao)
9. Atualizar `src/pages/OSAssistenciaEditar.tsx` (banner de lote)
10. Atualizar `src/pages/FinanceiroNotasPendencias.tsx` (banner de abatimento no dialog)

### Arquivos Afetados

- `src/utils/loteRevisaoApi.ts` (novo)
- `src/utils/assistenciaApi.ts` (2 campos na interface OrdemServico)
- `src/utils/notaEntradaFluxoApi.ts` (2 campos na interface NotaEntrada)
- `src/components/estoque/LoteRevisaoResumo.tsx` (novo)
- `src/pages/EstoqueEncaminharAssistencia.tsx` (novo)
- `src/App.tsx` (rota)
- `src/pages/EstoqueNotasPendencias.tsx` (botao)
- `src/pages/OSAnaliseGarantia.tsx` (coluna renomeada + identificacao)
- `src/pages/OSAssistenciaEditar.tsx` (banner informativo)
- `src/pages/FinanceiroNotasPendencias.tsx` (banner de abatimento)

