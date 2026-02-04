
# Plano de Ajustes e Refinamentos - Modulos Vendas, Conferencia e Cadastros

## Resumo das Alteracoes

Este plano abrange 5 areas principais de ajustes e refinamentos solicitados para os modulos de Vendas, Conferencia e Cadastros, focando em usabilidade, precisao financeira e logica de negocio.

---

## 1. Modulo de Vendas: Nova Venda

### 1.1. Redimensionamento de Modal de Selecao de Acessorios

**Problema Identificado**
O modal de selecao de acessorios ja esta configurado com `max-w-6xl max-h-[80vh] overflow-y-auto` (linha 3114 de VendasNova.tsx), porem pode estar quebrando em alguns contextos.

**Solucao**
- Adicionar `overflow-hidden` no DialogContent principal
- Aplicar altura fixa no container interno com scroll
- Garantir que a tabela nao exceda limites do modal

**Arquivo a Modificar**
- `src/pages/VendasNova.tsx` (linha 3114)

```text
Antes:
<DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">

Depois:
<DialogContent className="max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
  <DialogHeader>...</DialogHeader>
  <div className="flex-1 overflow-y-auto space-y-4">
    ...tabela...
  </div>
  <DialogFooter>...</DialogFooter>
```

---

### 1.2. Leitura de Codigo de Barras (Quadro de Base de Troca)

**Problema Identificado**
O campo IMEI no modal de Base de Troca (linha 2862-2876) nao possui opcao de leitura via camera.

**Solucao**
- Adicionar icone de camera ao lado do campo IMEI
- Implementar componente de leitura de codigo de barras usando a API MediaStream
- Adicionar linha guia horizontal para posicionamento do codigo

**Arquivos a Criar/Modificar**
- `src/components/ui/barcode-scanner.tsx` (novo componente)
- `src/pages/VendasNova.tsx` (modal Trade-In, linha 2862)

**Implementacao Detalhada**

Novo componente BarcodeScanner:
```text
- Botao com icone Camera que abre modal fullscreen
- Usa navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
- Canvas overlay com linha guia horizontal centralizada
- Biblioteca html5-qrcode ou native BarcodeDetector API
- Callback onScan(imei: string) para retornar valor lido
- Suporte a 3 codigos no aparelho (usuario foca na linha guia)
```

Integracao no modal Trade-In:
```text
<div className="flex gap-2">
  <Input 
    value={novoTradeIn.imei || ''}
    onChange={(e) => {...}}
    placeholder="00-000000-000000-0"
  />
  <Button variant="outline" onClick={() => setShowBarcodeScanner(true)}>
    <Camera className="h-4 w-4" />
  </Button>
</div>

<BarcodeScanner 
  open={showBarcodeScanner}
  onScan={(imei) => {
    setNovoTradeIn({ ...novoTradeIn, imei: formatIMEI(imei) });
    setShowBarcodeScanner(false);
  }}
  onClose={() => setShowBarcodeScanner(false)}
/>
```

---

### 1.3. Correcao de Logica no Quadro de Retirada/Logistica

**Problema Identificado**
Ao alterar de "Entrega" para "Retirada Balcao" ou "Retirada em Outra Loja", o valor da entrega (`taxaEntrega`) nao e zerado automaticamente no card de resumo.

**Localizacao**
- `src/pages/VendasNova.tsx` (linha 1957-1969)

**Solucao**
Adicionar useEffect ou handler no Select de tipoRetirada para zerar taxaEntrega quando nao for "Entrega".

**Implementacao**
```text
const handleTipoRetiradaChange = (value: string) => {
  setTipoRetirada(value as any);
  
  // Zerar valores de entrega quando nao for "Entrega"
  if (value !== 'Entrega') {
    setTaxaEntrega(0);
    setLocalEntregaId('');
    setLocalEntregaNome('');
    setValorRecomendadoEntrega(0);
    setMotoboyId('');
  }
};

// No Select:
<Select value={tipoRetirada} onValueChange={handleTipoRetiradaChange}>
```

