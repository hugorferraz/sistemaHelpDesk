// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================
let state = {
  chamados: [],
  filtroStatus: 'todos',
  filtroCategoria: '',
  filtroOrdem: 'recente',
  busca: '',
  chamadoAberto: null,
  avaliacaoNota: 0,
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  atualizarSidebar();

  // Carrega chamados do backend
  await carregarChamados();

  initFiltros();
  initModal();
  atualizarBadgeNotificacoes();
  document.getElementById('btn-responder').addEventListener('click', enviarResposta);
});

// ============================================================
// CARREGAR CHAMADOS DA API
// ============================================================
async function carregarChamados() {
  try {
    const params = new URLSearchParams();
    if (state.filtroStatus && state.filtroStatus !== 'todos') {
      params.append('status', state.filtroStatus);
    }
    if (state.busca) {
      params.append('search', state.busca);
    }
    if (state.filtroOrdem) {
      params.append('ordem', state.filtroOrdem);
    }

    const data = await fetchAuth('/chamados/meus?' + params);
    state.chamados = data.chamados || [];

    // Aplica filtro de categoria localmente (se o backend não filtrar)
    if (state.filtroCategoria) {
      state.chamados = state.chamados.filter(c => c.categoria === state.filtroCategoria);
    }

    atualizarResumos(data.resumo);
    renderLista();
  } catch (erro) {
    console.error('Erro ao carregar chamados:', erro);
    document.getElementById('chamados-list').innerHTML = '<p style="text-align:center;color:red;">Erro ao carregar chamados.</p>';
  }
}

// ============================================================
// RESUMOS (cards superiores)
// ============================================================
function atualizarResumos(resumo) {
  if (resumo) {
    const total = Object.values(resumo).reduce((a, b) => a + b, 0);
    document.getElementById('total-todos').textContent = total;
    document.getElementById('total-aberto').textContent = resumo.aberto || 0;
    document.getElementById('total-atentimento').textContent = resumo.em_atendimento || 0;
    document.getElementById('total-aguardando').textContent = resumo.aguardando_usuario || 0;
    document.getElementById('total-resolvido').textContent = resumo.resolvido || 0;
    document.getElementById('total-fechado').textContent = resumo.fechado || 0;
  }

  // Highlight card ativo
  document.querySelectorAll('.summary-card').forEach(card => {
    card.classList.toggle('active', card.dataset.filter === state.filtroStatus);
  });
}

// ============================================================
// BADGE DE NOTIFICAÇÕES
// ============================================================
async function atualizarBadgeNotificacoes() {
  try {
    const notifData = await fetchAuth('/notificacoes');
    const naoLidas = notifData.filter(n => !n.lida).length;
    const badge = document.querySelector('.badge');
    if (badge) badge.textContent = naoLidas > 0 ? naoLidas : '';
  } catch (erro) {
    console.error('Erro ao carregar badge:', erro);
  }
}

// ============================================================
// FILTROS
// ============================================================
function initFiltros() {
  // Cards de status
  document.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('click', () => {
      state.filtroStatus = card.dataset.filter;
      atualizarResumos();
      carregarChamados();
    });
  });

  // Busca
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.busca = searchInput.value.trim().toLowerCase();
      searchClear.hidden = !state.busca;
      carregarChamados();
    }, 400); // debounce de 400ms
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.busca = '';
    searchClear.hidden = true;
    carregarChamados();
  });

  // Select de categoria
  document.getElementById('filter-categoria').addEventListener('change', e => {
    state.filtroCategoria = e.target.value;
    carregarChamados();
  });

  // Select de ordem
  document.getElementById('filter-ordem').addEventListener('change', e => {
    state.filtroOrdem = e.target.value;
    carregarChamados();
  });
}

