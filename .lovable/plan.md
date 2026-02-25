

## Plano: Modulo de Garantia - Persistencia localStorage + Correcoes PDF/Timeline + Regras de Negocio

### Escopo Geral

Refatorar o modulo de Garantia em 4 frentes: persistencia com localStorage, correcoes na Nota de Garantia (PDF), unificacao da timeline, e implementacao de regras de negocio (validacoes, automacao e fluxo de aprovacao).

---

### 1. Persistencia com localStorage (`src/utils/garantiasApi.ts`)

Todas as entidades do modulo (garantias, tratativas, timeline, contatos ativos, registros de analise) serao persistidas no localStorage. O padrao ja existe em outros modulos do sistema (ex: `gestaoAdministrativaApi.ts`, `whatsappNotificacaoApi.ts`).

**Acoes:**
- Criar funcoes auxiliares `loadFromStorage(key, defaultData)` e `saveToStorage(key, data)` no topo do arquivo
- Chaves: `garantias_data`, `tratativas_data`, `timeline_garantia_data`, `contatos_ativos_data`, `registros_analise_data`, `garantia_counter`, `tratativa_counter`, `timeline_counter`
- Os dados mockados atuais serao usados como `defaultData` na primeira carga (quando nao ha dados no localStorage)
- Toda funcao de escrita (`addGarantia`, `updateGarantia`, `addTratativa`, `updateTratativa`, `addTimelineEntry`, `addContatoAtivo`, `updateContatoAtivo`, `aprovarAnaliseGarantia`, `recusarAnaliseGarantia`, `encaminharParaAnaliseGarantia`) chamara `saveToStorage` apos modificar o array
- Toda funcao de leitura (`getGarantias`, `getTratativas`, etc.) lera do array em memoria (ja carregado do localStorage na inicializacao)
- Os contadores (`garantiaCounter`, `tratativaCounter`, `timelineCounter`) tambem serao persistidos

**Arquivo:** `src/utils/garantiasApi.ts`

---

### 2. Correcoes na Nota de Garantia

**2.1 Corrigir `entidadeTipo` na Timeline** - `src/pages/VendaDetalhes.tsx`
- Linha 178: Mudar `entidadeTipo: 'OS' as any` para `entidadeTipo: 'Venda'`
- Adicionar `'Venda'` ao tipo union de `entidadeTipo` em `src/utils/timelineApi.ts` na interface `TimelineEntry`

**2.2 Corrigir mensagem da timeline** - `src/pages/VendaDetalhes.tsx`
- Linha 181: Atualizar descricao para ser mais precisa sobre o que realmente acontece (imagens do termo de garantia anexadas como paginas adicionais)

**2.3 Cabecalho dinamico** - `src/utils/gerarNotaGarantiaPdf.ts`
- A funcao `getCabecalhoLoja` atualmente usa IDs hardcoded. Refatorar para buscar dados das lojas via `getLojaById` do `cadastrosApi.ts` como fallback, mantendo o mapeamento especifico para os dados fiscais (CNPJ, Razao Social) que nao existem no cadastro de lojas

**2.4 Verificar anexo do Termo** - `src/utils/gerarNotaGarantiaPdf.ts`
- Confirmar que as imagens `termo-garantia-p1.jpg` e `termo-garantia-p2.jpg` estao sendo carregadas e anexadas corretamente
- Adicionar tratamento de erro mais robusto com feedback ao usuario caso as imagens nao carreguem

**Arquivos:** `src/pages/VendaDetalhes.tsx`, `src/utils/timelineApi.ts`, `src/utils/gerarNotaGarantiaPdf.ts`

---

### 3. Unificacao da Timeline

**3.1 Expandir `TimelineEntry` em `timelineApi.ts`**
- Adicionar `'Venda'` ao tipo union de `entidadeTipo`
- Manter a interface `TimelineGarantia` em `garantiasApi.ts` como tipo interno para compatibilidade, mas todas as novas entradas usarao o sistema unificado

**3.2 Migrar chamadas de timeline nas paginas de Garantia**
- Em `GarantiasEmAndamento.tsx` (linhas 125-143): As chamadas a `addTimelineEntry` do garantiasApi continuam funcionando normalmente (timeline local da garantia). Adicionalmente, registrar na timeline unificada (`timelineApi.ts`) para rastreabilidade global
- Em `GarantiaDetalhes.tsx`: Mesmo tratamento - manter timeline local e adicionar registro unificado
- Em `processarTratativaGarantia`: Manter ambas timelines (local para exibicao na garantia, unificada para auditoria global)

