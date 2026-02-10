import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveTableContainer, ResponsiveFilterGrid } from '@/components/ui/ResponsiveContainers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Package,
  Timer,
  Download
} from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  getMovimentacoesMatriz,
  verificarStatusMovimentacoesMatriz,
  MovimentacaoMatriz
} from '@/utils/estoqueApi';

// Componente Timer
const TimerRegressivo = ({ dataLimite }: { dataLimite: string }) => {
  const [tempoRestante, setTempoRestante] = useState({ texto: '', cor: '', expirado: false });

  useEffect(() => {
    const calcular = () => {
      const agora = new Date();
      const limite = new Date(dataLimite);
      const diff = limite.getTime() - agora.getTime();

      if (diff <= 0) {
        return { expirado: true, texto: 'Expirado', cor: 'text-destructive animate-pulse' };
      }

      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diff % (1000 * 60)) / 1000);

      let cor = 'text-green-500';
      if (horas < 1) cor = 'text-destructive';
      else if (horas < 4) cor = 'text-yellow-500';

      return {
        expirado: false,
        texto: `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`,
        cor
      };
    };

    setTempoRestante(calcular());
    const interval = setInterval(() => setTempoRestante(calcular()), 1000);
    return () => clearInterval(interval);
  }, [dataLimite]);

  return (
    <div className={`flex items-center gap-1 font-mono font-medium ${tempoRestante.cor}`}>
      <Timer className="h-4 w-4" />
      {tempoRestante.texto}
    </div>
  );
};

export default function EstoqueMovimentacoesMatriz() {
  const navigate = useNavigate();
  const { obterNomeLoja } = useCadastroStore();
  
  // Estados da tabela e filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoMatriz[]>([]);
  
  // Refresh
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Carregar movimentações e verificar status
  useEffect(() => {
    // Verificar status automaticamente ao carregar
    verificarStatusMovimentacoesMatriz();
    setMovimentacoes(getMovimentacoesMatriz());
  }, [refreshKey]);
  
  // Filtrar movimentações
  const movimentacoesFiltradas = useMemo(() => {
    let resultado = movimentacoes;
    if (filtroStatus) {
      resultado = resultado.filter(m => m.statusMovimentacao === filtroStatus);
    }
    if (filtroDataInicio) {
      resultado = resultado.filter(m => new Date(m.dataHoraLancamento) >= new Date(filtroDataInicio));
    }
    if (filtroDataFim) {
      const fim = new Date(filtroDataFim);
      fim.setHours(23, 59, 59, 999);
      resultado = resultado.filter(m => new Date(m.dataHoraLancamento) <= fim);
    }
    return resultado;
  }, [movimentacoes, filtroStatus, filtroDataInicio, filtroDataFim]);
  
  // Navegar para detalhes da movimentação
  const handleAbrirDetalhes = (movId: string) => {
    navigate(`/estoque/movimentacoes-matriz/${movId}`);
  };
  
  // Badge de status
  const getStatusBadge = (status: MovimentacaoMatriz['statusMovimentacao']) => {
    switch (status) {
      case 'Pendente':
        return <Badge className="gap-1 bg-yellow-500"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'Atrasado':
        return <Badge variant="destructive" className="gap-1 animate-pulse"><AlertTriangle className="h-3 w-3" /> Atrasado</Badge>;
      case 'Finalizado - Dentro do Prazo':
        return <Badge className="gap-1 bg-green-600 hover:bg-green-600"><CheckCircle className="h-3 w-3" /> Dentro do Prazo</Badge>;
      case 'Finalizado - Atrasado':
        return <Badge className="gap-1 bg-orange-500 hover:bg-orange-500"><CheckCircle className="h-3 w-3" /> Finalizado Atrasado</Badge>;
    }
  };
  
  // Cor da linha baseada no status
  const getRowStatusClass = (mov: MovimentacaoMatriz) => {
    const temPendencia = mov.itens.some(i => i.statusItem === 'Enviado');
    
    if (mov.statusMovimentacao.startsWith('Finalizado')) {
      return 'bg-green-500/10';
    }
    
    if (mov.statusMovimentacao === 'Atrasado') {
      return 'bg-red-500/10';
    }
    
    // Se tem pendência
    if (temPendencia) {
      return 'bg-yellow-500/10';
    }
    
    return '';
  };
  
  // Limpar filtros
  const handleLimparFiltros = () => {
    setFiltroStatus('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
  };

  return (
    <EstoqueLayout title="Estoque - Movimentações - Matriz">
      <div className="space-y-4">
        {/* Barra de filtros */}
        <Card>
          <CardContent className="pt-4">
            <ResponsiveFilterGrid cols={5}>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Inicial</Label>
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Final</Label>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                    <SelectItem value="Finalizado - Dentro do Prazo">Finalizado - Dentro do Prazo</SelectItem>
                    <SelectItem value="Finalizado - Atrasado">Finalizado - Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={handleLimparFiltros}>
                  Limpar
                </Button>
              </div>
              
              <div className="col-span-full flex justify-end gap-2 sm:col-span-2">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button onClick={() => navigate('/estoque/movimentacoes-matriz/nova')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Movimentação
                </Button>
              </div>
            </ResponsiveFilterGrid>
          </CardContent>
        </Card>
        
        {/* Tabela de Movimentações */}
        <ResponsiveTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Data/Hora Lançamento</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Aparelhos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timer (até 22:00)</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma movimentação encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                movimentacoesFiltradas.map(mov => {
                  const itensEnviados = mov.itens.filter(i => i.statusItem === 'Enviado').length;
                  const itensDevolvidos = mov.itens.filter(i => i.statusItem === 'Devolvido').length;
                  const itensVendidos = mov.itens.filter(i => i.statusItem === 'Vendido').length;
                  
                  return (
                    <TableRow key={mov.id} className={getRowStatusClass(mov)}>
                      <TableCell className="font-mono font-medium">{mov.id}</TableCell>
                      <TableCell>
                        {format(new Date(mov.dataHoraLancamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{mov.responsavelLancamento}</TableCell>
                      <TableCell>{obterNomeLoja(mov.lojaDestinoId)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{mov.itens.length} itens</p>
                          <p className="text-muted-foreground text-xs">
                            {itensEnviados > 0 && <span className="text-yellow-600">{itensEnviados} pend.</span>}
                            {itensDevolvidos > 0 && <span className="text-green-600 ml-1">{itensDevolvidos} dev.</span>}
                            {itensVendidos > 0 && <span className="text-blue-600 ml-1">{itensVendidos} vend.</span>}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(mov.statusMovimentacao)}</TableCell>
                      <TableCell>
                        {mov.statusMovimentacao.startsWith('Finalizado') ? (
                          <span className="text-muted-foreground">--</span>
                        ) : (
                          <TimerRegressivo dataLimite={mov.dataHoraLimiteRetorno} />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleAbrirDetalhes(mov.id)}
                          title="Ver Detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ResponsiveTableContainer>
      </div>
    </EstoqueLayout>
  );
}
