import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getNotasCompra, getFornecedores } from '@/utils/estoqueApi';
import { exportToCSV, formatCurrency } from '@/utils/formatUtils';
import { Download, Plus, Eye, FileText, DollarSign, CheckCircle, Clock } from 'lucide-react';

export default function EstoqueNotasCompra() {
  const navigate = useNavigate();
  const [notas] = useState(getNotasCompra());
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const notasFiltradas = notas.filter(n => {
    if (fornecedorFilter !== 'todos' && n.fornecedor !== fornecedorFilter) return false;
    if (statusFilter !== 'todos' && n.status !== statusFilter) return false;
    if (dataInicio && n.data < dataInicio) return false;
    if (dataFim && n.data > dataFim) return false;
    return true;
  });

  // Cálculos para os cards
  const stats = useMemo(() => {
    const qtdNotas = notasFiltradas.length;
    const valorTotal = notasFiltradas.reduce((acc, n) => acc + n.valorTotal, 0);
    const valorConcluido = notasFiltradas.filter(n => n.status === 'Concluído').reduce((acc, n) => acc + n.valorTotal, 0);
    const valorPendente = notasFiltradas.filter(n => n.status === 'Pendente').reduce((acc, n) => acc + n.valorTotal, 0);
    return { qtdNotas, valorTotal, valorConcluido, valorPendente };
  }, [notasFiltradas]);

  const handleExport = () => {
    exportToCSV(notasFiltradas, 'notas-compra.csv');
  };

  return (
    <EstoqueLayout title="Notas de Compra">
      <div className="space-y-4">
        {/* Cards de Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600 opacity-70" />
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Qtd de Notas</p>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{stats.qtdNotas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-purple-600 opacity-70" />
                <div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Valor Total</p>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{formatCurrency(stats.valorTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600 opacity-70" />
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Valor Concluído</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">{formatCurrency(stats.valorConcluido)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-600 opacity-70" />
                <div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">Valor Pendente</p>
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{formatCurrency(stats.valorPendente)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="Data início"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-[150px]"
            />
            <Input
              type="date"
              placeholder="Data fim"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos fornecedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos fornecedores</SelectItem>
              {getFornecedores().map(fornecedor => (
                <SelectItem key={fornecedor} value={fornecedor}>{fornecedor}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Button onClick={() => navigate('/estoque/nota/cadastrar')}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Nova Nota
            </Button>

            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nº Nota</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notasFiltradas.map(nota => (
                <TableRow key={nota.id}>
                  <TableCell>{new Date(nota.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-mono text-xs">{nota.numeroNota}</TableCell>
                  <TableCell>{nota.fornecedor}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valorTotal)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={nota.status === 'Concluído' ? 'default' : 'destructive'}>
                      {nota.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/estoque/nota/${nota.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </EstoqueLayout>
  );
}
