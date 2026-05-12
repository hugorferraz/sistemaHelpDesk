document.addEventListener('DOMContentLoaded', () => {
  atualizarSidebar();
  // Preencher filtros
  const selectTecnico = document.getElementById('rel-tecnico');
  const selectCategoria = document.getElementById('rel-categoria');
  tecnicos = usuarios.filter(u => u.id_perfil === 2);
  selectTecnico.innerHTML += tecnicos.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
  CATEGORIAS.forEach(cat => selectCategoria.innerHTML += `<option value="${cat}">${cat}</option>`);

  document.getElementById('btn-gerar').addEventListener('click', gerarRelatorio);
  document.getElementById('btn-export').addEventListener('click', exportarCSV);

  function gerarRelatorio() {
    const inicio = document.getElementById('data-inicio').value;
    const fim = document.getElementById('data-fim').value;
    const status = document.getElementById('rel-status').value;
    const tecnico = document.getElementById('rel-tecnico').value;
    const categoria = document.getElementById('rel-categoria').value;

    let filtrados = [...chamados];
    if (inicio) filtrados = filtrados.filter(c => new Date(c.aberto_em) >= new Date(inicio));
    if (fim) filtrados = filtrados.filter(c => new Date(c.aberto_em) <= new Date(fim + 'T23:59:59'));
    if (status) filtrados = filtrados.filter(c => c.status === status);
    if (tecnico) filtrados = filtrados.filter(c => c.id_tecnico == tecnico);
    if (categoria) filtrados = filtrados.filter(c => c.id_categoria === categoria);

    document.getElementById('resumo-cards').innerHTML = `
      <div class="resumo-card"><strong>${filtrados.length}</strong><br>Total de Chamados</div>
      <div class="resumo-card"><strong>${filtrados.filter(c => c.sla_atendido).length}</strong><br>SLA Cumprido</div>
      <div class="resumo-card"><strong>${filtrados.filter(c => !c.sla_atendido && (c.status === 'aberto' || c.status === 'em_atendimento')).length}</strong><br>SLA Violado</div>
    `;

    const tbody = document.getElementById('relatorio-body');
    if (filtrados.length === 0) {
      tbody.innerHTML = '';
      document.getElementById('empty-message').hidden = false;
      return;
    }
    document.getElementById('empty-message').hidden = true;
    tbody.innerHTML = filtrados.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td>${c.titulo}</td>
        <td>${getUsuario(c.id_solicitante)?.nome}</td>
        <td>${getUsuario(c.id_tecnico)?.nome || '—'}</td>
        <td>${c.id_categoria}</td>
        <td>${STATUS[c.status]}</td>
        <td>${formatarData(c.aberto_em)}</td>
        <td>${c.sla_atendido ? '✅' : '❌'}</td>
      </tr>`).join('');
  }

  function exportarCSV() {
    const rows = [['ID','Título','Solicitante','Técnico','Categoria','Status','Abertura','SLA']];
    const filtrados = [...chamados]; // poderia pegar a lista atual
    filtrados.forEach(c => rows.push([c.id, c.titulo, getUsuario(c.id_solicitante)?.nome, getUsuario(c.id_tecnico)?.nome, c.id_categoria, STATUS[c.status], c.aberto_em, c.sla_atendido ? 'Sim' : 'Não']));
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  // Gerar automático ao carregar
  gerarRelatorio();
  
});