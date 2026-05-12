// ============================================================
// DADOS COMPARTILHADOS (MOCK) – ADMIN/TÉCNICO
// ============================================================

// Perfis
const PERFIS = {
  1: 'Administrador',
  2: 'Técnico',
  3: 'Colaborador'
};

// Setores
const SETORES = {
  1: 'TI',
  2: 'RH',
  3: 'Financeiro',
  4: 'Marketing',
  5: 'Vendas'
};

// Status de chamado
const STATUS = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  aguardando_usuario: 'Aguardando Usuário',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
  cancelado: 'Cancelado'
};

// Prioridades
const PRIORIDADES = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica'
};

// Categorias
const CATEGORIAS = [
  'Hardware',
  'Software',
  'Rede / Internet',
  'Acesso / Senha',
  'Impressora',
  'E-mail',
  'Telefonia',
  'Outros'
];

// Usuários mock
const usuarios = [
  { id: 1, id_perfil: 1, id_setor: 1, nome: 'Admin', email: 'admin@funada.com', senha: '123', ramal: '100', ip_maquina: '192.168.1.10', nome_maquina: 'ADMIN-PC', ativo: true, ultimo_acesso: '2026-05-06 09:30', created_at: '2025-01-10', updated_at: '2026-05-01' },
  { id: 2, id_perfil: 2, id_setor: 1, nome: 'Carlos Técnico', email: 'carlos@funada.com', senha: '123', ramal: '101', ip_maquina: '192.168.1.20', nome_maquina: 'CARLOS-PC', ativo: true, ultimo_acesso: '2026-05-06 10:00', created_at: '2025-02-15', updated_at: '2026-04-20' },
  { id: 3, id_perfil: 2, id_setor: 1, nome: 'Ana Técnica', email: 'ana@funada.com', senha: '123', ramal: '102', ip_maquina: '192.168.1.21', nome_maquina: 'ANA-PC', ativo: true, ultimo_acesso: '2026-05-05 17:00', created_at: '2025-03-01', updated_at: '2026-04-18' },
  { id: 4, id_perfil: 3, id_setor: 3, nome: 'João Silva', email: 'joao@funada.com', senha: '123', ramal: '200', ip_maquina: '192.168.2.10', nome_maquina: 'JOAO-PC', ativo: true, ultimo_acesso: '2026-05-06 08:45', created_at: '2025-04-10', updated_at: '2026-05-01' },
  { id: 5, id_perfil: 3, id_setor: 2, nome: 'Maria RH', email: 'maria@funada.com', senha: '123', ramal: '201', ip_maquina: '192.168.2.20', nome_maquina: 'MARIA-PC', ativo: true, ultimo_acesso: '2026-05-05 16:30', created_at: '2025-05-20', updated_at: '2026-04-25' },
  { id: 6, id_perfil: 3, id_setor: 5, nome: 'Pedro Vendas', email: 'pedro@funada.com', senha: '123', ramal: '202', ip_maquina: '192.168.2.30', nome_maquina: 'PEDRO-PC', ativo: false, ultimo_acesso: '2026-03-10', created_at: '2025-06-01', updated_at: '2026-03-11' },
  { id: 7, id_perfil: 2, id_setor: 1, nome: 'Rafael Suporte', email: 'rafael@funada.com', senha: '123', ramal: '103', ip_maquina: '192.168.1.22', nome_maquina: 'RAFAEL-PC', ativo: true, ultimo_acesso: '2026-05-06 11:15', created_at: '2026-01-10', updated_at: '2026-04-30' },
];

