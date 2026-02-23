import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Check } from 'lucide-react';
import { buscarValoresRecomendados, ValorRecomendadoTroca } from '@/utils/valoresRecomendadosTrocaApi';
import { formatCurrency } from '@/utils/formatUtils';

interface ValoresRecomendadosTrocaProps {
  onUsarValor?: (valor: number, modelo: string, condicao: 'Novo' | 'Semi-novo') => void;
}

export function ValoresRecomendadosTroca({ onUsarValor }: ValoresRecomendadosTrocaProps) {
  const [busca, setBusca] = useState('');

  const resultados = useMemo(() => buscarValoresRecomendados(busca), [busca]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar modelo (ex: iPhone 15 Pro)..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-[300px] overflow-y-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Condição</TableHead>
              <TableHead className="text-right">Mín</TableHead>
              <TableHead className="text-right">Máx</TableHead>
              <TableHead className="text-right">Sugerido</TableHead>
              {onUsarValor && <TableHead className="text-center w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onUsarValor ? 6 : 5} className="text-center py-6 text-muted-foreground">
                  Nenhum modelo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              resultados.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm">{item.modelo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={item.condicao === 'Novo' ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400'}>
                      {item.condicao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(item.valorMin)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(item.valorMax)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{formatCurrency(item.valorSugerido)}</TableCell>
                  {onUsarValor && (
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onUsarValor(item.valorSugerido, item.modelo, item.condicao as 'Novo' | 'Semi-novo')}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Usar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Valores de referência para compra de aparelhos usados. Última atualização: Fev/2026
      </p>
    </div>
  );
}
