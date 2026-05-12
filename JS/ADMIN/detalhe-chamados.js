let chamadoAtual = null;
let historicoAtual = [];
let acaoTipo = '';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  atualizarSidebar();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    document.getElementById('detalhe-container').innerHTML = '<p>Chamado não encontrado.</p>';
    return;
  }

  await carregarDetalhes(id);
  initModalAcao();
});

// ============================================================
// CARREGAR DETALHES DO CHAMADO
// ============================================================
async function carregarDetalhes(id) {
  try {
    const data = await fetchAuth(`/chamados/${id}`);
    chamadoAtual = data.chamado;
    historicoAtual = data.historico || [];

    renderizarDetalhes();
    renderizarHistorico();
    renderizarAcoes();
  } catch (erro) {
    console.error('Erro ao carregar detalhes:', erro);
    document.getElementById('detalhe-container').innerHTML = '<p style="color:red;">Erro ao carregar chamado.</p>';
  }
}

// ============================================================
// RENDERIZAR DETALHES
// ============================================================
function renderizarDetalhes() {
  const c = chamadoAtual;
  const container = document.getElementById('detalhe-container');

  const labelStatus = {
    aberto: 'Aberto',
    em_atendimento: 'Em Atendimento',
    aguardando_usuario: 'Aguardando Usuário',
    resolvido: 'Resolvido',
    fechado: 'Fechado',
    cancelado: 'Cancelado',
  };

  const prioridadeMap = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    critica: 'Crítica',
  };

  container.innerHTML = `
    <div class="detalhe-card">
      <div class="det-header">
        <div>
          <span class="det-id">#${c.id} · ${c.categoria || '—'}</span>
        </div>
        <span class="card-status status-${c.status}">${labelStatus[c.status] || c.status}</span>
      </div>

      <h2 class="det-titulo">${c.titulo}</h2>

      <div class="det-meta-grid">
        <div class="det-meta-item">
          <span class="det-meta-label">Solicitante</span>
          <span class="det-meta-value">${c.solicitante || '—'}</span>
        </div>
        <div class="det-meta-item">
          <span class="det-meta-label">Técnico</span>
          <span class="det-meta-value">${c.tecnico || 'Não atribuído'}</span>
        </div>
        <div class="det-meta-item">
          <span class="det-meta-label">Prioridade</span>
          <span class="det-meta-value">
            <span class="prioridade-pill ${c.prioridade}">${prioridadeMap[c.prioridade] || c.prioridade}</span>
          </span>
        </div>
        <div class="det-meta-item">
          <span class="det-meta-label">Abertura</span>
          <span class="det-meta-value">${formatarData(c.aberto_em)}</span>
        </div>
        <div class="det-meta-item">
          <span class="det-meta-label">SLA Prazo</span>
          <span class="det-meta-value">${formatarData(c.sla_prazo)}</span>
        </div>
        <div class="det-meta-item">
          <span class="det-meta-label">IP / Máquina</span>
          <span class="det-meta-value">${c.ip_maquina || '—'} / ${c.nome_maquina || '—'}</span>
        </div>
      </div>

      <div class="det-descricao">${c.descricao || 'Sem descrição.'}</div>

      <h3 style="margin-top:1.5rem;">Histórico</h3>
      <div class="timeline" id="det-timeline"></div>

      <div class="acoes-bar" id="acoes-bar" style="margin-top:1.5rem;"></div>
    </div>
  `;
}

