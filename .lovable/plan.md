

# Plano - Reestruturacao do Modulo de Assistencia (Abas Operacionais + Nova Maquina de Estados)

## Resumo

Reorganizar completamente o modulo de Assistencia em 5 abas operacionais por perfil, implementar uma nova maquina de estados com 9 etapas, criar a aba "Conferencia Gestor - Assistencia" e ajustar todas as travas de seguranca.

---

## 1. Nova Arquitetura de Abas

As 7 abas atuais serao substituidas por 5 abas operacionais:

| # | Aba | Rota | Perfil | Descricao |
|---|-----|------|--------|-----------|
| 1 | Nova Assistencia | `/os/assistencia` | Vendedor/Gestor | Central de entrada. Botao "Nova OS (Balcao)". Lista OSs em status de registro ou pendentes de pagamento |
| 2 | Oficina / Bancada | `/os/oficina` | Tecnico | Execucao tecnica. Exibe apenas OSs com Proxima Atuacao = "Tecnico" |
| 3 | Conferencia Gestor | `/os/conferencia-gestor` | Gestor | Nova aba de governanca. Valida pagamentos antes do financeiro |
| 4 | Solicitacoes de Pecas | `/os/solicitacoes-pecas` | Matriz | Gestao de suprimentos (mantida) |
| 5 | Historico | `/os/historico-assistencia` | Todos | Consulta geral de todos os registros |

### 1.1 Alteracoes em `OSLayout.tsx`

Substituir as 7 tabs atuais pelas 5 novas:
```
{ name: 'Nova Assistencia', href: '/os/assistencia', icon: Wrench }
{ name: 'Oficina / Bancada', href: '/os/oficina', icon: HardHat }
{ name: 'Conferencia Gestor', href: '/os/conferencia-gestor', icon: ClipboardCheck }
{ name: 'Solicitacoes de Pecas', href: '/os/solicitacoes-pecas', icon: ShoppingCart }
{ name: 'Historico', href: '/os/historico-assistencia', icon: History }
```

### 1.2 Alteracoes em `AssistenciaLayout.tsx`

Replicar as mesmas 5 tabs (manter sincronizado com OSLayout).

### 1.3 Remocao de abas/rotas excedentes

As seguintes abas/rotas serao removidas da navegacao por tabs (as paginas continuam existindo como sub-rotas acessiveis):
- `Analise de Tratativas` (/os/analise-garantia) - funcionalidade absorvida pela aba "Nova Assistencia"
- `Estoque - Assistencia` (/os/pecas) - acessivel via sub-rota
- `Retirada de Pecas` (/os/retirada-pecas) - acessivel via sub-rota
- `Historico de Notas` (/os/historico-notas) - acessivel via sub-rota
- `Movimentacao - Pecas` (/os/movimentacao-pecas) - acessivel via sub-rota
- `Lotes de Pagamento` (/assistencia/lotes-pagamento) - acessivel via sub-rota

---

## 2. Nova Maquina de Estados (9 Etapas)

| Etapa | Acao | Status da OS | Proxima Atuacao |
|-------|------|-------------|-----------------|
| 1. Registro | Vendedor salva OS | Aguardando Analise | Tecnico |
| 2. Check-in | Tecnico clica "Assumir OS" | Em Servico | Tecnico |
| 3. Pecas | Tecnico solicita peca | Solicitacao de Peca | Gestor (Suprimentos) |
| 4. Logistica | Gestor aprova e Financeiro paga | Pagamento Concluido | Tecnico (Recebimento) |
| 5. Retorno | Tecnico confirma recebimento | Em Servico | Tecnico |
| 6. Check-out | Tecnico preenche resumo e finaliza | Finalizado | Gestor/Vendedor |
| 7. Pagamento | Vendedor registra pagamento | Pendente de Pagamento | Gestor (Conferencia) |
| 8. Auditoria | Gestor aprova conferencia | Aguardando Financeiro | Financeiro |
| 9. Fim | Financeiro valida e registra | Liquidado | - |

### 2.1 Alteracoes na interface `OrdemServico` (assistenciaApi.ts)

Atualizar o tipo `status` para incluir os novos valores:
- Adicionar: `'Aguardando Análise'`, `'Solicitação de Peça'`, `'Pendente de Pagamento'`, `'Aguardando Financeiro'`, `'Liquidado'`
- Manter compatibilidade com status existentes durante transicao

