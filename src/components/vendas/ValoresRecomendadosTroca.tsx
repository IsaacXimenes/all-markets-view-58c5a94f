import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Check } from 'lucide-react';
import { buscarValoresRecomendados, ValorRecomendadoTroca } from '@/utils/valoresRecomendadosTrocaApi';
import { formatCurrency } from '@/utils/formatUtils';

interface ValoresRecomendadosTrocaProps {
  onUsarValor?: (valor: number, modelo: string) => void;
}

export function ValoresRecomendadosTroca({ onUsarValor }: ValoresRecomendadosTrocaProps) {
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

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
              <TableHead className="text-right">Valor Sugerido</TableHead>
              {onUsarValor && <TableHead className="text-center w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onUsarValor ? 3 : 2} className="text-center py-6 text-muted-foreground">
                  Nenhum modelo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              resultados.map(item => {
                const isSelected = selecionadoId === item.id;
                return (
                <TableRow key={item.id} className={isSelected ? 'bg-green-50 dark:bg-green-900/20 transition-colors duration-500' : 'transition-colors duration-300'}>
                  <TableCell className="font-medium text-sm">{item.modelo}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{formatCurrency(item.valorSugerido)}</TableCell>
                  {onUsarValor && (
                    <TableCell className="text-center">
                      {isSelected ? (
                        <span className="inline-flex items-center text-xs font-medium text-green-600 dark:text-green-400 h-7 px-2">
                          <Check className="h-3 w-3 mr-1" />
                          Vinculado
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            onUsarValor(item.valorSugerido, item.modelo);
                            setSelecionadoId(item.id);
                          }}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Usar
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
                );
              })
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
