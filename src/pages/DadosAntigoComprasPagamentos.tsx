import { useState, useMemo } from 'react';
import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CreditCard, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';
import { Badge } from '@/components/ui/badge';

const HEADER_MAP: Record<string, string> = {
  'FORNECEDOR': 'Fornecedor',
  'DATA_PAGAMETO': 'Data Pagamento',
  'PAGAMENTO': 'Pagamento',
  'VALOR': 'Valor',
  'DESCRIÇÃO': 'Descrição',
  'LEMBRETE': 'Lembrete',
};

const PAGE_SIZE = 50;

export default function DadosAntigoComprasPagamentos() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/compras-pagamentos.xlsx',
    headerMap: HEADER_MAP,
  });

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();
    return data.filter(row =>
      Object.values(row as Record<string, any>).some(val =>
        String(val).toLowerCase().includes(term)
      )
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Compras Pagamentos
              {!loading && (
                <Badge variant="secondary" className="ml-2">
                  {filtered.length} registros
                </Badge>
              )}
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por fornecedor, descrição..."
                className="pl-9"
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Carregando dados...</span>
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-8">{error}</p>
          ) : (
            <>
              <div className="overflow-x-auto scrollbar-visible rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map(h => (
                        <TableHead key={h} className="whitespace-nowrap font-semibold">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={headers.length} className="text-center py-8 text-muted-foreground">
                          Nenhum resultado encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((row, idx) => (
                        <TableRow key={idx}>
                          {headers.map(h => (
                            <TableCell key={h} className="whitespace-nowrap">
                              {String((row as Record<string, any>)[h] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Próxima <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </DadosSistemaAntigoLayout>
  );
}
