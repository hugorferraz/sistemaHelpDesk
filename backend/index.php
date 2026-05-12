<?php
date_default_timezone_set('America/Sao_Paulo');
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

// 2º: classes JWT manuais (ordem correta para dependências)
require_once __DIR__ . '/vendor/firebase/php-jwt/src/JWTExceptionWithPayloadInterface.php';
require_once __DIR__ . '/vendor/firebase/php-jwt/src/ExpiredException.php';
require_once __DIR__ . '/vendor/firebase/php-jwt/src/JWT.php';
require_once __DIR__ . '/vendor/firebase/php-jwt/src/Key.php';

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middlewares/AuthMiddleware.php';
require_once __DIR__ . '/controllers/AuthController.php';

// 3º: database e middleware (que dependem das constantes)
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middlewares/AuthMiddleware.php';

// 4º: controllers
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ChamadosController.php';
require_once __DIR__ . '/controllers/UsuariosController.php';
require_once __DIR__ . '/controllers/DashboardController.php';
require_once __DIR__ . '/controllers/NotificacoesController.php';
require_once __DIR__ . '/controllers/RelatoriosController.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Remover base path (ajuste conforme necessário)
$basePath = '/api';
$uri = substr($uri, strlen($basePath));
if ($uri === false) $uri = '';

// Rotas
try {
    // Autenticação
    if ($uri === '/auth/login' && $method === 'POST') {
        (new AuthController())->login();
    } elseif ($uri === '/auth/me' && $method === 'GET') {
        (new AuthController())->me();
    }
    // Chamados
    elseif ($uri === '/chamados' && $method === 'GET') {
        (new ChamadosController())->listar();
    } elseif ($uri === '/chamados/meus' && $method === 'GET') {
        (new ChamadosController())->meus();
    } elseif (preg_match('#^/chamados/(\d+)$#', $uri, $m) && $method === 'GET') {
        (new ChamadosController())->detalhar($m[1]);
    } elseif (preg_match('#^/chamados/(\d+)/historico$#', $uri, $m) && $method === 'POST') {
        (new ChamadosController())->adicionarHistorico($m[1]);
    } elseif (preg_match('#^/chamados/(\d+)/status$#', $uri, $m) && $method === 'PATCH') {
        (new ChamadosController())->mudarStatus($m[1]);
    }
    // Usuários
    elseif ($uri === '/usuarios' && $method === 'GET') {
        (new UsuariosController())->listar();
    } elseif ($uri === '/usuarios' && $method === 'POST') {
        (new UsuariosController())->criar();
    } elseif (preg_match('#^/usuarios/(\d+)$#', $uri, $m) && $method === 'PUT') {
        (new UsuariosController())->atualizar($m[1]);
    } elseif (preg_match('#^/usuarios/(\d+)/ativo$#', $uri, $m) && $method === 'PATCH') {
        (new UsuariosController())->toggleAtivo($m[1]);
    }
    // Dashboard
    elseif ($uri === '/dashboard/summary' && $method === 'GET') {
        (new DashboardController())->summary();
    } elseif ($uri === '/dashboard/tecnico' && $method === 'GET') {
        (new DashboardController())->desempenhoTecnicos();
    }
    // Notificações
    elseif ($uri === '/notificacoes' && $method === 'GET') {
        (new NotificacoesController())->listar();
    } elseif (preg_match('#^/notificacoes/(\d+)/ler$#', $uri, $m) && $method === 'PATCH') {
        (new NotificacoesController())->marcarLida($m[1]);
    } elseif ($uri === '/notificacoes/ler-todas' && $method === 'PATCH') {
        (new NotificacoesController())->marcarTodasLidas();
    }
    // Relatórios
    elseif ($uri === '/relatorios/chamados' && $method === 'GET') {
        (new RelatoriosController())->chamados();
    }
    elseif ($uri === '/chamados' && $method === 'POST') {
    (new ChamadosController())->criar();
    }
    else {
        http_response_code(404);
        echo json_encode(['erro' => 'Rota não encontrada']);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['erro' => 'Erro interno: ' . $e->getMessage()]);
}