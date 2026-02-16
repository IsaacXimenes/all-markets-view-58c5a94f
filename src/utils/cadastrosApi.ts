// Cadastros API - Mock Data

export interface Loja {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  cep: string;
  cidade: string;
  estado: string;
  responsavel: string;
  horarioFuncionamento: string;
  status: 'Ativo' | 'Inativo';
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  dataNascimento: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  status: 'Ativo' | 'Inativo';
  origemCliente: 'Assistência' | 'Venda';
  idsCompras: string[];
  tipoCliente: 'Novo' | 'Normal' | 'VIP';
  tipoPessoa: 'Pessoa Física' | 'Pessoa Jurídica';
}

// Helper para calcular tipo de pessoa baseado no CPF/CNPJ
export const calcularTipoPessoa = (cpfCnpj: string): 'Pessoa Física' | 'Pessoa Jurídica' => {
  const numeros = cpfCnpj.replace(/\D/g, '');
  return numeros.length <= 11 ? 'Pessoa Física' : 'Pessoa Jurídica';
};

export interface Colaborador {
  id: string;
  cpf: string;
  nome: string;
  cargo: string;
  loja: string;
  dataAdmissao: string;
  dataInativacao?: string;
  dataNascimento?: string;
  email: string;
  telefone: string;
  modeloPagamento: string;
  salario?: number;
  foto?: string;
  status: 'Ativo' | 'Inativo';
}

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  responsavel: string;
  telefone: string;
  status: 'Ativo' | 'Inativo';
  ultimaCompra?: string;
}

export interface OrigemVenda {
  id: string;
  origem: string;
  status: 'Ativo' | 'Inativo';
}

export interface ProdutoCadastro {
  id: string;
  marca: string;
  categoria: string;
  produto: string;
}

export interface TipoDesconto {
  id: string;
  nome: string;
  desconto: number;
  descricao: string;
}

export interface Cargo {
  id: string;
  funcao: string;
  permissoes: string[];
}

export interface ModeloPagamento {
  id: string;
  modelo: string;
}

export interface ContaFinanceira {
  id: string;
  nome: string;
  tipo: string;
  lojaVinculada: string;
  banco: string;
  agencia: string;
  conta: string;
  cnpj: string;
  saldoInicial: number;
  saldoAtual: number;
  status: 'Ativo' | 'Inativo';
  ultimoMovimento?: string;
  statusMaquina: 'Terceirizada' | 'Própria';
  notaFiscal: boolean;
}

export interface MaquinaCartao {
  id: string;
  nome: string;
  cnpjVinculado: string; // ID da loja
  contaOrigem: string;   // ID da conta financeira
  status: 'Ativo' | 'Inativo';
  percentualMaquina?: number; // % da Máquina (0-100)
  taxas: {
    credito: { [parcela: number]: number }; // Ex: { 1: 2, 2: 4, 3: 6, ... }
    debito: number; // Taxa fixa
  };
  parcelamentos?: { parcelas: number; taxa: number }[]; // Parcelamento 1x-36x com taxas
}

// Helper para calcular tipo de cliente
const calcularTipoCliente = (idsCompras: string[]): 'Novo' | 'Normal' | 'VIP' => {
  const numCompras = idsCompras.length;
  if (numCompras === 0) return 'Novo';
  if (numCompras === 1) return 'Normal';
  return 'VIP';
};

// Mock Data
// Loja Online - Digital (não pode ser deletada ou editada)
const LOJA_ONLINE: Loja = { 
  id: 'LOJA-ONLINE', 
  nome: 'Online - Digital', 
  cnpj: '00.000.000/0000-00', 
  endereco: 'Vendas Online', 
  telefone: '', 
  cep: '', 
  cidade: 'Online', 
  estado: 'BR', 
  responsavel: '', 
  horarioFuncionamento: '24h', 
  status: 'Ativo' 
};

