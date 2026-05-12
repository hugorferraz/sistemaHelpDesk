let state = {
  chamados: [],
  resumo: {},
  filtroStatus: '',
  filtroPrioridade: '',
  filtroTecnico: '',
  filtroOrdem: 'recente',
  busca: '',
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  atualizarSidebar();
  await carregarTecnicos();
  await carregarChamados();
  initFiltros();
});

// ============================================================
// CARREGAR TÉCNICOS PARA O SELECT
// ============================================================
async function carregarTecnicos() {
  try {
    const usuarios = await fetchAuth('/usuarios?id_perfil=2');
    const select = document.getElementById('filter-tecnico');
    usuarios.forEach(u => {
      const option = document.createElement('option');
      option.value = u.id;
      option.textContent = u.nome;
      select.appendChild(option);
    });
  } catch (erro) {
    console.error('Erro ao carregar técnicos:', erro);
  }
}

// ============================================================
// CARREGAR CHAMADOS DA API
// ============================================================
async function carregarChamados() {
  try {
    const params = new URLSearchParams();
    if (state.filtroStatus) params.append('status', state.filtroStatus);
    if (state.filtroPrioridade) params.append('prioridade', state.filtroPrioridade);
    if (state.filtroTecnico) params.append('id_tecnico', state.filtroTecnico);
    if (state.busca) params.append('search', state.busca);
    if (state.filtroOrdem) params.append('ordem', state.filtroOrdem);

    const data = await fetchAuth('/chamados?' + params);
    state.chamados = data.chamados || [];
    state.resumo = data.resumo || {};

    atualizarResumos();
    renderizarLista();
  } catch (erro) {
    console.error('Erro ao carregar chamados:', erro);
    document.getElementById('chamados-list').innerHTML = 
      '<p style="text-align:center;color:red;">Erro ao carregar chamados.</p>';
  }
}

// ============================================================
// ATUALIZAR CARDS DE RESUMO
// ============================================================
function atualizarResumos() {
  const resumo = state.resumo;
  const total = Object.values(resumo).reduce((a, b) => a + b, 0);

  document.getElementById('summary-bar').innerHTML = `
    <div class="summary-card" data-filter="">
      <span class="summary-number">${total}</span>
      <span class="summary-label">Total</span>
    </div>
    <div class="summary-card" data-filter="aberto">
      <span class="summary-number">${resumo.aberto || 0}</span>
      <span class="summary-label">Abertos</span>
    </div>
    <div class="summary-card" data-filter="em_atendimento">
      <span class="summary-number">${resumo.em_atendimento || 0}</span>
      <span class="summary-label">Em Atend.</span>
    </div>
    <div class="summary-card" data-filter="aguardando_usuario">
      <span class="summary-number">${resumo.aguardando_usuario || 0}</span>
      <span class="summary-label">Aguardando</span>
    </div>
    <div class="summary-card" data-filter="resolvido">
      <span class="summary-number">${resumo.resolvido || 0}</span>
      <span class="summary-label">Resolvidos</span>
    </div>
    <div class="summary-card" data-filter="fechado">
      <span class="summary-number">${resumo.fechado || 0}</span>
      <span class="summary-label">Fechados</span>
    </div>
  `;

  // Re-adiciona eventos de clique
  document.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('click', () => {
      state.filtroStatus = card.dataset.filter;
      carregarChamados();
    });
  });
}

// ============================================================
// FILTROS
// ============================================================
function initFiltros() {
  const searchInput = document.getElementById('search-input');

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.busca = searchInput.value.trim().toLowerCase();
      carregarChamados();
    }, 400);
  });

  document.getElementById('filter-status').addEventListener('change', e => {
    state.filtroStatus = e.target.value;
    carregarChamados();
  });

  document.getElementById('filter-prioridade').addEventListener('change', e => {
    state.filtroPrioridade = e.target.value;
    carregarChamados();
  });

  document.getElementById('filter-tecnico').addEventListener('change', e => {
    state.filtroTecnico = e.target.value;
    carregarChamados();
  });

  document.getElementById('filter-ordem').addEventListener('change', e => {
    state.filtroOrdem = e.target.value;
    carregarChamados();
  });
}

// ============================================================
// RENDERIZAR LISTA
// ============================================================
function renderizarLista() {
  const container = document.getElementById('chamados-list');
  const emptyState = document.getElementById('empty-state');

  container.innerHTML = '';

  if (state.chamados.length === 0) {
    emptyState.removeAttribute('hidden');
    return;
  }
  emptyState.setAttribute('hidden', '');

  state.chamados.forEach((c, i) => {
    const card = criarCard(c, i);
    container.appendChild(card);
  });
}

// ============================================================
// CRIAR CARD
// ============================================================
function criarCard(c, index) {
  const card = document.createElement('div');
  card.className = `chamado-card status-${c.status}`;
  card.style.animationDelay = `${index * 0.05}s`;

  const labelStatus = {
    aberto: 'Aberto',
    em_atendimento: 'Em Atendimento',
    aguardando_usuario: 'Aguardando',
    resolvido: 'Resolvido',
    fechado: 'Fechado',
    cancelado: 'Cancelado',
  };

  card.innerHTML = `
    <span class="card-protocolo">#${c.id}</span>
    <div class="card-info">
      <div class="card-titulo">${c.titulo}</div>
      <div class="card-meta">
        ${c.solicitante || '—'} · 
        ${c.tecnico || 'Não atribuído'} · 
        ${c.categoria || '—'} · 
        IP: ${c.ip_maquina || '—'} ·
        ${formatarData(c.aberto_em)}
      </div>
    </div>
    <span class="card-status status-${c.status}">${labelStatus[c.status] || c.status}</span>
    <div class="card-actions">
      <a href="detalhe-chamados.html?id=${c.id}" class="btn-detalhe" title="Detalhes">🔍</a>
    </div>
  `;

  // Clique no card também redireciona para detalhes
  card.addEventListener('click', (e) => {
    // Não redireciona se clicou no ícone (já é um link)
    if (!e.target.closest('.btn-detalhe')) {
      window.location.href = `detalhe-chamados.html?id=${c.id}`;
    }
  });

  return card;
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function formatarData(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