**Arquivos:** `src/utils/timelineApi.ts`, `src/utils/garantiasApi.ts`, `src/pages/GarantiasEmAndamento.tsx`, `src/pages/GarantiaDetalhes.tsx`

---

### 4. Regras de Negocio e Automacao

**4.1 Validacao de Status para Tratativas** - `src/utils/garantiasApi.ts` e `src/pages/GarantiaDetalhes.tsx`
- Na funcao `processarTratativaGarantia`: Adicionar validacao que impede abertura de tratativa se `garantia.status === 'Expirada'` ou `garantia.status === 'Concluída'`, retornando `{ sucesso: false, erro: 'Nao e possivel abrir tratativa para garantia expirada/concluida' }`
- Em `GarantiaDetalhes.tsx`: Exibir alerta visual (`Alert` com icone `AlertTriangle`) quando `statusExpiracao.status === 'urgente'` ou `'atencao'`, com cor vermelha/amarela respectivamente
- Desabilitar o formulario de nova tratativa quando garantia esta expirada ou concluida, com mensagem explicativa

**4.2 Automacao de Contatos Ativos** - `src/utils/garantiasApi.ts`
- Criar funcao `verificarEGerarContatosAutomaticos()` que:
  - Busca garantias com `getGarantiasExpirandoEm30Dias()` e `getGarantiasExpirandoEm7Dias()`
  - Para cada garantia sem contato ativo existente, gera automaticamente um `ContatoAtivoGarantia` com dados do cliente pre-preenchidos
  - Marca com flag `autoGerado: true` para diferenciar dos manuais
- Chamar esta funcao na inicializacao da pagina `GarantiaContatosAtivosNovo.tsx` e `GarantiaContatosAtivos.tsx` (via `useEffect`)
- Adicionar campo `autoGerado?: boolean` na interface `ContatoAtivoGarantia`

**4.3 Fluxo de Aprovacao de Tratativas** - `src/utils/garantiasApi.ts`, `src/pages/GarantiaDetalhes.tsx`, `src/pages/GarantiasEmAndamento.tsx`
- Adicionar novos status a interface `TratativaGarantia`: `'Aguardando Aprovação' | 'Aprovada' | 'Recusada'` alem dos existentes
- Na funcao `processarTratativaGarantia`: Para tratativas dos tipos `'Assistência + Empréstimo'` e `'Troca Direta'`, o status inicial sera `'Aguardando Aprovação'` em vez de `'Em Andamento'`. As acoes de estoque (emprestimo, reserva) so serao executadas apos aprovacao
- Criar funcoes `aprovarTratativa(id, gestorId, gestorNome)` e `recusarTratativa(id, gestorId, gestorNome, motivo)` que:
  - Alteram o status da tratativa
  - Executam as acoes de estoque (se aprovada)
  - Registram na timeline
- Em `GarantiasEmAndamento.tsx`: Adicionar coluna "Aprovacao" na tabela. Tratativas com status `'Aguardando Aprovação'` exibem botoes "Aprovar" / "Recusar" para gestores
- Badge visual diferenciado para tratativas pendentes de aprovacao (laranja)

**Arquivos:** `src/utils/garantiasApi.ts`, `src/pages/GarantiaDetalhes.tsx`, `src/pages/GarantiasEmAndamento.tsx`, `src/pages/GarantiaContatosAtivosNovo.tsx`, `src/pages/GarantiaContatosAtivos.tsx`

---

### Resumo de Arquivos Afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/garantiasApi.ts` | localStorage, validacoes, aprovacao, contatos automaticos |
| `src/utils/timelineApi.ts` | Adicionar 'Venda' ao entidadeTipo |
| `src/utils/gerarNotaGarantiaPdf.ts` | Fallback dinamico no cabecalho, erro robusto no termo |
| `src/pages/VendaDetalhes.tsx` | Corrigir entidadeTipo e descricao da timeline |
| `src/pages/GarantiaDetalhes.tsx` | Alertas visuais, bloquear tratativa em expirada, aprovacao |
| `src/pages/GarantiasEmAndamento.tsx` | Coluna aprovacao, timeline unificada |
| `src/pages/GarantiaContatosAtivos.tsx` | useEffect para contatos automaticos |
| `src/pages/GarantiaContatosAtivosNovo.tsx` | Contatos auto-gerados |

### Ordem de Implementacao

1. Persistencia localStorage (base para tudo)
2. Correcoes PDF e Timeline (bugs atuais)
3. Validacoes de status e alertas visuais
4. Automacao de contatos ativos
5. Fluxo de aprovacao de tratativas