// ============================================================
// RENDER LISTA
// ============================================================
function renderLista() {
  const container = document.getElementById('chamados-list');
  const emptyState = document.getElementById('empty-state');

  container.innerHTML = '';

  if (state.chamados.length === 0) {
    emptyState.removeAttribute('hidden');
    return;
  }
  emptyState.setAttribute('hidden', '');

  state.chamados.forEach((chamado, i) => {
    const card = criarCard(chamado, i);
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
    aguardando_usuario: 'Aguardando Você',
    resolvido: 'Resolvido',
    fechado: 'Fechado',
    cancelado: 'Cancelado',
  };

  card.innerHTML = `
    <div class="card-left">
      <span class="card-protocolo">#${c.id}</span>
      <span class="prioridade-pill ${c.prioridade}">${capitalize(c.prioridade)}</span>
    </div>
    <div class="card-center">
      <p class="card-titulo">${c.titulo}</p>
      <div class="card-meta">
        <span class="card-meta-item"><span class="card-meta-icon">📁</span>${c.categoria || '—'}</span>
        <span class="card-meta-item"><span class="card-meta-icon">👤</span>${c.tecnico || 'Sem técnico'}</span>
        <span class="card-meta-item"><span class="card-meta-icon">🕐</span>${formatDate(c.aberto_em)}</span>
      </div>
    </div>
    <div class="card-right">
      <span class="status-badge ${c.status}">${labelStatus[c.status] || c.status}</span>
      <span class="card-tempo">${tempoRelativo(c.aberto_em)}</span>
      <span class="card-arrow">›</span>
    </div>
  `;

  card.addEventListener('click', () => abrirModal(c));
  return card;
}

// ============================================================
// MODAL DETALHE
// ============================================================
function initModal() {
  document.getElementById('modal-close').addEventListener('click', fecharModal);
  document.getElementById('modal-detalhe').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharModal();
  });

  // Avaliação — estrelas
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      state.avaliacaoNota = parseInt(star.dataset.value);
      document.querySelectorAll('.star').forEach((s, i) => {
        s.classList.toggle('active', i < state.avaliacaoNota);
      });
    });
  });

  document.getElementById('btn-avaliar').addEventListener('click', enviarAvaliacao);
}