// Chamados mock
const chamados = [
  {
    id: 1,
    id_solicitante: 4, // João Silva
    id_tecnico: 2,     // Carlos Técnico
    id_categoria: 'Hardware',
    titulo: 'Teclado com defeito',
    descricao: 'Teclado não funciona algumas teclas.',
    status: 'em_atendimento',
    prioridade: 'alta',
    ip_maquina: '192.168.2.10',
    nome_maquina: 'JOAO-PC',
    sla_prazo: '2026-05-07 12:00',
    sla_atendido: true,
    aberto_em: '2026-05-04 09:30',
    atendimento_em: '2026-05-04 10:15',
    resolvido_em: null,
    fechado_em: null,
    created_em: '2026-05-04 09:30',
    updated_em: '2026-05-05 14:20'
  },
  {
    id: 2,
    id_solicitante: 5, // Maria RH
    id_tecnico: null,
    id_categoria: 'Software',
    titulo: 'Erro ao abrir sistema de folha',
    descricao: 'Aparece mensagem de erro "DLL não encontrada".',
    status: 'aberto',
    prioridade: 'critica',
    ip_maquina: '192.168.2.20',
    nome_maquina: 'MARIA-PC',
    sla_prazo: '2026-05-06 12:00',
    sla_atendido: false,
    aberto_em: '2026-05-05 16:00',
    atendimento_em: null,
    resolvido_em: null,
    fechado_em: null,
    created_em: '2026-05-05 16:00',
    updated_em: '2026-05-05 16:00'
  },
  {
    id: 3,
    id_solicitante: 4, // João Silva
    id_tecnico: 2,
    id_categoria: 'Rede / Internet',
    titulo: 'Internet lenta',
    descricao: 'Navegação muito lenta desde ontem.',
    status: 'aguardando_usuario',
    prioridade: 'media',
    ip_maquina: '192.168.2.10',
    nome_maquina: 'JOAO-PC',
    sla_prazo: '2026-05-07 18:00',
    sla_atendido: true,
    aberto_em: '2026-05-03 11:00',
    atendimento_em: '2026-05-03 14:00',
    resolvido_em: null,
    fechado_em: null,
    created_em: '2026-05-03 11:00',
    updated_em: '2026-05-05 09:00'
  },
  {
    id: 4,
    id_solicitante: 5, // Maria RH
    id_tecnico: 3,     // Ana Técnica
    id_categoria: 'Acesso / Senha',
    titulo: 'Reset de senha do e-mail',
    descricao: 'Não consigo acessar o webmail.',
    status: 'resolvido',
    prioridade: 'baixa',
    ip_maquina: '192.168.2.20',
    nome_maquina: 'MARIA-PC',
    sla_prazo: '2026-05-04 17:00',
    sla_atendido: true,
    aberto_em: '2026-05-02 08:20',
    atendimento_em: '2026-05-02 09:00',
    resolvido_em: '2026-05-02 09:45',
    fechado_em: null,
    created_em: '2026-05-02 08:20',
    updated_em: '2026-05-02 09:45'
  },
  {
    id: 5,
    id_solicitante: 6, // Pedro Vendas
    id_tecnico: 2,
    id_categoria: 'Impressora',
    titulo: 'Impressora não imprime',
    descricao: 'Impressora HP LaserJet não responde.',
    status: 'fechado',
    prioridade: 'alta',
    ip_maquina: '192.168.2.30',
    nome_maquina: 'PEDRO-PC',
    sla_prazo: '2026-03-15 14:00',
    sla_atendido: true,
    aberto_em: '2026-03-11 10:00',
    atendimento_em: '2026-03-11 11:00',
    resolvido_em: '2026-03-12 15:30',
    fechado_em: '2026-03-13 10:00',
    created_em: '2026-03-11 10:00',
    updated_em: '2026-03-13 10:00'
  },
  {
    id: 6,
    id_solicitante: 4,
    id_tecnico: null,
    id_categoria: 'E-mail',
    titulo: 'E-mail não sincroniza',
    descricao: 'Conta de e-mail parou de sincronizar no Outlook.',
    status: 'aberto',
    prioridade: 'media',
    ip_maquina: '192.168.2.10',
    nome_maquina: 'JOAO-PC',
    sla_prazo: '2026-05-07 10:00',
    sla_atendido: false,
    aberto_em: '2026-05-06 07:45',
    atendimento_em: null,
    resolvido_em: null,
    fechado_em: null,
    created_em: '2026-05-06 07:45',
    updated_em: '2026-05-06 07:45'
  },
  {
    id: 7,
    id_solicitante: 5,
    id_tecnico: 3,
    id_categoria: 'Telefonia',
    titulo: 'Ramal mudo',
    descricao: 'Ramal 201 sem áudio.',
    status: 'em_atendimento',
    prioridade: 'alta',
    ip_maquina: '192.168.2.20',
    nome_maquina: 'MARIA-PC',
    sla_prazo: '2026-05-06 16:00',
    sla_atendido: true,
    aberto_em: '2026-05-05 15:00',
    atendimento_em: '2026-05-05 16:30',
    resolvido_em: null,
    fechado_em: null,
    created_em: '2026-05-05 15:00',
    updated_em: '2026-05-06 09:00'
  },
  {
    id: 8,
    id_solicitante: 4,
    id_tecnico: null,
    id_categoria: 'Outros',
    titulo: 'Mouse sem fio não conecta',
    descricao: 'Mouse Logitech parou de funcionar.',
    status: 'cancelado',
    prioridade: 'baixa',
    ip_maquina: '192.168.2.10',
    nome_maquina: 'JOAO-PC',
    sla_prazo: '2026-05-01 12:00',
    sla_atendido: false,
    aberto_em: '2026-04-28 14:00',
    atendimento_em: null,
    resolvido_em: null,
    fechado_em: null,
    created_em: '2026-04-28 14:00',
    updated_em: '2026-04-30 10:00'
  }
];

// Funções auxiliares globais
function getUsuario(id) {
  return usuarios.find(u => u.id === id) || null;
}

function getStatusClass(status) {
  const map = {
    aberto: 'status-aberto',
    em_atendimento: 'status-em_atendimento',
    aguardando_usuario: 'status-aguardando_usuario',
    resolvido: 'status-resolvido',
    fechado: 'status-fechado',
    cancelado: 'status-cancelado'
  };
  return map[status] || '';
}

function getPrioridadeClass(prioridade) {
  return prioridade;
}

function formatarData(data) {
  if (!data) return '—';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarDataCurta(data) {
  if (!data) return '—';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR');
}