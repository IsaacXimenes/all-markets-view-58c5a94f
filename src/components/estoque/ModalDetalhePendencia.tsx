import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PendenciaFinanceira } from '@/utils/pendenciasFinanceiraApi';
import { formatCurrency } from '@/utils/formatUtils';
import { 
  FileText, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Package,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';

interface ModalDetalhePendenciaProps {
  pendencia: PendenciaFinanceira | null;
  open: boolean;
  onClose: () => void;
  showPaymentButton?: boolean;
  onPayment?: () => void;
}

export function ModalDetalhePendencia({
  pendencia,
  open,
  onClose,
  showPaymentButton = false,
  onPayment
}: ModalDetalhePendenciaProps) {
  if (!pendencia) return null;

  const getTimelineIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'validacao':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pagamento':
        return <CreditCard className="h-4 w-4 text-emerald-500" />;
      case 'discrepancia':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'alerta_sla':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case 'critico':
        return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'aviso':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      default:
        return 'bg-green-500/10 text-green-600 border-green-500/30';
    }
  };

  const getConferenciaStatusBadge = (status: string) => {
    switch (status) {
      case 'Conferência Completa':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Completa</Badge>;
      case 'Discrepância Detectada':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Discrepância</Badge>;
      case 'Finalizada com Pendência':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Finalizada c/ Pendência</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Em Conferência</Badge>;
    }
  };

  const canPay = pendencia.statusPagamento !== 'Pago';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes - Nota {pendencia.notaId}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Informações Gerais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="h-3 w-3" />
                  Fornecedor
                </div>
                <p className="font-medium">{pendencia.fornecedor}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Data Entrada
                </div>
                <p className="font-medium">{new Date(pendencia.dataCriacao).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  Dias Decorridos
                </div>
                <p className="font-medium">{pendencia.diasDecorridos} dias</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  SLA
                </div>
                <Badge variant="outline" className={getSLAStatusColor(pendencia.slaStatus)}>
                  {pendencia.slaStatus === 'critico' ? 'Crítico' : pendencia.slaStatus === 'aviso' ? 'Atenção' : 'Normal'}
                </Badge>
              </div>
            </div>

            {/* Valores */}
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Valores
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor Total:</span>
                  <span className="font-bold text-lg">{formatCurrency(pendencia.valorTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span>Valor Conferido:</span>
                  <span className="font-medium">{formatCurrency(pendencia.valorConferido)}</span>
                </div>
                <div className="flex justify-between items-center text-orange-600">
                  <span>Valor Pendente:</span>
                  <span className="font-medium">{formatCurrency(pendencia.valorPendente)}</span>
                </div>
                {pendencia.discrepancia && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mt-3">
                    <div className="flex items-center gap-2 text-red-600 font-medium mb-1">
                      <AlertCircle className="h-4 w-4" />
                      Discrepância Detectada
                    </div>
                    {pendencia.motivoDiscrepancia && (
                      <p className="text-sm text-red-600/80">{pendencia.motivoDiscrepancia}</p>
                    )}
                    {pendencia.acaoRecomendada && (
                      <div className="flex items-center gap-1 mt-2 text-sm">
                        <ArrowRight className="h-3 w-3" />
                        <span>Ação recomendada: <strong>{pendencia.acaoRecomendada}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Aparelhos */}
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Aparelhos ({pendencia.aparelhosConferidos}/{pendencia.aparelhosTotal} conferidos)
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Progress value={pendencia.percentualConferencia} className="flex-1 h-3" />
                  <Badge variant="outline" className={
                    pendencia.percentualConferencia === 100 
                      ? 'bg-green-500/10 text-green-600' 
                      : pendencia.percentualConferencia >= 50 
                        ? 'bg-blue-500/10 text-blue-600'
                        : 'bg-yellow-500/10 text-yellow-600'
                  }>
                    {pendencia.percentualConferencia}%
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {getConferenciaStatusBadge(pendencia.statusConferencia)}
                  {pendencia.statusPagamento === 'Pago' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      Pago
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline de Eventos
              </h4>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {pendencia.timeline.map((entry, idx) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getTimelineIcon(entry.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{entry.titulo}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.data).toLocaleDateString('pt-BR')} às {new Date(entry.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{entry.descricao}</p>
                      {entry.responsavel && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {entry.responsavel}
                        </div>
                      )}
                      {entry.valor && (
                        <p className="text-sm text-green-600 mt-1">
                          {formatCurrency(entry.valor)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {showPaymentButton && canPay && (
            <Button onClick={onPayment}>
              <CreditCard className="h-4 w-4 mr-2" />
              Finalizar Pagamento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
