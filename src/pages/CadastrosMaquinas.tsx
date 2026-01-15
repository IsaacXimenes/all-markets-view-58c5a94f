import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Edit, Plus, Trash2, CreditCard, Percent, Settings, X } from 'lucide-react';
import { 
  getMaquinasCartao, 
  addMaquinaCartao, 
  updateMaquinaCartao, 
  deleteMaquinaCartao, 
  getLojas, 
  getContasFinanceiras,
  getLojaById,
  getContaFinanceiraById,
  MaquinaCartao 
} from '@/utils/cadastrosApi';
import { exportToCSV } from '@/utils/formatUtils';
import { toast } from 'sonner';

// Interface para parcelamento
interface Parcelamento {
  parcelas: number;
  taxa: number;
}

// Valores padrão de parcelamento
const getParcelamentoPadrao = (): Parcelamento[] => {
  const parcelamentos: Parcelamento[] = [];
  for (let i = 1; i <= 36; i++) {
    let taxa = 0;
    if (i === 1) taxa = 0;
    else if (i === 2) taxa = 2;
    else if (i === 3) taxa = 2.5;
    else if (i === 4) taxa = 3;
    else if (i === 5) taxa = 3.5;
    else if (i === 6) taxa = 4;
    else if (i === 7) taxa = 4.5;
    else if (i === 8) taxa = 5;
    else if (i === 9) taxa = 5.5;
    else if (i === 10) taxa = 6;
    else if (i === 11) taxa = 6.5;
    else if (i === 12) taxa = 7;
    else taxa = 7 + (i - 12) * 0.5;
    parcelamentos.push({ parcelas: i, taxa: parseFloat(taxa.toFixed(2)) });
  }
  return parcelamentos;
};

