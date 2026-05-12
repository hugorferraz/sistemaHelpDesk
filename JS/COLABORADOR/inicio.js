document.addEventListener('DOMContentLoaded', async () => {
  // Atualiza sidebar e saudação
  atualizarSidebar();
  atualizarSaudacao();

  // Carrega dados para os cards de resumo e feeds
  try {
    // Obtém resumo e lista de chamados (limitada a 4, ordenada por mais recentes)
    const meusDados = await fetchAuth('/chamados/meus?ordem=recente&limite=4');
    atualizarResumo(meusDados.resumo);
    atualizarUltimosChamados(meusDados.chamados);
  } catch (erro) {
    console.error('Erro ao carregar chamados:', erro);
    document.getElementById('summary-bar').innerHTML = '<p style="color:red;">Erro ao carregar resumo.</p>';
  }

  // Obtém últimas notificações (feed de atualizações)
  try {
    const notificacoes = await fetchAuth('/notificacoes?limite=5');
    atualizarUltimasAtualizacoes(notificacoes);
  } catch (erro) {
    console.error('Erro ao carregar notificações:', erro);
    document.getElementById('latest-updates').innerHTML = '<p class="empty-feed-message">Sem atualizações recentes.</p>';
  }

  // Badge de notificações (conta as não lidas)
  try {
    const notifData = await fetchAuth('/notificacoes');
    const naoLidas = notifData.filter(n => !n.lida).length;
    const badge = document.getElementById('badge-notif');
    if (badge) badge.textContent = naoLidas > 0 ? naoLidas : '';
  } catch (erro) {
    console.error('Erro ao carregar badge:', erro);
  }
});

// ------------------------------------------------------------
// CARDS DE RESUMO
// ------------------------------------------------------------
function atualizarResumo(resumo) {
  const abertos = resumo?.aberto || 0;
  const emAtendimento = resumo?.em_atendimento || 0;
  const aguardando = resumo?.aguardando_usuario || 0;

  document.getElementById('summary-bar').innerHTML = `
    <div class="summary-card aberto">
      <span class="summary-number">${abertos}</span>
      <span class="summary-label">Abertos</span>
    </div>
    <div class="summary-card em_atendimento">
      <span class="summary-number">${emAtendimento}</span>
      <span class="summary-label">Em Atendimento</span>
    </div>
    <div class="summary-card aguardando_usuario">
      <span class="summary-number">${aguardando}</span>
      <span class="summary-label">Aguardando Você</span>
    </div>
  `;
}

// ------------------------------------------------------------
// ÚLTIMOS CHAMADOS (feed)
// ------------------------------------------------------------
function atualizarUltimosChamados(chamados) {
  const container = document.getElementById('latest-tickets');
  if (!chamados || chamados.length === 0) {
    container.innerHTML = '<p class="empty-feed-message">Nenhum chamado recente.</p>';
    return;
  }
  container.innerHTML = chamados.map(c => `
    <a href="meus-chamados.html?protocolo=${c.id}" class="ticket-feed-item">
      <span class="ticket-feed-protocolo">#${c.id}</span>
      <div class="ticket-feed-info">
        <div class="ticket-feed-titulo">${c.titulo}</div>
        <div class="ticket-feed-meta">${formatarData(c.aberto_em)} · ${c.prioridade}</div>
      </div>
      <span class="ticket-feed-status status-${c.status}">${c.status}</span>
    </a>
  `).join('');
}

// ------------------------------------------------------------
// ÚLTIMAS ATUALIZAÇÕES (feed de notificações)
// ------------------------------------------------------------
function atualizarUltimasAtualizacoes(notificacoes) {
  const container = document.getElementById('latest-updates');
  if (!notificacoes || notificacoes.length === 0) {
    container.innerHTML = '<p class="empty-feed-message">Nenhuma atualização recente.</p>';
    return;
  }
  container.innerHTML = notificacoes.map(n => `
    <div class="timeline-feed-item">
      <span class="timeline-feed-dot"></span>
      <div>
        <div class="timeline-feed-text">${n.texto}</div>
        <div class="timeline-feed-time">${formatarData(n.criado_em)}</div>
      </div>
    </div>
  `).join('');
}

// ------------------------------------------------------------
// FUNÇÕES AUXILIARES
// ------------------------------------------------------------
function formatarData(data) {
  if (!data) return '—';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}