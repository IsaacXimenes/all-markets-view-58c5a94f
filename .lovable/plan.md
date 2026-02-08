

# Plano: Modulo Marketing - Monitoramento de Stories

## Resumo

Criar um novo modulo dentro da "Gestao Administrativa" com 3 abas adicionais para monitorar a prova social (stories de Instagram) gerada por vendas. O sistema agrupa vendas em lotes diarios, permite conferencia operacional (anexar prints), validacao administrativa (supervisor) e exibe indicadores de performance.

## Arquitetura

O modulo sera integrado como novas abas no layout existente de Gestao Administrativa (`GestaoAdministrativaLayout`), seguindo o mesmo padrao de persistencia em localStorage usado pelo modulo de conferencia de caixa.

### Novas Abas no Layout

| Aba | Rota | Descricao |
|-----|------|-----------|
| Conferencia Diaria | `/gestao-administrativa` | Existente (conferencia de caixa) |
| Logs de Auditoria | `/gestao-administrativa/logs` | Existente |
| **Lotes de Stories** | `/gestao-administrativa/stories` | **Nova** - Listagem de lotes diarios |
| **Indicadores Stories** | `/gestao-administrativa/stories/indicadores` | **Nova** - Dashboard de performance |

A conferencia operacional e a validacao administrativa serao acessadas via rotas dedicadas (nao abas), pois sao telas de detalhe de um lote especifico:
- `/gestao-administrativa/stories/lote/:id/conferencia` - Conferencia operacional
- `/gestao-administrativa/stories/lote/:id/validacao` - Validacao administrativa

## Estrutura de Dados

### Interfaces principais (em `src/utils/storiesMonitoramentoApi.ts`)

```text
LoteMonitoramento
  - id: string
  - data: string (YYYY-MM-DD)
  - lojaId: string
  - totalVendas: number
  - vendasComStory: number
  - percentualStories: number
  - status: 'Pendente Conf. Operacional' | 'Aguardando Validacao' | 'Validado' | 'Rejeitado Parcial'
  - conferidoPor?: string (ID colaborador)
  - dataConferencia?: string
  - validadoPor?: string (ID colaborador)
  - dataValidacao?: string

VendaMonitoramento
  - id: string
  - loteId: string
  - vendaId: string (ref para Venda)
  - vendaNumero: number
  - clienteNome: string
  - vendedorId: string
  - vendedorNome: string
  - valorVenda: number
  - statusAnexo: 'Sem Anexo' | 'Anexo Pendente' | 'Anexado' | 'Validado' | 'Rejeitado'
  - motivoNaoPostagem?: string
  - seloQualidade?: 'Story Exemplo' | 'Excelente Engajamento' | null
  - observacaoConferencia?: string
  - observacaoValidacao?: string

AnexoStory
  - id: string
  - vendaMonitoramentoId: string
  - nome: string
  - tipo: string (image/png, image/jpeg)
  - tamanho: number
  - dataUrl: string (Base64 - temporario ate salvar)
  - dataUpload: string
```

### Persistencia

- localStorage com chaves por competencia/loja (mesmo padrao do modulo de caixa)
- Lotes gerados automaticamente ao acessar a tela (simulando rotina diaria)
- Anexos armazenados em Base64 no localStorage ao salvar a conferencia (volateis antes do save)

## Arquivos a Criar

### 1. `src/utils/storiesMonitoramentoApi.ts`
API principal com:
- Interfaces de dados
- `gerarLotesDiarios(competencia, lojaId)` - consolida vendas em lotes
- `getLoteById(loteId)` - buscar lote especifico
- `getVendasDoLote(loteId)` - listar vendas de um lote
- `salvarConferenciaOperacional(loteId, vendas, anexos, responsavel)` - persiste conferencia
- `salvarValidacao(loteId, validacoes, responsavel)` - persiste validacao
- `calcularIndicadores(competencia, lojaId)` - retorna metricas para dashboard
- Constantes: `META_STORIES_PERCENTUAL = 70`, motivos de nao-postagem

### 2. `src/pages/GestaoAdmStoriesLotes.tsx`
Tela de listagem de lotes com:
- Filtros: periodo (competencia), loja, status
- Tabela com colunas: Data, Loja, Total Vendas, Vendas com Story, % Stories, Status, Acoes
- Acoes: Ver Detalhes, Conferir (1a etapa), Validar (2a etapa)
- Cores de linha por status (padrao semaforo existente)