let lojas: Loja[] = [
  LOJA_ONLINE, // Loja online sempre primeira
  { id: 'LOJA-001', nome: 'Thiago Imports Centro', cnpj: '12.345.678/0001-01', endereco: 'Rua das Flores, 123', telefone: '(11) 3456-7890', cep: '01310-100', cidade: 'São Paulo', estado: 'SP', responsavel: 'COL-001', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
  { id: 'LOJA-002', nome: 'Thiago Imports Norte', cnpj: '12.345.678/0002-02', endereco: 'Av. Norte, 456', telefone: '(11) 3456-7891', cep: '02020-000', cidade: 'São Paulo', estado: 'SP', responsavel: 'COL-002', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
  { id: 'LOJA-003', nome: 'Thiago Imports Sul', cnpj: '12.345.678/0003-03', endereco: 'Rua Sul, 789', telefone: '(11) 3456-7892', cep: '04040-000', cidade: 'São Paulo', estado: 'SP', responsavel: 'COL-003', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
  { id: 'LOJA-004', nome: 'Thiago Imports Shopping', cnpj: '12.345.678/0004-04', endereco: 'Shopping Center, Loja 10', telefone: '(11) 3456-7893', cep: '05050-000', cidade: 'São Paulo', estado: 'SP', responsavel: 'COL-004', horarioFuncionamento: '10:00 - 22:00', status: 'Ativo' },
  { id: 'LOJA-005', nome: 'Thiago Imports Oeste', cnpj: '12.345.678/0005-05', endereco: 'Av. Oeste, 321', telefone: '(11) 3456-7894', cep: '06060-000', cidade: 'São Paulo', estado: 'SP', responsavel: 'COL-005', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
  { id: 'LOJA-006', nome: 'Thiago Imports Leste', cnpj: '12.345.678/0006-06', endereco: 'Rua Leste, 654', telefone: '(11) 3456-7895', cep: '07070-000', cidade: 'São Paulo', estado: 'SP', responsavel: 'COL-006', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
  { id: 'LOJA-007', nome: 'Thiago Imports Guarulhos', cnpj: '12.345.678/0007-07', endereco: 'Av. Guarulhos, 987', telefone: '(11) 3456-7896', cep: '07190-000', cidade: 'Guarulhos', estado: 'SP', responsavel: 'COL-001', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
  { id: 'LOJA-008', nome: 'Thiago Imports Osasco', cnpj: '12.345.678/0008-08', endereco: 'Rua Osasco, 159', telefone: '(11) 3456-7897', cep: '06010-000', cidade: 'Osasco', estado: 'SP', responsavel: 'COL-002', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
  { id: 'LOJA-009', nome: 'Thiago Imports ABC', cnpj: '12.345.678/0009-09', endereco: 'Av. ABC, 753', telefone: '(11) 3456-7898', cep: '09010-000', cidade: 'Santo André', estado: 'SP', responsavel: 'COL-003', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
  { id: 'LOJA-010', nome: 'Thiago Imports Campinas', cnpj: '12.345.678/0010-10', endereco: 'Rua Campinas, 852', telefone: '(19) 3456-7899', cep: '13010-000', cidade: 'Campinas', estado: 'SP', responsavel: 'COL-004', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
  { id: 'LOJA-011', nome: 'Thiago Imports Ribeirão', cnpj: '12.345.678/0011-11', endereco: 'Av. Ribeirão, 741', telefone: '(16) 3456-7800', cep: '14010-000', cidade: 'Ribeirão Preto', estado: 'SP', responsavel: 'COL-005', horarioFuncionamento: '09:00 - 18:00', status: 'Ativo' },
];

let clientes: Cliente[] = [
  { id: 'CLI-001', nome: 'João Silva', cpf: '123.456.789-00', telefone: '(11) 99999-1111', dataNascimento: '1985-05-15', email: 'joao@email.com', cep: '01310-100', endereco: 'Rua das Flores', numero: '123', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP', status: 'Ativo', origemCliente: 'Venda', idsCompras: ['VEN-2025-0001', 'VEN-2025-0005', 'VEN-2025-0008'], tipoCliente: 'VIP', tipoPessoa: 'Pessoa Física' },
  { id: 'CLI-002', nome: 'Maria Santos', cpf: '234.567.890-11', telefone: '(11) 99999-2222', dataNascimento: '1990-08-20', email: 'maria@email.com', cep: '02020-000', endereco: 'Av. Norte', numero: '456', bairro: 'Santana', cidade: 'São Paulo', estado: 'SP', status: 'Ativo', origemCliente: 'Venda', idsCompras: ['VEN-2025-0002'], tipoCliente: 'Normal', tipoPessoa: 'Pessoa Física' },
  { id: 'CLI-003', nome: 'Pedro Oliveira', cpf: '345.678.901-22', telefone: '(11) 99999-3333', dataNascimento: '1988-12-10', email: 'pedro@email.com', cep: '04040-000', endereco: 'Rua Sul', numero: '789', bairro: 'Moema', cidade: 'São Paulo', estado: 'SP', status: 'Ativo', origemCliente: 'Assistência', idsCompras: [], tipoCliente: 'Novo', tipoPessoa: 'Pessoa Física' },
  { id: 'CLI-004', nome: 'Ana Costa', cpf: '456.789.012-33', telefone: '(11) 99999-4444', dataNascimento: '1995-03-25', email: 'ana@email.com', cep: '05050-000', endereco: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', status: 'Ativo', origemCliente: 'Venda', idsCompras: ['VEN-2025-0003', 'VEN-2025-0006'], tipoCliente: 'VIP', tipoPessoa: 'Pessoa Física' },
  { id: 'CLI-005', nome: 'Carlos Ferreira', cpf: '567.890.123-44', telefone: '(11) 99999-5555', dataNascimento: '1982-07-30', email: 'carlos@email.com', cep: '06060-000', endereco: 'Rua Augusta', numero: '500', bairro: 'Consolação', cidade: 'São Paulo', estado: 'SP', status: 'Inativo', origemCliente: 'Venda', idsCompras: ['VEN-2025-0004'], tipoCliente: 'Normal', tipoPessoa: 'Pessoa Física' },
  { id: 'CLI-006', nome: 'Tech Solutions Ltda', cpf: '12.345.678/0001-99', telefone: '(11) 3333-4444', dataNascimento: '', email: 'contato@techsolutions.com.br', cep: '01310-200', endereco: 'Av. Brigadeiro Faria Lima', numero: '2000', bairro: 'Jardim Paulistano', cidade: 'São Paulo', estado: 'SP', status: 'Ativo', origemCliente: 'Venda', idsCompras: ['VEN-2025-0007'], tipoCliente: 'Normal', tipoPessoa: 'Pessoa Jurídica' },
];

let colaboradores: Colaborador[] = [
  { id: 'COL-001', cpf: '111.222.333-44', nome: 'Lucas Mendes', cargo: 'CARGO-001', loja: 'LOJA-001', dataAdmissao: '2020-01-15', dataNascimento: '1988-01-10', email: 'lucas@thiagoimports.com', telefone: '(11) 98888-1111', modeloPagamento: 'MP-002', salario: 5000, status: 'Ativo' },
  { id: 'COL-002', cpf: '222.333.444-55', nome: 'Fernanda Lima', cargo: 'CARGO-002', loja: 'LOJA-002', dataAdmissao: '2019-06-20', dataNascimento: '1990-06-15', email: 'fernanda@thiagoimports.com', telefone: '(11) 98888-2222', modeloPagamento: 'MP-001', salario: 4500, status: 'Ativo' },
  { id: 'COL-003', cpf: '333.444.555-66', nome: 'Roberto Alves', cargo: 'CARGO-003', loja: 'LOJA-003', dataAdmissao: '2021-03-10', dataNascimento: '1985-03-22', email: 'roberto@thiagoimports.com', telefone: '(11) 98888-3333', modeloPagamento: 'MP-002', salario: 4200, status: 'Ativo' },
  { id: 'COL-004', cpf: '444.555.666-77', nome: 'Juliana Costa', cargo: 'CARGO-004', loja: 'LOJA-004', dataAdmissao: '2022-09-05', dataNascimento: '1995-09-30', email: 'juliana@thiagoimports.com', telefone: '(11) 98888-4444', modeloPagamento: 'MP-003', salario: 2500, status: 'Ativo' },
  { id: 'COL-005', cpf: '555.666.777-88', nome: 'Marcos Silva', cargo: 'CARGO-005', loja: 'LOJA-005', dataAdmissao: '2018-11-25', dataNascimento: '1992-11-18', email: 'marcos@thiagoimports.com', telefone: '(11) 98888-5555', modeloPagamento: 'MP-001', salario: 3200, status: 'Ativo' },
  { id: 'COL-006', cpf: '666.777.888-99', nome: 'Patricia Souza', cargo: 'CARGO-006', loja: 'LOJA-001', dataAdmissao: '2023-02-14', dataNascimento: '1998-02-05', email: 'patricia@thiagoimports.com', telefone: '(11) 98888-6666', modeloPagamento: 'MP-002', salario: 2200, status: 'Ativo' },
  { id: 'COL-007', cpf: '777.888.999-00', nome: 'Carlos Eduardo', cargo: 'CARGO-004', loja: 'LOJA-002', dataAdmissao: '2021-07-10', dataNascimento: '1993-07-12', email: 'carlos@thiagoimports.com', telefone: '(11) 98888-7777', modeloPagamento: 'MP-003', salario: 2500, status: 'Ativo' },
  { id: 'COL-008', cpf: '888.999.000-11', nome: 'Amanda Santos', cargo: 'CARGO-004', loja: 'LOJA-003', dataAdmissao: '2022-01-20', dataNascimento: '1996-01-25', email: 'amanda@thiagoimports.com', telefone: '(11) 98888-8888', modeloPagamento: 'MP-003', salario: 2500, status: 'Ativo' },
  { id: 'COL-009', cpf: '999.000.111-22', nome: 'Ricardo Oliveira', cargo: 'CARGO-005', loja: 'LOJA-004', dataAdmissao: '2020-05-15', dataNascimento: '1987-05-08', email: 'ricardo@thiagoimports.com', telefone: '(11) 98888-9999', modeloPagamento: 'MP-002', salario: 3200, status: 'Ativo' },
  { id: 'COL-010', cpf: '000.111.222-33', nome: 'Bianca Ferreira', cargo: 'CARGO-006', loja: 'LOJA-005', dataAdmissao: '2023-04-01', dataNascimento: '1999-04-20', email: 'bianca@thiagoimports.com', telefone: '(11) 98889-0000', modeloPagamento: 'MP-001', salario: 2200, status: 'Ativo' },
  { id: 'COL-011', cpf: '111.000.222-33', nome: 'Diego Martins', cargo: 'CARGO-008', loja: 'LOJA-006', dataAdmissao: '2019-09-10', dataNascimento: '1991-12-03', email: 'diego@thiagoimports.com', telefone: '(11) 98889-1111', modeloPagamento: 'MP-002', salario: 3800, status: 'Ativo' },
  { id: 'COL-012', cpf: '222.111.333-44', nome: 'Camila Rocha', cargo: 'CARGO-004', loja: 'LOJA-006', dataAdmissao: '2022-06-15', dataNascimento: '1994-08-14', email: 'camila@thiagoimports.com', telefone: '(11) 98889-2222', modeloPagamento: 'MP-003', salario: 2500, status: 'Ativo' },
  { id: 'COL-013', cpf: '333.222.444-55', nome: 'Felipe Nunes', cargo: 'CARGO-004', loja: 'LOJA-007', dataAdmissao: '2021-11-08', dataNascimento: '1997-10-28', email: 'felipe@thiagoimports.com', telefone: '(11) 98889-3333', modeloPagamento: 'MP-003', salario: 2500, status: 'Ativo' },
  { id: 'COL-014', cpf: '444.333.555-66', nome: 'Larissa Gomes', cargo: 'CARGO-008', loja: 'LOJA-008', dataAdmissao: '2020-03-20', dataNascimento: '1989-04-11', email: 'larissa@thiagoimports.com', telefone: '(11) 98889-4444', modeloPagamento: 'MP-002', salario: 3800, status: 'Ativo' },
  { id: 'COL-015', cpf: '555.444.666-77', nome: 'Bruno Pereira', cargo: 'CARGO-004', loja: 'LOJA-008', dataAdmissao: '2023-01-10', dataNascimento: '1996-06-22', email: 'bruno@thiagoimports.com', telefone: '(11) 98889-5555', modeloPagamento: 'MP-003', salario: 2500, status: 'Ativo' },
  { id: 'COL-016', cpf: '666.555.777-88', nome: 'Natália Castro', cargo: 'CARGO-004', loja: 'LOJA-009', dataAdmissao: '2022-04-05', dataNascimento: '1995-03-18', email: 'natalia@thiagoimports.com', telefone: '(11) 98889-6666', modeloPagamento: 'MP-003', salario: 2500, status: 'Ativo' },
  { id: 'COL-017', cpf: '777.666.888-99', nome: 'Thiago Ribeiro', cargo: 'CARGO-005', loja: 'LOJA-009', dataAdmissao: '2021-08-12', dataNascimento: '1990-09-05', email: 'thiago.r@thiagoimports.com', telefone: '(11) 98889-7777', modeloPagamento: 'MP-002', salario: 3200, status: 'Ativo' },
  { id: 'COL-018', cpf: '888.777.999-00', nome: 'Gabriela Monteiro', cargo: 'CARGO-008', loja: 'LOJA-010', dataAdmissao: '2019-12-01', dataNascimento: '1988-11-30', email: 'gabriela@thiagoimports.com', telefone: '(11) 98889-8888', modeloPagamento: 'MP-002', salario: 3800, status: 'Ativo' },
  { id: 'COL-019', cpf: '999.888.000-11', nome: 'Vinícius Barbosa', cargo: 'CARGO-004', loja: 'LOJA-010', dataAdmissao: '2022-10-20', dataNascimento: '1997-02-14', email: 'vinicius@thiagoimports.com', telefone: '(11) 98889-9999', modeloPagamento: 'MP-003', salario: 2500, status: 'Ativo' },
  { id: 'COL-020', cpf: '000.999.111-22', nome: 'Carla Mendonça', cargo: 'CARGO-004', loja: 'LOJA-011', dataAdmissao: '2021-05-25', dataNascimento: '1994-07-08', email: 'carla@thiagoimports.com', telefone: '(11) 98880-0000', modeloPagamento: 'MP-003', salario: 2500, status: 'Ativo' },
  { id: 'COL-021', cpf: '111.999.222-33', nome: 'Rafael Cardoso', cargo: 'CARGO-005', loja: 'LOJA-011', dataAdmissao: '2020-08-10', dataNascimento: '1986-12-20', email: 'rafael@thiagoimports.com', telefone: '(11) 98880-1111', modeloPagamento: 'MP-002', salario: 3200, status: 'Ativo' },
  { id: 'COL-022', cpf: '222.999.333-44', nome: 'Beatriz Almeida', cargo: 'CARGO-007', loja: 'LOJA-001', dataAdmissao: '2022-02-28', dataNascimento: '1993-05-15', email: 'beatriz@thiagoimports.com', telefone: '(11) 98880-2222', modeloPagamento: 'MP-001', salario: 3500, status: 'Ativo' },
  { id: 'COL-023', cpf: '333.888.444-55', nome: 'João Silva Motoboy', cargo: 'CARGO-009', loja: 'LOJA-001', dataAdmissao: '2023-06-15', dataNascimento: '1992-03-10', email: 'joao.motoboy@thiagoimports.com', telefone: '(11) 97777-1111', modeloPagamento: 'MP-002', salario: 2000, status: 'Ativo' },
  { id: 'COL-024', cpf: '444.888.555-66', nome: 'Maria Santos Motoboy', cargo: 'CARGO-009', loja: 'LOJA-002', dataAdmissao: '2023-08-20', dataNascimento: '1995-08-25', email: 'maria.motoboy@thiagoimports.com', telefone: '(11) 97777-2222', modeloPagamento: 'MP-002', salario: 2000, status: 'Ativo' },
];

let fornecedores: Fornecedor[] = [
  { id: 'FORN-001', nome: 'Apple Brasil Distribuidora', cnpj: '11.111.111/0001-11', endereco: 'Av. Paulista, 1000, São Paulo - SP', responsavel: 'Carlos Distribuidor', telefone: '(11) 3000-1111', status: 'Ativo', ultimaCompra: '2025-01-15' },
  { id: 'FORN-002', nome: 'TechCell Importadora', cnpj: '22.222.222/0002-22', endereco: 'Rua Augusta, 500, São Paulo - SP', responsavel: 'Marina Tech', telefone: '(11) 3000-2222', status: 'Ativo', ultimaCompra: '2025-01-10' },
  { id: 'FORN-003', nome: 'MobileWorld LTDA', cnpj: '33.333.333/0003-33', endereco: 'Av. Brasil, 200, Rio de Janeiro - RJ', responsavel: 'Pedro Mobile', telefone: '(21) 3000-3333', status: 'Ativo', ultimaCompra: '2025-01-08' },
  { id: 'FORN-004', nome: 'SmartDevices Inc', cnpj: '44.444.444/0004-44', endereco: 'Rua das Tecnologias, 150, Campinas - SP', responsavel: 'Ana Smart', telefone: '(19) 3000-4444', status: 'Ativo', ultimaCompra: '2024-12-20' },
  { id: 'FORN-005', nome: 'Gadget Plus Comércio', cnpj: '55.555.555/0005-55', endereco: 'Av. Gadgets, 300, Curitiba - PR', responsavel: 'Roberto Gadget', telefone: '(41) 3000-5555', status: 'Ativo', ultimaCompra: '2025-01-12' },
  { id: 'FORN-006', nome: 'Digital Express', cnpj: '66.666.666/0006-66', endereco: 'Rua Digital, 400, Belo Horizonte - MG', responsavel: 'Fernanda Digital', telefone: '(31) 3000-6666', status: 'Ativo', ultimaCompra: '2024-11-30' },
  { id: 'FORN-007', nome: 'iStore Distribuição', cnpj: '77.777.777/0007-77', endereco: 'Av. Apple, 600, Brasília - DF', responsavel: 'Lucas iStore', telefone: '(61) 3000-7777', status: 'Ativo', ultimaCompra: '2025-01-05' },
  { id: 'FORN-008', nome: 'Premium Tech Brasil', cnpj: '88.888.888/0008-88', endereco: 'Rua Premium, 700, Porto Alegre - RS', responsavel: 'Juliana Premium', telefone: '(51) 3000-8888', status: 'Ativo', ultimaCompra: '2024-12-15' },
  { id: 'FORN-009', nome: 'Celular Center', cnpj: '99.999.999/0009-99', endereco: 'Av. Celular, 800, Salvador - BA', responsavel: 'Marcos Celular', telefone: '(71) 3000-9999', status: 'Ativo', ultimaCompra: '2025-01-18' },
  { id: 'FORN-010', nome: 'Eletronic World', cnpj: '10.101.010/0010-10', endereco: 'Rua Eletrônica, 900, Recife - PE', responsavel: 'Patricia Eletro', telefone: '(81) 3000-1010', status: 'Ativo', ultimaCompra: '2024-10-25' },
  { id: 'FORN-011', nome: 'Mobile Solutions', cnpj: '11.121.314/0011-11', endereco: 'Av. Mobile, 1100, Fortaleza - CE', responsavel: 'André Mobile', telefone: '(85) 3000-1111', status: 'Ativo', ultimaCompra: '2025-01-02' },
  { id: 'FORN-012', nome: 'Tech Import Brasil', cnpj: '12.131.415/0012-12', endereco: 'Rua Import, 1200, Manaus - AM', responsavel: 'Carla Import', telefone: '(92) 3000-1212', status: 'Ativo', ultimaCompra: '2024-09-18' },
  { id: 'FORN-013', nome: 'Apple Premium Partner', cnpj: '13.141.516/0013-13', endereco: 'Av. Premium, 1300, Goiânia - GO', responsavel: 'Ricardo Premium', telefone: '(62) 3000-1313', status: 'Ativo', ultimaCompra: '2025-01-20' },
  { id: 'FORN-014', nome: 'Smart Import LTDA', cnpj: '14.151.617/0014-14', endereco: 'Rua Smart, 1400, Florianópolis - SC', responsavel: 'Bianca Smart', telefone: '(48) 3000-1414', status: 'Ativo', ultimaCompra: '2024-12-28' },
  { id: 'FORN-015', nome: 'Device World', cnpj: '15.161.718/0015-15', endereco: 'Av. Device, 1500, Vitória - ES', responsavel: 'Thiago Device', telefone: '(27) 3000-1515', status: 'Ativo', ultimaCompra: '2024-11-10' },
  { id: 'FORN-016', nome: 'Gadgets Brasil', cnpj: '16.171.819/0016-16', endereco: 'Rua Gadgets, 1600, Natal - RN', responsavel: 'Amanda Gadget', telefone: '(84) 3000-1616', status: 'Ativo', ultimaCompra: '2025-01-08' },
  { id: 'FORN-017', nome: 'iWorld Distribuidora', cnpj: '17.181.920/0017-17', endereco: 'Av. iWorld, 1700, João Pessoa - PB', responsavel: 'Felipe iWorld', telefone: '(83) 3000-1717', status: 'Ativo', ultimaCompra: '2024-08-22' },
  { id: 'FORN-018', nome: 'Tech Store Brasil', cnpj: '18.192.021/0018-18', endereco: 'Rua Tech, 1800, Maceió - AL', responsavel: 'Vanessa Tech', telefone: '(82) 3000-1818', status: 'Inativo', ultimaCompra: '2024-05-15' },
  { id: 'FORN-019', nome: 'Mobile Express', cnpj: '19.202.122/0019-19', endereco: 'Av. Express, 1900, Aracaju - SE', responsavel: 'Gustavo Express', telefone: '(79) 3000-1919', status: 'Ativo', ultimaCompra: '2025-01-14' },
  { id: 'FORN-020', nome: 'Digital Import', cnpj: '20.212.223/0020-20', endereco: 'Rua Digital Import, 2000, Teresina - PI', responsavel: 'Larissa Digital', telefone: '(86) 3000-2020', status: 'Ativo', ultimaCompra: '2024-12-05' },
  { id: 'FORN-021', nome: 'Premium Devices', cnpj: '21.222.324/0021-21', endereco: 'Av. Premium Devices, 2100, São Luís - MA', responsavel: 'Bruno Premium', telefone: '(98) 3000-2121', status: 'Ativo', ultimaCompra: '2024-07-30' },
  { id: 'FORN-022', nome: 'Apple Zone', cnpj: '22.232.425/0022-22', endereco: 'Rua Apple Zone, 2200, Belém - PA', responsavel: 'Daniela Zone', telefone: '(91) 3000-2222', status: 'Ativo', ultimaCompra: '2025-01-16' },
  { id: 'FORN-023', nome: 'Tech Solutions Brasil', cnpj: '23.242.526/0023-23', endereco: 'Av. Solutions, 2300, Cuiabá - MT', responsavel: 'Eduardo Solutions', telefone: '(65) 3000-2323', status: 'Ativo', ultimaCompra: '2024-06-12' },
];

let origensVenda: OrigemVenda[] = [
  { id: 'ORIG-001', origem: 'Loja Física', status: 'Ativo' },
  { id: 'ORIG-002', origem: 'Online', status: 'Ativo' },
  { id: 'ORIG-003', origem: 'WhatsApp', status: 'Ativo' },
  { id: 'ORIG-004', origem: 'Indicação', status: 'Ativo' },
  { id: 'ORIG-005', origem: 'Mercado Livre', status: 'Ativo' },
  { id: 'ORIG-006', origem: 'Site Próprio', status: 'Ativo' },
];

let produtosCadastro: ProdutoCadastro[] = [
  { id: 'PROD-CAD-001', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 15 Pro Max' },
  { id: 'PROD-CAD-002', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 15 Pro' },
  { id: 'PROD-CAD-003', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 15 Plus' },
  { id: 'PROD-CAD-004', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 15' },
  { id: 'PROD-CAD-005', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 14 Pro Max' },
  { id: 'PROD-CAD-006', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 14 Pro' },
  { id: 'PROD-CAD-007', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 14 Plus' },
  { id: 'PROD-CAD-008', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 14' },
  { id: 'PROD-CAD-009', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 13 Pro Max' },
  { id: 'PROD-CAD-010', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 13 Pro' },
  { id: 'PROD-CAD-011', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 13' },
  { id: 'PROD-CAD-012', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 13 Mini' },
  { id: 'PROD-CAD-013', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 12 Pro Max' },
  { id: 'PROD-CAD-014', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 12 Pro' },
  { id: 'PROD-CAD-015', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 12' },
  { id: 'PROD-CAD-016', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 12 Mini' },
  { id: 'PROD-CAD-017', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone SE (3ª geração)' },
  { id: 'PROD-CAD-018', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 11 Pro Max' },
  { id: 'PROD-CAD-019', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 11 Pro' },
  { id: 'PROD-CAD-020', marca: 'Apple', categoria: 'iPhone', produto: 'iPhone 11' },
  { id: 'PROD-CAD-021', marca: 'Apple', categoria: 'iPad', produto: 'iPad Pro 12.9"' },
  { id: 'PROD-CAD-022', marca: 'Apple', categoria: 'iPad', produto: 'iPad Pro 11"' },
  { id: 'PROD-CAD-023', marca: 'Apple', categoria: 'iPad', produto: 'iPad Air' },
  { id: 'PROD-CAD-024', marca: 'Apple', categoria: 'iPad', produto: 'iPad Mini' },
  { id: 'PROD-CAD-025', marca: 'Apple', categoria: 'iPad', produto: 'iPad 10ª geração' },
  { id: 'PROD-CAD-026', marca: 'Apple', categoria: 'MacBook', produto: 'MacBook Pro 16"' },
  { id: 'PROD-CAD-027', marca: 'Apple', categoria: 'MacBook', produto: 'MacBook Pro 14"' },
  { id: 'PROD-CAD-028', marca: 'Apple', categoria: 'MacBook', produto: 'MacBook Air M2' },
  { id: 'PROD-CAD-029', marca: 'Apple', categoria: 'MacBook', produto: 'MacBook Air M1' },
  { id: 'PROD-CAD-030', marca: 'Apple', categoria: 'Watch', produto: 'Apple Watch Ultra 2' },
  { id: 'PROD-CAD-031', marca: 'Apple', categoria: 'Watch', produto: 'Apple Watch Series 9' },
  { id: 'PROD-CAD-032', marca: 'Apple', categoria: 'Watch', produto: 'Apple Watch SE' },
  { id: 'PROD-CAD-033', marca: 'Apple', categoria: 'AirPods', produto: 'AirPods Pro 2' },
  { id: 'PROD-CAD-034', marca: 'Apple', categoria: 'AirPods', produto: 'AirPods 3' },
  { id: 'PROD-CAD-035', marca: 'Apple', categoria: 'AirPods', produto: 'AirPods Max' },
  { id: 'PROD-CAD-036', marca: 'Apple', categoria: 'Acessórios', produto: 'MagSafe Charger' },
  { id: 'PROD-CAD-037', marca: 'Apple', categoria: 'Acessórios', produto: 'Apple Pencil 2' },
  { id: 'PROD-CAD-038', marca: 'Apple', categoria: 'Acessórios', produto: 'Magic Keyboard' },
  { id: 'PROD-CAD-039', marca: 'Apple', categoria: 'Acessórios', produto: 'Magic Mouse' },
  { id: 'PROD-CAD-040', marca: 'Apple', categoria: 'Acessórios', produto: 'Capa Silicone iPhone' },
];

let tiposDesconto: TipoDesconto[] = [
  { id: 'DESC-001', nome: 'Desconto Funcionário', desconto: 10, descricao: 'Desconto para funcionários da empresa' },
  { id: 'DESC-002', nome: 'Desconto Cliente VIP', desconto: 15, descricao: 'Desconto para clientes VIP' },
  { id: 'DESC-003', nome: 'Desconto Promocional', desconto: 5, descricao: 'Desconto em promoções especiais' },
  { id: 'DESC-004', nome: 'Desconto Black Friday', desconto: 20, descricao: 'Desconto Black Friday' },
];

let cargos: Cargo[] = [
  { id: 'CARGO-001', funcao: 'Gerente Geral', permissoes: ['Financeiro', 'Estoque', 'Vendas', 'Assistência', 'Cadastros', 'Relatórios', 'Admin'] },
  { id: 'CARGO-002', funcao: 'Gerente Financeiro', permissoes: ['Financeiro', 'Relatórios', 'Cadastros'] },
  { id: 'CARGO-003', funcao: 'Gerente de Estoque', permissoes: ['Estoque', 'Relatórios', 'Cadastros'] },
  { id: 'CARGO-004', funcao: 'Vendedor', permissoes: ['Vendas'] },
  { id: 'CARGO-005', funcao: 'Técnico Assistência', permissoes: ['Assistência', 'Estoque'] },
  { id: 'CARGO-006', funcao: 'Auxiliar Administrativo', permissoes: ['Cadastros'] },
  { id: 'CARGO-007', funcao: 'Analista Financeiro', permissoes: ['Financeiro', 'Relatórios'] },
  { id: 'CARGO-008', funcao: 'Supervisor de Loja', permissoes: ['Vendas', 'Estoque', 'Relatórios'] },
  { id: 'CARGO-009', funcao: 'Motoboy', permissoes: ['Entregas'] },
];

let modelosPagamento: ModeloPagamento[] = [
  { id: 'MP-001', modelo: 'Salário Fixo' },
  { id: 'MP-002', modelo: 'Fixo + Comissão' },
  { id: 'MP-003', modelo: 'Comissão 100%' },
];

let contasFinanceiras: ContaFinanceira[] = [
  // Loja - Matriz
  { id: 'CTA-001', nome: 'Santander (Unicred)', tipo: 'Conta Bancária', lojaVinculada: '3ac7e00c', banco: 'Santander', agencia: '', conta: '', cnpj: '53.295.194/0001-66', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Terceirizada', notaFiscal: false },
  { id: 'CTA-002', nome: 'Bradesco Thiago Eduardo', tipo: 'Conta Bancária', lojaVinculada: '3ac7e00c', banco: 'Bradesco', agencia: '', conta: '', cnpj: '53.295.194/0001-66', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Loja - Online
  { id: 'CTA-003', nome: 'Santander (Unicred)', tipo: 'Conta Bancária', lojaVinculada: 'fcc78c1a', banco: 'Santander', agencia: '', conta: '', cnpj: '46.197.533/0001-06', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Terceirizada', notaFiscal: false },
  { id: 'CTA-004', nome: 'Bradesco Thiago Imports', tipo: 'Conta Bancária', lojaVinculada: 'fcc78c1a', banco: 'Bradesco', agencia: '', conta: '', cnpj: '46.197.533/0001-06', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Loja - JK Shopping
  { id: 'CTA-005', nome: 'Santander (Santander JK)', tipo: 'Conta Bancária', lojaVinculada: 'db894e7d', banco: 'Santander', agencia: '', conta: '', cnpj: '62.968.637/0001-23', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Terceirizada', notaFiscal: false },
  { id: 'CTA-006', nome: 'Sicoob (Sicoob JK)', tipo: 'Conta Bancária', lojaVinculada: 'db894e7d', banco: 'Sicoob', agencia: '', conta: '', cnpj: '62.968.637/0001-23', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Loja - Águas Lindas Shopping
  { id: 'CTA-007', nome: 'Santander (Unicred TH Imports)', tipo: 'Conta Bancária', lojaVinculada: '0d06e7db', banco: 'Santander', agencia: '', conta: '', cnpj: '56.221.743/0001-46', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Terceirizada', notaFiscal: false },
  { id: 'CTA-008', nome: 'Pagbank (Pix Carol)', tipo: 'Conta Digital', lojaVinculada: '0d06e7db', banco: 'Pagbank', agencia: '', conta: '', cnpj: '56.221.743/0001-46', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Loja - Shopping Sul
  { id: 'CTA-009', nome: 'Santander (Bradesco Shopping Sul)', tipo: 'Conta Bancária', lojaVinculada: '5b9446d5', banco: 'Santander', agencia: '', conta: '', cnpj: '55.449.390/0001-73', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Terceirizada', notaFiscal: false },
  { id: 'CTA-010', nome: 'Bradesco Acessórios', tipo: 'Conta Bancária', lojaVinculada: '5b9446d5', banco: 'Bradesco', agencia: '', conta: '', cnpj: '55.449.390/0001-73', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Assistência - SIA
  { id: 'CTA-011', nome: 'Bradesco Assistência', tipo: 'Conta Bancária', lojaVinculada: '3cfbf69f', banco: 'Bradesco', agencia: '', conta: '', cnpj: '54.872.234/0001-58', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Assistência - Shopping JK
  { id: 'CTA-012', nome: 'Bradesco Assistência', tipo: 'Conta Bancária', lojaVinculada: '94dbe2b1', banco: 'Bradesco', agencia: '', conta: '', cnpj: '54.872.234/0001-58', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Assistência - Shopping Sul
  { id: 'CTA-013', nome: 'Bradesco Assistência', tipo: 'Conta Bancária', lojaVinculada: 'ba1802b9', banco: 'Bradesco', agencia: '', conta: '', cnpj: '54.872.234/0001-58', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Assistência - Águas Lindas
  { id: 'CTA-014', nome: 'Bradesco Assistência', tipo: 'Conta Bancária', lojaVinculada: 'be961085', banco: 'Bradesco', agencia: '', conta: '', cnpj: '54.872.234/0001-58', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Contas de Dinheiro por Loja
  { id: 'CTA-015', nome: 'Dinheiro - JK Shopping', tipo: 'Dinheiro', lojaVinculada: 'db894e7d', banco: '', agencia: '', conta: '', cnpj: '62.968.637/0001-23', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  { id: 'CTA-016', nome: 'Dinheiro - Shopping Sul', tipo: 'Dinheiro', lojaVinculada: '5b9446d5', banco: '', agencia: '', conta: '', cnpj: '55.449.390/0001-73', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  { id: 'CTA-017', nome: 'Dinheiro - Águas Lindas Shopping', tipo: 'Dinheiro', lojaVinculada: '0d06e7db', banco: '', agencia: '', conta: '', cnpj: '56.221.743/0001-46', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  { id: 'CTA-018', nome: 'Dinheiro - Online', tipo: 'Dinheiro', lojaVinculada: 'fcc78c1a', banco: '', agencia: '', conta: '', cnpj: '46.197.533/0001-06', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  { id: 'CTA-019', nome: 'Dinheiro - Loja Matriz', tipo: 'Dinheiro', lojaVinculada: '3ac7e00c', banco: '', agencia: '', conta: '', cnpj: '53.295.194/0001-66', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  { id: 'CTA-020', nome: 'Dinheiro - Geral', tipo: 'Dinheiro - Geral', lojaVinculada: 'db894e7d', banco: '', agencia: '', conta: '', cnpj: '62.968.637/0001-23', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
  // Assistência - Geral
  { id: 'CTA-021', nome: 'Bradesco Assistência', tipo: 'Conta Bancária', lojaVinculada: '3cfbf69f', banco: 'Bradesco', agencia: '', conta: '', cnpj: '54.872.234/0001-58', saldoInicial: 0, saldoAtual: 0, status: 'Ativo', statusMaquina: 'Própria', notaFiscal: true },
];

let maquinasCartao: MaquinaCartao[] = [
  { 
    id: 'MAQ-001', 
    nome: 'Stone Matriz', 
    cnpjVinculado: '3ac7e00c', // Loja - Matriz
    contaOrigem: 'CTA-002', // Bradesco Thiago Eduardo (Própria)
    status: 'Ativo',
    percentualMaquina: 2.5,
    taxas: {
      credito: { 1: 3, 2: 5, 3: 7, 4: 9, 5: 11, 6: 13, 7: 15, 8: 17, 9: 19, 10: 21, 11: 23, 12: 25 },
      debito: 2
    }
  },
  { 
    id: 'MAQ-002', 
    nome: 'PagSeguro Online', 
    cnpjVinculado: 'fcc78c1a', // Loja - Online
    contaOrigem: 'CTA-004', // Bradesco Thiago Imports (Própria)
    status: 'Ativo',
    percentualMaquina: 1.99,
    taxas: {
      credito: { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16, 9: 18, 10: 20, 11: 22, 12: 24 },
      debito: 2
    }
  },
  { 
    id: 'MAQ-003', 
    nome: 'Stone JK Shopping', 
    cnpjVinculado: 'db894e7d', // Loja - JK Shopping
    contaOrigem: 'CTA-006', // Sicoob (Sicoob JK) (Própria)
    status: 'Ativo',
    percentualMaquina: 3,
    taxas: {
      credito: { 1: 3, 2: 5, 3: 7, 4: 9, 5: 11, 6: 13, 7: 15, 8: 17, 9: 19, 10: 21, 11: 23, 12: 25 },
      debito: 2
    }
  },
  { 
    id: 'MAQ-004', 
    nome: 'Cielo Águas Lindas', 
    cnpjVinculado: '0d06e7db', // Loja - Águas Lindas Shopping
    contaOrigem: 'CTA-008', // Pagbank (Pix Carol) (Própria)
    status: 'Ativo',
    percentualMaquina: 2.2,
    taxas: {
      credito: { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16, 9: 18, 10: 20, 11: 22, 12: 24 },
      debito: 2
    }
  },
  { 
    id: 'MAQ-005', 
    nome: 'GetNet Shopping Sul', 
    cnpjVinculado: '5b9446d5', // Loja - Shopping Sul
    contaOrigem: 'CTA-010', // Bradesco Acessórios (Própria)
    status: 'Ativo',
    percentualMaquina: 2.0,
    taxas: {
      credito: { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16, 9: 18, 10: 20, 11: 22, 12: 24 },
      debito: 1.5
    }
  },
];

// API Functions
export const getLojas = () => [...lojas];
export const addLoja = (loja: Omit<Loja, 'id'>) => {
  const newId = `LOJA-${String(lojas.length + 1).padStart(3, '0')}`;
  const newLoja = { ...loja, id: newId };
  lojas.push(newLoja);
  return newLoja;
};
export const updateLoja = (id: string, updates: Partial<Loja>) => {
  const index = lojas.findIndex(l => l.id === id);
  if (index !== -1) {
    lojas[index] = { ...lojas[index], ...updates };
    return lojas[index];
  }
  return null;
};
export const deleteLoja = (id: string) => {
  lojas = lojas.filter(l => l.id !== id);
};

export const getClientes = () => [...clientes];
export const getClienteById = (id: string) => clientes.find(c => c.id === id);
export const getClienteByCpf = (cpf: string) => clientes.find(c => c.cpf === cpf);
export const addCliente = (cliente: Omit<Cliente, 'id' | 'tipoCliente' | 'tipoPessoa'>) => {
  const newId = `CLI-${String(clientes.length + 1).padStart(3, '0')}`;
  const idsCompras = cliente.idsCompras || [];
  const newCliente: Cliente = { 
    ...cliente, 
    id: newId, 
    idsCompras,
    tipoCliente: calcularTipoCliente(idsCompras),
    origemCliente: cliente.origemCliente || 'Venda',
    tipoPessoa: calcularTipoPessoa(cliente.cpf)
  };
  clientes.push(newCliente);
  return newCliente;
};
export const updateCliente = (id: string, updates: Partial<Cliente>) => {
  const index = clientes.findIndex(c => c.id === id);
  if (index !== -1) {
    const updatedCliente = { ...clientes[index], ...updates };
    // Recalcular tipo de cliente se idsCompras foi atualizado
    if (updates.idsCompras) {
      updatedCliente.tipoCliente = calcularTipoCliente(updates.idsCompras);
    }
    clientes[index] = updatedCliente;
    return clientes[index];
  }
  return null;
};
export const deleteCliente = (id: string) => {
  clientes = clientes.filter(c => c.id !== id);
};
// Adicionar compra ao cliente
export const addCompraToCliente = (clienteId: string, vendaId: string) => {
  const cliente = clientes.find(c => c.id === clienteId);
  if (cliente) {
    if (!cliente.idsCompras.includes(vendaId)) {
      cliente.idsCompras.push(vendaId);
      cliente.tipoCliente = calcularTipoCliente(cliente.idsCompras);
    }
    return cliente;
  }
  return null;
};

export const getColaboradores = () => [...colaboradores];
export const getColaboradoresByPermissao = (permissao: string) => {
  return colaboradores.filter(col => {
    const cargo = cargos.find(c => c.id === col.cargo);
    return cargo?.permissoes.includes(permissao);
  });
};
export const getColaboradoresByLoja = (lojaId: string) => 
  colaboradores.filter(c => c.loja === lojaId && c.status === 'Ativo');

export const getAniversariantesDaSemana = () => {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  return colaboradores.filter(col => {
    if (!col.dataNascimento || col.status !== 'Ativo') return false;
    const birthday = new Date(col.dataNascimento);
    birthday.setFullYear(today.getFullYear());
    return birthday >= today && birthday <= nextWeek;
  }).sort((a, b) => {
    const dateA = new Date(a.dataNascimento!);
    const dateB = new Date(b.dataNascimento!);
    dateA.setFullYear(today.getFullYear());
    dateB.setFullYear(today.getFullYear());
    return dateA.getTime() - dateB.getTime();
  });
};

export const getContagemColaboradoresPorLoja = () => {
  const contagem: Record<string, number> = {};
  colaboradores.forEach(col => {
    if (col.status === 'Ativo' && col.loja) {
      contagem[col.loja] = (contagem[col.loja] || 0) + 1;
    }
  });
  return contagem;
};

export const getCargoNome = (cargoId: string) => {
  const cargo = cargos.find(c => c.id === cargoId);
  return cargo?.funcao || cargoId;
};

export const addColaborador = (colaborador: Omit<Colaborador, 'id'>) => {
  const newId = `COL-${String(colaboradores.length + 1).padStart(3, '0')}`;
  const newColaborador = { ...colaborador, id: newId };
  colaboradores.push(newColaborador);
  return newColaborador;
};
export const updateColaborador = (id: string, updates: Partial<Colaborador>) => {
  const index = colaboradores.findIndex(c => c.id === id);
  if (index !== -1) {
    colaboradores[index] = { ...colaboradores[index], ...updates };
    return colaboradores[index];
  }
  return null;
};
export const deleteColaborador = (id: string) => {
  colaboradores = colaboradores.filter(c => c.id !== id);
};

export const getFornecedores = () => [...fornecedores];
export const addFornecedor = (fornecedor: Omit<Fornecedor, 'id'>) => {
  const newId = `FORN-${String(fornecedores.length + 1).padStart(3, '0')}`;
  const newFornecedor = { ...fornecedor, id: newId };
  fornecedores.push(newFornecedor);
  return newFornecedor;
};
export const updateFornecedor = (id: string, updates: Partial<Fornecedor>) => {
  const index = fornecedores.findIndex(f => f.id === id);
  if (index !== -1) {
    fornecedores[index] = { ...fornecedores[index], ...updates };
    return fornecedores[index];
  }
  return null;
};
export const deleteFornecedor = (id: string) => {
  fornecedores = fornecedores.filter(f => f.id !== id);
};

export const getOrigensVenda = () => [...origensVenda];
export const addOrigemVenda = (origem: Omit<OrigemVenda, 'id'>) => {
  const newId = `ORIG-${String(origensVenda.length + 1).padStart(3, '0')}`;
  const newOrigem = { ...origem, id: newId };
  origensVenda.push(newOrigem);
  return newOrigem;
};
export const updateOrigemVenda = (id: string, updates: Partial<OrigemVenda>) => {
  const index = origensVenda.findIndex(o => o.id === id);
  if (index !== -1) {
    origensVenda[index] = { ...origensVenda[index], ...updates };
    return origensVenda[index];
  }
  return null;
};
export const deleteOrigemVenda = (id: string) => {
  origensVenda = origensVenda.filter(o => o.id !== id);
};

export const getProdutosCadastro = () => [...produtosCadastro];
export const addProdutoCadastro = (produto: Omit<ProdutoCadastro, 'id'>) => {
  const newId = `PROD-CAD-${String(produtosCadastro.length + 1).padStart(3, '0')}`;
  const newProduto = { ...produto, id: newId };
  produtosCadastro.push(newProduto);
  return newProduto;
};
export const updateProdutoCadastro = (id: string, updates: Partial<ProdutoCadastro>) => {
  const index = produtosCadastro.findIndex(p => p.id === id);
  if (index !== -1) {
    produtosCadastro[index] = { ...produtosCadastro[index], ...updates };
    return produtosCadastro[index];
  }
  return null;
};
export const deleteProdutoCadastro = (id: string) => {
  produtosCadastro = produtosCadastro.filter(p => p.id !== id);
};

export const getTiposDesconto = () => [...tiposDesconto];
export const addTipoDesconto = (tipo: Omit<TipoDesconto, 'id'>) => {
  const newId = `DESC-${String(tiposDesconto.length + 1).padStart(3, '0')}`;
  const newTipo = { ...tipo, id: newId };
  tiposDesconto.push(newTipo);
  return newTipo;
};
export const updateTipoDesconto = (id: string, updates: Partial<TipoDesconto>) => {
  const index = tiposDesconto.findIndex(t => t.id === id);
  if (index !== -1) {
    tiposDesconto[index] = { ...tiposDesconto[index], ...updates };
    return tiposDesconto[index];
  }
  return null;
};
export const deleteTipoDesconto = (id: string) => {
  tiposDesconto = tiposDesconto.filter(t => t.id !== id);
};

export const getCargos = () => [...cargos];
export const addCargo = (cargo: Omit<Cargo, 'id'>) => {
  const newId = `CARGO-${String(cargos.length + 1).padStart(3, '0')}`;
  const newCargo = { ...cargo, id: newId };
  cargos.push(newCargo);
  return newCargo;
};
export const updateCargo = (id: string, updates: Partial<Cargo>) => {
  const index = cargos.findIndex(c => c.id === id);
  if (index !== -1) {
    cargos[index] = { ...cargos[index], ...updates };
    return cargos[index];
  }
  return null;
};
export const deleteCargo = (id: string) => {
  cargos = cargos.filter(c => c.id !== id);
};

export const getModelosPagamento = () => [...modelosPagamento];
export const addModeloPagamento = (modelo: Omit<ModeloPagamento, 'id'>) => {
  const newId = `MP-${String(modelosPagamento.length + 1).padStart(3, '0')}`;
  const newModelo = { ...modelo, id: newId };
  modelosPagamento.push(newModelo);
  return newModelo;
};
export const updateModeloPagamento = (id: string, updates: Partial<ModeloPagamento>) => {
  const index = modelosPagamento.findIndex(m => m.id === id);
  if (index !== -1) {
    modelosPagamento[index] = { ...modelosPagamento[index], ...updates };
    return modelosPagamento[index];
  }
  return null;
};
export const deleteModeloPagamento = (id: string) => {
  modelosPagamento = modelosPagamento.filter(m => m.id !== id);
};

export const getContasFinanceiras = () => [...contasFinanceiras];
export const addContaFinanceira = (conta: Omit<ContaFinanceira, 'id'>) => {
  const newId = `CTA-${String(contasFinanceiras.length + 1).padStart(3, '0')}`;
  const newConta = { ...conta, id: newId };
  contasFinanceiras.push(newConta);
  return newConta;
};
export const updateContaFinanceira = (id: string, updates: Partial<ContaFinanceira>) => {
  const index = contasFinanceiras.findIndex(c => c.id === id);
  if (index !== -1) {
    contasFinanceiras[index] = { ...contasFinanceiras[index], ...updates };
    return contasFinanceiras[index];
  }
  return null;
};
export const deleteContaFinanceira = (id: string) => {
  contasFinanceiras = contasFinanceiras.filter(c => c.id !== id);
};

// Máquinas de Cartão CRUD
export const getMaquinasCartao = () => [...maquinasCartao];
export const getMaquinaCartaoById = (id: string) => maquinasCartao.find(m => m.id === id);
export const addMaquinaCartao = (maquina: Omit<MaquinaCartao, 'id'>) => {
  const newId = `MAQ-${String(maquinasCartao.length + 1).padStart(3, '0')}`;
  const newMaquina = { ...maquina, id: newId };
  maquinasCartao.push(newMaquina);
  return newMaquina;
};
export const updateMaquinaCartao = (id: string, updates: Partial<MaquinaCartao>) => {
  const index = maquinasCartao.findIndex(m => m.id === id);
  if (index !== -1) {
    maquinasCartao[index] = { ...maquinasCartao[index], ...updates };
    return maquinasCartao[index];
  }
  return null;
};
export const deleteMaquinaCartao = (id: string) => {
  maquinasCartao = maquinasCartao.filter(m => m.id !== id);
};

// Motoboys - colaboradores com cargo Motoboy
export const getMotoboys = () => colaboradores.filter(c => c.status === 'Ativo' && c.cargo === 'CARGO-009');

// Utility functions
// formatCurrency removido - usar import { formatCurrency } from '@/utils/formatUtils'
export { formatCurrency } from '@/utils/formatUtils';

export const formatCPF = (value: string): string => {
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (value: string): string => {
  return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (value: string): string => {
  if (value.length === 11) {
    return value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};

// Get lookups
export const getLojaById = (id: string) => lojas.find(l => l.id === id);
export const getColaboradorById = (id: string) => colaboradores.find(c => c.id === id);
export const getCargoById = (id: string) => cargos.find(c => c.id === id);
export const getFornecedorById = (id: string) => fornecedores.find(f => f.id === id);
export const getContaFinanceiraById = (id: string) => contasFinanceiras.find(c => c.id === id);
export const getModeloPagamentoById = (id: string) => modelosPagamento.find(m => m.id === id);
