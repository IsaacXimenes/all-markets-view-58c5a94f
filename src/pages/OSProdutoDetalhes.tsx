import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Wrench,
  Smartphone,
  MapPin,
  Calendar,
  User,
  DollarSign,
  Plus,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getProdutoPendenteById, 
  salvarParecerAssistencia,
  liberarProdutoPendente,
  ProdutoPendente,
  TimelineEntry
} from '@/utils/osApi';
import { getColaboradores, getCargos, getFornecedores } from '@/utils/cadastrosApi';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface PecaForm {
  descricao: string;
  valor: string;
  fornecedor: string;
}

export default function OSProdutoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [produto, setProduto] = useState<ProdutoPendente | null>(null);
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  
  // Form state
  const [parecerStatus, setParecerStatus] = useState<string>('');
  const [parecerObservacoes, setParecerObservacoes] = useState('');
  const [parecerResponsavel, setParecerResponsavel] = useState('');
  const [pecas, setPecas] = useState<PecaForm[]>([]);
  const [novoFornecedor, setNovoFornecedor] = useState('');

  useEffect(() => {
    if (id) {
      const data = getProdutoPendenteById(id);
      setProduto(data);
    }

    const colaboradoresData = getColaboradores();
    setColaboradores(colaboradoresData);
    
    const fornecedoresData = getFornecedores();
    setFornecedores(fornecedoresData.map(f => f.nome));
  }, [id]);

  const handleAddPeca = () => {
    setPecas([...pecas, { descricao: '', valor: '', fornecedor: '' }]);
  };

  const handleRemovePeca = (index: number) => {
    setPecas(pecas.filter((_, i) => i !== index));
  };

  const handlePecaChange = (index: number, field: keyof PecaForm, value: string) => {
    const newPecas = [...pecas];
    newPecas[index][field] = value;
    setPecas(newPecas);
  };

  const parseValor = (valor: string): number => {
    const cleaned = valor.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleSalvarParecer = () => {
    if (!id || !parecerStatus || !parecerResponsavel) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do parecer.",
        variant: "destructive"
      });
      return;
    }

    // Validar peças se for "Ajustes realizados"
    if (parecerStatus === 'Ajustes realizados') {
      const pecasValidas = pecas.filter(p => p.descricao && p.valor && p.fornecedor);
      if (pecasValidas.length === 0) {
        toast({
          title: "Adicione as peças",
          description: "Para ajustes realizados, adicione pelo menos uma peça/despesa.",
          variant: "destructive"
        });
        return;
      }
    }

    const statusParecer = parecerStatus as 'Produto conferido' | 'Aguardando peça' | 'Ajustes realizados';
    
    const pecasFormatadas = pecas
      .filter(p => p.descricao && p.valor && p.fornecedor)
      .map(p => ({
        descricao: p.descricao,
        valor: parseValor(p.valor),
        fornecedor: p.fornecedor
      }));

    const resultado = salvarParecerAssistencia(
      id, 
      statusParecer, 
      parecerObservacoes, 
      parecerResponsavel,
      pecasFormatadas.length > 0 ? pecasFormatadas : undefined
    );
    
    if (resultado) {
      if (statusParecer === 'Produto conferido') {
        liberarProdutoPendente(id);
        toast({
          title: "Produto liberado!",
          description: "Produto conferido e liberado para o estoque.",
        });
        navigate('/estoque/produtos');
      } else {
        toast({
          title: "Parecer salvo!",
          description: "Parecer da assistência registrado com sucesso.",
        });
        // Recarregar dados
        const data = getProdutoPendenteById(id);
        setProduto(data);
      }
    }
  };

  const getTimelineIcon = (tipo: TimelineEntry['tipo']) => {
    switch (tipo) {
      case 'entrada':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'parecer_estoque':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'parecer_assistencia':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'despesa':
        return <DollarSign className="h-4 w-4 text-red-500" />;
      case 'liberacao':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!produto) {
    return (
      <OSLayout title="Produto não encontrado">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Produto não encontrado na lista de reparos.</p>
          <Button className="mt-4" onClick={() => navigate('/os/produtos-analise')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </OSLayout>
    );
  }

  const custoTotalPecas = pecas.reduce((acc, p) => acc + parseValor(p.valor), 0);

  return (
    <OSLayout title="Detalhes do Produto - Assistência">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/os/produtos-analise')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-bold">{produto.modelo}</h2>
            <p className="text-sm text-muted-foreground">IMEI: {produto.imei}</p>
          </div>
          <Badge variant="outline" className={
            produto.origemEntrada === 'Trade-In' 
              ? 'bg-purple-500/10 text-purple-600 border-purple-500/30 ml-auto'
              : 'bg-blue-500/10 text-blue-600 border-blue-500/30 ml-auto'
          }>
            {produto.origemEntrada}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações do Produto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Informações do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Modelo</Label>
                  <p className="font-medium">{produto.modelo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cor</Label>
                  <p>{produto.cor}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Saúde Bateria</Label>
                  <p className={produto.saudeBateria < 80 ? 'text-red-500 font-medium' : ''}>
                    {produto.saudeBateria}%
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Custo Original</Label>
                  <p>{formatCurrency(produto.valorCusto)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Custo Assistência</Label>
                  <p className={produto.custoAssistencia > 0 ? 'text-red-500 font-medium' : ''}>
                    {formatCurrency(produto.custoAssistencia)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Custo Total</Label>
                  <p className="font-bold">
                    {formatCurrency(produto.valorCusto + produto.custoAssistencia)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Parecer Estoque já preenchido */}
              {produto.parecerEstoque && (
                <div className="p-4 bg-blue-500/10 rounded-lg">
                  <Label className="text-blue-600 font-medium">Parecer Estoque</Label>
                  <p className="text-sm mt-1">{produto.parecerEstoque.status}</p>
                  <p className="text-xs text-muted-foreground mt-1">{produto.parecerEstoque.observacoes}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {produto.parecerEstoque.responsavel} - {formatDateTime(produto.parecerEstoque.data)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quadro Parecer Assistência */}
          <Card className={produto.parecerAssistencia ? 'border-orange-500/30' : 'border-yellow-500/30'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Parecer Assistência
              </CardTitle>
              <CardDescription>
                {produto.parecerAssistencia 
                  ? `Último parecer em ${formatDateTime(produto.parecerAssistencia.data)}`
                  : 'Preencha o parecer técnico do produto'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {produto.parecerAssistencia && (
                <div className="p-4 bg-muted/50 rounded-lg mb-4">
                  <Label className="text-muted-foreground">Último Parecer</Label>
                  <Badge variant="outline" className="ml-2">
                    {produto.parecerAssistencia.status}
                  </Badge>
                  <p className="text-sm mt-2">{produto.parecerAssistencia.observacoes}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status do Parecer *</Label>
                <Select value={parecerStatus} onValueChange={setParecerStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Produto conferido">Produto conferido</SelectItem>
                    <SelectItem value="Aguardando peça">Aguardando peça</SelectItem>
                    <SelectItem value="Ajustes realizados">Ajustes realizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Descreva as observações técnicas..."
                  value={parecerObservacoes}
                  onChange={(e) => setParecerObservacoes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Select value={parecerResponsavel} onValueChange={setParecerResponsavel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((colab) => (
                      <SelectItem key={colab.id} value={colab.nome}>
                        {colab.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Peças para Assistência (apenas se Ajustes realizados) */}
              {parecerStatus === 'Ajustes realizados' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Peças para Assistência</Label>
                    <Button variant="outline" size="sm" onClick={handleAddPeca}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Peça
                    </Button>
                  </div>

                  {pecas.map((peca, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
                      <Input
                        placeholder="Descrição da peça"
                        value={peca.descricao}
                        onChange={(e) => handlePecaChange(index, 'descricao', e.target.value)}
                      />
                      <Input
                        placeholder="Valor R$"
                        value={peca.valor}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^\d,]/g, '');
                          handlePecaChange(index, 'valor', value);
                        }}
                      />
                      <Select 
                        value={peca.fornecedor} 
                        onValueChange={(v) => handlePecaChange(index, 'fornecedor', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                          <SelectItem value="Interno">Interno</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemovePeca(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}

                  {pecas.length > 0 && (
                    <div className="text-right font-medium">
                      Total Peças: {formatCurrency(custoTotalPecas)}
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Data/Hora: {new Date().toLocaleString('pt-BR')} (automático)
              </div>

              <Button onClick={handleSalvarParecer} className="w-full">
                Salvar Parecer Assistência
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Completa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline Completa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {produto.timeline.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                      {getTimelineIcon(entry.tipo)}
                    </div>
                    {index < produto.timeline.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{entry.titulo}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.data)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.descricao}</p>
                    {entry.responsavel && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.responsavel}
                      </p>
                    )}
                    {entry.valor && (
                      <p className="text-sm font-medium text-red-500 mt-1">
                        {formatCurrency(entry.valor)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </OSLayout>
  );
}
