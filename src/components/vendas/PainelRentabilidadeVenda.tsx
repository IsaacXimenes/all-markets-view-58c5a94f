import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  Package, Headphones, ArrowLeftRight, Shield, Truck, TrendingUp, TrendingDown,
  ChevronDown, DollarSign, AlertTriangle, Info, Lightbulb
} from 'lucide-react';
import { formatarMoeda } from '@/utils/formatUtils';
import { ItemVenda, ItemTradeIn, Pagamento } from '@/utils/vendasApi';
import { VendaAcessorio } from '@/utils/acessoriosApi';
import {
  calcularRentabilidadeAparelhos,
  calcularRentabilidadeAcessorios,
  calcularAnaliseTradeIn,
  calcularLucroReal,
  ResumoRentabilidade,
} from '@/utils/calculoRentabilidadeVenda';

const formatCurrency = formatarMoeda;

interface PainelRentabilidadeVendaProps {
  itens: ItemVenda[];
  acessoriosVenda: VendaAcessorio[];
  tradeIns: ItemTradeIn[];
  garantiaExtendida: { planoNome: string; valor: number } | null;
  taxaEntrega: number;
  localEntregaId: string;
  lojaVenda: string;
  pagamentos: Pagamento[];
  total: number;
}

function BlocoHeader({ icon: Icon, title, total, className }: { icon: any; title: string; total?: string; className?: string }) {
  return (
    <CollapsibleTrigger className={`flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {total && <span className="text-sm font-semibold">{total}</span>}
        <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
      </div>
    </CollapsibleTrigger>
  );
}

export function PainelRentabilidadeVenda(props: PainelRentabilidadeVendaProps) {
  const { itens, acessoriosVenda, tradeIns, garantiaExtendida, taxaEntrega, localEntregaId, lojaVenda, pagamentos, total } = props;

  const aparelhos = useMemo(() => calcularRentabilidadeAparelhos(itens), [itens]);
  const acessorios = useMemo(() => calcularRentabilidadeAcessorios(acessoriosVenda), [acessoriosVenda]);
  const analiseTradeIn = useMemo(() => calcularAnaliseTradeIn(tradeIns), [tradeIns]);

  const resumo: ResumoRentabilidade = useMemo(() => calcularLucroReal({
    itens,
    acessoriosVenda,
    tradeIns,
    valorGarantia: garantiaExtendida?.valor ?? 0,
    taxaEntregaCobrada: taxaEntrega,
    localEntregaId,
    lojaVendaId: lojaVenda,
    pagamentos,
    totalVenda: total,
  }), [itens, acessoriosVenda, tradeIns, garantiaExtendida, taxaEntrega, localEntregaId, lojaVenda, pagamentos, total]);

  const hasData = itens.length > 0 || acessoriosVenda.length > 0;
  if (!hasData) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Painel de Rentabilidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Bloco Aparelhos */}
        {itens.length > 0 && (
          <Collapsible defaultOpen>
            <BlocoHeader icon={Package} title="Aparelhos" total={formatCurrency(aparelhos.totalVenda)} />
            <CollapsibleContent>
              <div className="px-3 pb-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Produto</TableHead>
                      <TableHead className="text-xs text-right">Custo</TableHead>
                      <TableHead className="text-xs text-right">Venda</TableHead>
                      <TableHead className="text-xs text-right">Lucro</TableHead>
                      <TableHead className="text-xs text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aparelhos.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs py-1.5">{item.produto}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.valorCusto)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.valorVenda)}</TableCell>
                        <TableCell className={`text-xs text-right py-1.5 font-medium ${item.lucro < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrency(item.lucro)}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5">
                          <Badge variant={item.margem < 0 ? 'destructive' : 'secondary'} className={`text-xs ${item.margem >= 30 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : item.margem >= 15 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {item.margem.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Bloco Acessórios */}
        {acessoriosVenda.length > 0 && (
          <Collapsible>
            <BlocoHeader icon={Headphones} title="Acessórios" total={formatCurrency(acessorios.totalVenda)} />
            <CollapsibleContent>
              <div className="px-3 pb-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs text-right">Qtd</TableHead>
                      <TableHead className="text-xs text-right">Custo Un.</TableHead>
                      <TableHead className="text-xs text-right">Venda</TableHead>
                      <TableHead className="text-xs text-right">Lucro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acessorios.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs py-1.5">{item.descricao}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{item.quantidade}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.valorCusto)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{formatCurrency(item.valorTotal)}</TableCell>
                        <TableCell className={`text-xs text-right py-1.5 font-medium ${item.lucro < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrency(item.lucro)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Bloco Trade-In */}
        {tradeIns.length > 0 && (
          <Collapsible>
            <BlocoHeader icon={ArrowLeftRight} title="Base de Troca" total={formatCurrency(resumo.totalTradeIn)} />
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-2">
                {analiseTradeIn.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{t.modelo}</p>
                      <p className="text-xs text-muted-foreground">Compra: {formatCurrency(t.valorCompraUsado)}</p>
                    </div>
                    <div className="text-right">
                      {t.status === 'economia' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingDown className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Economia: {formatCurrency(Math.abs(t.diferenca!))}</span>
                        </div>
                      )}
                      {t.status === 'acima' && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Acima: {formatCurrency(Math.abs(t.diferenca!))}</span>
                        </div>
                      )}
                      {t.status === 'sem_referencia' && (
                        <span className="text-xs text-muted-foreground">Sem referência</span>
                      )}
                      {t.valorSugerido !== null && (
                        <p className="text-xs text-muted-foreground">Ref: {formatCurrency(t.valorSugerido)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Bloco Garantia Extendida */}
        {garantiaExtendida && (
          <Collapsible>
            <BlocoHeader icon={Shield} title="Garantia Extendida" total={formatCurrency(garantiaExtendida.valor)} />
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plano</span>
                  <span className="font-medium">{garantiaExtendida.planoNome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor</span>
                  <span>{formatCurrency(garantiaExtendida.valor)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Comissão (10%)</span>
                  <span className="text-green-600 font-medium">{formatCurrency(resumo.comissaoGarantia)}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Bloco Logística */}
        {taxaEntrega > 0 && (
          <Collapsible>
            <BlocoHeader icon={Truck} title="Logística (Entrega)" total={formatCurrency(taxaEntrega)} />
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cobrado do Cliente</span>
                  <span>{formatCurrency(taxaEntrega)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Custo Parametrizado</span>
                  <span>{formatCurrency(resumo.custoEntregaParametrizado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Diferença</span>
                  <span className={resumo.lucroEntrega >= 0 ? 'text-green-600' : 'text-destructive'}>
                    {formatCurrency(resumo.lucroEntrega)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Info className="h-3 w-3" />
                  Custo parametrizado provisionado 100% para o motoboy
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* Resumo Consolidado */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Resumo Consolidado
            </h4>
            <span className={`text-sm font-bold ${resumo.lucroBruto >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              Lucro Bruto: {formatCurrency(resumo.lucroBruto)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">Custo Total</span>
            <span className="text-right">{formatCurrency(resumo.custoTotal)}</span>

            <span className="text-muted-foreground">Valor de Venda Total</span>
            <span className="text-right font-medium">{formatCurrency(resumo.valorVendaTotal)}</span>

            <span className="text-muted-foreground">Lucro Bruto</span>
            <span className={`text-right font-medium ${resumo.lucroBruto < 0 ? 'text-destructive' : 'text-green-600'}`}>
              {formatCurrency(resumo.lucroBruto)}
            </span>
          </div>

          <Separator className="my-2" />

          {/* Discriminação de Valores */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              Discriminação de Valores
            </summary>
            <div className="mt-2 space-y-1 text-xs border rounded-lg p-3 bg-muted/20">
              <div className="flex justify-between">
                <span>(-) Comissão Garantia (10%)</span>
                <span>{formatCurrency(resumo.comissaoGarantia)}</span>
              </div>
              <div className="flex justify-between">
                <span>(-) Comissão Lucro ({resumo.percentualComissao}%)</span>
                <span>{formatCurrency(resumo.comissaoLucro)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>(-) Comissão Final</span>
                <span>{formatCurrency(resumo.comissaoFinal)}</span>
              </div>
              <div className="flex justify-between">
                <span>(-) Custo Entrega Parametrizado</span>
                <span>{formatCurrency(resumo.custoEntregaParametrizado)}</span>
              </div>
              <div className="flex justify-between">
                <span>(-) Taxas Cartão</span>
                <span>{formatCurrency(resumo.taxasCartao)}</span>
              </div>
            </div>
          </details>

          <Separator className="my-2" />

          {/* Coach de Vendas - Dicas de Upsell */}
          {(itens.length > 0 && acessoriosVenda.length === 0) || (!garantiaExtendida && itens.length > 0) ? (
            <div className="space-y-2">
              {itens.length > 0 && acessoriosVenda.length === 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Dica: Adicionar Acessórios
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                      Capa + Película pode gerar ~{formatCurrency(50 * 0.4)} de lucro extra e ajuda a bater a meta de acessórios da loja!
                    </p>
                  </div>
                </div>
              )}
              {!garantiaExtendida && itens.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Dica: Garantia Extendida
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                      A Garantia Extendida garante 10% de comissão extra (~{formatCurrency(199 * 0.10)}) e protege o investimento do cliente!
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className={`flex justify-between items-center p-3 rounded-lg ${resumo.lucroReal >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
            <span className="font-bold text-sm">Lucro Real (Líquido)</span>
            <span className={`text-lg font-bold ${resumo.lucroReal >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(resumo.lucroReal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