---

## 2. Modulo de Vendas: Historico de Vendas

### 2.1. Ajustes na Tabela de Historico

**Problema Identificado**
A tabela exibe colunas desnecessarias e ordem de colunas nao otimizada.

**Localizacao**
- `src/pages/Vendas.tsx` (linhas 381-398 e 433-480)

**Alteracoes Necessarias**

1. **Remover Colunas da Tabela Principal**:
   - `Resp. Loja` (linha 389 e 444)
   - `V. Recomendado` (linha 391 e 448-450)

2. **Reordenar Colunas**:
```text
Nova ordem:
Modelo > Loja > IMEI > ID Venda > Data/Hora > Cliente > Resp. Venda > V. Custo > V. Venda > Lucro > Margem % > Resp. Garantia > Data Fim Garantia > Acoes
```

**Implementacao**
```text
<TableHeader>
  <TableRow>
    <TableHead>Modelo</TableHead>
    <TableHead>Loja</TableHead>
    <TableHead>IMEI</TableHead>
    <TableHead>ID Venda</TableHead>
    <TableHead>Data/Hora</TableHead>
    <TableHead>Cliente</TableHead>
    <TableHead>Resp. Venda</TableHead>
    <TableHead className="text-right">V. Custo</TableHead>
    <TableHead className="text-right">V. Venda</TableHead>
    <TableHead className="text-right">Lucro</TableHead>
    <TableHead className="text-right">Margem %</TableHead>
    <TableHead>Resp. Garantia</TableHead>
    <TableHead>Data Fim Garantia</TableHead>
    <TableHead>Acoes</TableHead>
  </TableRow>
</TableHeader>
```

---

## 3. Modulo de Vendas: Quadro de Pagamento (Fiado)

### 3.1. Flexibilizacao de Recorrencia de Pagamento Fiado

**Problema Identificado**
O pagamento Fiado atualmente so suporta recorrencia mensal com selecao de dia do mes (linha 647-694 de PagamentoQuadro.tsx).

**Localizacao**
- `src/components/vendas/PagamentoQuadro.tsx` (linhas 647-694)

**Solucao**
Adicionar opcao de recorrencia "Semanal" com intervalo em dias.

**Implementacao Detalhada**

Adicionar campo de selecao de recorrencia:
```text
// Novo estado
fiadoTipoRecorrencia?: 'Mensal' | 'Semanal';
fiadoIntervaloDias?: number; // Para semanal: 7, 14, 15, etc.

// Interface atualizada
<div>
  <label className="text-sm font-medium">Tipo de Recorrencia *</label>
  <Select 
    value={novoPagamento.fiadoTipoRecorrencia || 'Mensal'} 
    onValueChange={(v) => setNovoPagamento({ 
      ...novoPagamento, 
      fiadoTipoRecorrencia: v as 'Mensal' | 'Semanal',
      fiadoDataBase: v === 'Semanal' ? undefined : novoPagamento.fiadoDataBase,
      fiadoIntervaloDias: v === 'Semanal' ? 7 : undefined
    })}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Mensal">Mensal (dia fixo do mes)</SelectItem>
      <SelectItem value="Semanal">Semanal (intervalo em dias)</SelectItem>
    </SelectContent>
  </Select>
</div>

// Condicional - Mensal
{novoPagamento.fiadoTipoRecorrencia === 'Mensal' && (
  <div>
    <label>Dia do Mes *</label>
    <Select value={String(novoPagamento.fiadoDataBase)} ...>
      // Dias 1, 5, 10, 15, 20, 25, 28
    </Select>
  </div>
)}

// Condicional - Semanal
{novoPagamento.fiadoTipoRecorrencia === 'Semanal' && (
  <div>
    <label>Intervalo de Dias *</label>
    <Select 
      value={String(novoPagamento.fiadoIntervaloDias)} 
      onValueChange={(v) => setNovoPagamento({ ...novoPagamento, fiadoIntervaloDias: Number(v) })}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">A cada 7 dias</SelectItem>
        <SelectItem value="14">A cada 14 dias</SelectItem>
        <SelectItem value="15">A cada 15 dias</SelectItem>
        <SelectItem value="21">A cada 21 dias</SelectItem>
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground mt-1">
      Primeira parcela em {format(addDays(new Date(), novoPagamento.fiadoIntervaloDias || 7), 'dd/MM/yyyy')}
    </p>
  </div>
)}
```

