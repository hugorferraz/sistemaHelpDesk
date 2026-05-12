<?php
// controllers/AuthController.php
// Não precisa de require aqui, pois o index.php já carregou tudo.

use Firebase\JWT\JWT;

class AuthController {

    public function login() {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = trim($data['email'] ?? '');
        $senha = $data['senha'] ?? '';

        if (empty($email) || empty($senha)) {
            http_response_code(400);
            echo json_encode(['erro' => 'E-mail e senha são obrigatórios']);
            return;
        }

        $db = Database::getConnection();

        // Verifica se o usuário existe e está ativo
        $stmt = $db->prepare("SELECT id, nome, id_perfil, email, senha_hash FROM usuarios WHERE email = :email AND ativo = 1");
        $stmt->execute([':email' => $email]);
        $usuario = $stmt->fetch();

        if (!$usuario || !password_verify($senha, $usuario['senha_hash'])) {
            // Log de tentativa falha (opcional)
            $logStmt = $db->prepare("INSERT INTO log_acessos (email, ip, acao, user_agent) VALUES (:email, :ip, 'login_falhou', :ua)");
            $logStmt->execute([
                ':email' => $email,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
                ':ua' => $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
            http_response_code(401);
            echo json_encode(['erro' => 'Credenciais inválidas']);
            return;
        }

        $db->prepare("UPDATE usuarios SET ip_maquina = :ip WHERE id = :id")
        ->execute([':ip' => $_SERVER['REMOTE_ADDR'], ':id' => $usuario['id']]);

        // Atualiza último acesso
        $db->prepare("UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = :id")
           ->execute([':id' => $usuario['id']]);

        // Log de sucesso
        $logStmt = $db->prepare("INSERT INTO log_acessos (id_usuario, email, ip, acao, user_agent) VALUES (:uid, :email, :ip, 'login_ok', :ua)");
        $logStmt->execute([
            ':uid' => $usuario['id'],
            ':email' => $usuario['email'],
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
            ':ua' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);

        // Mapeia perfil numérico para string
        $perfisMap = [1 => 'admin', 2 => 'tecnico', 3 => 'colaborador'];
        $perfilStr = $perfisMap[$usuario['id_perfil']] ?? 'colaborador';

        $payload = [
            'iss' => APP_URL,
            'iat' => time(),
            'exp' => time() + JWT_EXPIRE,
            'sub' => $usuario['id'],
            'nome' => $usuario['nome'],
            'email' => $usuario['email'],
            'perfil' => $perfilStr
        ];

        $token = JWT::encode($payload, JWT_SECRET, 'HS256');

        echo json_encode([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => JWT_EXPIRE,
            'usuario' => [
                'id' => $usuario['id'],
                'nome' => $usuario['nome'],
                'email' => $usuario['email'],
                'perfil' => $perfilStr
            ]
        ]);
    }

    public function me() {
        $auth = AuthMiddleware::autenticar();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT u.id, u.nome, u.email, u.id_perfil, u.id_setor, u.ramal, u.ip_maquina, u.nome_maquina, u.ultimo_acesso, s.nome AS setor
                            FROM usuarios u
                            LEFT JOIN setores s ON s.id = u.id_setor
                            WHERE u.id = :id");
        $stmt->execute([':id' => $auth->sub]);
        $usuario = $stmt->fetch();

        if (!$usuario) {
            http_response_code(404);
            echo json_encode(['erro' => 'Usuário não encontrado']);
            return;
        }

        $perfisMap = [1 => 'admin', 2 => 'tecnico', 3 => 'colaborador'];
        $usuario['perfil'] = $perfisMap[$usuario['id_perfil']] ?? 'desconhecido';
        unset($usuario['id_perfil']);

        echo json_encode($usuario);
    }
}