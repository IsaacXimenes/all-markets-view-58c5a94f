import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Lock, AlertCircle, Info, FileText, Zap } from 'lucide-react';
import { getNotasCompra } from '@/utils/estoqueApi';
import { 
  criarNotaEntrada, 
  TipoPagamentoNota, 
  definirAtuacaoInicial,
  AtuacaoAtual 
} from '@/utils/notaEntradaFluxoApi';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { formatCurrency } from '@/utils/formatUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BufferAnexos, AnexoTemporario } from '@/components/estoque/BufferAnexos';

// Número da nota será gerado automaticamente pela API

export default function EstoqueNotaCadastrar() {
  const navigate = useNavigate();
  
  // Informações da Nota
  const [fornecedor, setFornecedor] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [valorTotal, setValorTotal] = useState<number>(0);
  
  // Flag de Urgência
  const [urgente, setUrgente] = useState(false);
  
  // Pagamento
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Pix' | ''>('');
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamentoNota | ''>('');
  const [observacaoPagamento, setObservacaoPagamento] = useState('');
  
  // Atuação Atual (somente leitura, calculado automaticamente)
  const [atuacaoAtual, setAtuacaoAtual] = useState<AtuacaoAtual | ''>('');
  
  // Buffer de anexos temporários
  const [anexos, setAnexos] = useState<AnexoTemporario[]>([]);

  // Atualizar atuação automaticamente quando tipo de pagamento muda
  useEffect(() => {
    if (tipoPagamento) {
      setAtuacaoAtual(definirAtuacaoInicial(tipoPagamento));
    } else {
      setAtuacaoAtual('');
    }
  }, [tipoPagamento]);


  const handleValorTotalChange = (formatted: string, raw: string | number) => {
    const valor = typeof raw === 'number' ? raw : parseFloat(String(raw)) || 0;
    setValorTotal(valor);
  };

  const validarCampos = (): string[] => {
    const camposFaltando: string[] = [];
    
    if (!fornecedor) camposFaltando.push('Fornecedor');
    if (!dataEntrada) camposFaltando.push('Data de Entrada');
    if (!tipoPagamento) camposFaltando.push('Tipo de Pagamento');
    
    return camposFaltando;
  };

  const handleSalvar = () => {
    const camposFaltando = validarCampos();
    
    if (camposFaltando.length > 0) {
      toast.error('Campos obrigatórios não preenchidos', {
        description: camposFaltando.join(', ')
      });
      return;
    }

    // Validar que a data não seja no futuro
    const dataInformada = new Date(dataEntrada + 'T12:00:00');
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    if (dataInformada > hoje) {
      toast.error('Data inválida', {
        description: 'A data de entrada não pode ser no futuro'
      });
      return;
    }

    // Criar nota via nova API (LANÇAMENTO INICIAL - sem produtos)
    // O número da nota será gerado automaticamente pela API
    const novaNota = criarNotaEntrada({
      data: dataEntrada,
      fornecedor, // Passa o nome do fornecedor diretamente
      tipoPagamento: tipoPagamento as TipoPagamentoNota,
      valorTotal: valorTotal || undefined,
      formaPagamento: formaPagamento || undefined,
      responsavel: 'Usuário Estoque', // TODO: obter do contexto de autenticação
      observacoes: observacaoPagamento || undefined,
      urgente: urgente
    });

    // Mensagem de sucesso
    const atuacao = definirAtuacaoInicial(tipoPagamento as TipoPagamentoNota);
    toast.success(`Nota ${novaNota.id} lançada com sucesso!`, {
      description: `Atuação inicial: ${atuacao}. ${atuacao === 'Estoque' ? 'Acesse Notas Pendências para cadastrar produtos.' : 'Aguardando ação do Financeiro.'}`
    });
    
    // Redirecionar para Notas Pendências
    navigate('/estoque/notas-pendencias');
  };

  const getAtuacaoBadge = (atuacao: AtuacaoAtual | '') => {
    if (!atuacao) return null;
    
    switch (atuacao) {
      case 'Estoque':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Estoque</Badge>;
      case 'Financeiro':
        return <Badge className="bg-accent text-accent-foreground border-accent">Financeiro</Badge>;
      case 'Encerrado':
        return <Badge variant="secondary">Encerrado</Badge>;
      default:
        return null;
    }
  };

  return (
    <EstoqueLayout title="Cadastrar Nova Nota de Compra">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/estoque/notas-compra')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Notas de Compra
        </Button>

        {/* Alerta informativo sobre Lançamento Inicial */}
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Lançamento Inicial:</strong> Esta tela registra a existência da nota e define o fluxo de pagamento. 
            Os produtos serão cadastrados posteriormente na aba <strong>Notas Pendências</strong> quando a Atuação Atual for "Estoque".
          </AlertDescription>
        </Alert>

        {/* Informações da Nota */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações da Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dataEntrada">Data de Entrada *</Label>
                <Input 
                  id="dataEntrada" 
                  type="date"
                  value={dataEntrada}
                  onChange={(e) => setDataEntrada(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fornecedor">Fornecedor *</Label>
                <AutocompleteFornecedor
                  value={fornecedor}
                  onChange={setFornecedor}
                  placeholder="Selecione um fornecedor"
                />
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                <strong>Nº da Nota:</strong> Será gerado automaticamente ao salvar (formato: NE-{new Date().getFullYear()}-XXXXX)
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valorTotal">Valor Total da Nota</Label>
                <InputComMascara
                  mascara="moeda"
                  value={valorTotal}
                  onChange={handleValorTotalChange}
                  placeholder="R$ 0,00"
                />
                <p className="text-xs text-muted-foreground mt-1">Valor previsto da nota fiscal</p>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <Checkbox
                  id="urgente"
                  checked={urgente}
                  onCheckedChange={(checked) => setUrgente(checked as boolean)}
                />
                <div className="flex items-center gap-2">
                  <Zap className={`h-4 w-4 ${urgente ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <Label htmlFor="urgente" className={`cursor-pointer ${urgente ? 'text-destructive font-medium' : ''}`}>
                    Solicitação de Urgência
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quadro de Produtos - BLOQUEADO */}
        <Card className="opacity-70 relative">
          <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center rounded-lg">
            <div className="text-center p-6 bg-muted rounded-lg shadow-lg">
              <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium text-foreground">Produtos bloqueados no Lançamento Inicial</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre produtos em <strong>Notas Pendências</strong> após salvar
              </p>
            </div>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-5 w-5" />
              Produtos
            </CardTitle>
            <CardDescription>
              O cadastro de produtos é realizado posteriormente via Notas Pendências
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground">Tipo Produto</TableHead>
                    <TableHead className="text-muted-foreground">Marca</TableHead>
                    <TableHead className="text-muted-foreground">IMEI</TableHead>
                    <TableHead className="text-muted-foreground">Modelo</TableHead>
                    <TableHead className="text-muted-foreground">Cor</TableHead>
                    <TableHead className="text-muted-foreground">Categoria</TableHead>
                    <TableHead className="text-muted-foreground">Qtd</TableHead>
                    <TableHead className="text-muted-foreground">Custo Unit.</TableHead>
                    <TableHead className="text-muted-foreground">Custo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-6 w-6" />
                        <span>Nenhum produto cadastrado nesta etapa</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 pt-4 border-t flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total da Nota</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(valorTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamento *</CardTitle>
            <CardDescription>
              O tipo de pagamento define o fluxo da nota e a atuação inicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Forma de Pagamento */}
              <div>
                <Label className="mb-3 block">Forma de Pagamento</Label>
                <RadioGroup 
                  value={formaPagamento} 
                  onValueChange={(v) => setFormaPagamento(v as 'Dinheiro' | 'Pix')}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Dinheiro" id="dinheiro" />
                    <Label htmlFor="dinheiro" className="font-normal cursor-pointer">Dinheiro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Pix" id="pix" />
                    <Label htmlFor="pix" className="font-normal cursor-pointer">Pix</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Tipo de Pagamento - OBRIGATÓRIO */}
              <div>
                <Label className="mb-3 block">Tipo de Pagamento *</Label>
                <Select 
                  value={tipoPagamento} 
                  onValueChange={(v) => setTipoPagamento(v as TipoPagamentoNota)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pagamento Pos">
                      <div className="flex flex-col">
                        <span className="font-medium">Pagamento Pós</span>
                        <span className="text-xs text-muted-foreground">100% após conferência do estoque</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Pagamento Parcial">
                      <div className="flex flex-col">
                        <span className="font-medium">Pagamento Parcial</span>
                        <span className="text-xs text-muted-foreground">Adiantamento + restante após conferência</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Pagamento 100% Antecipado">
                      <div className="flex flex-col">
                        <span className="font-medium">Pagamento 100% Antecipado</span>
                        <span className="text-xs text-muted-foreground">Pagamento total antes da conferência</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Atuação Atual - SOMENTE LEITURA */}
              <div>
                <Label className="mb-3 block flex items-center gap-2">
                  Atuação Atual
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center gap-2">
                  {atuacaoAtual ? (
                    <>
                      {getAtuacaoBadge(atuacaoAtual)}
                      <span className="text-sm text-muted-foreground">
                        (definido automaticamente)
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Selecione o tipo de pagamento
                    </span>
                  )}
                </div>
                {atuacaoAtual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {atuacaoAtual === 'Estoque' 
                      ? 'Estoque cadastra e confere primeiro' 
                      : 'Financeiro realiza pagamento primeiro'}
                  </p>
                )}
              </div>
            </div>
            
            {/* Descrição do fluxo baseado no tipo */}
            {tipoPagamento && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {tipoPagamento === 'Pagamento Pos' && (
                    <>
                      <strong>Fluxo Pagamento Pós:</strong> Estoque cadastra produtos → Estoque realiza conferência → 
                      Ao atingir 100% conferência → Financeiro realiza pagamento total → Nota encerrada
                    </>
                  )}
                  {tipoPagamento === 'Pagamento Parcial' && (
                    <>
                      <strong>Fluxo Pagamento Parcial:</strong> Financeiro realiza primeiro pagamento → 
                      Estoque cadastra produtos e confere → Ao atingir 100% conferência → 
                      Financeiro realiza pagamento restante → Nota encerrada
                    </>
                  )}
                  {tipoPagamento === 'Pagamento 100% Antecipado' && (
                    <>
                      <strong>Fluxo 100% Antecipado:</strong> Financeiro realiza pagamento total → 
                      Estoque cadastra produtos e confere → Ao atingir 100% conferência → Nota encerrada automaticamente
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea 
                id="observacao"
                value={observacaoPagamento}
                onChange={(e) => setObservacaoPagamento(e.target.value)}
                placeholder="Informações adicionais sobre o pagamento..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Buffer de Anexos */}
        <BufferAnexos 
          anexos={anexos}
          onAnexosChange={setAnexos}
          maxFiles={10}
          maxSizeMB={5}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/estoque/notas-compra')}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>
            Salvar Lançamento Inicial
          </Button>
        </div>
      </div>
    </EstoqueLayout>
  );
}
