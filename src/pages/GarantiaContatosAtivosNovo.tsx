import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, ArrowLeft, Truck, Phone, User, Shield, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

import { getClientes, getMotoboys, Cliente } from '@/utils/cadastrosApi';
import { 
  addContatoAtivo, 
  ContatoAtivoGarantia 
} from '@/utils/garantiasApi';
import { getPlanosPorModelo, getPlanosAtivos, PlanoGarantia, formatCurrency } from '@/utils/planosGarantiaApi';

export default function GarantiaContatosAtivosNovo() {
  const navigate = useNavigate();
  const clientes = getClientes();
  const motoboys = getMotoboys();
  const todosPlanos = getPlanosAtivos();
  
  // Form state
  const [form, setForm] = useState({
    clienteId: '',
    clienteNome: '',
    clienteTelefone: '',
    clienteEmail: '',
    aparelhoModelo: '',
    aparelhoImei: '',
    aparelhoCondicao: '' as '' | 'Novo' | 'Seminovo',
    motoboyId: '',
    dataEntregaPrevista: '',
    enderecoEntrega: '',
    observacoes: '',
    garantiaExtendidaAderida: false,
    planoGarantiaId: ''
  });

  // Planos filtrados por modelo e condição
  const planosFiltrados = useMemo(() => {
    if (!form.aparelhoModelo || !form.aparelhoCondicao) {
      return [];
    }
    
    // Filtrar planos que correspondem ao modelo e condição
    return todosPlanos.filter(plano => {
      // Se for "Sem Garantia Adicional", sempre mostra
      if (plano.nome === 'Sem Garantia Adicional') return true;
      
      // Verifica condição
      if (plano.condicao !== 'Ambos' && plano.condicao !== form.aparelhoCondicao) {
        return false;
      }
      
      // Verifica se o modelo está incluído nos modelos do plano
      const modeloNormalizado = form.aparelhoModelo.toLowerCase();
      const modeloEncontrado = plano.modelos.some(m => 
        modeloNormalizado.includes(m.toLowerCase()) || m.toLowerCase().includes(modeloNormalizado)
      );
      
      return modeloEncontrado;
    });
  }, [form.aparelhoModelo, form.aparelhoCondicao, todosPlanos]);

  // Plano selecionado
  const planoSelecionado = useMemo(() => {
    if (!form.planoGarantiaId) return null;
    return todosPlanos.find(p => p.id === form.planoGarantiaId) || null;
  }, [form.planoGarantiaId, todosPlanos]);

  // Resetar plano quando mudar modelo ou condição
  useEffect(() => {
    setForm(prev => ({ ...prev, planoGarantiaId: '' }));
  }, [form.aparelhoModelo, form.aparelhoCondicao]);

  const getMotoboyNome = (id: string) => motoboys.find(m => m.id === id)?.nome || id;

  const handleSelecionarCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setForm(prev => ({
        ...prev,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone,
        clienteEmail: cliente.email,
        enderecoEntrega: `${cliente.endereco}, ${cliente.numero} - ${cliente.bairro}, ${cliente.cidade}-${cliente.estado}`
      }));
    }
  };

  const handleSalvar = () => {
    if (!form.clienteNome || !form.aparelhoModelo || !form.aparelhoImei || !form.aparelhoCondicao || !form.motoboyId || !form.dataEntregaPrevista) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (form.garantiaExtendidaAderida && !form.planoGarantiaId) {
      toast.error('Selecione um plano de garantia');
      return;
    }

    const novoContato: Omit<ContatoAtivoGarantia, 'id' | 'timeline'> = {
      garantiaId: undefined,
      dataLancamento: new Date().toISOString(),
      cliente: {
        id: form.clienteId || `CLI-TEMP-${Date.now()}`,
        nome: form.clienteNome,
        telefone: form.clienteTelefone,
        email: form.clienteEmail
      },
      aparelho: {
        modelo: form.aparelhoModelo,
        imei: form.aparelhoImei,
        condicao: form.aparelhoCondicao
      },
      logistica: {
        motoboyId: form.motoboyId,
        motoboyNome: getMotoboyNome(form.motoboyId),
        dataEntregaPrevista: form.dataEntregaPrevista,
        enderecoEntrega: form.enderecoEntrega,
        observacoes: form.observacoes
      },
      garantiaEstendida: form.garantiaExtendidaAderida && planoSelecionado ? {
        aderida: true,
        planoId: planoSelecionado.id,
        planoNome: planoSelecionado.nome,
        planoMeses: planoSelecionado.meses,
        valor: planoSelecionado.valor
      } : undefined,
      status: 'Pendente'
    };

    addContatoAtivo(novoContato);
    toast.success('Contato registrado com sucesso!');
    navigate('/garantias/contatos-ativos');
  };

  // Agrupar planos por nome (Silver, Gold)
  const planosAgrupados = useMemo(() => {
    const grupos: { [key: string]: PlanoGarantia[] } = {};
    planosFiltrados.forEach(plano => {
      if (!grupos[plano.nome]) {
        grupos[plano.nome] = [];
      }
      grupos[plano.nome].push(plano);
    });
    return grupos;
  }, [planosFiltrados]);

  return (
    <GarantiasLayout title="Novo Lançamento de Garantia">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/garantias/contatos-ativos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Novo Lançamento de Garantia</h1>
        </div>

        <div className="space-y-6">
          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Selecionar Cliente</Label>
                <Select value={form.clienteId} onValueChange={handleSelecionarCliente}>
                  <SelectTrigger><SelectValue placeholder="Buscar cliente..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome} - {c.cpf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.clienteNome} onChange={e => setForm({...form, clienteNome: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.clienteTelefone} onChange={e => setForm({...form, clienteTelefone: e.target.value})} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Email</Label>
                <Input value={form.clienteEmail} onChange={e => setForm({...form, clienteEmail: e.target.value})} />
              </div>
            </CardContent>
          </Card>

          {/* Aparelho */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4" />
                Aparelho
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Modelo *</Label>
                <Input 
                  value={form.aparelhoModelo} 
                  onChange={e => setForm({...form, aparelhoModelo: e.target.value})}
                  placeholder="iPhone 15 Pro Max"
                />
              </div>
              <div className="space-y-2">
                <Label>Condição *</Label>
                <Select value={form.aparelhoCondicao} onValueChange={v => setForm({...form, aparelhoCondicao: v as 'Novo' | 'Seminovo'})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Novo">Novo</SelectItem>
                    <SelectItem value="Seminovo">Seminovo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>IMEI *</Label>
                <Input 
                  value={form.aparelhoImei} 
                  onChange={e => setForm({...form, aparelhoImei: e.target.value})}
                  placeholder="352123456789012"
                />
              </div>
            </CardContent>
          </Card>

          {/* Logística */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4" />
                Logística
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Motoboy *</Label>
                <Select value={form.motoboyId} onValueChange={v => setForm({...form, motoboyId: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {motoboys.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Entrega Prevista *</Label>
                <Input 
                  type="date" 
                  value={form.dataEntregaPrevista} 
                  onChange={e => setForm({...form, dataEntregaPrevista: e.target.value})} 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Endereço de Entrega</Label>
                <Input 
                  value={form.enderecoEntrega} 
                  onChange={e => setForm({...form, enderecoEntrega: e.target.value})} 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea 
                  value={form.observacoes} 
                  onChange={e => setForm({...form, observacoes: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Garantia Estendida */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Garantia Estendida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Deseja aderir à Garantia Estendida?</Label>
                <Select 
                  value={form.garantiaExtendidaAderida ? 'sim' : 'nao'} 
                  onValueChange={v => setForm({...form, garantiaExtendidaAderida: v === 'sim', planoGarantiaId: ''})}
                >
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.garantiaExtendidaAderida && (
                <>
                  {!form.aparelhoModelo || !form.aparelhoCondicao ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                      <p className="font-medium">Preencha o modelo e a condição do aparelho</p>
                      <p className="text-sm">Os planos disponíveis serão exibidos de acordo com o aparelho informado.</p>
                    </div>
                  ) : planosFiltrados.length === 0 ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                      <p className="font-medium">Nenhum plano disponível</p>
                      <p className="text-sm">Não há planos de garantia cadastrados para o modelo "{form.aparelhoModelo}" na condição "{form.aparelhoCondicao}".</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Planos disponíveis para <strong>{form.aparelhoModelo}</strong> ({form.aparelhoCondicao}):
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {planosFiltrados
                          .filter(p => p.nome !== 'Sem Garantia Adicional')
                          .map(plano => (
                          <div
                            key={plano.id}
                            onClick={() => setForm({...form, planoGarantiaId: plano.id})}
                            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                              form.planoGarantiaId === plano.id 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {form.planoGarantiaId === plano.id && (
                              <div className="absolute -top-2 -right-2">
                                <CheckCircle className="h-6 w-6 text-primary fill-background" />
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge 
                                  className={plano.nome === 'Silver' 
                                    ? 'bg-gray-400 hover:bg-gray-500' 
                                    : 'bg-yellow-500 hover:bg-yellow-600'}
                                >
                                  {plano.nome}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{plano.meses} meses</span>
                              </div>
                              
                              <div className="text-2xl font-bold text-primary">
                                {formatCurrency(plano.valor)}
                              </div>
                              
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {plano.descricao}
                              </p>
                              
                              <div className="flex gap-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {plano.condicao}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {plano.tipo}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Plano selecionado resumo */}
                      {planoSelecionado && (
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-primary">Plano selecionado: {planoSelecionado.nome}</p>
                              <p className="text-sm text-muted-foreground">
                                {planoSelecionado.meses} meses de cobertura
                              </p>
                            </div>
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(planoSelecionado.valor)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pb-6">
            <Button variant="outline" onClick={() => navigate('/garantias/contatos-ativos')}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} size="lg">
              <Save className="h-4 w-4 mr-2" />
              Salvar Lançamento
            </Button>
          </div>
        </div>
      </div>
    </GarantiasLayout>
  );
}
