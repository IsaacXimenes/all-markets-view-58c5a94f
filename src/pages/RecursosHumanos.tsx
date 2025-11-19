import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { mockStores, mockEmployees, getBirthdaysThisWeek, getStoreById } from '@/utils/rhApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Building2, MapPin, Cake, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function RecursosHumanos() {
  const navigate = useNavigate();
  const birthdays = getBirthdaysThisWeek();
  
  const getDaysUntilBirthday = (birthday: Date) => {
    const today = new Date();
    const thisYearBirthday = new Date(birthday);
    thisYearBirthday.setFullYear(today.getFullYear());
    
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = thisYearBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const getAge = (birthday: Date) => {
    const today = new Date();
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
    <PageLayout title="Recursos Humanos">
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
              {mockStores.map((store) => (
                <AccordionItem key={store.id} value={store.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="font-semibold">{store.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {store.address}, {store.city}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Funcionários</p>
                          <p className="font-semibold">{store.totalEmployees}</p>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 pl-8">
                      <Button 
                        onClick={() => navigate(`/rh/loja/${store.id}`)}
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
                    <TableHead>Produto Mais Vendido</TableHead>
                    <TableHead className="text-right">Comissão do Mês</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockEmployees.map((employee) => {
                    const store = getStoreById(employee.storeId);
                    return (
                      <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{store?.name.replace('Thiago Imports - ', '')}</TableCell>
                        <TableCell>{employee.name}</TableCell>
                        <TableCell className="text-muted-foreground">{employee.cpf}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{employee.topProduct}</TableCell>
                        <TableCell className="text-right font-medium text-success">
                          R$ {employee.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                {birthdays.map((employee) => {
                  const store = getStoreById(employee.storeId);
                  const daysUntil = getDaysUntilBirthday(employee.birthday);
                  const age = getAge(employee.birthday);
                  
                  return (
                    <Card key={employee.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <CardContent className="p-6 text-center">
                        <Avatar className="h-20 w-20 mx-auto mb-4">
                          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                            {getInitials(employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-lg mb-1">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground mb-1">{employee.position}</p>
                        <p className="text-xs text-muted-foreground mb-3">{store?.name.replace('Thiago Imports - ', '')}</p>
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
    </PageLayout>
  );
}
