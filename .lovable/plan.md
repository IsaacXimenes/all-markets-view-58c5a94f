

## Reestruturacao do Fluxo de Assistencia com Ramificacao "Origem: Estoque" e Valorizacao de Ativos

### Resumo

Este plano implementa um fluxo especializado para OSs com **Origem: Estoque**, onde aparelhos internos passam pela assistencia sem cobranca ao cliente, com ciclo de retrabalho (ping-pong) entre tecnico e gestor de estoque, e acumulo de custos de reparo no cadastro do aparelho.

---

### 1. Regras de Negocio para Origem: Estoque

Quando `origemOS === 'Estoque'`:

- **Mao de Obra Zero**: Campo "Valor do servico (R$)" fixado em R$ 0,00 e desabilitado
- **Pagamento Oculto**: Quadro de pagamentos (PagamentoQuadro) e botao "Registrar Pagamento" sao escondidos
- **Finalizacao redireciona para Estoque**: Ao finalizar, status muda para `"Servico Concluido - Validar Aparelho"` com `proximaAtuacao: "Gestor (Estoque)"`
- **Resumo obrigatorio**: Tecnico deve preencher "Resumo da Conclusao" antes de finalizar

---

### 2. Nova Aba "Aparelhos Pendentes" no Modulo OS

Uma nova aba no layout de abas da Assistencia (OSLayout/AssistenciaLayout) para o gestor de estoque validar retornos.

**Funcionalidades:**
- Lista OSs com status `"Servico Concluido - Validar Aparelho"`
- **Aprovar**: Calcula Custo Composto (Custo Original + Custo de Reparo), atualiza o aparelho no estoque como "Disponivel"
- **Recusar/Retrabalho**: Gestor informa motivo. OS volta para Oficina com status `"Retrabalho - Recusado pelo Estoque"`

---

### 3. Maquina de Estados - Ping-Pong de Retrabalho

```text
Oficina (Tecnico)
    |
    v  [Finalizar OS]
"Servico Concluido - Validar Aparelho" (Gestor Estoque)
    |
    +-- [Aprovar] --> Atualiza estoque, OS finalizada
    |
    +-- [Recusar] --> "Retrabalho - Recusado pelo Estoque" (Tecnico)
                          |
                          v  [Tecnico refaz e finaliza]
                    "Servico Concluido - Validar Aparelho" (Gestor Estoque)
                          |
                          +-- [Aprovar / Recusar novamente...]
```

---

### 4. Timeline de Auditoria e Acumulo de Custos

- Cada recusa gera registro na timeline: `"Retrabalho solicitado por [Usuario] - Motivo: [Texto]"`
- Cada ciclo de retrabalho com novas pecas **soma** ao custo total do aparelho
- O custo final eh atomico: `Custo Aquisicao + SUM(todos custos de reparo de todas as idas)`

---

### 5. Visualizacao de Custo no Cadastro do Aparelho

No detalhamento do produto (`EstoqueProdutoDetalhes.tsx`):

- Novo campo **"Custo Total"**: Exibe `valorCusto + custoAssistencia`
- Novo botao **"Ver Detalhes do Custo"**: Abre modal com:
  - Custo de Aquisicao: R$ [valor original]
  - Investimento em Reparo (OS #[ID]): R$ [valor] (para cada OS vinculada)

---

### Detalhes Tecnicos

#### Arquivos a modificar:

**1. `src/utils/assistenciaApi.ts`**
- Adicionar novos status ao tipo `OrdemServico.status`: `'Servico Concluido - Validar Aparelho'` e `'Retrabalho - Recusado pelo Estoque'`
- Adicionar `'Gestor (Estoque)'` ao tipo `proximaAtuacao`
- Na funcao `updateOrdemServico`: quando status muda para `'Servico Concluido - Validar Aparelho'` com origem Estoque, acumular custos no produto via `estoqueApi`

**2. `src/components/layout/OSLayout.tsx` e `AssistenciaLayout.tsx`**
- Adicionar nova aba "Aparelhos Pendentes" com icone `Package` e href `/os/aparelhos-pendentes`

**3. Nova pagina: `src/pages/OSAparelhosPendentes.tsx`**
- Listagem de OSs com status `"Servico Concluido - Validar Aparelho"`
- Cards com info do aparelho (modelo, IMEI, tecnico, resumo)
- Modal de Aprovacao: exibe calculo do Custo Composto, botao confirmar
- Modal de Recusa: campo de motivo obrigatorio, botao recusar

**4. `src/pages/OSOficina.tsx`**
- Exibir OSs com status `"Retrabalho - Recusado pelo Estoque"` na fila do tecnico com badge vermelho "Retrabalho"
- Na finalizacao: detectar se `origemOS === 'Estoque'` para redirecionar para validacao em vez de Atendente

**5. `src/pages/OSAssistenciaDetalhes.tsx`**
- Quando `origemOS === 'Estoque'`:
  - Esconder quadro de pagamentos
  - Fixar valor de servico em R$ 0,00
  - Alterar destino da finalizacao para Gestor (Estoque)

**6. `src/pages/OSAssistenciaNova.tsx`**
- Quando `origemOS === 'estoque'` (ja existe parcialmente):
  - Esconder campo de pagamento
  - Desabilitar campo valor do servico

**7. `src/utils/estoqueApi.ts`**
- Nova funcao `atualizarCustoAssistencia(produtoId, osId, custoReparo)`: soma `custoReparo` ao campo `custoAssistencia` do produto
- Nova funcao `getHistoricoCustosReparo(produtoId)`: retorna lista de OSs e seus custos vinculados ao IMEI/produto
- Ao aprovar retorno: atualizar status do produto para "Disponivel" e somar custos

**8. `src/pages/EstoqueProdutoDetalhes.tsx`**
- Novo card "Custo Total" exibindo `valorCusto + custoAssistencia`
- Novo botao "Ver Detalhes do Custo" com modal listando aquisicao + reparos por OS

**9. `src/App.tsx`**
- Adicionar rota `/os/aparelhos-pendentes` apontando para `OSAparelhosPendentes`

**10. `src/components/ui/badge.tsx` (sem alteracao)**
- Reutilizar badges existentes para novos status

#### Novos status e badges:
- `"Servico Concluido - Validar Aparelho"` - Badge amarelo/laranja
- `"Retrabalho - Recusado pelo Estoque"` - Badge vermelho com icone de retorno

#### Travas de seguranca:
- Tecnico nao pode finalizar sem preencher resumo e valores de pecas (ja existente, mantido)
- Campo "Loja" filtra apenas tipo "Assistencia" (ja existente, mantido)
- Calculo de custo composto eh atomico (leitura + soma + escrita em uma unica operacao)
- Campo "Responsavel" auto-preenchido pelo usuario logado (regra global mantida)

