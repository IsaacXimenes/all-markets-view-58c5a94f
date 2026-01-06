import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, FileText } from 'lucide-react';
import { getVendas, Venda } from '@/utils/vendasApi';
import { getLojas } from '@/utils/cadastrosApi';
import { 
  getGarantiasByVendaId, addGarantia, addTimelineEntry, calcularStatusExpiracao
} from '@/utils/garantiasApi';
import { format, addMonths } from 'date-fns';

export default function GarantiasNova() {
  const navigate = useNavigate();
  const lojas = getLojas();
  const vendas = getVendas();
  
  // Estados
  const [buscaImei, setBuscaImei] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaLoja, setBuscaLoja] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Helpers
  const getLojaName = (id: string) => lojas.find(l => l.id === id)?.nome || id;
  
  // Flatten vendas para exibir uma linha por item (IMEI)
  const vendasComItens = useMemo(() => {
    const resultado: { venda: Venda; item: any; garantiaInfo: any }[] = [];
    
    vendas.forEach(venda => {
      if (venda.status === 'Cancelada') return;
      
      venda.itens.forEach(item => {
        // Buscar garantia existente para este item
        const garantias = getGarantiasByVendaId(venda.id);
        const garantiaItem = garantias.find(g => g.imei === item.imei);
        
        // Calcular data fim garantia se não existir
        const dataVenda = new Date(venda.dataHora);
        const meses = garantiaItem?.mesesGarantia || 12;
        const dataFimCalc = garantiaItem?.dataFimGarantia || format(addMonths(dataVenda, meses), 'yyyy-MM-dd');
        const tipoGarantia = garantiaItem?.tipoGarantia || 'Garantia - Apple';
        
        resultado.push({
          venda,
          item: {
            ...item,
            tipoGarantia,
            dataFimGarantia: dataFimCalc
          },
          garantiaInfo: garantiaItem
        });
      });
    });
    
    return resultado;
  }, [vendas]);
  
  // Filtrar vendas
  const vendasFiltradas = useMemo(() => {
    return vendasComItens.filter(({ venda, item }) => {
      // Filtrar por IMEI
      if (buscaImei && !item.imei.includes(buscaImei)) return false;
      
      // Filtrar por cliente
      if (buscaCliente && !venda.clienteNome.toLowerCase().includes(buscaCliente.toLowerCase())) return false;
      
      // Filtrar por loja
      if (buscaLoja && venda.lojaVenda !== buscaLoja) return false;
      
      // Filtrar por data
      if (dataInicio) {
        const data = new Date(venda.dataHora);
        if (data < new Date(dataInicio)) return false;
      }
      if (dataFim) {
        const data = new Date(venda.dataHora);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59);
        if (data > fim) return false;
      }
      
      return true;
    });
  }, [vendasComItens, buscaImei, buscaCliente, buscaLoja, dataInicio, dataFim]);
  
  // Ver detalhes - navegar para página de garantia
  const handleVerDetalhes = (venda: Venda, item: any) => {
    // Buscar garantia existente para este IMEI
    const garantias = getGarantiasByVendaId(venda.id);
    const garantiaExistente = garantias.find(g => g.imei === item.imei);
    
    if (garantiaExistente) {
      // Garantia já existe, navegar direto
      navigate(`/garantias/${garantiaExistente.id}`);
    } else {
      // Criar nova garantia
      const dataVenda = new Date(venda.dataHora);
      const meses = item.mesesGarantia || 12;
      const dataFimCalc = format(addMonths(dataVenda, meses), 'yyyy-MM-dd');
      
      const novaGarantia = addGarantia({
        vendaId: venda.id,
        itemVendaId: item.id,
        produtoId: item.produtoId,
        imei: item.imei,
        modelo: item.produto,
        tipoGarantia: item.tipoGarantia || 'Garantia - Apple',
        mesesGarantia: meses,
        dataInicioGarantia: venda.dataHora.split('T')[0],
        dataFimGarantia: dataFimCalc,
        status: 'Ativa',
        lojaVenda: venda.lojaVenda,
        clienteId: venda.clienteId,
        clienteNome: venda.clienteNome,
        clienteTelefone: venda.clienteTelefone,
        clienteEmail: venda.clienteEmail
      });
      
      // Adicionar timeline de registro
      addTimelineEntry({
        garantiaId: novaGarantia.id,
        dataHora: new Date().toISOString(),
        tipo: 'registro_venda',
        titulo: 'Garantia Registrada',
        descricao: `Garantia registrada a partir da venda ${venda.id}`,
        usuarioId: 'COL-001',
        usuarioNome: 'Usuário Sistema'
      });
      
      toast.success('Garantia registrada com sucesso!');
      navigate(`/garantias/${novaGarantia.id}`);
    }
  };

  // Função para cor do badge de garantia
  const getGarantiaBadgeClass = (dataFim: string) => {
    const status = calcularStatusExpiracao(dataFim);
    switch (status.status) {
      case 'expirada':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'urgente':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'atencao':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  return (
    <GarantiasLayout title="Nova Garantia">
      <div className="space-y-6">
        {/* Quadro Histórico de Vendas - Tabela Direta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros inline */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>IMEI</Label>
                <Input 
                  placeholder="Buscar IMEI..."
                  value={buscaImei}
                  onChange={(e) => setBuscaImei(e.target.value)}
                />
              </div>
              <div>
                <Label>Cliente</Label>
                <Input 
                  placeholder="Buscar cliente..."
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Início</Label>
                <Input 
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input 
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div>
                <Label>Loja</Label>
                <Select value={buscaLoja || 'all'} onValueChange={(v) => setBuscaLoja(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as Lojas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Lojas</SelectItem>
                    {lojas.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Tabela de Vendas (sempre visível) */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Venda</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Resp. Garantia</TableHead>
                      <TableHead>Data Fim Garantia</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasFiltradas.slice(0, 50).map(({ venda, item }, index) => (
                      <TableRow key={`${venda.id}-${item.id}-${index}`} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{venda.id}</TableCell>
                        <TableCell>{format(new Date(venda.dataHora), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{getLojaName(venda.lojaVenda)}</TableCell>
                        <TableCell>{venda.clienteNome}</TableCell>
                        <TableCell>{item.produto}</TableCell>
                        <TableCell className="font-mono text-xs">{item.imei}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.tipoGarantia}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getGarantiaBadgeClass(item.dataFimGarantia)}>
                            {format(new Date(item.dataFimGarantia), 'dd/MM/yyyy')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleVerDetalhes(venda, item)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {vendasFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhuma venda encontrada com os filtros aplicados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* Contador de resultados */}
            <p className="text-sm text-muted-foreground">
              {vendasFiltradas.length} {vendasFiltradas.length === 1 ? 'venda encontrada' : 'vendas encontradas'}
            </p>
          </CardContent>
        </Card>
      </div>
    </GarantiasLayout>
  );
}
