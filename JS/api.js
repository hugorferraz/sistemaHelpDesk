const API_BASE = 'http://127.0.0.1:8000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function fetchAuth(url, options = {}) {
  const token = getToken();
  if (!token) {
    window.location.href = '../../login.html';
    throw new Error('Não autenticado');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  const response = await fetch(API_BASE + url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '../../login.html';
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ erro: 'Erro desconhecido' }));
    throw new Error(error.erro || `Erro ${response.status}`);
  }

  return response.json();
}