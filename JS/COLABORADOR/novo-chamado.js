document.addEventListener('DOMContentLoaded', async () => {
  atualizarSidebar();
  atualizarSaudacao();
  initDate();
  initPriority();
  initCharCount();
  initUpload();
  initForm();

  // Preenche automaticamente os dados do usuário
  await carregarDadosUsuario();
});

// ------------------------------------------------------------
// CARREGA DADOS DO USUÁRIO E PREENCHE CAMPOS AUTOMATICAMENTE
// ------------------------------------------------------------
async function carregarDadosUsuario() {
  const solicitanteInput = document.getElementById('solicitante');
  const setorInput = document.getElementById('setor');
  const ipInput = document.getElementById('ip-maquina');
  const ipStatus = document.getElementById('ip-status');

  try {
    // 1. Busca dados do usuário logado (nome e setor)
    const usuario = await fetchAuth('/auth/me');

    // Preenche nome do solicitante
    if (solicitanteInput) {
      solicitanteInput.value = usuario.nome || '';
    }

    // Preenche setor
    if (setorInput) {
      setorInput.value = usuario.setor || 'Não definido';
    }

    // 2. Captura o IP local da máquina (rede interna)
    if (ipInput) {
      try {
        const ipLocal = await getLocalIP();
        ipInput.value = ipLocal;
        if (ipStatus) ipStatus.textContent = '✅';
      } catch {
        // Fallback: tenta IP público se o local falhar
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          ipInput.value = data.ip;
          if (ipStatus) ipStatus.textContent = '⚠️ (público)';
        } catch {
          ipInput.value = 'Não detectado';
          if (ipStatus) ipStatus.textContent = '❌';
        }
      }
    }

  } catch (erro) {
    console.error('Erro ao carregar dados do usuário:', erro);
    if (solicitanteInput) solicitanteInput.value = 'Erro ao carregar';
    if (setorInput) setorInput.value = 'Erro ao carregar';
  }
}

// ------------------------------------------------------------
// OBTÉM O IP LOCAL DA MÁQUINA USANDO WebRTC
// ------------------------------------------------------------
function getLocalIP() {
  return new Promise((resolve, reject) => {
    // Configura timeout de 3 segundos
    const timeout = setTimeout(() => {
      reject(new Error('Timeout ao obter IP local'));
    }, 3000);

    try {
      const pc = new RTCPeerConnection({
        iceServers: [] // sem servidores STUN, apenas IP local
      });

      pc.createDataChannel('');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          // Extrai o IP do candidato (formato: "candidate:... 192.168.x.x ...")
          const ipMatch = candidate.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
          if (ipMatch && ipMatch[1]) {
            clearTimeout(timeout);
            pc.close();
            resolve(ipMatch[1]);
          }
        }
      };

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(err => {
          clearTimeout(timeout);
          reject(err);
        });

    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

// ------------------------------------------------------------
// DATA NO HEADER
// ------------------------------------------------------------
function initDate() {
  const el = document.getElementById('header-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

// ------------------------------------------------------------
// SELEÇÃO DE PRIORIDADE (cards radio)
// ------------------------------------------------------------
function initPriority() {
  const cards = document.querySelectorAll('.priority-card');

  cards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');

    if (radio && radio.checked) card.classList.add('selected');

    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      if (radio) radio.checked = true;
    });
  });
}

// ------------------------------------------------------------
// CONTADORES DE CARACTERES
// ------------------------------------------------------------
function initCharCount() {
  const titulo = document.getElementById('titulo');
  const desc   = document.getElementById('descricao');
  const tCount = document.getElementById('titulo-count');
  const dCount = document.getElementById('desc-count');

  titulo?.addEventListener('input', () => {
    if (tCount) tCount.textContent = titulo.value.length;
    if (tCount) tCount.style.color = titulo.value.length > 180 ? '#D92B27' : '';
  });

  desc?.addEventListener('input', () => {
    if (dCount) dCount.textContent = desc.value.length;
  });
}

