// js/sidebar.js

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

  const iniciais = nome.split(' ').map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');

  const sidebarNome = document.getElementById('sidebar-nome');
  const sidebarRole = document.getElementById('sidebar-role');
  const sidebarAvatar = document.getElementById('sidebar-avatar');

  if (sidebarNome) sidebarNome.textContent = nome;
  if (sidebarRole) sidebarRole.textContent = perfilTexto;
  if (sidebarAvatar) sidebarAvatar.textContent = iniciais || '??';
}

function atualizarSaudacao() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const nome = usuario?.nome || 'Usuário';
  const el = document.getElementById('welcome-message');
  if (el) {
    el.textContent = `👋 Olá, ${nome}`;
  }
}