export default function CadastrosMaquinas() {
  const [maquinas, setMaquinas] = useState(getMaquinasCartao());
  const lojas = getLojas().filter(l => l.status === 'Ativo');
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState<MaquinaCartao | null>(null);
  
  // Modal de parcelamento
  const [showParcelamentoModal, setShowParcelamentoModal] = useState(false);
  const [maquinaParcelamento, setMaquinaParcelamento] = useState<MaquinaCartao | null>(null);
  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [showAddParcelamento, setShowAddParcelamento] = useState(false);
  const [novoParcelamento, setNovoParcelamento] = useState({ parcelas: 1, taxa: 0 });
  const [editingParcelamento, setEditingParcelamento] = useState<Parcelamento | null>(null);
  
  // Edição inline de percentual
  const [editingPercentual, setEditingPercentual] = useState<string | null>(null);
  const [tempPercentual, setTempPercentual] = useState<string>('');

  const [form, setForm] = useState({
    nome: '',
    cnpjVinculado: '',
    contaOrigem: '',
    status: 'Ativo' as MaquinaCartao['status'],
    percentualMaquina: 2
  });

  const resetForm = () => {
    setForm({
      nome: '',
      cnpjVinculado: '',
      contaOrigem: '',
      status: 'Ativo',
      percentualMaquina: 2
    });
    setEditingMaquina(null);
  };

  const handleOpenDialog = (maquina?: MaquinaCartao) => {
    if (maquina) {
      setEditingMaquina(maquina);
      setForm({
        nome: maquina.nome,
        cnpjVinculado: maquina.cnpjVinculado,
        contaOrigem: maquina.contaOrigem,
        status: maquina.status,
        percentualMaquina: maquina.percentualMaquina || maquina.taxas?.debito || 2
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.cnpjVinculado || !form.contaOrigem) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    // Parcelamentos padrão para novas máquinas
    const parcelamentoPadrao = getParcelamentoPadrao();
    const creditoTaxas: { [key: number]: number } = {};
    parcelamentoPadrao.forEach(p => {
      creditoTaxas[p.parcelas] = p.taxa;
    });

    const maquinaData = {
      nome: form.nome,
      cnpjVinculado: form.cnpjVinculado,
      contaOrigem: form.contaOrigem,
      status: form.status,
      percentualMaquina: form.percentualMaquina,
      taxas: editingMaquina?.taxas || { credito: creditoTaxas, debito: form.percentualMaquina },
      parcelamentos: editingMaquina?.parcelamentos || parcelamentoPadrao
    };

    if (editingMaquina) {
      updateMaquinaCartao(editingMaquina.id, maquinaData);
      toast.success('Máquina atualizada com sucesso!');
    } else {
      const novaMaquina = addMaquinaCartao(maquinaData);
      toast.success(`Máquina criada: ${novaMaquina.id}`);
    }

    setMaquinas(getMaquinasCartao());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta máquina?')) {
      deleteMaquinaCartao(id);
      setMaquinas(getMaquinasCartao());
      toast.success('Máquina excluída com sucesso!');
    }
  };

  const handleExport = () => {
    const data = maquinas.map(m => {
      const loja = getLojaById(m.cnpjVinculado);
      const conta = getContaFinanceiraById(m.contaOrigem);
      return {
        ID: m.id,
        Nome: m.nome,
        'Loja Vinculada': loja?.nome || m.cnpjVinculado,
        'CNPJ': loja?.cnpj || '-',
        'Conta de Origem': conta?.nome || m.contaOrigem,
        '% da Máquina': `${m.percentualMaquina || m.taxas?.debito || 2}%`,
        Status: m.status
      };
    });
    exportToCSV(data, `maquinas-cartao-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Máquinas exportadas com sucesso!');
  };

  // Handlers para edição inline de percentual
  const handleStartEditPercentual = (maquina: MaquinaCartao) => {
    setEditingPercentual(maquina.id);
    setTempPercentual(String(maquina.percentualMaquina || maquina.taxas?.debito || 2));
  };

  const handleSavePercentual = (maquinaId: string) => {
    const valor = parseFloat(tempPercentual);
    if (isNaN(valor) || valor < 0 || valor > 100) {
      toast.error('O percentual deve ser um número entre 0 e 100');
      return;
    }
    
    updateMaquinaCartao(maquinaId, { percentualMaquina: valor });
    setMaquinas(getMaquinasCartao());
    setEditingPercentual(null);
    setTempPercentual('');
    toast.success('Percentual atualizado com sucesso!');
  };

  const handleCancelEditPercentual = () => {
    setEditingPercentual(null);
    setTempPercentual('');
  };

  // Handlers para parcelamento
  const handleOpenParcelamentoModal = (maquina: MaquinaCartao) => {
    setMaquinaParcelamento(maquina);
    // Carregar parcelamentos existentes ou usar padrão
    const parcelamentosExistentes = maquina.parcelamentos || getParcelamentoPadrao();
    setParcelamentos([...parcelamentosExistentes].sort((a, b) => a.parcelas - b.parcelas));
    setShowParcelamentoModal(true);
  };

  const handleSaveParcelamentos = () => {
    if (!maquinaParcelamento) return;

    // Converter parcelamentos para o formato de taxas
    const creditoTaxas: { [key: number]: number } = {};
    parcelamentos.forEach(p => {
      creditoTaxas[p.parcelas] = p.taxa;
    });

    updateMaquinaCartao(maquinaParcelamento.id, { 
      parcelamentos: parcelamentos,
      taxas: { 
        credito: creditoTaxas, 
        debito: maquinaParcelamento.taxas?.debito || 2 
      }
    });
    setMaquinas(getMaquinasCartao());
    toast.success('Parcelamentos salvos com sucesso!');
    setShowParcelamentoModal(false);
  };

  const handleAddParcelamento = () => {
    if (novoParcelamento.parcelas < 1 || novoParcelamento.parcelas > 36) {
      toast.error('Parcelas devem ser entre 1 e 36');
      return;
    }
    if (novoParcelamento.taxa < 0 || novoParcelamento.taxa > 100) {
      toast.error('Taxa deve ser entre 0 e 100');
      return;
    }
    if (parcelamentos.find(p => p.parcelas === novoParcelamento.parcelas)) {
      toast.error('Já existe parcelamento para este número de parcelas');
      return;
    }

    setParcelamentos([...parcelamentos, { ...novoParcelamento }].sort((a, b) => a.parcelas - b.parcelas));
    setNovoParcelamento({ parcelas: 1, taxa: 0 });
    setShowAddParcelamento(false);
    toast.success('Parcelamento adicionado');
  };

  const handleUpdateParcelamento = () => {
    if (!editingParcelamento) return;
    if (editingParcelamento.taxa < 0 || editingParcelamento.taxa > 100) {
      toast.error('Taxa deve ser entre 0 e 100');
      return;
    }

    setParcelamentos(parcelamentos.map(p => 
      p.parcelas === editingParcelamento.parcelas ? editingParcelamento : p
    ));
    setEditingParcelamento(null);
    toast.success('Parcelamento atualizado');
  };

  const handleDeleteParcelamento = (parcelas: number) => {
    setParcelamentos(parcelamentos.filter(p => p.parcelas !== parcelas));
    toast.success('Parcelamento removido');
  };

  return (
    <CadastrosLayout title="Cadastro de Máquinas de Cartão">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Máquinas de Cartão Cadastradas
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Máquina
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingMaquina ? 'Editar Máquina' : 'Nova Máquina de Cartão'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <Label>Nome da Máquina *</Label>
                      <Input
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        placeholder="Ex: Máquina Stone Matriz"
                      />
                    </div>
                    <div>
                      <Label>Loja Vinculada (CNPJ) *</Label>
                      <Select value={form.cnpjVinculado} onValueChange={(value) => setForm({ ...form, cnpjVinculado: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a loja..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>
                              {loja.nome} - {loja.cnpj}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Conta de Origem *</Label>
                      <Select value={form.contaOrigem} onValueChange={(value) => setForm({ ...form, contaOrigem: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a conta..." />
                        </SelectTrigger>
                        <SelectContent>
                          {contasFinanceiras.map(conta => (
                            <SelectItem key={conta.id} value={conta.id}>
                              {conta.nome} - {conta.banco || conta.tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>% da Máquina (Débito) *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={form.percentualMaquina}
                          onChange={(e) => setForm({ ...form, percentualMaquina: parseFloat(e.target.value) || 0 })}
                          placeholder="2"
                          className="w-24"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Taxa percentual para débito (0-100)
                      </p>
                    </div>
                    <div>
                      <Label>Status *</Label>
                      <Select value={form.status} onValueChange={(value: MaquinaCartao['status']) => setForm({ ...form, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      Salvar Máquina
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome da Máquina</TableHead>
                  <TableHead>Loja Vinculada</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Conta de Origem</TableHead>
                  <TableHead>% da Máquina</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maquinas.map((maquina) => {
                  const loja = getLojaById(maquina.cnpjVinculado);
                  const conta = getContaFinanceiraById(maquina.contaOrigem);
                  const percentual = maquina.percentualMaquina ?? maquina.taxas?.debito ?? 2;
                  
                  return (
                    <TableRow key={maquina.id}>
                      <TableCell className="font-mono text-xs">{maquina.id}</TableCell>
                      <TableCell className="font-medium">{maquina.nome}</TableCell>
                      <TableCell>{loja?.nome || maquina.cnpjVinculado}</TableCell>
                      <TableCell className="font-mono text-xs">{loja?.cnpj || '-'}</TableCell>
                      <TableCell>{conta?.nome || maquina.contaOrigem}</TableCell>
                      <TableCell>
                        {editingPercentual === maquina.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={tempPercentual}
                              onChange={(e) => setTempPercentual(e.target.value)}
                              className="w-16 h-8 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePercentual(maquina.id);
                                if (e.key === 'Escape') handleCancelEditPercentual();
                              }}
                            />
                            <span className="text-xs">%</span>
                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => handleSavePercentual(maquina.id)}>
                              ✓
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={handleCancelEditPercentual}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                            onClick={() => handleStartEditPercentual(maquina)}
                            title="Clique para editar"
                          >
                            <Percent className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{percentual}%</span>
                            <Edit className="h-3 w-3 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={maquina.status === 'Ativo' ? 'default' : 'secondary'}>
                          {maquina.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleOpenParcelamentoModal(maquina)}
                            title="Configurar Parcelamento"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(maquina)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(maquina.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {maquinas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma máquina cadastrada.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Parcelamento */}
      <Dialog open={showParcelamentoModal} onOpenChange={setShowParcelamentoModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Parcelamento - {maquinaParcelamento?.nome}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Configure as taxas de juros para cada opção de parcelamento desta máquina.
              </p>
              <Button onClick={() => setShowAddParcelamento(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Parcelamento
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Parcelas</TableHead>
                  <TableHead className="w-32">Taxa de Juros</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelamentos.map((p) => (
                  <TableRow key={p.parcelas}>
                    <TableCell className="font-medium">{p.parcelas}x</TableCell>
                    <TableCell>
                      {editingParcelamento?.parcelas === p.parcelas ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={editingParcelamento.taxa}
                            onChange={(e) => setEditingParcelamento({ 
                              ...editingParcelamento, 
                              taxa: parseFloat(e.target.value) || 0 
                            })}
                            className="w-20 h-8"
                            autoFocus
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <Button size="sm" variant="ghost" onClick={handleUpdateParcelamento}>
                            ✓
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingParcelamento(null)}>
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <span>{p.taxa.toFixed(2)}%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setEditingParcelamento({ ...p })}
                          disabled={editingParcelamento !== null}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDeleteParcelamento(p.parcelas)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {parcelamentos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum parcelamento configurado. Adicione pelo menos um.
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowParcelamentoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveParcelamentos}>
              Salvar Parcelamentos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Parcelamento */}
      <Dialog open={showAddParcelamento} onOpenChange={setShowAddParcelamento}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Parcelamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Parcelas *</Label>
              <Input
                type="number"
                min="1"
                max="36"
                value={novoParcelamento.parcelas}
                onChange={(e) => setNovoParcelamento({ ...novoParcelamento, parcelas: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Entre 1 e 36</p>
            </div>
            <div>
              <Label>Taxa de Juros *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={novoParcelamento.taxa}
                  onChange={(e) => setNovoParcelamento({ ...novoParcelamento, taxa: parseFloat(e.target.value) || 0 })}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Entre 0 e 100, até 2 casas decimais</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddParcelamento(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddParcelamento}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CadastrosLayout>
  );
}
