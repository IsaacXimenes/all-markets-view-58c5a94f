

# Plano: Aprimoramentos no Modulo de Garantia, Assistencia e Refinamentos Gerais

## Analise do Estado Atual

Apos inspecao detalhada do codigo, varias funcionalidades solicitadas ja estao implementadas:

| Funcionalidade | Status |
|---|---|
| Quadros (Dados Venda, Cliente, Aparelho, Tratativa) | Ja implementado |
| Autocomplete Modelo (via cadastro de produtos) | Ja implementado |
| Tipos de Tratativa (4 opcoes) | Ja implementado |
| Orquestrador atomico processarTratativaGarantia | Ja implementado |
| Fluxo de aprovacao gestor (Emprestimo/Troca) | Ja implementado |
| origemOS = "Garantia" nas OS geradas | Ja implementado (linha 900 garantiasApi.ts) |
| Status "Emprestado - Garantia" no estoque | Ja implementado |
| Reserva de aparelho para Troca Direta | Ja implementado |
| Controle de devolucao na aba Em Andamento | Ja implementado |
| Garantia Extendida: vencimentos + tratativas comerciais + pagamento | Ja implementado |
| Cadastros > Colaboradores toggle habilitar/desabilitar | Ja implementado |
| Extrato por Conta: coluna Log (Data/Hora) | Ja implementado |

---

## Funcionalidades a Implementar

### 1. Leitura de IMEI via Camera (GarantiasNovaManual.tsx)

**O que**: Adicionar botao de camera ao lado do campo IMEI para scan via QR Code / codigo de barras usando o componente `barcode-scanner` ja existente no projeto (`src/components/ui/barcode-scanner.tsx`).

**Detalhes tecnicos**:
- Importar e integrar o componente BarcodeScanner existente
- Adicionar botao de camera (icone Camera) ao lado do input IMEI
- Ao escanear, preencher automaticamente o campo IMEI com formatacao

**Arquivo**: `src/pages/GarantiasNovaManual.tsx`

---

### 2. Upload de Fotos Obrigatorio para Emprestimo (Entrega e Devolucao)

**O que**: Ao selecionar tratativa "Assistencia + Emprestimo", exigir fotos do estado do aparelho emprestado antes de salvar. Na devolucao (aba Em Andamento), exigir fotos do retorno.

**Detalhes tecnicos**:
- Em `GarantiasNovaManual.tsx`: adicionar campo FileUploadComprovante (componente existente) abaixo da selecao do aparelho emprestado. Tornar obrigatorio (validar no handleSalvar).
- Em `GarantiasEmAndamento.tsx`: no modal de devolucao, adicionar campo FileUploadComprovante obrigatorio antes de confirmar.
- Armazenar referencias das fotos na tratativa e registrar na timeline.

**Arquivos**: `src/pages/GarantiasNovaManual.tsx`, `src/pages/GarantiasEmAndamento.tsx`

---

### 3. Troca Direta: Gerar Nota de Venda (Modelo Garantia)

**O que**: Quando a tratativa "Troca Direta" for aprovada pelo gestor, gerar automaticamente uma Nota de Venda com custo e lucro zerados (modelo garantia).

**Detalhes tecnicos**:
- Em `garantiasApi.ts` na funcao `aprovarTratativa`, ao processar Troca Direta:
  - Criar registro de venda via `addVenda` com valorTotal = 0, lucro = 0
  - O aparelho do cliente (com defeito) deve ser registrado em Aparelhos Pendentes com origem "Entrada de Garantia"
  - O aparelho novo sai do estoque com status "Troca - Garantia"
- Registrar na timeline da garantia

**Arquivos**: `src/utils/garantiasApi.ts`, `src/utils/estoqueApi.ts`

---

### 4. Troca Direta: Aparelho do Cliente para Aparelhos Pendentes

**O que**: O aparelho defeituoso do cliente (IMEI da garantia) deve ser adicionado a "Aparelhos Pendentes" no Estoque com identificacao "Entrada de Garantia".

**Detalhes tecnicos**:
- Na funcao `aprovarTratativa` (garantiasApi.ts), ao aprovar Troca Direta:
  - Chamar `addProdutoPendente` (ou equivalente em estoqueApi) com:
    - modelo: garantia.modelo
    - imei: garantia.imei
    - origem: "Entrada de Garantia"
    - garantiaId: garantia.id
  - Registrar movimentacao de estoque

**Arquivo**: `src/utils/garantiasApi.ts`

---

### 5. Inclusao do Aparelho de Troca na Nota de Garantia (PDF)

**O que**: Na nota de garantia gerada (PDF), incluir linha do aparelho de troca com:
- DESCRICAO: "Aparelho de Troca - [Modelo] ([Capacidade]) - IMEI: [Numero]"
- TIPO: "Base de Troca"
- VALOR: negativo (ex: - R$ 1.500,00)

**Detalhes tecnicos**:
- Ajustar `gerarNotaGarantiaPdf.ts` para aceitar e renderizar item de troca
- Quando a venda tem origem de troca de garantia, incluir a linha extra na tabela de produtos

**Arquivo**: `src/utils/gerarNotaGarantiaPdf.ts`

---

### 6. Remover Quadro "Plano de Garantia" da tela de Nova Garantia Manual

**O que**: O quadro de selecao de planos de garantia (linhas 569-611 de GarantiasNovaManual.tsx) deve ser removido da tela, pois a gestao de planos sera feita em outro local. Os campos manuais de tipo/meses/data ja cobrem a necessidade.

**Arquivo**: `src/pages/GarantiasNovaManual.tsx`

---

### 7. Fix "Observacao Fantasma" no Financeiro

**O que**: Na aba de Conferencia de Contas do Financeiro, se a observacao do gestor estiver vazia ou conter apenas espacos, nao deve aparecer na tela.

**Detalhes tecnicos**:
- Em `FinanceiroConferencia.tsx` (linha 1415-1424): adicionar validacao `observacaoGestorCarregada.texto.trim()` antes de exibir
- Em `VendasConferenciaGestor.tsx` (linha 288): ja salva apenas se `trim()` e truthy, mas adicionar limpeza do localStorage se vazio para evitar entradas residuais

**Arquivos**: `src/pages/FinanceiroConferencia.tsx`, `src/pages/VendasConferenciaGestor.tsx`

---

## Sequencia de Implementacao

1. Fix observacao fantasma (rapido, isolado)
2. Remover quadro Plano de Garantia
3. Leitura IMEI via camera
4. Upload de fotos para emprestimo (entrega)
5. Upload de fotos para devolucao
6. Troca Direta: aparelho pendente + nota zerada
7. Inclusao na nota PDF

## Observacoes

- As funcionalidades de **Garantia Extendida** (acompanhamento de vencimento, registro de tratativa comercial, venda de plano com pagamentos e integracao financeira) ja estao 100% implementadas em `GarantiasExtendida.tsx`, `GarantiaExtendidaDetalhes.tsx` e `garantiaExtendidaApi.ts`.
- O **toggle de Colaboradores** ja esta implementado em `CadastrosColaboradores.tsx` com historico e auditoria.
- A coluna **Log (Data/Hora)** no extrato ja existe em `FinanceiroExtratoContas.tsx`.
- A **origemOS = "Garantia"** ja esta correta na funcao `processarTratativaGarantia` (linha 900 de garantiasApi.ts).