Atualizar o tipo `proximaAtuacao` para usar os novos valores simplificados:
- `'Técnico'`, `'Gestor (Suprimentos)'`, `'Técnico (Recebimento)'`, `'Gestor/Vendedor'`, `'Gestor (Conferência)'`, `'Financeiro'`, `'-'`

Adicionar campo `resumoConclusao` (string) na interface OrdemServico.

### 2.2 Transicoes automaticas por arquivo

**`OSAssistenciaNova.tsx`:**
- Status inicial: `'Aguardando Análise'` (em vez de `'Em Aberto'`)
- proximaAtuacao: `'Técnico'`

**Nova pagina `OSOficina.tsx`:**
- Listar apenas OSs onde `proximaAtuacao` contem "Tecnico"
- Botao "Assumir OS": muda status para `'Em Serviço'`, proximaAtuacao = `'Técnico'`
- Botao "Solicitar Peca": muda status para `'Solicitação de Peça'`, proximaAtuacao = `'Gestor (Suprimentos)'`
- Botao "Confirmar Recebimento": muda status para `'Em Serviço'`, proximaAtuacao = `'Técnico'`
- Botao "Finalizar OS": exige resumoConclusao + valorCusto + valorVenda. Muda status para `'Finalizado'`, proximaAtuacao = `'Gestor/Vendedor'`

**`OSAssistencia.tsx` (Nova Assistencia):**
- Filtrar para mostrar OSs em `'Aguardando Análise'` ou `'Pendente de Pagamento'` ou `'Finalizado'` (com atuacao Gestor/Vendedor)
- Botao "Registrar Pagamento" visivel apenas quando status = `'Finalizado'` e atuacao = `'Gestor/Vendedor'`
- Apos pagamento: status = `'Pendente de Pagamento'`, proximaAtuacao = `'Gestor (Conferência)'`

**Nova pagina `OSConferenciaGestor.tsx`:**
- Espelhar logica da `VendasConferenciaGestor.tsx`
- Listar OSs com status `'Pendente de Pagamento'` e proximaAtuacao `'Gestor (Conferência)'`
- Ao aprovar: status = `'Aguardando Financeiro'`, proximaAtuacao = `'Financeiro'`
- Ao final do financeiro: status = `'Liquidado'`, proximaAtuacao = `'-'`

**`solicitacaoPecasApi.ts`:**
- `aprovarSolicitacao`: Manter status `'Solicitação de Peça'`, proximaAtuacao = `'Gestor (Suprimentos)'`
- Apos pagamento financeiro: status = `'Pagamento Concluído'`, proximaAtuacao = `'Técnico (Recebimento)'`

---

## 3. Novas Paginas

### 3.1 `OSOficina.tsx` (Oficina / Bancada)

Pagina focada no tecnico com:
- Cards de resumo: OSs aguardando check-in, Em servico, Aguardando peca
- Tabela filtrada por `proximaAtuacao` contendo "Tecnico"
- Acoes: Assumir OS, Ver Detalhes, Finalizar
- Na linha da OS, exibir badge com sub-status (Aguardando Analise, Em Servico, Peca Recebida)

### 3.2 `OSConferenciaGestor.tsx` (Conferencia Gestor - Assistencia)

Pagina espelho da Conferencia de Vendas:
- Tabela de OSs com status `'Pendente de Pagamento'`
- Drawer lateral com detalhes da OS + pagamentos registrados
- Botoes: Aprovar (envia para financeiro), Recusar (volta para vendedor)
- Exibir: Valor Custo (tecnico), Valor Venda (tecnico), Pagamentos registrados, Comprovantes

---

## 4. Travas de Seguranca

### 4.1 Trava de Pagamento

O quadro de pagamentos deve estar **bloqueado** ate que:
- Status = `'Finalizado'`
- proximaAtuacao = `'Gestor/Vendedor'`

Em `OSAssistenciaDetalhes.tsx`, o card de Pagamentos so exibe o PagamentoQuadro quando estas condicoes sao atendidas. Caso contrario, exibe mensagem informativa.

### 4.2 Obrigatoriedade Tecnica (Check-out)

