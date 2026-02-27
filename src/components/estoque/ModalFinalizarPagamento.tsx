import { useState, useMemo, useEffect } from 'react';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { getContasFinanceirasHabilitadas } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/utils/formatUtils';
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Interface genérica para pendência no modal de pagamento
export interface PendenciaPagamentoData {
  id: string;
  notaId: string;
  valorTotal: number;
  valorPendente: number;
  percentualConferencia: number;
  aparelhosTotal?: number;
  aparelhosConferidos?: number;
  qtdInformada?: number;
  qtdConferida?: number;
  tipoPagamento?: string;
  valorPago?: number;
}

export interface DadosPagamento {
  contaPagamento: string;
  formaPagamento: string;
  parcelas: number;
  dataVencimento: string;
  comprovante: string;
  comprovanteNome: string;
  observacoes: string;
  responsavel: string;
  forcarFinalizacao?: boolean;
  valorPagamento?: number;
}

interface ModalFinalizarPagamentoProps {
  pendencia: PendenciaPagamentoData | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (dados: DadosPagamento) => void;
  dadosPix?: { banco: string; recebedor: string; chave: string; observacao?: string };
}

export function ModalFinalizarPagamento({
  pendencia,
  open,
  onClose,
  onConfirm,
  dadosPix
}: ModalFinalizarPagamentoProps) {
  const { obterFinanceiros } = useCadastroStore();
  const user = useAuthStore((state) => state.user);
  const contasFinanceiras = getContasFinanceirasHabilitadas();
  const colaboradoresFinanceiros = obterFinanceiros();
  
  // Usuário logado - usa dados do authStore
  const usuarioLogado = useMemo(() => {
    if (user?.colaborador?.nome) {
      return user.colaborador.nome;
    }
    // Fallback para primeiro financeiro se authStore não tiver colaborador
    if (colaboradoresFinanceiros.length > 0) {
      return colaboradoresFinanceiros[0].nome;
    }
    return 'Usuário Financeiro';
  }, [user, colaboradoresFinanceiros]);

  const [form, setForm] = useState<DadosPagamento>({
    contaPagamento: '',
    formaPagamento: '',
    parcelas: 1,
    dataVencimento: '',
    comprovante: '',
    comprovanteNome: '',
    observacoes: '',
    responsavel: '',
    forcarFinalizacao: false,
    valorPagamento: undefined
  });

  // Verificar se é pagamento parcial
  const isParcial = pendencia?.tipoPagamento === 'Pagamento Parcial';
  const saldoDevedor = pendencia ? pendencia.valorPendente : 0;
  const valorJaPago = pendencia?.valorPago ?? 0;

  // Preencher responsável e valor apenas na ABERTURA do modal
  useEffect(() => {
    if (open && pendencia) {
      setForm({
        contaPagamento: '',
        formaPagamento: '',
        parcelas: 1,
        dataVencimento: '',
        comprovante: '',
        comprovanteNome: '',
        observacoes: '',
        responsavel: usuarioLogado,
        forcarFinalizacao: false,
        valorPagamento: isParcial ? (valorJaPago === 0 ? 0 : saldoDevedor) : undefined
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Verificar se conferência está incompleta - apenas para Pagamento Pós
  const conferenciaIncompleta = useMemo(() => {
    if (!pendencia) return false;
    // Alerta só para Pagamento Pós (paga após conferência)
    if (pendencia.tipoPagamento !== 'Pagamento Pos') return false;
    return pendencia.percentualConferencia < 100;
  }, [pendencia]);

  const mostrarCampoParcelas = form.formaPagamento === 'Cartão de Crédito' || form.formaPagamento === 'Boleto';

  const handleComprovanteChange = (data: { 
    comprovante: string; 
    comprovanteNome: string; 
    comprovantePreview: string;
    isFile: boolean;
  }) => {
    setForm(prev => ({ 
      ...prev, 
      comprovante: data.comprovante, 
      comprovanteNome: data.comprovanteNome 
    }));
  };

  const validateForm = (): boolean => {
    if (!form.contaPagamento) {
      toast.error('Selecione a conta de pagamento');
      return false;
    }
    if (!form.formaPagamento) {
      toast.error('Selecione a forma de pagamento');
      return false;
    }
    if (!form.responsavel) {
      toast.error('Selecione o responsável');
      return false;
    }
    if (!form.comprovante) {
      toast.error('Faça upload do comprovante de pagamento');
      return false;
    }
    if (isParcial && form.valorPagamento !== undefined) {
      if (form.valorPagamento <= 0) {
        toast.error('O valor do pagamento deve ser maior que zero');
        return false;
      }
      if (form.valorPagamento > saldoDevedor + 0.01) {
        toast.error('O valor não pode exceder o saldo devedor');
        return false;
      }
      // Alerta se primeiro pagamento parcial e valor é igual ao total
      if (valorJaPago === 0 && Math.abs(form.valorPagamento - pendencia!.valorTotal) < 0.01) {
        const confirmar = window.confirm(
          'Você está pagando o valor total da nota. Para pagamento parcial, informe um valor menor. Deseja continuar mesmo assim?'
        );
        if (!confirmar) return false;
      }
    }
    if (conferenciaIncompleta && !form.forcarFinalizacao) {
      toast.error('Marque a opção para forçar finalização com conferência incompleta');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onConfirm(form);
    // Reset form
    setForm({
      contaPagamento: '',
      formaPagamento: '',
      parcelas: 1,
      dataVencimento: '',
      comprovante: '',
      comprovanteNome: '',
      observacoes: '',
      responsavel: '',
      forcarFinalizacao: false,
      valorPagamento: undefined
    });
  };

  if (!pendencia) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Finalizar Pagamento - {pendencia.notaId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Banner PIX pré-preenchido */}
          {dadosPix && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Dados PIX da Nota de Entrada</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Banco:</span> {dadosPix.banco}</div>
                <div><span className="text-muted-foreground">Recebedor:</span> {dadosPix.recebedor}</div>
                <div><span className="text-muted-foreground">Chave:</span> <span className="font-mono">{dadosPix.chave}</span></div>
                {dadosPix.observacao && <div><span className="text-muted-foreground">Obs:</span> {dadosPix.observacao}</div>}
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total da Nota</p>
                <p className="text-xl font-bold">{formatCurrency(pendencia.valorTotal)}</p>
              </div>
              {isParcial && valorJaPago > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Já Pago</p>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(valorJaPago)}</p>
                </div>
              )}
            </div>
            {isParcial && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(saldoDevedor)}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Conferência: {pendencia.percentualConferencia}% 
              ({pendencia.qtdConferida ?? pendencia.aparelhosConferidos ?? 0}/{pendencia.qtdInformada ?? pendencia.aparelhosTotal ?? 0} aparelhos)
            </p>
          </div>

          {/* Alerta de conferência incompleta */}
          {conferenciaIncompleta && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">Conferência Incompleta</p>
                  <p className="text-xs text-yellow-600/80 mt-1">
                    Apenas {pendencia.percentualConferencia}% dos aparelhos foram conferidos.
                    Valor não conferido: {formatCurrency(pendencia.valorPendente)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Checkbox 
                  id="forcarFinalizacao"
                  checked={form.forcarFinalizacao}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, forcarFinalizacao: !!checked }))}
                />
                <Label htmlFor="forcarFinalizacao" className="text-sm text-yellow-600 cursor-pointer">
                  Forçar finalização mesmo com pendência
                </Label>
              </div>
            </div>
          )}

          {/* Campos do formulário */}
          <div className="space-y-3">
            {/* Campo de valor editável para pagamento parcial */}
            {isParcial && (
              <div>
                <Label>Valor do Pagamento *</Label>
                <InputComMascara
                  mascara="moeda"
                  value={form.valorPagamento ?? 0}
                  onChange={(formatted, raw) => {
                    const valor = typeof raw === 'number' ? raw : parseFloat(String(raw)) || 0;
                    setForm(prev => ({ ...prev, valorPagamento: valor }));
                  }}
                  placeholder="R$ 0,00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Máximo: {formatCurrency(saldoDevedor)}
                </p>
              </div>
            )}
            <div>
              <Label>Conta de Pagamento *</Label>
              <Select 
                value={form.contaPagamento} 
                onValueChange={(v) => setForm(prev => ({ ...prev, contaPagamento: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contasFinanceiras.map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Forma de Pagamento *</Label>
              <Select 
                value={form.formaPagamento} 
                onValueChange={(v) => setForm(prev => ({ ...prev, formaPagamento: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mostrarCampoParcelas && (
              <div>
                <Label>Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={form.parcelas}
                  onChange={(e) => setForm(prev => ({ ...prev, parcelas: parseInt(e.target.value) || 1 }))}
                />
              </div>
            )}

            <div>
              <Label>Data de Pagamento</Label>
              <Input
                type="date"
                value={form.dataVencimento}
                onChange={(e) => setForm(prev => ({ ...prev, dataVencimento: e.target.value }))}
              />
            </div>

            <div>
              <Label>Responsável *</Label>
              <Input
                value={user?.colaborador?.nome || usuarioLogado}
                disabled
                className="bg-muted"
              />
            </div>

            <FileUploadComprovante
              label="Comprovante de Pagamento"
              required
              value={form.comprovante}
              fileName={form.comprovanteNome}
              onFileChange={handleComprovanteChange}
              acceptedTypes={['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']}
              maxSizeMB={5}
            />

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações sobre o pagamento..."
                value={form.observacoes}
                onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            <CreditCard className="h-4 w-4 mr-2" />
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
