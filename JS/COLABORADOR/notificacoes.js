document.addEventListener('DOMContentLoaded', () => {
  // Notificações mockadas
  let notificacoes = [
    {
      id: 1,
      lida: false,
      tipo: 'atualizacao',
      titulo: 'Chamado atualizado',
      texto: 'Seu chamado #2026/0001 foi <strong>atualizado</strong> para Em Atendimento.',
      data: '2026-05-06 10:30',
      link: 'meus-chamados.html?protocolo=2026/0001'
    },
    {
      id: 2,
      lida: false,
      tipo: 'resposta',
      titulo: 'Técnico respondeu',
      texto: 'O técnico <strong>Carlos</strong> respondeu ao seu chamado #2026/0002.',
      data: '2026-05-05 15:45',
      link: 'meus-chamados.html?protocolo=2026/0002'
    },
    {
      id: 3,
      lida: false,
      tipo: 'resolvido',
      titulo: 'Chamado resolvido',
      texto: 'Seu chamado #2026/0005 foi marcado como <strong>Resolvido</strong>. Avalie o atendimento.',
      data: '2026-05-04 09:20',
      link: 'meus-chamados.html?protocolo=2026/0005'
    },
    {
      id: 4,
      lida: true,
      tipo: 'aguardando',
      titulo: 'Aguardando sua resposta',
      texto: 'O chamado #2026/0003 precisa de mais informações. <strong>Aguardando você.</strong>',
      data: '2026-05-03 14:10',
      link: 'meus-chamados.html?protocolo=2026/0003'
    }
  ];

  const listaContainer = document.getElementById('notifications-list');
  const emptyState = document.getElementById('empty-state');
  const badge = document.getElementById('badge-notif');

  function renderNotifications() {
    if (notificacoes.length === 0) {
      listaContainer.innerHTML = '';
      emptyState.hidden = false;
      badge.textContent = '0';
      return;
    }

    emptyState.hidden = true;
    const naoLidas = notificacoes.filter(n => !n.lida).length;
    badge.textContent = naoLidas > 0 ? naoLidas : '';

    listaContainer.innerHTML = notificacoes
      .sort((a, b) => (a.lida === b.lida ? 0 : a.lida ? 1 : -1) || new Date(b.data) - new Date(a.data))
      .map(notif => `
        <div class="notification-item ${notif.lida ? '' : 'unread'}" data-id="${notif.id}">
          <span class="notification-icon">${getIcone(notif.tipo)}</span>
          <div class="notification-content">
            <div class="notification-title">${notif.titulo}</div>
            <div class="notification-text">${notif.texto}</div>
            <div class="notification-time">${notif.data}</div>
          </div>
          <div class="notification-actions">
            ${notif.lida ? '' : `<button class="btn-mark-read" data-id="${notif.id}">Marcar como lida</button>`}
            <a href="${notif.link}" style="text-decoration:none; color: var(--blue-700); font-size:12px; font-weight:600;">Ver</a>
          </div>
        </div>
      `).join('');
  }

  function getIcone(tipo) {
    const icons = {
      atualizacao: '🔄',
      resposta: '💬',
      resolvido: '✅',
      aguardando: '⏳'
    };
    return icons[tipo] || '🔔';
  }

  // Marcar como lida individualmente
  listaContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-mark-read');
    if (btn) {
      const id = parseInt(btn.dataset.id, 10);
      const notif = notificacoes.find(n => n.id === id);
      if (notif && !notif.lida) {
        notif.lida = true;
        renderNotifications();
        // Aqui poderia enviar para o backend
      }
    }
    // Se clicar no item inteiro, também pode marcar como lida (opcional)
    const item = e.target.closest('.notification-item');
    if (item && !e.target.closest('a') && !e.target.closest('button')) {
      const id = parseInt(item.dataset.id, 10);
      const notif = notificacoes.find(n => n.id === id);
      if (notif && !notif.lida) {
        notif.lida = true;
        renderNotifications();
      }
      // Navegar para o link do chamado
      if (notif.link) window.location.href = notif.link;
    }
  });

  // Marcar todas como lidas
  document.getElementById('btn-mark-all-read').addEventListener('click', () => {
    notificacoes.forEach(n => n.lida = true);
    renderNotifications();
  });

  renderNotifications();
  atualizarSidebar();
});
