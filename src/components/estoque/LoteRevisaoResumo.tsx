import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, DollarSign, FileText, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/utils/formatUtils';
import { cn } from '@/lib/utils';

interface LoteRevisaoResumoProps {
  valorOriginalNota: number;
  custoTotalReparos: number;
  valorLiquidoSugerido: number;
  percentualReparo?: number;
}

export function LoteRevisaoResumo({ 
  valorOriginalNota, 
  custoTotalReparos, 
  valorLiquidoSugerido,
  percentualReparo 
}: LoteRevisaoResumoProps) {
  const pct = percentualReparo ?? (valorOriginalNota > 0 ? (custoTotalReparos / valorOriginalNota) * 100 : 0);
  const alertaCritico = pct > 15;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Original da Nota</p>
              <p className="text-2xl font-bold">{formatCurrency(valorOriginalNota)}</p>
            </div>
            <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card className={cn(alertaCritico && 'border-destructive bg-destructive/5')}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Custo Total de Reparos (Abatimento)</p>
              <p className={cn('text-2xl font-bold', alertaCritico ? 'text-destructive' : 'text-primary')}>
                {formatCurrency(custoTotalReparos)}
              </p>
              <p className={cn('text-xs', alertaCritico ? 'text-destructive' : 'text-muted-foreground')}>
                {pct.toFixed(1)}% do valor da nota
              </p>
            </div>
            {alertaCritico ? (
              <AlertTriangle className="h-10 w-10 text-destructive opacity-70" />
            ) : (
              <DollarSign className="h-10 w-10 text-primary opacity-50" />
            )}
          </div>
          {alertaCritico && (
            <p className="text-xs text-destructive mt-2 font-medium">
              ⚠ Custo de reparo ultrapassou 15% do valor da nota!
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Líquido Sugerido</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(valorLiquidoSugerido)}</p>
            </div>
            <TrendingDown className="h-10 w-10 text-primary opacity-50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
