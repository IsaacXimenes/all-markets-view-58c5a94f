import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/assistenciaApi';
import { Download, Eye, FileText, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';

interface NotaHistorico {
  id: string;
  numeroNota: string;
  data: string;
  fornecedorId: string;
  valorTotal: number;
  status: 'Pendente - Financeiro' | 'Concluído';
  loteId: string;
  itens: { descricao: string; quantidade: number; valorUnitario: number }[];
  timeline: { data: string; acao: string; responsavel: string }[];
}

// Mock de notas do histórico
const notasHistoricoMock: NotaHistorico[] = [
  {
    id: 'NOTA-0001',
    numeroNota: '4523',
    data: '2024-12-28T10:00:00',
    fornecedorId: 'FORN-001',
    valorTotal: 1250.00,
    status: 'Pendente - Financeiro',
    loteId: 'LOT-0001',
    itens: [
      { descricao: 'Tela LCD iPhone 14', quantidade: 2, valorUnitario: 450.00 },
      { descricao: 'Bateria iPhone 13', quantidade: 3, valorUnitario: 116.67 }
    ],
    timeline: [
      { data: '2024-12-28T10:00:00', acao: 'Nota criada', responsavel: 'Sistema' },
      { data: '2024-12-28T14:30:00', acao: 'Aprovada pelo Gestor', responsavel: 'Maria Gestora' }
    ]
  },
  {
    id: 'NOTA-0002',
    numeroNota: '4524',
    data: '2024-12-25T14:00:00',
    fornecedorId: 'FORN-002',
    valorTotal: 800.00,
    status: 'Concluído',
    loteId: 'LOT-0002',
    itens: [
      { descricao: 'Câmera Traseira iPhone 15', quantidade: 2, valorUnitario: 400.00 }
    ],
    timeline: [
      { data: '2024-12-25T14:00:00', acao: 'Nota criada', responsavel: 'Sistema' },
      { data: '2024-12-25T16:00:00', acao: 'Aprovada pelo Gestor', responsavel: 'Maria Gestora' },
      { data: '2024-12-26T10:00:00', acao: 'Finalizada pelo Financeiro', responsavel: 'João Financeiro' }
    ]
  },
  {
    id: 'NOTA-0003',
    numeroNota: '4525',
    data: '2024-12-20T09:00:00',
    fornecedorId: 'FORN-001',
    valorTotal: 560.00,
    status: 'Concluído',
    loteId: 'LOT-0003',
    itens: [
      { descricao: 'Conector de Carga iPhone 12', quantidade: 4, valorUnitario: 80.00 },
      { descricao: 'Alto-falante iPhone 14', quantidade: 4, valorUnitario: 60.00 }
    ],
    timeline: [
      { data: '2024-12-20T09:00:00', acao: 'Nota criada', responsavel: 'Sistema' },
      { data: '2024-12-20T11:00:00', acao: 'Aprovada pelo Gestor', responsavel: 'Maria Gestora' },
      { data: '2024-12-21T09:00:00', acao: 'Finalizada pelo Financeiro', responsavel: 'João Financeiro' }
    ]
  },
  {
    id: 'NOTA-0004',
    numeroNota: '4526',
    data: '2024-12-29T11:00:00',
    fornecedorId: 'FORN-003',
    valorTotal: 950.00,
    status: 'Pendente - Financeiro',
    loteId: 'LOT-0004',
    itens: [
      { descricao: 'Tela OLED iPhone 13 Pro', quantidade: 1, valorUnitario: 650.00 },
      { descricao: 'Bateria iPhone 14', quantidade: 2, valorUnitario: 150.00 }
    ],
    timeline: [
      { data: '2024-12-29T11:00:00', acao: 'Nota criada', responsavel: 'Sistema' },
      { data: '2024-12-29T15:00:00', acao: 'Aprovada pelo Gestor', responsavel: 'Maria Gestora' }
    ]
  },
  {
    id: 'NOTA-0005',
    numeroNota: '4527',
    data: '2024-12-15T16:00:00',
    fornecedorId: 'FORN-002',
    valorTotal: 420.00,
    status: 'Concluído',
    loteId: 'LOT-0005',
    itens: [
      { descricao: 'Botão Power iPhone 12', quantidade: 6, valorUnitario: 35.00 },
      { descricao: 'Flex Volume iPhone 13', quantidade: 4, valorUnitario: 30.00 }
    ],
    timeline: [
      { data: '2024-12-15T16:00:00', acao: 'Nota criada', responsavel: 'Sistema' },
      { data: '2024-12-16T09:00:00', acao: 'Aprovada pelo Gestor', responsavel: 'Maria Gestora' },
      { data: '2024-12-16T14:00:00', acao: 'Finalizada pelo Financeiro', responsavel: 'João Financeiro' }
    ]
  }
];

export default function OSHistoricoNotas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notas] = useState<NotaHistorico[]>(notasHistoricoMock);
  const fornecedores = getFornecedores();

  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaHistorico | null>(null);

  const notasFiltradas = useMemo(() => {
    return notas.filter(n => {
      if (filtroDataInicio) {
        const dataNota = new Date(n.data).toISOString().split('T')[0];
        if (dataNota < filtroDataInicio) return false;
      }
      if (filtroDataFim) {
        const dataNota = new Date(n.data).toISOString().split('T')[0];
        if (dataNota > filtroDataFim) return false;
      }
      if (filtroFornecedor !== 'todos' && n.fornecedorId !== filtroFornecedor) return false;
      if (filtroStatus !== 'todos' && n.status !== filtroStatus) return false;
      return true;
    }).sort((a, b) => {
      // Pendentes primeiro
      if (a.status === 'Pendente - Financeiro' && b.status !== 'Pendente - Financeiro') return -1;
      if (a.status !== 'Pendente - Financeiro' && b.status === 'Pendente - Financeiro') return 1;
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
  }, [notas, filtroDataInicio, filtroDataFim, filtroFornecedor, filtroStatus]);

  const getFornecedorNome = (fornId: string) => {
    return fornecedores.find(f => f.id === fornId)?.nome || fornId;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente - Financeiro':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente - Financeiro</Badge>;
      case 'Concluído':
        return <Badge className="bg-green-500 hover:bg-green-600">Concluído</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleVerDetalhes = (nota: NotaHistorico) => {
    setNotaSelecionada(nota);
    setShowModal(true);
  };

  const handleExport = () => {
    const headers = ['Nº Nota', 'Data', 'Fornecedor', 'Valor Total', 'Status', 'Lote ID'];
    const rows = notasFiltradas.map(n => [
      n.numeroNota,
      new Date(n.data).toLocaleDateString('pt-BR'),
      getFornecedorNome(n.fornecedorId),
      n.valorTotal.toFixed(2),
      n.status,
      n.loteId
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'historico-notas-assistencia.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'Sucesso', description: 'CSV exportado!' });
  };

  // Stats
  const totalNotas = notasFiltradas.length;
  const pendentes = notasFiltradas.filter(n => n.status === 'Pendente - Financeiro').length;
  const concluidas = notasFiltradas.filter(n => n.status === 'Concluído').length;
  const valorTotal = notasFiltradas.reduce((acc, n) => acc + n.valorTotal, 0);

  return (
    <OSLayout title="Histórico de Notas">
      {/* Dashboard Cards */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{totalNotas}</div>
              <div className="text-xs text-muted-foreground">Total de Notas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{pendentes}</div>
              <div className="text-xs text-muted-foreground">Pendente - Financeiro</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{concluidas}</div>
              <div className="text-xs text-muted-foreground">Concluídas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{formatCurrency(valorTotal)}</div>
              <div className="text-xs text-muted-foreground">Valor Total</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={e => setFiltroDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={e => setFiltroDataFim(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <AutocompleteFornecedor
                value={filtroFornecedor === 'todos' ? '' : filtroFornecedor}
                onChange={(v) => setFiltroFornecedor(v || 'todos')}
                placeholder="Todos os Fornecedores"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente - Financeiro">Pendente - Financeiro</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Nota</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notasFiltradas.map(nota => (
              <TableRow 
                key={nota.id}
                className={nota.status === 'Pendente - Financeiro' ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
              >
                <TableCell className="font-mono font-medium">{nota.id}</TableCell>
                <TableCell className="text-xs">
                  {new Date(nota.data).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{getFornecedorNome(nota.fornecedorId)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(nota.valorTotal)}</TableCell>
                <TableCell>{getStatusBadge(nota.status)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(nota)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {notasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma nota encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Detalhes */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes da Nota {notaSelecionada?.numeroNota}
            </DialogTitle>
          </DialogHeader>
          {notaSelecionada && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="font-mono">{notaSelecionada.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <p>{new Date(notaSelecionada.data).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fornecedor</Label>
                  <p>{getFornecedorNome(notaSelecionada.fornecedorId)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(notaSelecionada.status)}</div>
                </div>
              </div>

              {/* Itens */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Itens da Nota</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notaSelecionada.itens.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>{formatCurrency(item.valorUnitario)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.quantidade * item.valorUnitario)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={3} className="font-bold">Total</TableCell>
                      <TableCell className="font-bold">{formatCurrency(notaSelecionada.valorTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Timeline */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </Label>
                <div className="space-y-3">
                  {notaSelecionada.timeline.map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {idx < notaSelecionada.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-border" />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className="text-sm font-medium">{item.acao}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.data).toLocaleString('pt-BR')} - {item.responsavel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
