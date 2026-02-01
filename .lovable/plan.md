

# Plano: Correções e Melhorias em Múltiplos Módulos

## Resumo das Solicitações

O usuário identificou diversas melhorias e correções necessárias em 5 módulos do sistema:

---

## 1. MÓDULO CADASTROS - Acessórios

### 1.1 Adicionar Campo "Limite Mínimo" no Cadastro de Acessórios

**Arquivo:** `src/pages/CadastrosAcessorios.tsx`

**Mudanças:**
- Adicionar campo `limiteMinimo` na interface `AcessorioCadastro`
- Adicionar coluna "Limite Mín." na tabela
- Adicionar campo no formulário de criação/edição
- Atualizar dados mockados com valores de limite
- Atualizar função de exportação CSV

**Interface atualizada:**
```typescript
export interface AcessorioCadastro {
  id: string;
  marca: string;
  categoria: string;
  produto: string;
  limiteMinimo: number; // NOVO CAMPO
}
```

---

## 2. MÓDULO FINANCEIRO

### 2.1 Despesas Fixas/Variáveis - Competência como Seleção

**Arquivos:** 
- `src/pages/FinanceiroDespesasFixas.tsx`
- `src/pages/FinanceiroDespesasVariaveis.tsx`

**Mudanças:**
- Substituir `Input` de texto por `Select` com lista de meses
- Gerar lista dinâmica de competências (ex: FEV-2026, MAR-2026, etc.)
- Manter formato padrão "MMM-YYYY"

### 2.2 Despesas - Opção para Mudar Competência em Lote

**Mudanças:**
- Adicionar botão "Mudar Competência" na tabela de despesas lançadas
- Abrir modal para selecionar despesas e nova competência
- Aplicar alteração em lote para despesas selecionadas

### 2.3 Fiado - Controle Semanal

**Arquivo:** `src/pages/FinanceiroFiado.tsx` e `src/utils/fiadoApi.ts`

**Mudanças:**
- Adicionar campo `tipoRecorrencia: 'Mensal' | 'Semanal'` nas parcelas
- Ao selecionar "Semanal", mostrar campo para escolher dia da semana (Segunda, Terça, etc.)
- Adicionar campo "Data Inicial de Pagamento"
- Lógica de geração de parcelas: ao invés de +30 dias, calcular próxima ocorrência do dia da semana selecionado (+7 dias)

**Exemplo de lógica:**
```text
Fiado 8x Semanal, Quarta-feira, início 05/02/2026
→ Parcelas: 05/02, 12/02, 19/02, 26/02, 05/03, 12/03, 19/03, 26/03
```

---

## 3. MÓDULO GARANTIAS

### 3.1 Nomenclatura das Lojas

**Arquivo:** `src/pages/GarantiasNova.tsx`

**Problema:** Usando nomenclatura antiga "THIAGO IMPORTS NORTE"
**Solução:** Já está usando `obterNomeLoja()` do CadastroStore. Verificar se os dados mockados estão atualizados.

### 3.2 Incluir Acessórios (JBL) em Garantia

**Arquivo:** `src/pages/GarantiasNovaManual.tsx`

**Mudanças:**
- Adicionar opção de tipo "Acessório" no formulário
- Ao selecionar "Acessório", mostrar campo para buscar acessórios do Cadastros
- Adaptar campos de garantia para acessórios (sem IMEI, usar código do produto)

### 3.3 Tratativa "Troca Direta" - Layout igual Vendas

**Arquivo:** `src/pages/GarantiasNovaManual.tsx`

**Mudanças:**
- Ao selecionar "Troca Direta", abrir modal/seção com:
  - Busca de aparelhos no estoque (igual tela de Vendas)
  - Filtros: IMEI, Modelo, Loja (SIA como padrão + outras)
  - Tabela com aparelhos disponíveis
  - Botão "Solicitar Movimentação" se aparelho estiver em outra loja
  - Exibir informações completas: IMEI, Modelo, Cor, Bateria, Custo, Loja

### 3.4 Tratativa "Assistência + Empréstimo" - Mesmo Layout

**Arquivo:** `src/pages/GarantiasNovaManual.tsx`

**Mudanças:**
- Replicar o mesmo layout de seleção de aparelhos do item anterior
- Aparelho de empréstimo vinculado ao estoque com possibilidade de movimentação

### 3.5 Garantia Padrão "Garantia - Thiago Imports"

**Arquivo:** `src/pages/GarantiasNovaManual.tsx`

**Mudanças:**
- Alterar valor inicial de `tipoGarantia` de `'Garantia - Apple'` para `'Garantia - Thiago Imports'`

---

## 4. MÓDULO ESTOQUE

### 4.1 Movimentações - Nomenclatura das Lojas

**Arquivo:** `src/pages/EstoqueMovimentacoes.tsx`

**Problema:** Colunas Origem/Destino mostrando nomenclatura antiga "LOJA CENTRO"
**Verificação:** O código já usa `getLojaNome()` que chama `obterNomeLoja()`. Verificar dados mockados.

### 4.2 Aparelhos - Máscara de Moeda no Valor Recomendado

**Arquivo:** `src/pages/EstoqueProdutos.tsx` (modal de alterar valor)

**Mudanças:**
- Usar `InputComMascara` com máscara "moeda" no campo de valor recomendado
- Exibir valores formatados: R$ 12.600,00 ao invés de 12600

