
# Plano - Integrar Solicitacoes de Pecas no Fluxo da Nova Assistencia

## Problema Identificado

Tres falhas conectadas impedem o fluxo de solicitacao de pecas de funcionar:

1. **Solicitacoes nao sao persistidas**: A tela "Nova Assistencia" permite cadastrar solicitacoes de pecas localmente, mas ao registrar a OS, essas solicitacoes nunca sao enviadas para a API (`addSolicitacao` de `solicitacaoPecasApi.ts` nunca e importada nem chamada).

2. **Status da OS nao muda**: Quando ha solicitacoes de pecas, o status da OS deveria ser alterado para "Solicitacao Enviada", mas isso nao acontece porque as solicitacoes nao sao processadas.

3. **Detalhes da OS nao mostram solicitacoes**: A tela de detalhes (`OSAssistenciaDetalhes.tsx`) nao consulta nem exibe as solicitacoes vinculadas a OS, entao mesmo que fossem salvas, o usuario nao saberia quais pecas foram solicitadas.

---

## Correcao 1: Persistir solicitacoes ao registrar OS

**Arquivo:** `src/pages/OSAssistenciaNova.tsx`

- Importar `addSolicitacao` de `@/utils/solicitacaoPecasApi`
- Dentro de `handleRegistrarOS`, apos criar a OS, iterar sobre `solicitacoesPecas` e chamar `addSolicitacao()` para cada uma, passando `osId`, `peca`, `quantidade`, `justificativa`, `modeloImei` (IMEI do aparelho) e `lojaSolicitante` (loja da OS)
- Se houver solicitacoes, alterar o status da OS para "Solicitacao Enviada" via `updateOrdemServico`
- Adicionar entrada na timeline registrando o envio das solicitacoes

## Correcao 2: Exibir solicitacoes nos Detalhes da OS

**Arquivo:** `src/pages/OSAssistenciaDetalhes.tsx`

- Importar `getSolicitacoesByOS` de `@/utils/solicitacaoPecasApi`
- Consultar as solicitacoes vinculadas a OS ao carregar a pagina
- Adicionar um novo Card "Solicitacoes de Pecas" entre o card de Pecas/Servicos e o de Pagamentos, contendo uma tabela com: Peca, Quantidade, Justificativa, Status (com badge colorido) e data da solicitacao
- O card so aparece se houver ao menos uma solicitacao vinculada

---

## Arquivos alterados

1. `src/pages/OSAssistenciaNova.tsx` - Importar e chamar `addSolicitacao`, atualizar status para "Solicitacao Enviada"
2. `src/pages/OSAssistenciaDetalhes.tsx` - Importar `getSolicitacoesByOS`, exibir card de solicitacoes vinculadas
