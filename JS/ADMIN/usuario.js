let usuariosList = []; // armazena a última lista carregada

document.addEventListener('DOMContentLoaded', () => {
  carregarUsuarios();

  document.getElementById('btn-novo-usuario').addEventListener('click', abrirModal);
  document.getElementById('modal-cancel').addEventListener('click', fecharModal);
  document.getElementById('modal-salvar').addEventListener('click', salvarUsuario);

  document.getElementById('search-usuario').addEventListener('input', carregarUsuarios);
  document.getElementById('filter-perfil').addEventListener('change', carregarUsuarios);
  document.getElementById('filter-ativo').addEventListener('change', carregarUsuarios);

  atualizarSidebar();
});

// ------------------------------------------------------------
// CARREGAR USUÁRIOS DA API
// ------------------------------------------------------------
async function carregarUsuarios() {
  const termo = document.getElementById('search-usuario').value;
  const perfil = document.getElementById('filter-perfil').value;
  const ativo = document.getElementById('filter-ativo').value;

  const params = new URLSearchParams();
  if (termo) params.append('search', termo);
  if (perfil) params.append('id_perfil', perfil);
  if (ativo !== '') params.append('ativo', ativo);

  try {
    const data = await fetchAuth('/usuarios?' + params);
    usuariosList = data; // armazena globalmente
    renderizarTabela(data);
  } catch (erro) {
    console.error('Erro ao carregar usuários:', erro);
    alert('Erro ao carregar lista de usuários.');
  }
}

// ------------------------------------------------------------
// RENDERIZAR TABELA
// ------------------------------------------------------------
function renderizarTabela(usuarios) {
  const tbody = document.getElementById('usuario-body');
  if (!usuarios || usuarios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum usuário encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = usuarios.map(u => `
    <tr>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${u.perfil}</td>
      <td>${u.setor || '—'}</td>
      <td>${u.ramal || '—'}</td>
      <td>${u.ativo ? '✅' : '❌'}</td>
      <td>
        <button class="btn-editar" onclick="editarUsuario(${u.id})">✏️</button>
        <button class="btn-toggle" onclick="toggleUsuario(${u.id})">${u.ativo ? '🔒' : '🔓'}</button>
      </td>
    </tr>
  `).join('');
}

// ------------------------------------------------------------
// ABRIR MODAL (CRIAÇÃO)
// ------------------------------------------------------------
function abrirModal() {
  document.getElementById('edit-id').value = '';
  document.getElementById('modal-title').textContent = 'Novo Usuário';
  document.getElementById('edit-nome').value = '';
  document.getElementById('edit-email').value = '';
  document.getElementById('edit-perfil').value = '3';
  document.getElementById('edit-setor').value = '1';
  document.getElementById('edit-ramal').value = '';
  document.getElementById('edit-senha').value = '';
  document.getElementById('modal-usuario').hidden = false;
}

// ------------------------------------------------------------
// EDITAR USUÁRIO
// ------------------------------------------------------------
window.editarUsuario = function(id) {
  const u = usuariosList.find(x => x.id == id);
  if (!u) {
    alert('Usuário não encontrado na lista.');
    return;
  }

  document.getElementById('edit-id').value = u.id;
  document.getElementById('edit-nome').value = u.nome;
  document.getElementById('edit-email').value = u.email;
  document.getElementById('edit-perfil').value = u.id_perfil ?? 3;
  document.getElementById('edit-setor').value = u.id_setor ?? 1;
  document.getElementById('edit-ramal').value = u.ramal || '';
  document.getElementById('edit-senha').value = ''; // nunca preencher a senha atual
  document.getElementById('modal-title').textContent = 'Editar Usuário';
  document.getElementById('modal-usuario').hidden = false;
};

// ------------------------------------------------------------
// ATIVAR / DESATIVAR
// ------------------------------------------------------------
window.toggleUsuario = async function(id) {
  try {
    await fetchAuth(`/usuarios/${id}/ativo`, { method: 'PATCH' });
    carregarUsuarios();
  } catch (erro) {
    alert('Erro ao alterar status: ' + erro.message);
  }
};

// ------------------------------------------------------------
// FECHAR MODAL
// ------------------------------------------------------------
function fecharModal() {
  document.getElementById('modal-usuario').hidden = true;
}

// ------------------------------------------------------------
// SALVAR USUÁRIO (CRIAR / EDITAR)
// ------------------------------------------------------------
async function salvarUsuario() {
  const id = document.getElementById('edit-id').value;
  const nome = document.getElementById('edit-nome').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const id_perfil = parseInt(document.getElementById('edit-perfil').value);
  const id_setor = parseInt(document.getElementById('edit-setor').value);
  const ramal = document.getElementById('edit-ramal').value.trim();
  const senha = document.getElementById('edit-senha').value.trim();

  // Validações
  if (!nome || !email) {
    alert('Nome e e-mail são obrigatórios.');
    return;
  }
  if (!id && senha.length < 6) {
    alert('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  const dados = {
    nome,
    email,
    id_perfil,
    id_setor,
    ramal,
    // só envia senha se fornecida (na edição pode deixar em branco)
    ...(senha ? { senha } : {})
  };

  try {
    if (id) {
      // Editar
      await fetchAuth(`/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dados)
      });
    } else {
      // Criar
      await fetchAuth('/usuarios', {
        method: 'POST',
        body: JSON.stringify({ ...dados, senha }) // senha obrigatória na criação
      });
    }
    fecharModal();
    carregarUsuarios();
  } catch (erro) {
    console.error('Erro ao salvar:', erro);
    // Tenta exibir detalhes se a resposta for HTML
    try {
      const responseText = erro.message; // pode conter texto da resposta se capturado
      alert('Erro ao salvar: ' + responseText);
    } catch (_) {
      alert('Erro ao salvar. Veja o console para mais detalhes.');
    }
  }
}