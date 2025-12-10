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
}

export interface Colaborador {
  id: string;
  cpf: string;
  nome: string;
  cargo: string;
  dataAdmissao: string;
  dataInativacao?: string;
  email: string;
  telefone: string;
  modeloPagamento: string;
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
}

// Mock Data
let lojas: Loja[] = [
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
  { id: 'CLI-001', nome: 'João Silva', cpf: '123.456.789-00', telefone: '(11) 99999-1111', dataNascimento: '1985-05-15', email: 'joao@email.com', cep: '01310-100', endereco: 'Rua das Flores', numero: '123', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP', status: 'Ativo' },
  { id: 'CLI-002', nome: 'Maria Santos', cpf: '234.567.890-11', telefone: '(11) 99999-2222', dataNascimento: '1990-08-20', email: 'maria@email.com', cep: '02020-000', endereco: 'Av. Norte', numero: '456', bairro: 'Santana', cidade: 'São Paulo', estado: 'SP', status: 'Ativo' },
  { id: 'CLI-003', nome: 'Pedro Oliveira', cpf: '345.678.901-22', telefone: '(11) 99999-3333', dataNascimento: '1988-12-10', email: 'pedro@email.com', cep: '04040-000', endereco: 'Rua Sul', numero: '789', bairro: 'Moema', cidade: 'São Paulo', estado: 'SP', status: 'Ativo' },
  { id: 'CLI-004', nome: 'Ana Costa', cpf: '456.789.012-33', telefone: '(11) 99999-4444', dataNascimento: '1995-03-25', email: 'ana@email.com', cep: '05050-000', endereco: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', status: 'Ativo' },
  { id: 'CLI-005', nome: 'Carlos Ferreira', cpf: '567.890.123-44', telefone: '(11) 99999-5555', dataNascimento: '1982-07-30', email: 'carlos@email.com', cep: '06060-000', endereco: 'Rua Augusta', numero: '500', bairro: 'Consolação', cidade: 'São Paulo', estado: 'SP', status: 'Inativo' },
];

let colaboradores: Colaborador[] = [
  { id: 'COL-001', cpf: '111.222.333-44', nome: 'Lucas Mendes', cargo: 'CARGO-001', dataAdmissao: '2020-01-15', email: 'lucas@thiagoimports.com', telefone: '(11) 98888-1111', modeloPagamento: 'MP-002' },
  { id: 'COL-002', cpf: '222.333.444-55', nome: 'Fernanda Lima', cargo: 'CARGO-002', dataAdmissao: '2019-06-20', email: 'fernanda@thiagoimports.com', telefone: '(11) 98888-2222', modeloPagamento: 'MP-001' },
  { id: 'COL-003', cpf: '333.444.555-66', nome: 'Roberto Alves', cargo: 'CARGO-003', dataAdmissao: '2021-03-10', email: 'roberto@thiagoimports.com', telefone: '(11) 98888-3333', modeloPagamento: 'MP-002' },
  { id: 'COL-004', cpf: '444.555.666-77', nome: 'Juliana Costa', cargo: 'CARGO-004', dataAdmissao: '2022-09-05', email: 'juliana@thiagoimports.com', telefone: '(11) 98888-4444', modeloPagamento: 'MP-003' },
  { id: 'COL-005', cpf: '555.666.777-88', nome: 'Marcos Silva', cargo: 'CARGO-005', dataAdmissao: '2018-11-25', email: 'marcos@thiagoimports.com', telefone: '(11) 98888-5555', modeloPagamento: 'MP-001' },
  { id: 'COL-006', cpf: '666.777.888-99', nome: 'Patricia Souza', cargo: 'CARGO-006', dataAdmissao: '2023-02-14', email: 'patricia@thiagoimports.com', telefone: '(11) 98888-6666', modeloPagamento: 'MP-002' },
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
];

let modelosPagamento: ModeloPagamento[] = [
  { id: 'MP-001', modelo: 'Salário Fixo' },
  { id: 'MP-002', modelo: 'Fixo + Comissão' },
  { id: 'MP-003', modelo: 'Comissão 100%' },
];

let contasFinanceiras: ContaFinanceira[] = [
  { id: 'CTA-001', nome: 'Caixa Centro', tipo: 'Caixa', lojaVinculada: 'LOJA-001', banco: '-', agencia: '-', conta: '-', cnpj: '12.345.678/0001-01', saldoInicial: 5000, saldoAtual: 12500.50, status: 'Ativo', ultimoMovimento: '2025-01-20' },
  { id: 'CTA-002', nome: 'Pix Geral', tipo: 'Pix', lojaVinculada: 'Administrativo', banco: 'Nubank', agencia: '0001', conta: '12345678-9', cnpj: '12.345.678/0001-01', saldoInicial: 0, saldoAtual: 45000, status: 'Ativo', ultimoMovimento: '2025-01-20' },
  { id: 'CTA-003', nome: 'Conta Bradesco', tipo: 'Conta Bancária', lojaVinculada: 'Administrativo', banco: 'Bradesco', agencia: '1234-5', conta: '98765-4', cnpj: '12.345.678/0001-01', saldoInicial: 100000, saldoAtual: 250000, status: 'Ativo', ultimoMovimento: '2025-01-19' },
  { id: 'CTA-004', nome: 'Conta Itaú', tipo: 'Conta Bancária', lojaVinculada: 'Administrativo', banco: 'Itaú', agencia: '5678', conta: '12345-6', cnpj: '12.345.678/0001-01', saldoInicial: 50000, saldoAtual: 180000, status: 'Ativo', ultimoMovimento: '2025-01-18' },
  { id: 'CTA-005', nome: 'Nubank Digital', tipo: 'Conta Digital', lojaVinculada: 'Administrativo', banco: 'Nubank', agencia: '0001', conta: '87654321-0', cnpj: '12.345.678/0001-01', saldoInicial: 10000, saldoAtual: 75000, status: 'Ativo', ultimoMovimento: '2025-01-20' },
  { id: 'CTA-006', nome: 'Caixa Norte', tipo: 'Caixa', lojaVinculada: 'LOJA-002', banco: '-', agencia: '-', conta: '-', cnpj: '12.345.678/0002-02', saldoInicial: 3000, saldoAtual: 8500, status: 'Ativo', ultimoMovimento: '2025-01-19' },
  { id: 'CTA-007', nome: 'Caixa Sul', tipo: 'Caixa', lojaVinculada: 'LOJA-003', banco: '-', agencia: '-', conta: '-', cnpj: '12.345.678/0003-03', saldoInicial: 3000, saldoAtual: 6200, status: 'Ativo', ultimoMovimento: '2025-01-18' },
  { id: 'CTA-008', nome: 'Caixa Shopping', tipo: 'Caixa', lojaVinculada: 'LOJA-004', banco: '-', agencia: '-', conta: '-', cnpj: '12.345.678/0004-04', saldoInicial: 8000, saldoAtual: 22000, status: 'Ativo', ultimoMovimento: '2025-01-20' },
  { id: 'CTA-009', nome: 'Santander PJ', tipo: 'Conta Bancária', lojaVinculada: 'Administrativo', banco: 'Santander', agencia: '4321', conta: '56789-0', cnpj: '12.345.678/0001-01', saldoInicial: 30000, saldoAtual: 95000, status: 'Ativo', ultimoMovimento: '2025-01-17' },
  { id: 'CTA-010', nome: 'Inter Digital', tipo: 'Conta Digital', lojaVinculada: 'Administrativo', banco: 'Inter', agencia: '0001', conta: '11223344-5', cnpj: '12.345.678/0001-01', saldoInicial: 5000, saldoAtual: 42000, status: 'Ativo', ultimoMovimento: '2025-01-16' },
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
export const addCliente = (cliente: Omit<Cliente, 'id'>) => {
  const newId = `CLI-${String(clientes.length + 1).padStart(3, '0')}`;
  const newCliente = { ...cliente, id: newId };
  clientes.push(newCliente);
  return newCliente;
};
export const updateCliente = (id: string, updates: Partial<Cliente>) => {
  const index = clientes.findIndex(c => c.id === id);
  if (index !== -1) {
    clientes[index] = { ...clientes[index], ...updates };
    return clientes[index];
  }
  return null;
};
export const deleteCliente = (id: string) => {
  clientes = clientes.filter(c => c.id !== id);
};

export const getColaboradores = () => [...colaboradores];
export const getColaboradoresByPermissao = (permissao: string) => {
  return colaboradores.filter(col => {
    const cargo = cargos.find(c => c.id === col.cargo);
    return cargo?.permissoes.includes(permissao);
  });
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

// Utility functions
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

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

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// Get lookups
export const getLojaById = (id: string) => lojas.find(l => l.id === id);
export const getColaboradorById = (id: string) => colaboradores.find(c => c.id === id);
export const getCargoById = (id: string) => cargos.find(c => c.id === id);
export const getFornecedorById = (id: string) => fornecedores.find(f => f.id === id);
export const getContaFinanceiraById = (id: string) => contasFinanceiras.find(c => c.id === id);
export const getModeloPagamentoById = (id: string) => modelosPagamento.find(m => m.id === id);
