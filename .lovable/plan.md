
# Plano - Area do Gestor e Ajustes na Nova Assistencia

## Parte 1: Nova Aba "Area do Gestor" no modulo de Assistencia

### 1.1 Estrutura da nova aba

Criar uma nova pagina `src/pages/OSAreaGestor.tsx` que contera duas sub-abas internas usando o componente `Tabs`:

- **Sub-aba "Aprovacoes de Solicitacoes de Pecas"**: Reutilizacao da logica e interface ja existente em `OSSolicitacoesPecas.tsx`, importando ou replicando o mesmo componente.
- **Sub-aba "Tratativas"**: Listagem das OS com status "Servico concluido", com botoes "Detalhes" e "Registrar Pagamento".

### 1.2 Sub-aba Tratativas

- Buscar todas as OS via `getOrdensServico()` e filtrar por `status === 'Servico concluido'`.
- Tabela com colunas: Numero OS, Cliente, Modelo, IMEI, Data Conclusao, Acoes.
- **Botao "Detalhes"**: Navegar para `/os/assistencia/{id}` (tela existente de detalhes).
- **Botao "Registrar Pagamento"**: Abrir modal/drawer com:
  - Dados resumidos da OS (cliente, pecas, servicos, total).
  - Componente `PagamentoQuadro` completo (mesmo da Nova Venda) para registrar pagamentos.
  - Botao "Confirmar Pagamento" que:
    1. Salva os pagamentos na OS via `updateOrdemServico`.
    2. Altera o status da OS para "Pagamento - Financeiro".
    3. Cria um registro pendente no financeiro (via `addNotaAssistencia` ou similar) para conferencia.

### 1.3 Fluxo Pos-Pagamento e Conferencia Financeira

- Apos o gestor registrar o pagamento, a OS recebe status "Pagamento - Financeiro".
- O financeiro, na tela `FinanceiroNotasAssistencia.tsx`, ja pode conferir e finalizar.
- Apos a finalizacao pelo financeiro, o status da OS sera atualizado para "Pagamento Finalizado" (termo para conclusao financeira).

### 1.4 Visibilidade na aba "Nova Assistencia"

- Na listagem `OSAssistencia.tsx`, as OS com status "Servico concluido" serao filtradas/excluidas da visualizacao padrao, pois agora aparecem na "Area do Gestor > Tratativas".

### 1.5 Controle de Acesso (Gestor)

- A aba so sera visivel na navegacao (`AssistenciaLayout` / `OSLayout`) se o usuario logado for gestor.
- Verificacao via `useAuthStore` checando se o cargo contem "Gestor" ou campo `eh_gestor`.

### 1.6 Navegacao

- Adicionar nova aba no `AssistenciaLayout.tsx` e `OSLayout.tsx`: `{ name: 'Area do Gestor', href: '/os/area-gestor', icon: Shield }`.
- Adicionar rota no `App.tsx`: `<Route path="/os/area-gestor" element={<OSAreaGestor />} />`.

---

## Parte 2: Ajustes na Nova Assistencia

### 2.1 Persistencia de Dados do Cliente (Analise de Tratativas -> Nova Assistencia)

**Arquivo:** `src/pages/OSAnaliseGarantia.tsx`

Quando a origem e "Estoque", o `clienteId` fica vazio porque o `ProdutoPendente` nao tem informacao de cliente. Para resolver:
- Verificar se o registro da analise (`registroAprovado`) contem informacoes de cliente no campo `clienteDescricao`.
- Buscar o cliente pelo nome na descricao (ex: parsing de `clienteDescricao`).
- Se nenhum cliente for encontrado, manter vazio (preenchido depois na edicao).
- Garantir que `modeloAparelho` e `imeiAparelho` (ja corrigido anteriormente) sejam passados corretamente.

Alem disso, quando a OS e criada pela Analise e o usuario e redirecionado para `/os/assistencia`, ele pode clicar para editar. O pre-preenchimento ja ocorre via `useEffect` com `analiseIdParam` na Nova Assistencia.

### 2.2 Remocao de Mensagens de Origem do Aparelho

**Arquivo:** `src/pages/OSAssistenciaNova.tsx`, linhas 937-946

Remover o bloco condicional:
```
{origemAparelho && (
  <div className={cn(...)}>
    {origemAparelho === 'Thiago Imports' 
      ? "... O aparelho foi adquirido na Thiago Imports ..."
      : "... O aparelho foi adquirido externamente ..."}
  </div>
)}
```

### 2.3 Filtro no Campo "Loja" (Quadro Informacoes da OS)

**Arquivo:** `src/pages/OSAssistenciaNova.tsx`, linha 978-984

Alterar `apenasLojasTipoLoja={true}` para `filtrarPorTipo="Assistencia"` no `AutocompleteLoja` do campo Loja.

### 2.4 Quadro "Solicitar Pecas" em Modo de Edicao

Na tela de detalhes da OS (`OSAssistenciaDetalhes.tsx`), o quadro de solicitacoes ja existe com formulario de nova solicitacao em modo edicao (linhas 639-696). O problema reportado anteriormente era a perda de dados ao salvar - a logica de `addSolicitacao` e `setSolicitacoesOS(getSolicitacoesByOS(os.id))` (linha 686) ja esta correta. Vou revisar e garantir que a persistencia funcione corretamente, recarregando as solicitacoes apos qualquer operacao de salvamento.

---

## Secao Tecnica

| Arquivo | Alteracoes |
|---------|-----------|
| `src/pages/OSAreaGestor.tsx` | **NOVO** - Pagina com sub-abas "Aprovacoes" (replica OSSolicitacoesPecas) e "Tratativas" (OS concluidas + modal de pagamento) |
| `src/components/layout/AssistenciaLayout.tsx` | Adicionar aba "Area do Gestor" com controle de visibilidade por perfil gestor |
| `src/components/layout/OSLayout.tsx` | Adicionar aba "Area do Gestor" com controle de visibilidade por perfil gestor |
| `src/App.tsx` | Adicionar rota `/os/area-gestor` |
| `src/pages/OSAssistenciaNova.tsx` | Remover mensagens de origem; alterar campo Loja para filtrar por tipo Assistencia |
| `src/pages/OSAssistencia.tsx` | Filtrar OS concluidas da listagem (exibidas agora na Area do Gestor) |
| `src/pages/OSAnaliseGarantia.tsx` | Melhorar persistencia de dados do cliente ao criar OS de origem Estoque |
| `src/utils/assistenciaApi.ts` | Adicionar novo status "Pagamento - Financeiro" ao tipo OrdemServico (ja existe no tipo) |