// ============================================================
// RENDERIZAR HISTÓRICO (TIMELINE)
// ============================================================
function renderizarHistorico() {
  const container = document.getElementById('det-timeline');
  if (!container) return;

  if (historicoAtual.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--gray-500);">Nenhuma interação registrada.</p>';
    return;
  }

  const labelTipo = {
    comentario: 'Comentário',
    nota_interna: 'Nota Interna',
    mudanca_status: 'Status',
    mudanca_tecnico: 'Técnico',
    mudanca_prioridade: 'Prioridade',
    abertura: 'Abertura',
  };

  container.innerHTML = historicoAtual.map(h => `
    <div class="timeline-item">
      <div class="tl-dot-wrap">
        <span class="tl-dot ${h.tipo || 'comentario'}"></span>
        <span class="tl-line"></span>
      </div>
      <div class="tl-content">
        <div class="tl-header">
          <span class="tl-autor">${h.autor || h.nome || 'Sistema'}</span>
          <span class="tl-tipo">${labelTipo[h.tipo] || h.tipo}</span>
          <span class="tl-data">${formatarData(h.created_at || h.data)}</span>
        </div>
        <div class="tl-texto">${h.descricao || h.texto || ''}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// RENDERIZAR AÇÕES DISPONÍVEIS
// ============================================================
function renderizarAcoes() {
  const container = document.getElementById('acoes-bar');
  if (!container) return;

  const status = chamadoAtual.status;
  const finalizado = ['resolvido', 'fechado', 'cancelado'].includes(status);
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const perfil = usuario?.perfil || '';

  // Apenas admin e técnico podem executar ações
  if (perfil === 'colaborador') {
    container.innerHTML = '<p style="color:var(--gray-500);">Você não tem permissão para executar ações.</p>';
    return;
  }

  if (finalizado) {
    container.innerHTML = '<p style="color:var(--gray-500);">Este chamado já foi finalizado.</p>';
    return;
  }

  let botoes = '';

  // Ações disponíveis por status
  if (status === 'aberto') {
    botoes += `<button class="btn-acao" onclick="executarAcao('iniciar_atendimento')">▶️ Iniciar Atendimento</button>`;
    botoes += `<button class="btn-acao secundario" onclick="abrirModalAtribuir()">👤 Atribuir Técnico</button>`;
  }

  if (status === 'em_atendimento') {
    botoes += `<button class="btn-acao" onclick="abrirModalComentario()">💬 Adicionar Comentário</button>`;
    botoes += `<button class="btn-acao secundario" onclick="abrirModalNotaInterna()">📝 Nota Interna</button>`;
    botoes += `<button class="btn-acao secundario" onclick="executarAcao('aguardar_usuario')">⏳ Aguardar Usuário</button>`;
    botoes += `<button class="btn-acao" onclick="executarAcao('finalizar')">✅ Finalizar Chamado</button>`;
  }

  if (status === 'aguardando_usuario') {
    botoes += `<button class="btn-acao" onclick="abrirModalComentario()">💬 Responder (retornar)</button>`;
    botoes += `<button class="btn-acao" onclick="executarAcao('finalizar')">✅ Finalizar Chamado</button>`;
  }

  container.innerHTML = botoes || '<p style="color:var(--gray-500);">Nenhuma ação disponível.</p>';
}

// ============================================================
// MODAL DE AÇÃO (comentário, nota, atribuir técnico)
// ============================================================
function initModalAcao() {
  document.getElementById('modal-cancel').addEventListener('click', fecharModalAcao);
  document.getElementById('modal-acao').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharModalAcao();
  });
}

function abrirModalComentario() {
  acaoTipo = 'comentario';
  document.getElementById('modal-titulo').textContent = 'Adicionar Comentário (visível ao usuário)';
  document.getElementById('modal-texto').value = '';
  document.getElementById('modal-acao').hidden = false;
  document.getElementById('modal-texto').focus();
  document.getElementById('modal-submit').onclick = enviarComentario;
}

function abrirModalNotaInterna() {
  acaoTipo = 'nota_interna';
  document.getElementById('modal-titulo').textContent = 'Adicionar Nota Interna (visível apenas para técnicos/admin)';
  document.getElementById('modal-texto').value = '';
  document.getElementById('modal-acao').hidden = false;
  document.getElementById('modal-texto').focus();
  document.getElementById('modal-submit').onclick = enviarComentario;
}

function abrirModalAtribuir() {
  acaoTipo = 'atribuir_tecnico';

  // Buscar técnicos disponíveis
  fetchAuth('/usuarios?id_perfil=2').then(tecnicos => {
    let options = tecnicos.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
    document.getElementById('modal-titulo').textContent = 'Atribuir Técnico';
    document.getElementById('modal-texto').style.display = 'none';

    // Cria select temporário se não existir
    let select = document.getElementById('modal-select-tecnico');
    if (!select) {
      select = document.createElement('select');
      select.id = 'modal-select-tecnico';
      select.style.cssText = 'width:100%;padding:8px;border:1.5px solid var(--gray-300);border-radius:8px;';
      document.getElementById('modal-texto').parentNode.insertBefore(select, document.getElementById('modal-texto'));
    }
    select.style.display = 'block';
    select.innerHTML = options;
    document.getElementById('modal-texto').style.display = 'none';

    document.getElementById('modal-acao').hidden = false;
    document.getElementById('modal-submit').onclick = enviarAtribuicao;
  }).catch(erro => {
    alert('Erro ao carregar técnicos.');
    console.error(erro);
  });
}

function fecharModalAcao() {
  document.getElementById('modal-acao').hidden = true;
  document.getElementById('modal-texto').value = '';
  document.getElementById('modal-texto').style.display = 'block';
  const select = document.getElementById('modal-select-tecnico');
  if (select) select.style.display = 'none';
}

async function enviarComentario() {
  const texto = document.getElementById('modal-texto').value.trim();
  if (!texto) {
    alert('Digite uma mensagem.');
    return;
  }

  try {
    await fetchAuth(`/chamados/${chamadoAtual.id}/historico`, {
      method: 'POST',
      body: JSON.stringify({ tipo: acaoTipo, texto })
    });
    fecharModalAcao();
    await carregarDetalhes(chamadoAtual.id); // recarrega
  } catch (erro) {
    alert('Erro ao enviar: ' + erro.message);
  }
}

async function enviarAtribuicao() {
  const select = document.getElementById('modal-select-tecnico');
  const idTecnico = select?.value;
  if (!idTecnico) {
    alert('Selecione um técnico.');
    return;
  }

  try {
    await fetchAuth(`/chamados/${chamadoAtual.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ acao: 'atribuir_tecnico', id_tecnico: parseInt(idTecnico) })
    });
    fecharModalAcao();
    await carregarDetalhes(chamadoAtual.id);
  } catch (erro) {
    alert('Erro ao atribuir: ' + erro.message);
  }
}

// ============================================================
// EXECUTAR AÇÃO RÁPIDA (iniciar, finalizar, aguardar)
// ============================================================
window.executarAcao = async function(acao) {
  const confirmacoes = {
    iniciar_atendimento: 'Deseja iniciar o atendimento deste chamado?',
    finalizar: 'Deseja finalizar este chamado como resolvido?',
    aguardar_usuario: 'Deseja colocar este chamado como "Aguardando Usuário"?',
  };

  if (confirmacoes[acao] && !confirm(confirmacoes[acao])) return;

  try {
    await fetchAuth(`/chamados/${chamadoAtual.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ acao })
    });
    await carregarDetalhes(chamadoAtual.id);
  } catch (erro) {
    alert('Erro ao executar ação: ' + erro.message);
  }
};

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