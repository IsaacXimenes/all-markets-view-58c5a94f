import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { useCadastroStore } from '@/store/cadastroStore';
import { getCargos, getCargoNome } from '@/utils/cadastrosApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Download, Eye, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ColaboradorMockado } from '@/types/mockData';

export default function LojaRH() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Usar useCadastroStore como fonte única de verdade
  const { 
    obterLojaById, 
    obterColaboradoresPorLoja, 
    adicionarColaborador, 
    atualizarColaborador, 
    deletarColaborador 
  } = useCadastroStore();
  
  const loja = obterLojaById(id || '');
  const cargos = getCargos();
  
  // Obter colaboradores da loja usando o store
  const colaboradoresLoja = useMemo(() => {
    return obterColaboradoresPorLoja(id || '');
  }, [id, obterColaboradoresPorLoja]);
  
  const [employees, setEmployees] = useState<ColaboradorMockado[]>(colaboradoresLoja);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ColaboradorMockado | null>(null);
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    cargo: '',
    salario: '',
    dataAdmissao: '',
    dataNascimento: '',
    email: '',
    telefone: ''
  });

  // Atualizar lista quando colaboradores mudam
  React.useEffect(() => {
    setEmployees(colaboradoresLoja);
  }, [colaboradoresLoja]);

  if (!loja) {
    return (
      <PageLayout title="Loja não encontrada">
        <div className="text-center">
          <p>Loja não encontrada</p>
          <Button onClick={() => navigate('/rh')} className="mt-4">
            Voltar para RH
          </Button>
        </div>
      </PageLayout>
    );
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.substring(0, 2);
  };

  const resetForm = () => {
    setForm({
      nome: '',
      cpf: '',
      cargo: '',
      salario: '',
      dataAdmissao: '',
      dataNascimento: '',
      email: '',
      telefone: ''
    });
    setEditingEmployee(null);
  };

  const handleOpenDialog = (employee?: ColaboradorMockado) => {
    if (employee) {
      setEditingEmployee(employee);
      setForm({
        nome: employee.nome,
        cpf: employee.cpf,
        cargo: employee.cargo,
        salario: employee.salario_fixo?.toString() || '',
        dataAdmissao: employee.data_admissao,
        dataNascimento: '',
        email: employee.email,
        telefone: employee.telefone
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'CPF', 'Cargo', 'Data Admissão', 'Salário'];
    const rows = employees.map(emp => [
      emp.nome,
      emp.cpf,
      emp.cargo,
      new Date(emp.data_admissao).toLocaleDateString('pt-BR'),
      emp.salario_fixo ? `R$ ${emp.salario_fixo.toFixed(2)}` : '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `funcionarios_${loja.nome.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Tabela exportada com sucesso!');
  };

  const handleSaveEmployee = () => {
    if (!form.nome || !form.cpf || !form.cargo) {
      toast.error('Nome, CPF e Cargo são obrigatórios');
      return;
    }

    const employeeData = {
      nome: form.nome,
      cpf: form.cpf,
      cargo: form.cargo,
      loja_id: id!,
      data_admissao: form.dataAdmissao || new Date().toISOString().split('T')[0],
      email: form.email,
      telefone: form.telefone,
      salario_fixo: form.salario ? parseFloat(form.salario) : 0,
      ajuda_custo: 0,
      comissao: 0,
      eh_gestor: form.cargo.toLowerCase().includes('gestor'),
      eh_vendedor: form.cargo.toLowerCase().includes('vendedor'),
      eh_estoquista: form.cargo.toLowerCase().includes('estoquista'),
      ativo: true
    };

    if (editingEmployee) {
      atualizarColaborador(editingEmployee.id, employeeData);
      toast.success('Funcionário atualizado com sucesso!');
    } else {
      adicionarColaborador(employeeData);
      toast.success('Funcionário adicionado com sucesso!');
    }

    // Atualizar lista local
    setEmployees(obterColaboradoresPorLoja(id!));
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDeleteEmployee = (empId: string) => {
    deletarColaborador(empId);
    setEmployees(obterColaboradoresPorLoja(id!));
    toast.success('Funcionário removido com sucesso!');
  };

  return (
    <PageLayout title={loja.nome}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/rh')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para RH
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4" />
                  Novo Funcionário
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input 
                      id="name" 
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="João Silva" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input 
                      id="cpf" 
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                      placeholder="000.000.000-00" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="position">Cargo *</Label>
                    <Select value={form.cargo} onValueChange={(v) => setForm({ ...form, cargo: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {cargos.map(cargo => (
                          <SelectItem key={cargo.id} value={cargo.funcao}>{cargo.funcao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="salary">Salário Base (R$)</Label>
                    <Input 
                      id="salary" 
                      type="number" 
                      value={form.salario}
                      onChange={(e) => setForm({ ...form, salario: e.target.value })}
                      placeholder="2500.00" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="admission">Data de Admissão</Label>
                    <Input 
                      id="admission" 
                      type="date" 
                      value={form.dataAdmissao}
                      onChange={(e) => setForm({ ...form, dataAdmissao: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="birthday">Data de Nascimento</Label>
                    <Input 
                      id="birthday" 
                      type="date" 
                      value={form.dataNascimento}
                      onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveEmployee}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Funcionários de {loja.nome}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Data Admissão</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Avatar>
                          <AvatarFallback>{getInitials(employee.nome)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{employee.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{employee.cpf}</TableCell>
                      <TableCell>{employee.cargo}</TableCell>
                      <TableCell>{new Date(employee.data_admissao).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-medium">
                        {employee.salario_fixo ? `R$ ${employee.salario_fixo.toLocaleString('pt-BR')}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/rh/funcionario/${employee.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleOpenDialog(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