### 3. `src/pages/GestaoAdmStoriesConferencia.tsx`
Interface de conferencia operacional (1a etapa) com:
- Layout dividido: lista de vendas (esquerda) + area de upload (direita)
- Upload multiplo de imagens (prints de stories)
- Indicadores de status por venda (sem anexo / pendente / anexado)
- Dropdown de motivo de nao-postagem para vendas sem anexo
- Anexos temporarios em memoria (Blob URLs) ate salvar
- Botao "Salvar Conferencia Operacional" que muda status do lote

### 4. `src/pages/GestaoAdmStoriesValidacao.tsx`
Interface de validacao administrativa (2a etapa) com:
- Lista de vendas com anexos e motivos
- Visualizador de imagens dos prints
- Botoes de Confirmar/Rejeitar por venda
- Checkbox de selo de qualidade
- Botao "Validar Lote" que finaliza o processo

### 5. `src/pages/GestaoAdmStoriesIndicadores.tsx`
Dashboard de indicadores com:
- Termometro de engajamento (barra de progresso vs meta 70%)
- Cards: total vendas, total stories, percentual
- Ranking de lojas (tabela comparativa)
- Ranking de vendedores (tabela com % sucesso)
- Grafico de motivos de nao-postagem (pizza via Recharts)

## Arquivos a Modificar

### 1. `src/components/layout/GestaoAdministrativaLayout.tsx`
- Adicionar 2 novas abas: "Lotes de Stories" e "Indicadores Stories"
- Novos icones: `Camera` e `BarChart3` do lucide-react

### 2. `src/App.tsx`
- Adicionar 4 novas rotas:
  - `/gestao-administrativa/stories` -> GestaoAdmStoriesLotes
  - `/gestao-administrativa/stories/indicadores` -> GestaoAdmStoriesIndicadores
  - `/gestao-administrativa/stories/lote/:id/conferencia` -> GestaoAdmStoriesConferencia
  - `/gestao-administrativa/stories/lote/:id/validacao` -> GestaoAdmStoriesValidacao
- Importar os 4 novos componentes de pagina

### 3. `src/components/layout/Sidebar.tsx`
- Nenhuma alteracao necessaria (o modulo ja esta no sidebar como "Gestao Administrativa")

## Fluxo do Usuario

```text
1. Gestor acessa Gestao Administrativa > aba "Lotes de Stories"
   |
   v
2. Sistema gera lotes automaticamente (1 por dia/loja com vendas)
   |
   v
3. Gestor da loja clica em "Conferir" (icone upload) no lote pendente
   |
   v
4. Tela de Conferencia Operacional:
   - Seleciona venda na lista esquerda
   - Faz upload dos prints do story na area direita
   - Para vendas sem story: seleciona motivo
   - Clica "Salvar Conferencia Operacional"
   - Status do lote muda para "Aguardando Validacao"
   |
   v
5. Supervisor clica em "Validar" (icone check) no lote
   |
   v
6. Tela de Validacao Administrativa:
   - Revisa anexos de cada venda
   - Confirma ou rejeita cada anexo
   - Opcionalmente marca selo de qualidade
   - Clica "Validar Lote"
   - Status do lote muda para "Validado"
   |
   v
7. Indicadores atualizados automaticamente na aba "Indicadores Stories"
```

## Detalhes Tecnicos

### Upload de Imagens
- Aceitar apenas imagens (image/jpeg, image/png, image/webp)
- Limite: 5MB por arquivo, ate 5 arquivos por venda
- Armazenamento temporario via `FileReader.readAsDataURL()` (Base64)
- Persistido no localStorage ao salvar conferencia
- Volatil antes do save (descartado no F5)

### Geracao de Lotes
- Ao acessar a tela, o sistema verifica se ja existem lotes no localStorage para a competencia/loja selecionada
- Se nao existirem, gera automaticamente a partir das vendas finalizadas do periodo
- Cada combinacao data + loja gera 1 lote

### Controle de Acesso
- Conferencia operacional: perfil `eh_gestor`
- Validacao administrativa: perfil `eh_gestor` (mesmo perfil, mas o validador nao pode ser o mesmo que conferiu)
- Indicadores: perfil `eh_gestor` (somente leitura)

### Componentes Reutilizados
- `GestaoAdministrativaLayout` (com tabs atualizadas)
- `Table`, `Card`, `Badge`, `Dialog` do shadcn/ui
- `Recharts` para grafico de pizza
- `ResponsiveCardGrid`, `ResponsiveFilterGrid` para responsividade
- Padrao de cores semaforo via `statusColors.ts`

### Meta de 70%
- Constante configuravel na API (`META_STORIES_PERCENTUAL = 70`)
- Usada no termometro e nos indicadores
- Cores: verde (>= 70%), amarelo (50-69%), vermelho (< 50%)

