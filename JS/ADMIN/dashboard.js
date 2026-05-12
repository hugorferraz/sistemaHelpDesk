document.addEventListener('DOMContentLoaded', async () => {
  // Data atual
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // Atualiza sidebar com dados do usuário logado
  atualizarSidebar();

  // Atualiza saudação
  atualizarSaudacao();

  // Carrega dados do dashboard
  try {
    const summary = await fetchAuth('/dashboard/summary');
    preencherResumo(summary.totais);
    preencherGraficoStatus(summary.totais);
    preencherGraficoCategorias(summary.categorias);
    preencherChamadosCriticos(summary.chamados_criticos);
  } catch (erro) {
    console.error('Erro ao carregar dashboard:', erro);
    document.getElementById('summary-grid').innerHTML = '<p style="color:red;">Erro ao carregar resumo.</p>';
  }

  try {
    const desempenho = await fetchAuth('/dashboard/tecnico');
    preencherDesempenhoTecnicos(desempenho);
  } catch (erro) {
    console.error('Erro ao carregar desempenho dos técnicos:', erro);
    document.getElementById('tech-performance-body').innerHTML = '<tr><td colspan="5">Erro ao carregar.</td></tr>';
  }
});

// ------------------------------------------------------------
// SIDEBAR DINÂMICA
// ------------------------------------------------------------
function atualizarSidebar() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario) return;

  const nome = usuario.nome || 'Usuário';
  const perfil = usuario.perfil || 'colaborador';

  const perfilTexto = {
    admin: 'Administrador',
    tecnico: 'Técnico',
    colaborador: 'Colaborador'
  }[perfil] || perfil;

  // Iniciais do avatar (até 2 letras)
  const iniciais = nome.split(' ').map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');

  const elNome = document.getElementById('sidebar-nome');
  const elRole = document.getElementById('sidebar-role');
  const elAvatar = document.getElementById('sidebar-avatar');

  if (elNome) elNome.textContent = nome;
  if (elRole) elRole.textContent = perfilTexto;
  if (elAvatar) elAvatar.textContent = iniciais || '??';
}

// ------------------------------------------------------------
// SAUDAÇÃO
// ------------------------------------------------------------
function atualizarSaudacao() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const nome = usuario?.nome || 'Usuário';
  const perfil = usuario?.perfil || '';
  const perfilTexto = {
    admin: 'Administrador',
    tecnico: 'Técnico',
    colaborador: 'Colaborador'
  }[perfil] || '';

  const el = document.getElementById('welcome-message');
  if (el) {
    el.textContent = `👋 Olá, ${nome}`;
  }
}

// ------------------------------------------------------------
// PREENCHER RESUMO (cards)
// ------------------------------------------------------------
function preencherResumo(totais) {
  const total = Object.values(totais).reduce((a, b) => a + b, 0);
  document.getElementById('summary-grid').innerHTML = `
    <div class="summary-card"><span class="summary-number">${total}</span><span class="summary-label">Total de Chamados</span></div>
    <div class="summary-card abertos"><span class="summary-number">${totais.aberto || 0}</span><span class="summary-label">Abertos</span></div>
    <div class="summary-card em_atendimento"><span class="summary-number">${totais.em_atendimento || 0}</span><span class="summary-label">Em Atendimento</span></div>
    <div class="summary-card resolvidos"><span class="summary-number">${totais.resolvido || 0}</span><span class="summary-label">Resolvidos</span></div>
    <div class="summary-card sla"><span class="summary-number">${totais.sla_violado || 0}</span><span class="summary-label">SLA Violado</span></div>
  `;
}

// ------------------------------------------------------------
// GRÁFICO DE BARRAS (status)
// ------------------------------------------------------------
function preencherGraficoStatus(totais) {
  const statusMap = {
    aberto: 'Aberto',
    em_atendimento: 'Em Atend.',
    aguardando_usuario: 'Aguard. Usuário',
    resolvido: 'Resolvido',
    fechado: 'Fechado',
    cancelado: 'Cancelado'
  };
  const colors = {
    aberto: '#E85D27',
    em_atendimento: '#0097a7',
    aguardando_usuario: '#F5A623',
    resolvido: '#4CAF35',
    fechado: '#6b7280',
    cancelado: '#D92B27'
  };

  const entries = Object.entries(totais).filter(([s]) => statusMap[s]);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  let html = '';
  for (const [status, count] of entries) {
    const pct = (count / maxVal) * 100;
    html += `
      <div class="bar-item">
        <div class="bar-value">${count}</div>
        <div class="bar-fill" style="height:${pct}%; background:${colors[status] || '#1a3d8f'};"></div>
        <div class="bar-label">${statusMap[status]}</div>
      </div>`;
  }
  document.getElementById('bar-chart-status').innerHTML = html;
}

// ------------------------------------------------------------
// GRÁFICO DE CATEGORIAS (donut)
// ------------------------------------------------------------
function preencherGraficoCategorias(categorias) {
  const donut = document.getElementById('donut-chart-categoria');
  if (!categorias || categorias.length === 0) {
    donut.innerHTML = '<p>Nenhum dado.</p>';
    return;
  }

  const total = categorias.reduce((s, c) => s + c.total, 0);
  const catColors = ['#E85D27', '#1a3d8f', '#F5A623', '#4CAF35', '#0097a7', '#d1d5db'];
  let cumulative = 0;
  let grad = [];
  let legend = '';

  categorias.forEach((cat, i) => {
    const deg = (cat.total / total) * 360;
    grad.push(`${catColors[i % catColors.length]} ${cumulative}deg ${cumulative + deg}deg`);
    legend += `<div class="legend-item"><span class="legend-color" style="background:${catColors[i % catColors.length]}"></span>${cat.nome}: ${cat.total}</div>`;
    cumulative += deg;
  });

  donut.innerHTML = `
    <div class="donut-container">
      <div class="donut-ring" style="background: conic-gradient(${grad.join(',')});"></div>
      <div class="donut-legend">${legend}</div>
    </div>`;
}

// ------------------------------------------------------------
// CHAMADOS CRÍTICOS
// ------------------------------------------------------------
function preencherChamadosCriticos(lista) {
  const container = document.getElementById('urgent-list');
  if (!lista || lista.length === 0) {
    container.innerHTML = '<p style="color: var(--gray-500);">Nenhum chamado crítico no momento.</p>';
    return;
  }
  container.innerHTML = lista.map(c => `
    <a href="detalhe-chamados.html?id=${c.id}" class="urgent-item">
      <span class="urgent-protocolo">#${c.id}</span>
      <div class="urgent-info">
        <div class="urgent-titulo">${c.titulo}</div>
        <div class="urgent-meta">${c.solicitante} · ${c.prioridade}</div>
      </div>
      <span class="urgent-status status-${c.status}">${c.status}</span>
      <span style="color:${c.prioridade === 'critica' ? 'var(--red)' : 'var(--orange)'}">⚠️</span>
    </a>
  `).join('');
}

// ------------------------------------------------------------
// DESEMPENHO DE TÉCNICOS
// ------------------------------------------------------------
function preencherDesempenhoTecnicos(dados) {
  const tbody = document.getElementById('tech-performance-body');
  if (!dados || dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">Nenhum dado.</td></tr>';
    return;
  }
  tbody.innerHTML = dados.map(d => `
    <tr>
      <td>${d.tecnico || '—'}</td>
      <td>${d.abertos || 0}</td>
      <td>${d.em_atendimento || 0}</td>
      <td>${d.resolvidos || 0}</td>
      <td>${d.total_geral || 0}</td>
    </tr>
  `).join('');
}