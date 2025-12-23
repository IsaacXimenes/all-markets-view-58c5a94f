import { useState, useMemo } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, FileSpreadsheet, Store, Wrench, MessageSquareWarning } from 'lucide-react';
import { getLojas } from '@/utils/cadastrosApi';
import { getVendas, formatCurrency } from '@/utils/vendasApi';
import { getOrdensServico } from '@/utils/assistenciaApi';
import { getFeedbacks, getTodosColaboradoresParaFeedback } from '@/utils/feedbackApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const exportToCSV = (data: Record<string, any>[], filename: string) => {
  if (data.length === 0) {
    toast.error('Nenhum dado para exportar');
    return;
  }
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(item => 
    Object.values(item).map(value => 
      typeof value === 'string' && (value.includes(',') || value.includes('"')) 
        ? `"${value.replace(/"/g, '""')}"` 
        : value
    ).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.success(`Relatório ${filename} gerado com sucesso!`);
};

export default function Relatorios() {
  const lojas = getLojas();
  const vendas = getVendas();
  const ordensServico = getOrdensServico();
  const feedbacks = getFeedbacks();
  const colaboradores = getTodosColaboradoresParaFeedback();

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [lojaFiltro, setLojaFiltro] = useState('todas');

  const getLojaName = (id: string) => {
    const loja = lojas.find(l => l.id === id);
    return loja?.nome || id;
  };

  const getColaboradorNome = (id: string) => {
    const col = colaboradores.find(c => c.id === id);
    return col?.nome || id;
  };

  // Filtrar dados por período e loja
  const filtrarPorPeriodo = <T extends { dataHora?: string; data?: Date }>(items: T[]): T[] => {
    return items.filter(item => {
      const itemDate = item.dataHora 
        ? new Date(item.dataHora) 
        : item.data instanceof Date 
          ? item.data 
          : null;
      
      if (!itemDate) return true;
      
      if (dataInicio) {
        const inicio = new Date(dataInicio);
        if (itemDate < inicio) return false;
      }
      
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        if (itemDate > fim) return false;
      }
      
      return true;
    });
  };

  // Relatório de Vendas por Loja
  const handleExportVendasLoja = () => {
    let vendasFiltradas = filtrarPorPeriodo(vendas);
    
    if (lojaFiltro !== 'todas') {
      vendasFiltradas = vendasFiltradas.filter(v => v.lojaVenda === lojaFiltro);
    }

    const dataExport = vendasFiltradas.map(v => {
      const custo = v.itens.reduce((acc, item) => acc + item.valorCusto * item.quantidade, 0);
      const lucro = v.total - custo;
      
      return {
        'Data': format(new Date(v.dataHora), 'dd/MM/yyyy', { locale: ptBR }),
        'ID Venda': v.id,
        'Loja': getLojaName(v.lojaVenda),
        'Cliente': v.clienteNome,
        'Valor Custo': formatCurrency(custo),
        'Valor Venda': formatCurrency(v.total),
        'Lucro': formatCurrency(lucro),
        'Margem %': ((lucro / custo) * 100).toFixed(2) + '%'
      };
    });

    exportToCSV(dataExport, `vendas-por-loja-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Relatório de Custo Assistência Mensal
  const handleExportCustoAssistencia = () => {
    let osFiltradas = filtrarPorPeriodo(ordensServico);
    
    if (lojaFiltro !== 'todas') {
      osFiltradas = osFiltradas.filter(os => os.lojaId === lojaFiltro);
    }

    const dataExport = osFiltradas.map(os => {
      const custoPecas = os.pecas.reduce((acc, p) => acc + p.valorTotal, 0);
      const valorRecebido = os.pagamentos.reduce((acc, p) => acc + p.valor, 0);
      const prejuizo = custoPecas - valorRecebido;
      
      return {
        'Data': format(new Date(os.dataHora), 'dd/MM/yyyy', { locale: ptBR }),
        'ID OS': os.id,
        'Loja': getLojaName(os.lojaId),
        'Setor': os.setor,
        'Status': os.status,
        'Custo Peças': formatCurrency(custoPecas),
        'Valor Recebido': formatCurrency(valorRecebido),
        'Prejuízo': formatCurrency(Math.max(0, prejuizo))
      };
    });

    exportToCSV(dataExport, `custo-assistencia-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Relatório de Feedbacks por Colaborador
  const handleExportFeedbacks = () => {
    let feedbacksFiltrados = filtrarPorPeriodo(
      feedbacks.map(f => ({ ...f, dataHora: f.dataHora.toISOString() }))
    );

    if (lojaFiltro !== 'todas') {
      const colaboradoresLoja = colaboradores.filter(c => c.loja === lojaFiltro).map(c => c.id);
      feedbacksFiltrados = feedbacksFiltrados.filter(f => colaboradoresLoja.includes(f.colaboradorId));
    }

    const dataExport = feedbacksFiltrados.map(f => {
      const colaborador = colaboradores.find(c => c.id === f.colaboradorId);
      
      return {
        'Data': format(f.dataHora, 'dd/MM/yyyy', { locale: ptBR }),
        'ID Feedback': f.id,
        'ID Colaborador': f.colaboradorId,
        'Colaborador': colaborador?.nome || '-',
        'Cargo': colaborador?.cargo || '-',
        'Loja': colaborador ? getLojaName(colaborador.loja) : '-',
        'Tipo': f.tipo,
        'Gestor': f.gestorNome,
        'Descrição': f.texto
      };
    });

    exportToCSV(dataExport, `feedbacks-colaboradores-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Estatísticas para cards
  const stats = useMemo(() => {
    let vendasFiltradas = filtrarPorPeriodo(vendas);
    let osFiltradas = filtrarPorPeriodo(ordensServico);
    let feedbacksFiltrados = filtrarPorPeriodo(
      feedbacks.map(f => ({ ...f, dataHora: f.dataHora.toISOString() }))
    );

    if (lojaFiltro !== 'todas') {
      vendasFiltradas = vendasFiltradas.filter(v => v.lojaVenda === lojaFiltro);
      osFiltradas = osFiltradas.filter(os => os.lojaId === lojaFiltro);
      const colaboradoresLoja = colaboradores.filter(c => c.loja === lojaFiltro).map(c => c.id);
      feedbacksFiltrados = feedbacksFiltrados.filter(f => colaboradoresLoja.includes(f.colaboradorId));
    }

    return {
      totalVendas: vendasFiltradas.length,
      totalOS: osFiltradas.length,
      totalFeedbacks: feedbacksFiltrados.length
    };
  }, [vendas, ordensServico, feedbacks, dataInicio, dataFim, lojaFiltro, colaboradores]);

  return (
    <PageLayout title="Relatórios">
      <div className="space-y-6">
        {/* Dashboard Cards - Sticky */}
        <div className="sticky top-0 z-10 bg-background pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas no Período</p>
                    <p className="text-2xl font-bold">{stats.totalVendas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Wrench className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">OS no Período</p>
                    <p className="text-2xl font-bold">{stats.totalOS}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <MessageSquareWarning className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Feedbacks no Período</p>
                    <p className="text-2xl font-bold">{stats.totalFeedbacks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filtros Globais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Filtros Globais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Loja</Label>
                <Select value={lojaFiltro} onValueChange={setLojaFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as lojas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as lojas</SelectItem>
                    {lojas.map(loja => (
                      <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Relatórios Disponíveis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Relatórios Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Vendas por Loja */}
              <Card className="border-2 hover:border-primary/50 transition-colors h-full flex flex-col">
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="flex-1 flex flex-col items-center text-center">
                    <div className="p-4 rounded-full bg-green-500/10 mb-4">
                      <Store className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Vendas por Loja</h3>
                    <p className="text-sm text-muted-foreground flex-1">
                      Exportar relatório de vendas com data, loja, valor e lucro.
                    </p>
                  </div>
                  <Button onClick={handleExportVendasLoja} className="w-full gap-2 mt-4">
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardContent>
              </Card>

              {/* Custo Assistência Mensal */}
              <Card className="border-2 hover:border-primary/50 transition-colors h-full flex flex-col">
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="flex-1 flex flex-col items-center text-center">
                    <div className="p-4 rounded-full bg-orange-500/10 mb-4">
                      <Wrench className="h-8 w-8 text-orange-500" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Custo Assistência</h3>
                    <p className="text-sm text-muted-foreground flex-1">
                      Exportar custos de OS por loja, peça, valor total e prejuízo.
                    </p>
                  </div>
                  <Button onClick={handleExportCustoAssistencia} className="w-full gap-2 mt-4">
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardContent>
              </Card>

              {/* Feedbacks por Colaborador */}
              <Card className="border-2 hover:border-primary/50 transition-colors h-full flex flex-col">
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="flex-1 flex flex-col items-center text-center">
                    <div className="p-4 rounded-full bg-purple-500/10 mb-4">
                      <MessageSquareWarning className="h-8 w-8 text-purple-500" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Feedbacks</h3>
                    <p className="text-sm text-muted-foreground flex-1">
                      Exportar feedbacks com colaborador, data, tipo e texto.
                    </p>
                  </div>
                  <Button onClick={handleExportFeedbacks} className="w-full gap-2 mt-4">
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
