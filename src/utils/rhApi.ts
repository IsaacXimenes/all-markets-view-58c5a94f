import { useState, useEffect } from 'react';

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  photo?: string;
  position: string;
  storeId: string;
  admissionDate: Date;
  salary: number;
  commission: number;
  topProduct: string;
  birthday: Date;
  sales: number;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  totalEmployees: number;
}

export interface SalesHistory {
  month: string;
  sales: number;
  salary: number;
  commission: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

const stores: Store[] = [
  {
    id: 'loja1',
    name: 'Thiago Imports - Centro',
    address: 'Rua das Flores, 123',
    city: 'São Paulo',
    totalEmployees: 8
  },
  {
    id: 'loja2',
    name: 'Thiago Imports - Shopping Paulista',
    address: 'Av. Paulista, 1000',
    city: 'São Paulo',
    totalEmployees: 12
  },
  {
    id: 'loja3',
    name: 'Thiago Imports - Jardins',
    address: 'Rua Oscar Freire, 456',
    city: 'São Paulo',
    totalEmployees: 7
  },
  {
    id: 'loja4',
    name: 'Thiago Imports - Vila Olímpia',
    address: 'Av. Brigadeiro Faria Lima, 789',
    city: 'São Paulo',
    totalEmployees: 9
  },
  {
    id: 'loja5',
    name: 'Thiago Imports - Moema',
    address: 'Av. Ibirapuera, 321',
    city: 'São Paulo',
    totalEmployees: 6
  },
  {
    id: 'loja6',
    name: 'Thiago Imports - Pinheiros',
    address: 'Rua dos Pinheiros, 654',
    city: 'São Paulo',
    totalEmployees: 8
  }
];

const firstNames = ['João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Juliana', 'Carlos', 'Fernanda', 'Rafael', 'Beatriz', 
  'Felipe', 'Camila', 'Bruno', 'Larissa', 'Diego', 'Natália', 'Thiago', 'Amanda', 'Guilherme', 'Bianca',
  'Rodrigo', 'Carla', 'Marcelo', 'Patrícia', 'André', 'Renata', 'Paulo', 'Tatiana', 'Vinicius', 'Gabriela'];

const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Ferreira', 'Rodrigues', 'Almeida', 'Lima',
  'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro', 'Alves', 'Monteiro', 'Mendes', 'Barbosa', 'Pinto'];

const positions = ['Vendedor', 'Gerente', 'Supervisor', 'Técnico', 'Assistente'];

const topProducts = [
  'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'AirPods Pro 2ª Geração',
  'Capinha Silicone iPhone 15', 'Capinha Leather iPhone 15 Pro', 'Carregador MagSafe',
  'Samsung Galaxy S24', 'Xiaomi Redmi Note 13', 'JBL Flip 6', 'Apple Watch Series 9'
];

const generateCPF = () => {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
};

const generateBirthday = () => {
  const today = new Date();
  const year = today.getFullYear() - Math.floor(Math.random() * 30 + 22);
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28 + 1);
  return new Date(year, month, day);
};

const generateAdmissionDate = () => {
  const today = new Date();
  const yearsAgo = Math.floor(Math.random() * 5);
  const monthsAgo = Math.floor(Math.random() * 12);
  const date = new Date(today);
  date.setFullYear(date.getFullYear() - yearsAgo);
  date.setMonth(date.getMonth() - monthsAgo);
  return date;
};

const generateEmployees = (): Employee[] => {
  const employees: Employee[] = [];
  let employeeId = 1;
  
  stores.forEach(store => {
    for (let i = 0; i < store.totalEmployees; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const position = i === 0 ? 'Gerente' : positions[Math.floor(Math.random() * positions.length)];
      const baseSalary = position === 'Gerente' ? 5000 : position === 'Supervisor' ? 3500 : 2500;
      const sales = Math.floor(Math.random() * 150000) + 20000;
      const commission = sales * 0.02;
      
      employees.push({
        id: `emp${employeeId++}`,
        name: `${firstName} ${lastName}`,
        cpf: generateCPF(),
        position,
        storeId: store.id,
        admissionDate: generateAdmissionDate(),
        salary: baseSalary,
        commission: commission,
        topProduct: topProducts[Math.floor(Math.random() * topProducts.length)],
        birthday: generateBirthday(),
        sales: sales
      });
    }
  });
  
  return employees;
};

export const mockEmployees = generateEmployees();
export const mockStores = stores;

export const getStoreById = (id: string): Store | undefined => {
  return mockStores.find(store => store.id === id);
};

export const getEmployeesByStore = (storeId: string): Employee[] => {
  return mockEmployees.filter(emp => emp.storeId === storeId);
};

export const getEmployeeById = (id: string): Employee | undefined => {
  return mockEmployees.find(emp => emp.id === id);
};

export const getBirthdaysThisWeek = (): Employee[] => {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  return mockEmployees.filter(emp => {
    const birthday = new Date(emp.birthday);
    birthday.setFullYear(today.getFullYear());
    return birthday >= today && birthday <= nextWeek;
  }).sort((a, b) => {
    const dateA = new Date(a.birthday);
    const dateB = new Date(b.birthday);
    dateA.setFullYear(today.getFullYear());
    dateB.setFullYear(today.getFullYear());
    return dateA.getTime() - dateB.getTime();
  });
};

export const getTopSellers = (limit: number = 10): Employee[] => {
  return [...mockEmployees]
    .filter(emp => emp.position === 'Vendedor')
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
};

export const generateSalesHistory = (employeeId: string, months: number = 12): SalesHistory[] => {
  const employee = getEmployeeById(employeeId);
  if (!employee) return [];
  
  const history: SalesHistory[] = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const baseSales = employee.sales / 12;
    const variation = (Math.random() - 0.5) * 0.4;
    const sales = baseSales * (1 + variation);
    const commission = sales * 0.02;
    
    history.push({
      month: monthNames[date.getMonth()],
      sales: Math.round(sales),
      salary: employee.salary,
      commission: Math.round(commission)
    });
  }
  
  return history;
};

export const generateTopProducts = (employeeId: string): TopProduct[] => {
  const products: TopProduct[] = [
    { name: 'iPhone 15 Pro Max', quantity: Math.floor(Math.random() * 20) + 10, revenue: 0 },
    { name: 'iPhone 15 Pro', quantity: Math.floor(Math.random() * 25) + 8, revenue: 0 },
    { name: 'iPhone 15', quantity: Math.floor(Math.random() * 30) + 12, revenue: 0 },
    { name: 'AirPods Pro 2ª Geração', quantity: Math.floor(Math.random() * 40) + 15, revenue: 0 },
    { name: 'Apple Watch Series 9', quantity: Math.floor(Math.random() * 15) + 5, revenue: 0 }
  ];
  
  products.forEach(product => {
    const avgPrice = product.name.includes('iPhone 15 Pro Max') ? 7999 :
                     product.name.includes('iPhone 15 Pro') ? 6999 :
                     product.name.includes('iPhone 15') ? 5499 :
                     product.name.includes('AirPods') ? 1899 : 2999;
    product.revenue = product.quantity * avgPrice;
  });
  
  return products.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
};

export const useEmployeeData = (initialEmployees: Employee[]) => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setEmployees(currentEmployees => 
        currentEmployees.map(emp => ({
          ...emp,
          sales: Math.max(0, emp.sales + Math.floor(Math.random() * 5000 - 2000)),
          commission: emp.sales * 0.02
        }))
      );
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  return employees;
};