**Atualizacao da Interface Pagamento**
Adicionar campos `fiadoTipoRecorrencia` e `fiadoIntervaloDias` na interface Pagamento em `vendasApi.ts`.

---

## 4. Modulo de Conferencia

### 4.1. Conferencia - Gestor: Filtro de Conta Destino

**Problema Identificado**
A aba de Conferencia - Gestor nao possui filtro por "Conta Destino".

**Localizacao**
- `src/pages/VendasConferenciaGestor.tsx` (area de filtros)

**Solucao**
Adicionar Select de filtro por conta destino na area de filtros.

**Implementacao**
```text
// Novo estado
const [filtroContaDestino, setFiltroContaDestino] = useState('todas');

// Importar contas financeiras
const [contasFinanceiras] = useState(getContasFinanceiras());

// Adicionar filtro no useMemo vendasFiltradas
if (filtroContaDestino !== 'todas') {
  resultado = resultado.filter(v => 
    v.pagamentos?.some(p => p.contaDestino === filtroContaDestino)
  );
}

// UI do filtro
<div>
  <label className="text-sm font-medium mb-2 block">Conta Destino</label>
  <Select value={filtroContaDestino} onValueChange={setFiltroContaDestino}>
    <SelectTrigger>
      <SelectValue placeholder="Todas as Contas" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="todas">Todas as Contas</SelectItem>
      {contasFinanceiras.filter(c => c.status === 'Ativo').map(conta => {
        const lojaNome = obterNomeLoja(conta.lojaVinculada);
        return (
          <SelectItem key={conta.id} value={conta.id}>
            {lojaNome ? `${lojaNome} - ${conta.nome}` : conta.nome}
          </SelectItem>
        );
      })}
    </SelectContent>
  </Select>
</div>
```

---

### 4.2. Conferencia - Lancamento: Habilitacao de Registro com Pagamento Sinal

**Problema Identificado**
Vendas com status "Feito Sinal" nao podem ser enviadas para conferencia do gestor mesmo apos o valor total ser completado com outros pagamentos.

**Localizacao**
- `src/pages/VendasConferenciaLancamento.tsx` (linhas 642-652)

**Solucao**
Verificar se a soma dos pagamentos atingiu o valor total da venda e habilitar botao de conferir.

**Logica Atual (linha 642)**
```text
{venda.statusFluxo !== 'Feito Sinal' && ...}
```

**Implementacao Corrigida**
```text
// Funcao para verificar se venda pode ser aprovada
const podeAprovarVenda = (venda: VendaComFluxo) => {
  // Se for Feito Sinal, verificar se pagamentos completam o valor
  if (venda.statusFluxo === 'Feito Sinal') {
    const totalPagamentos = venda.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0;
    return totalPagamentos >= venda.total;
  }
  
  // Para outros status, manter logica atual
  return venda.statusFluxo !== 'Conferencia Gestor' && 
         venda.statusFluxo !== 'Conferencia Financeiro' && 
         venda.statusFluxo !== 'Finalizado';
};

// Uso na UI
{podeAprovarVenda(venda) && (
  <Button 
    size="sm"
    onClick={() => handleAbrirModalAprovar(venda)}
    title="Aprovar lancamento"
    className="bg-green-600 hover:bg-green-700"
  >
    <Check className="h-4 w-4 mr-1" />
    Conferir
  </Button>
)}
```

---

## 5. Modulo de Cadastros: Contas Financeiras (Filtro por Loja na Venda)

