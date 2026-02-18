import { useState } from 'react';
import { Bell, Check, Package, DollarSign, Wrench, FileText, Truck, ShoppingCart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getColaboradoresByPermissao } from '@/utils/cadastrosApi';
import { cn } from '@/lib/utils';

export interface Notificacao {
  id: string;
  tipo: 'venda' | 'parecer_estoque' | 'parecer_assistencia' | 'os_registrada' | 'nota_finalizada' | 'migracao_produto' | 'movimentacao';
  titulo: string;
  descricao: string;
  data: string;
  lida: boolean;
  setorOrigem: string;
}

// Dados mockados de notificações
const notificacoesMock: Notificacao[] = [
  {
    id: 'NOT-001',
    tipo: 'venda',
    titulo: 'Nova Venda Registrada',
    descricao: 'Venda VEN-2025-0055 - iPhone 15 Pro Max - R$ 12.999,00',
    data: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    lida: false,
    setorOrigem: 'Vendas'
  },
  {
    id: 'NOT-002',
    tipo: 'parecer_estoque',
    titulo: 'Parecer Estoque Salvo',
    descricao: 'PROD-0003 encaminhado para Assistência',
    data: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    lida: false,
    setorOrigem: 'Estoque'
  },
  {
    id: 'NOT-003',
    tipo: 'os_registrada',
    titulo: 'Nova OS Registrada',
    descricao: 'OS-2025-0010 - Cliente Maria Silva - Garantia',
    data: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    lida: false,
    setorOrigem: 'Assistência'
  },
  {
    id: 'NOT-004',
    tipo: 'nota_finalizada',
    titulo: 'Nota Finalizada',
    descricao: 'NC-2025-0008 liberada - 5 produtos no estoque',
    data: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    lida: false,
    setorOrigem: 'Financeiro'
  },
  {
    id: 'NOT-005',
    tipo: 'migracao_produto',
    titulo: 'Produto Liberado',
    descricao: 'PROD-0004 validado pela Assistência e liberado',
    data: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    lida: false,
    setorOrigem: 'Assistência'
  },
  {
    id: 'NOT-006',
    tipo: 'parecer_assistencia',
    titulo: 'Parecer Assistência Salvo',
    descricao: 'PROD-0005 - Ajustes realizados - R$ 150,00',
    data: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lida: false,
    setorOrigem: 'Assistência'
  },
  {
    id: 'NOT-007',
    tipo: 'movimentacao',
    titulo: 'Movimentação de Produto',
    descricao: 'PROD-0010 transferido Loja Centro → Loja Shopping',
    data: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    lida: false,
    setorOrigem: 'Estoque'
  },
  {
    id: 'NOT-008',
    tipo: 'venda',
    titulo: 'Nova Venda Registrada',
    descricao: 'Venda VEN-2025-0054 - iPhone 14 - R$ 5.499,00',
    data: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    lida: true,
    setorOrigem: 'Vendas'
  },
  {
    id: 'NOT-009',
    tipo: 'parecer_estoque',
    titulo: 'Produto Deferido Estoque',
    descricao: 'PROD-0002 aprovado e liberado para venda',
    data: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    lida: true,
    setorOrigem: 'Estoque'
  },
  {
    id: 'NOT-010',
    tipo: 'os_registrada',
    titulo: 'OS Concluída',
    descricao: 'OS-2025-0008 finalizada com sucesso',
    data: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    lida: true,
    setorOrigem: 'Assistência'
  }
];

const setores = ['Estoque', 'Assistência', 'Vendas', 'Financeiro', 'RH', 'Admin'];

export function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(notificacoesMock);
  const [confirmarLeituraOpen, setConfirmarLeituraOpen] = useState(false);
  const [notificacaoSelecionada, setNotificacaoSelecionada] = useState<Notificacao | null>(null);
  const [setorSelecionado, setSetorSelecionado] = useState('');
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState('');

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const colaboradoresDoSetor = setorSelecionado 
    ? getColaboradoresByPermissao(setorSelecionado)
    : [];

  const getIcon = (tipo: Notificacao['tipo']) => {
    switch (tipo) {
      case 'venda':
        return <ShoppingCart className="h-4 w-4 text-green-500" />;
      case 'parecer_estoque':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'parecer_assistencia':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'os_registrada':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'nota_finalizada':
        return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case 'migracao_produto':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'movimentacao':
        return <Truck className="h-4 w-4 text-cyan-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHour < 24) return `${diffHour}h atrás`;
    return `${diffDay}d atrás`;
  };

  const handleNotificacaoClick = (notificacao: Notificacao) => {
    if (notificacao.lida) return;
    setNotificacaoSelecionada(notificacao);
    setSetorSelecionado('');
    setColaboradorSelecionado('');
    setConfirmarLeituraOpen(true);
  };

  const handleConfirmarLeitura = () => {
    if (!notificacaoSelecionada || !setorSelecionado || !colaboradorSelecionado) return;

    setNotificacoes(prev => 
      prev.map(n => 
        n.id === notificacaoSelecionada.id ? { ...n, lida: true } : n
      )
    );
    setConfirmarLeituraOpen(false);
    setNotificacaoSelecionada(null);
  };

  const podeConfirmar = setorSelecionado && colaboradorSelecionado;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9 text-white hover:text-[#F7BB05] hover:bg-white/5">
            <Bell className="h-5 w-5" />
            {naoLidas > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground"
              >
                {naoLidas}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b">
            <h4 className="font-semibold">Notificações</h4>
            <p className="text-xs text-muted-foreground">{naoLidas} não lidas</p>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-2 space-y-1">
              {notificacoes.map(notificacao => (
                <div
                  key={notificacao.id}
                  onClick={() => handleNotificacaoClick(notificacao)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors",
                    notificacao.lida 
                      ? "bg-muted/50 hover:bg-muted" 
                      : "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notificacao.tipo)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        !notificacao.lida && "text-primary"
                      )}>
                        {notificacao.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notificacao.descricao}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notificacao.data)}
                        </span>
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {notificacao.setorOrigem}
                        </Badge>
                      </div>
                    </div>
                    {!notificacao.lida && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Modal de Confirmação de Leitura */}
      <Dialog open={confirmarLeituraOpen} onOpenChange={setConfirmarLeituraOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Leitura</DialogTitle>
          </DialogHeader>
          
          {notificacaoSelecionada && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{notificacaoSelecionada.titulo}</p>
                <p className="text-sm text-muted-foreground">{notificacaoSelecionada.descricao}</p>
              </div>

              <div className="space-y-2">
                <Label>Setor *</Label>
                <Select value={setorSelecionado} onValueChange={(val) => {
                  setSetorSelecionado(val);
                  setColaboradorSelecionado('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map(setor => (
                      <SelectItem key={setor} value={setor}>{setor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome *</Label>
                <Select 
                  value={colaboradorSelecionado} 
                  onValueChange={setColaboradorSelecionado}
                  disabled={!setorSelecionado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={setorSelecionado ? "Selecione o colaborador" : "Selecione um setor primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradoresDoSetor.map(col => (
                      <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarLeituraOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarLeitura} disabled={!podeConfirmar}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar Leitura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