// ------------------------------------------------------------
// UPLOAD DE ARQUIVOS (placeholder – o backend ainda não processa)
// ------------------------------------------------------------
function initUpload() {
  const area      = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const fileList  = document.getElementById('file-list');
  let   files     = [];

  const MAX_SIZE_MB = 10;

  if (!area || !fileInput || !fileList) return;

  area.addEventListener('click', () => fileInput.click());

  area.addEventListener('dragover', e => {
    e.preventDefault();
    area.classList.add('dragover');
  });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });

  function addFiles(newFiles) {
    Array.from(newFiles).forEach(file => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        showFileError(`"${file.name}" excede ${MAX_SIZE_MB}MB.`);
        return;
      }
      if (files.find(f => f.name === file.name && f.size === file.size)) return;

      files.push(file);
      renderFileItem(file);
    });
  }

  function renderFileItem(file) {
    const icon = getFileIcon(file.name);
    const size = formatBytes(file.size);

    const item = document.createElement('div');
    item.className    = 'file-item';
    item.dataset.name = file.name;
    item.innerHTML = `
      <span class="file-item-icon">${icon}</span>
      <span class="file-item-name" title="${file.name}">${file.name}</span>
      <span class="file-item-size">${size}</span>
      <button type="button" class="file-item-remove" title="Remover">✕</button>
    `;

    item.querySelector('.file-item-remove').addEventListener('click', () => {
      files = files.filter(f => !(f.name === file.name && f.size === file.size));
      item.remove();
    });

    fileList.appendChild(item);
  }

  function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const map = { pdf: '📄', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', docx: '📝', xlsx: '📊', txt: '📃' };
    return map[ext] || '📎';
  }

  function formatBytes(bytes) {
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  window.getUploadedFiles = () => files;
}

// ------------------------------------------------------------
// SUBMIT DO FORMULÁRIO (INTEGRADO COM BACKEND)
// ------------------------------------------------------------
function initForm() {
  const form = document.getElementById('form-chamado');
  const btn  = document.getElementById('btn-submit');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Estado de carregando
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Enviando...';
    btn.querySelector('.btn-icon').textContent = '⏳';

    try {
      const payload = buildPayload();
      console.log('Payload do chamado:', payload);

      // Chamada real ao backend
      const response = await fetchAuth('/chamados', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // response contém { id, mensagem }
      showSucesso(response.id || response.mensagem);

    } catch (err) {
      alert('Erro ao enviar chamado. Tente novamente.\n' + err.message);
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'Abrir Chamado';
      btn.querySelector('.btn-icon').textContent = '→';
    }
  });
}

// ------------------------------------------------------------
// VALIDAÇÃO
// ------------------------------------------------------------
function validateForm() {
  const campos = [
    { id: 'categoria',  msg: 'Selecione a categoria.' },
    { id: 'titulo',     msg: 'Informe o título do chamado.' },
    { id: 'descricao',  msg: 'Informe a descrição do problema.' },
  ];

  for (const campo of campos) {
    const el = document.getElementById(campo.id);
    if (!el || !el.value.trim()) {
      el?.focus();
      showFieldError(el, campo.msg);
      return false;
    }
  }

  const prioridade = document.querySelector('input[name="prioridade"]:checked');
  if (!prioridade) {
    alert('Selecione a prioridade.');
    return false;
  }

  return true;
}

function showFieldError(el, msg) {
  clearFieldError(el);
  const err = document.createElement('span');
  err.className   = 'field-error';
  err.textContent = msg;
  err.style.cssText = 'color:#D92B27;font-size:12px;margin-top:2px;';
  el?.parentElement?.appendChild(err);
  if (el?.style) el.style.borderColor = '#D92B27';
  el?.addEventListener('input', () => clearFieldError(el), { once: true });
}

function clearFieldError(el) {
  const parent = el?.parentElement;
  parent?.querySelector('.field-error')?.remove();
  if (el?.style) el.style.borderColor = '';
}

// ------------------------------------------------------------
// MONTA O PAYLOAD (ajustado para o backend)
// ------------------------------------------------------------
function buildPayload() {
  // Mapeia categoria para id numérico (supondo que o select value seja o id)
  const categoriaSelect = document.getElementById('categoria');
  const idCategoria = categoriaSelect?.value ? parseInt(categoriaSelect.value, 10) : null;

  const prioridadeRadio = document.querySelector('input[name="prioridade"]:checked');
  const prioridade = prioridadeRadio?.value || 'media';

  const titulo = document.getElementById('titulo')?.value.trim() || '';
  const descricao = document.getElementById('descricao')?.value.trim() || '';

  return {
    titulo,
    descricao,
    id_categoria: idCategoria,
    prioridade
    // solicitante, setor e ip são capturados automaticamente pelo backend
  };
}

// ------------------------------------------------------------
// MODAL DE SUCESSO
// ------------------------------------------------------------
function showSucesso(protocolo) {
  const modal = document.getElementById('modal-sucesso');
  const proto = document.getElementById('modal-protocolo');
  if (proto) proto.textContent = protocolo;
  modal?.removeAttribute('hidden');

  // Botão "Ir para Meus Chamados" já existente no modal continuará funcionando
}

function showFileError(msg) {
  alert(msg); // substituível por toast no futuro
}

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}