**Problema Identificado**
Ao selecionar "Conta de Destino" no quadro de pagamentos, todas as contas ativas aparecem, permitindo selecionar contas de outras lojas.

**Localizacao**
- `src/components/vendas/PagamentoQuadro.tsx` (linhas 808-827)

**Solucao**
Filtrar contas financeiras pela loja onde a venda esta sendo lancada.

**Implementacao**

1. Adicionar prop `lojaVendaId` no componente (ja existe)
2. Filtrar contas pelo `lojaVinculada`

```text
// Atual (linha 818-824)
{contasFinanceiras.filter(c => c.status === 'Ativo').map(conta => ...)}

// Corrigido
{contasFinanceiras
  .filter(c => c.status === 'Ativo')
  .filter(c => !lojaVendaId || c.lojaVinculada === lojaVendaId)
  .map(conta => {
    const lojaNome = conta.lojaVinculada ? obterNomeLoja(conta.lojaVinculada) : '';
    const displayName = lojaNome ? `${lojaNome} - ${conta.nome}` : conta.nome;
    return (
      <SelectItem key={conta.id} value={conta.id}>{displayName}</SelectItem>
    );
  })
}
```

**Atualizacao no VendasNova.tsx**
Garantir que o `lojaVendaId` esta sendo passado corretamente para o componente PagamentoQuadro.

---

## Sequencia de Implementacao

| Ordem | Item | Complexidade | Arquivos |
|-------|------|--------------|----------|
| 1 | Zerar taxa entrega ao mudar tipo retirada | Baixa | VendasNova.tsx |
| 2 | Remover colunas e reordenar Historico | Baixa | Vendas.tsx |
| 3 | Filtro conta destino Conferencia Gestor | Baixa | VendasConferenciaGestor.tsx |
| 4 | Habilitar Sinal quando pagamentos completos | Baixa | VendasConferenciaLancamento.tsx |
| 5 | Filtrar contas por loja no pagamento | Baixa | PagamentoQuadro.tsx |
| 6 | Redimensionar modal acessorios | Baixa | VendasNova.tsx |
| 7 | Recorrencia semanal Fiado | Media | PagamentoQuadro.tsx, vendasApi.ts |
| 8 | Leitor codigo de barras IMEI | Alta | Novo componente + VendasNova.tsx |

---

## Arquivos a Modificar

1. `src/pages/VendasNova.tsx`
   - Handler tipoRetirada para zerar taxa
   - Modal acessorios com layout flexivel
   - Modal trade-in com botao camera

2. `src/pages/Vendas.tsx`
   - Remover colunas Resp. Loja e V. Recomendado
   - Reordenar colunas: Modelo > Loja > IMEI primeiro

3. `src/components/vendas/PagamentoQuadro.tsx`
   - Adicionar selecao de recorrencia Mensal/Semanal
   - Filtrar contas por loja da venda

4. `src/pages/VendasConferenciaGestor.tsx`
   - Adicionar filtro por Conta Destino

5. `src/pages/VendasConferenciaLancamento.tsx`
   - Logica para habilitar Sinal quando pagamentos completos

6. `src/utils/vendasApi.ts`
   - Adicionar campos fiadoTipoRecorrencia e fiadoIntervaloDias na interface

7. `src/components/ui/barcode-scanner.tsx` (novo)
   - Componente de leitura de codigo de barras via camera

---

## Resultado Esperado

Apos implementacao:
- Modal de acessorios nao quebra mais o layout
- Campo IMEI no trade-in permite leitura via camera do dispositivo
- Valor de entrega e zerado ao mudar para retirada na loja
- Tabela de historico mais limpa e com ordem de colunas otimizada
- Pagamento Fiado suporta recorrencia semanal com intervalo em dias
- Conferencia Gestor possui filtro por conta destino
- Vendas com Sinal podem ser aprovadas apos pagamentos completarem valor
- Contas de destino filtradas pela loja da venda, evitando erros de lancamento
