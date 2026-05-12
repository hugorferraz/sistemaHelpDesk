const form = document.getElementById('login-form');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;

  handleLogin(usuario, senha);
});

async function handleLogin(usuario, senha) {
  const btn = document.querySelector('.btn');
  const errorMsg = document.querySelector('.error-msg');

  btn.disabled = true;
  btn.textContent = 'Entrando...';
  errorMsg?.classList.remove('visible');

  try {
    // Endpoint real do backend
    const response = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: usuario, senha }), // "usuario" enviado como "email"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.erro || 'Usuário ou senha inválidos.');
    }

    // Armazena token e dados do usuário
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));

    // Redireciona conforme o perfil
    const perfil = data.usuario.perfil;
    if (perfil === 'colaborador') {
      window.location.href = 'HTML/COLABORADOR/inicio.html';
    } else {
      // admin ou tecnico
      window.location.href = 'HTML/ADMIN/dashboard.html';
    }

  } catch (err) {
    showError(err.message);
    console.error('Erro de login:', err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔒 Entrar';
  }
}

function showError(message) {
  let errorMsg = document.querySelector('.error-msg');

  if (!errorMsg) {
    errorMsg = document.createElement('p');
    errorMsg.className = 'error-msg';
    document.getElementById('login-form').appendChild(errorMsg);
  }

  errorMsg.textContent = message;
  errorMsg.classList.add('visible');
}