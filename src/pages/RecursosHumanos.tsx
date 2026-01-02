import React from 'react';
import { RHLayout } from '@/components/layout/RHLayout';
import { getLojas, getColaboradores, getAniversariantesDaSemana, getLojaById, getCargoNome, getContagemColaboradoresPorLoja } from '@/utils/cadastrosApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Building2, MapPin, Cake, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function RecursosHumanos() {
  const navigate = useNavigate();
  const lojas = getLojas().filter(l => l.status === 'Ativo');
  const colaboradores = getColaboradores().filter(c => c.status === 'Ativo');
  const birthdays = getAniversariantesDaSemana();
  const contagemPorLoja = getContagemColaboradoresPorLoja();
  
  const getDaysUntilBirthday = (dataNascimento: string) => {
    const today = new Date();
    const birthday = new Date(dataNascimento);
    birthday.setFullYear(today.getFullYear());
    
    if (birthday < today) {
      birthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = birthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const getAge = (dataNascimento: string) => {
    const today = new Date();
    const birthday = new Date(dataNascimento);
    let age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    return age;
  };
  
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.substring(0, 2);
  };
  
  return (
    <RHLayout title="Recursos Humanos">
      <div className="space-y-6">
        {/* Lojas em Cards Expansíveis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Lojas da Rede
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {lojas.map((loja) => (
                <AccordionItem key={loja.id} value={loja.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="font-semibold">{loja.nome}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {loja.endereco}, {loja.cidade}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Funcionários</p>
                          <p className="font-semibold">{contagemPorLoja[loja.id] || 0}</p>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 pl-8">
                      <Button 
                        onClick={() => navigate(`/rh/loja/${loja.id}`)}
                        className="gap-2"
                      >
                        Ver Quadro Completo
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Tabela Geral de Funcionários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Todos os Funcionários da Rede
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaboradores.map((colaborador) => {
                    const loja = getLojaById(colaborador.loja);
                    return (
                      <TableRow key={colaborador.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{loja?.nome || '-'}</TableCell>
                        <TableCell>{colaborador.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{colaborador.cpf}</TableCell>
                        <TableCell>{getCargoNome(colaborador.cargo)}</TableCell>
                        <TableCell>{new Date(colaborador.dataAdmissao).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-medium">
                          {colaborador.salario ? `R$ ${colaborador.salario.toLocaleString('pt-BR')}` : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Aniversariantes do Dia/Semana */}
        {birthdays.length > 0 && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-primary" />
                Aniversariantes da Semana 🎉
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {birthdays.map((colaborador) => {
                  const loja = getLojaById(colaborador.loja);
                  const daysUntil = getDaysUntilBirthday(colaborador.dataNascimento!);
                  const age = getAge(colaborador.dataNascimento!);
                  
                  return (
                    <Card key={colaborador.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <CardContent className="p-6 text-center">
                        <Avatar className="h-20 w-20 mx-auto mb-4">
                          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                            {getInitials(colaborador.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-lg mb-1">{colaborador.nome}</h3>
                        <p className="text-sm text-muted-foreground mb-1">{getCargoNome(colaborador.cargo)}</p>
                        <p className="text-xs text-muted-foreground mb-3">{loja?.nome || '-'}</p>
                        <div className="bg-primary/10 rounded-lg p-3">
                          <p className="text-2xl font-bold text-primary">{age + 1} anos</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {daysUntil === 0 ? '🎉 Hoje!' : `Faltam ${daysUntil} ${daysUntil === 1 ? 'dia' : 'dias'}!`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RHLayout>
  );
}