Para finalizar, o tecnico DEVE preencher:
- `resumoConclusao` (novo campo Textarea)
- `valorCustoTecnico` (numero > 0)
- `valorVendaTecnico` (numero > 0)

Se algum estiver vazio/zerado, o botao "Finalizar OS" exibe toast de erro.

### 4.3 Persistencia de Solicitacoes de Pecas

Manter a correcao ja implementada: ao editar/salvar OS, recarregar solicitacoes via `getSolicitacoesByOS(id)` e usar timeline imutavel do servidor.

### 4.4 Camera

Manter comportamento atual: captura de fotos no registro (OSAssistenciaNova) e durante edicao tecnica (OSAssistenciaEditar/Detalhes).

### 4.5 Filtro de Loja

Manter `filtrarPorTipo="Assistência"` em todos os AutocompleteLoja do modulo.

---

## 5. Integracao Financeira e Pagamento

### 5.1 Valor automatico

O modal de pagamento (PagamentoQuadro) deve carregar `valorTotalProdutos = os.valorVendaTecnico` automaticamente.

### 5.2 Filtro de destino

`PagamentoQuadro` ja recebe `lojaVendaId={os.lojaId}` que filtra maquinas por loja.

### 5.3 Metodos restritos

Apenas Dinheiro, Pix (manual) e Cartao. Verificar se o PagamentoQuadro ja suporta prop de restricao de metodos ou adicionar `metodosPermitidos={['Dinheiro', 'Pix', 'Cartão']}`.

---

## 6. Timeline Automatica

Cada mudanca de status gera um registro automatico na Timeline com:
- `responsavel`: Nome do usuario logado (do authStore)
- `data`: ISO timestamp
- `descricao`: Texto descritivo da acao (ex: "OS assumida pelo tecnico", "Pagamento registrado pelo vendedor")
- `tipo`: Tipo do evento correspondente

---

## 7. Atualizacao de Rotas e Sidebar

### 7.1 Sidebar

O href do item "Assistencia" permanece `/os/assistencia` (primeira aba = Nova Assistencia). A logica `isActiveModule` para `/os` ja funciona.

### 7.2 Novas rotas em App.tsx

Adicionar:
- `/os/oficina` -> `OSOficina`
- `/os/conferencia-gestor` -> `OSConferenciaGestor`

---

## Secao Tecnica

| Arquivo | Alteracoes |
|---------|-----------|
| `src/utils/assistenciaApi.ts` | Novos status: `'Aguardando Análise'`, `'Solicitação de Peça'`, `'Pendente de Pagamento'`, `'Aguardando Financeiro'`, `'Liquidado'`. Novas atuacoes simplificadas. Campo `resumoConclusao`. Atualizar mocks |
| `src/components/layout/OSLayout.tsx` | 5 tabs novas: Nova Assistencia, Oficina, Conferencia Gestor, Solicitacoes, Historico |
| `src/components/layout/AssistenciaLayout.tsx` | Sincronizar com as mesmas 5 tabs |
| `src/pages/OSOficina.tsx` | **NOVO** - Bancada do tecnico. Lista OSs com atuacao "Tecnico". Botoes Assumir/Finalizar |
| `src/pages/OSConferenciaGestor.tsx` | **NOVO** - Conferencia gestor assistencia. Espelho da conferencia de vendas |
| `src/pages/OSAssistencia.tsx` | Filtrar para "Aguardando Analise" + "Pendente de Pagamento" + "Finalizado". Registrar pagamento |
| `src/pages/OSAssistenciaNova.tsx` | Status inicial `'Aguardando Análise'`, proximaAtuacao `'Técnico'` |
| `src/pages/OSAssistenciaEditar.tsx` | Adicionar campo `resumoConclusao`. Ajustar transicoes de status. Manter travas |
| `src/pages/OSAssistenciaDetalhes.tsx` | Bloquear pagamento ate status "Finalizado". Ajustar badges. Conferencia financeiro -> "Liquidado" |
| `src/pages/OSHistoricoAssistencia.tsx` | Novos badges para todos os 9 status |
| `src/utils/solicitacaoPecasApi.ts` | Ajustar transicoes: `'Solicitação de Peça'` e `'Técnico (Recebimento)'` |
| `src/App.tsx` | Adicionar rotas `/os/oficina` e `/os/conferencia-gestor` |