async function abrirModal(c) {
  state.chamadoAberto = c;
  state.avaliacaoNota = 0;

  const labelStatus = {
    aberto: 'Aberto',
    em_atendimento: 'Em Atendimento',
    aguardando_usuario: 'Aguardando Você',
    resolvido: 'Resolvido',
    fechado: 'Fechado',
    cancelado: 'Cancelado',
  };

  document.getElementById('det-protocolo').textContent = '#' + c.id;
  document.getElementById('det-titulo').textContent = c.titulo;
  document.getElementById('det-categoria').textContent = c.categoria || '—';
  document.getElementById('det-data').textContent = formatDate(c.aberto_em);
  document.getElementById('det-update').textContent = formatDate(c.updated_em || c.updated_at);
  document.getElementById('det-tecnico').textContent = c.tecnico || 'Não atribuído';
  document.getElementById('det-ip').textContent = c.ip_maquina || '—';
  document.getElementById('det-descricao').textContent = c.descricao;

  // Prioridade
  const prioEl = document.getElementById('det-prioridade');
  prioEl.innerHTML = `<span class="prioridade-pill ${c.prioridade}">${capitalize(c.prioridade)}</span>`;

  // Status badge
  const statusBadge = document.getElementById('det-status-badge');
  statusBadge.textContent = labelStatus[c.status];
  statusBadge.className = `modal-status-badge status-badge ${c.status}`;

  // Busca histórico e avaliação do backend
  await carregarDetalhesChamado(c.id);

  document.getElementById('modal-detalhe').removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

async function carregarDetalhesChamado(id) {
  try {
    const data = await fetchAuth(`/chamados/${id}`);
    
    // Timeline
    if (data.historico && data.historico.length > 0) {
      renderTimeline(data.historico);
    } else {
      document.getElementById('det-timeline').innerHTML = '<p style="font-size:13px;color:var(--gray-500)">Nenhuma interação registrada.</p>';
    }

    // Campo de resposta (quando aguardando usuário)
    const respostaWrap = document.getElementById('resposta-wrap');
    if (data.chamado.status === 'aguardando_usuario') {
      respostaWrap.removeAttribute('hidden');
    } else {
      respostaWrap.setAttribute('hidden', '');
    }

    // Avaliação
    const avalWrap = document.getElementById('avaliacao-wrap');
    const podeAvaliar = (data.chamado.status === 'resolvido' || data.chamado.status === 'fechado') && !data.avaliacao;
    avalWrap.toggleAttribute('hidden', !podeAvaliar);

    // Resetar estrelas
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
    document.getElementById('avaliacap-comentario').value = '';

  } catch (erro) {
    console.error('Erro ao carregar detalhes:', erro);
  }
}

function fecharModal() {
  document.getElementById('modal-detalhe').setAttribute('hidden', '');
  document.body.style.overflow = '';
  state.chamadoAberto = null;
}

function renderTimeline(historico) {
  const container = document.getElementById('det-timeline');
  container.innerHTML = '';

  if (!historico.length) {
    container.innerHTML = '<p style="font-size:13px;color:var(--gray-500)">Nenhuma interação registrada.</p>';
    return;
  }

  const labelTipo = {
    comentario: 'Comentário',
    nota_interna: 'Nota Interna',
    mudanca_status: 'Status',
    mudanca_tecnico: 'Técnico',
    mudanca_prioridade: 'Prioridade',
  };

  historico.forEach(h => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="tl-dot-wrap">
        <div class="tl-dot ${h.tipo}"></div>
        <div class="tl-line"></div>
      </div>
      <div class="tl-content">
        <div class="tl-header">
          <span class="tl-autor">${h.autor}</span>
          <span class="tl-tipo">${labelTipo[h.tipo] || h.tipo}</span>
          <span class="tl-data">${formatDate(h.created_at || h.data)}</span>
        </div>
        <div class="tl-texto">${h.descricao || h.texto}</div>
      </div>
    `;
    container.appendChild(item);
  });
}

async function enviarAvaliacao() {
  if (!state.avaliacaoNota) {
    alert('Selecione uma nota de 1 a 5 estrelas.');
    return;
  }

  const comentario = document.getElementById('avaliacap-comentario').value.trim();
  const btn = document.getElementById('btn-avaliar');

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    // Chamada real ao backend para criar avaliação
    await fetchAuth('/avaliacoes', {
      method: 'POST',
      body: JSON.stringify({
        id_chamado: state.chamadoAberto.id,
        nota: state.avaliacaoNota,
        comentario
      })
    });

    document.getElementById('avaliacao-wrap').setAttribute('hidden', '');
    alert(`Obrigado pela avaliação! Nota: ${'★'.repeat(state.avaliacaoNota)}`);

  } catch (err) {
    alert('Erro ao enviar avaliação. Tente novamente.');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar Avaliação';
  }
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  // Força exibição no fuso local do navegador
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function tempoRelativo(dateStr) {
  if (!dateStr) return '';
  
  const data = new Date(dateStr);
  const agora = new Date();
  
  // Se a data vier do banco sem fuso, adiciona o offset
  // (assumindo que o banco armazena em UTC e você está em -3)
  // data.setHours(data.getHours() - 3);
  
  const diffMs = agora.getTime() - data.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 30) return `há ${diffDays}d`;
  
  return formatDate(dateStr);
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

async function enviarResposta() {
  const texto = document.getElementById('resposta-texto').value.trim();
  if (!texto) {
    alert('Digite uma resposta.');
    return;
  }

  const btn = document.getElementById('btn-responder');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    // Adiciona comentário
    await fetchAuth(`/chamados/${state.chamadoAberto.id}/historico`, {
      method: 'POST',
      body: JSON.stringify({ tipo: 'comentario', texto })
    });

    // Muda status de volta para em_atendimento
    await fetchAuth(`/chamados/${state.chamadoAberto.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ acao: 'iniciar_atendimento' })
    });

    document.getElementById('resposta-texto').value = '';
    document.getElementById('resposta-wrap').setAttribute('hidden', '');
    
    // Recarrega detalhes
    await carregarDetalhesChamado(state.chamadoAberto.id);
    
    alert('Resposta enviada com sucesso!');
  } catch (erro) {
    alert('Erro ao enviar resposta: ' + erro.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📤 Enviar Resposta';
  }
}