### 4.3 Acessórios - Nomenclatura das Lojas

**Arquivo:** `src/pages/EstoqueAcessorios.tsx`

**Problema:** Coluna Loja mostrando "LOJA-001"
**Verificação:** Já usa `getLojaNome(lojaId)`. Verificar dados mockados.

### 4.4 Aparelhos Pendentes - Autocomplete no Filtro de Fornecedor

**Arquivo:** `src/pages/EstoqueProdutosPendentes.tsx`

**Mudanças:**
- Criar componente `AutocompleteFornecedor` (se não existir)
- Substituir `Select` de fornecedor por `AutocompleteFornecedor`
- Permitir digitação para busca

### 4.5 Aparelhos Pendentes - Nomenclatura das Lojas

**Arquivo:** `src/pages/EstoqueProdutosPendentes.tsx`

**Verificação:** Já usa `getLojaNome()`. Verificar dados mockados.

---

## 5. MÓDULO RECURSOS HUMANOS

### 5.1 Feedback - Ajustar Coluna Loja

**Arquivo:** `src/pages/RHFeedback.tsx`

**Problema:** Usando `getLojas()` do cadastrosApi antigo
**Solução:** Usar `useCadastroStore().obterNomeLoja()` para exibir nomes corretos

### 5.2 Feedback - Anexar Documento

**Arquivo:** `src/pages/RHFeedback.tsx`

**Mudanças:**
- Adicionar campo de upload de arquivo no modal de registro
- Armazenar referência do arquivo no objeto de feedback
- Exibir link/preview do documento anexado nos detalhes
- Suportar formatos: PDF, imagens (JPG, PNG)

### 5.3 Vales - Ajustar Colunas Loja e Colaborador

**Arquivo:** `src/pages/RHVales.tsx`

**Verificação:** Já usa `getLojaNome()` e `getColaboradorNome()` do CadastroStore. Verificar tabela.

### 5.4 Adiantamentos - Ajustar Colunas Loja e Colaborador

**Arquivo:** `src/pages/RHAdiantamentos.tsx`

**Verificação:** Já usa `getLojaNome()` e `getColaboradorNome()` do CadastroStore. Verificar tabela.

### 5.5 Nova Aba: Remuneração dos Motoboy

**Novos arquivos:**
- `src/pages/RHMotoboyRemuneracao.tsx`
- `src/utils/motoboyApi.ts`

**Funcionalidades:**
- Listar todos os Motoboys ativos (filtrar colaboradores por cargo)
- Colunas: Nome, Competência, Valor Final, Qtd Demandas
- Pagamento quinzenal baseado em períodos selecionados
- Filtros: Colaborador, Período Início, Período Fim, Competência
- Exportação CSV

**Atualizar layout:**
- `src/components/layout/RHLayout.tsx` - Adicionar nova aba "Remuneração Motoboy"

---

## Detalhes Técnicos

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/RHMotoboyRemuneracao.tsx` | Nova aba de remuneração de motoboys |
| `src/utils/motoboyApi.ts` | API mockada para demandas/entregas de motoboys |

### Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/CadastrosAcessorios.tsx` | Adicionar campo limiteMinimo |
| `src/pages/FinanceiroDespesasFixas.tsx` | Select de competência + alteração em lote |
| `src/pages/FinanceiroDespesasVariaveis.tsx` | Select de competência + alteração em lote |
| `src/pages/FinanceiroFiado.tsx` | Suporte a parcelas semanais |
| `src/utils/fiadoApi.ts` | Lógica de geração de parcelas semanais |
| `src/pages/GarantiasNovaManual.tsx` | Garantia padrão + Acessórios + Layout tratativas |
| `src/pages/EstoqueProdutos.tsx` | Máscara moeda no valor recomendado |
| `src/pages/EstoqueProdutosPendentes.tsx` | AutocompleteFornecedor |
| `src/pages/RHFeedback.tsx` | Nomenclatura loja + Upload de documento |
| `src/components/layout/RHLayout.tsx` | Nova aba Motoboy |
| `src/App.tsx` | Nova rota /rh/motoboy-remuneracao |

### Componentes a Verificar/Criar

| Componente | Status |
|------------|--------|
| `AutocompleteFornecedor` | Já existe em `src/components/AutocompleteFornecedor.tsx` |

---

## Priorização Sugerida

1. **Alta prioridade** (correções de nomenclatura - impacto visual):
   - Verificar e corrigir dados mockados de lojas em todos os módulos
   - Garantir uso consistente do CadastroStore

2. **Média prioridade** (novas funcionalidades):
   - Campo limite mínimo em Acessórios
   - Select de competência em Despesas
   - Controle semanal de Fiado
   - Upload de documento em Feedback

3. **Baixa prioridade** (funcionalidades maiores):
   - Nova aba Remuneração Motoboy
   - Layout completo de seleção de aparelhos em Garantias

---

## Próximos Passos

Após aprovação, implementarei as mudanças na seguinte ordem:

1. Correções de nomenclatura (verificação de dados mockados)
2. Cadastros > Acessórios (campo limite mínimo)
3. Financeiro > Despesas (select competência)
4. Financeiro > Fiado (controle semanal)
5. RH > Feedback (upload documento)
6. RH > Nova aba Motoboy
7. Garantias > Tratativas (layouts expandidos)

