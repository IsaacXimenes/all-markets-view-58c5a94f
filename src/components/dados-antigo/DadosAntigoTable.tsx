import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

interface DadosAntigoTableProps {
  icon: React.ReactNode;
  title: string;
  headers: string[];
  data: Record<string, any>[];
  loading: boolean;
  error: string | null;
  /** Colunas cujo valor deve ser renderizado como link (ex: "Comprovante") */
  linkColumns?: string[];
}

export function DadosAntigoTable({ icon, title, headers, data, loading, error, linkColumns = [] }: DadosAntigoTableProps) {
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const linkSet = useMemo(() => new Set(linkColumns), [linkColumns]);

  const hasActiveFilters = useMemo(() => 
    Object.values(columnFilters).some(v => v.trim() !== ''),
    [columnFilters]
  );

  const updateFilter = useCallback((header: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [header]: value }));
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setPage(1);
  }, []);

  const filtered = useMemo(() => {
    if (!hasActiveFilters) return data;
    return data.filter(row => {
      return Object.entries(columnFilters).every(([header, filterValue]) => {
        if (!filterValue.trim()) return true;
        const cellValue = String(row[header] ?? '').toLowerCase();
        return cellValue.includes(filterValue.toLowerCase());
      });
    });
  }, [data, columnFilters, hasActiveFilters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
            {!loading && (
              <Badge variant="secondary" className="ml-2">
                {filtered.length} registros
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground">
                <X className="h-4 w-4" />
                Limpar filtros
              </Button>
            )}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {Object.values(columnFilters).filter(v => v.trim()).length}
                </Badge>
              )}
            </Button>
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
                  {showFilters && (
                    <TableRow className="bg-muted/30">
                      {headers.map(h => (
                        <TableHead key={`filter-${h}`} className="p-1">
                          <Input
                            placeholder={`Filtrar...`}
                            className={cn(
                              "h-7 text-xs border-muted-foreground/20",
                              columnFilters[h]?.trim() && "border-primary bg-primary/5"
                            )}
                            value={columnFilters[h] || ''}
                            onChange={e => updateFilter(h, e.target.value)}
                          />
                        </TableHead>
                      ))}
                    </TableRow>
                  )}
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
                        {headers.map(h => {
                          const val = String(row[h] ?? '');
                          const isLink = linkSet.has(h) && val.startsWith('http');
                          return (
                            <TableCell key={h} className="whitespace-nowrap">
                              {isLink ? (
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline hover:text-primary/80"
                                >
                                  Ver comprovante
                                </a>
                              ) : val}
                            </TableCell>
                          );
                        })}
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
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    Próxima <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
