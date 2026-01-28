import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PendenciaFinanceira } from '@/utils/pendenciasFinanceiraApi';
import { getContasFinanceiras } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { formatCurrency } from '@/utils/formatUtils';
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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
}

interface ModalFinalizarPagamentoProps {
  pendencia: PendenciaFinanceira | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (dados: DadosPagamento) => void;
}

export function ModalFinalizarPagamento({
  pendencia,
  open,
  onClose,
  onConfirm
}: ModalFinalizarPagamentoProps) {
  const { obterFinanceiros } = useCadastroStore();
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');
  const colaboradoresFinanceiros = obterFinanceiros();

  const [form, setForm] = useState<DadosPagamento>({
    contaPagamento: '',
    formaPagamento: '',
    parcelas: 1,
    dataVencimento: '',
    comprovante: '',
    comprovanteNome: '',
    observacoes: '',
    responsavel: '',
    forcarFinalizacao: false
  });

  // Verificar se conferência está incompleta
  const conferenciaIncompleta = useMemo(() => {
    if (!pendencia) return false;
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
      forcarFinalizacao: false
    });
  };

  if (!pendencia) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Finalizar Pagamento - {pendencia.notaId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Resumo */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-xl font-bold">{formatCurrency(pendencia.valorTotal)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Conferência: {pendencia.percentualConferencia}% ({pendencia.aparelhosConferidos}/{pendencia.aparelhosTotal} aparelhos)
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
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={form.dataVencimento}
                onChange={(e) => setForm(prev => ({ ...prev, dataVencimento: e.target.value }))}
              />
            </div>

            <div>
              <Label>Responsável *</Label>
              <Select 
                value={form.responsavel} 
                onValueChange={(v) => setForm(prev => ({ ...prev, responsavel: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradoresFinanceiros.map(col => (
                    <SelectItem key={col.id} value={col.nome}>
                      {col.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
