<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middlewares/AuthMiddleware.php';

class UsuariosController {
    // GET /usuarios (admin e técnico)
    public function listar() {
        $auth = AuthMiddleware::verificarPerfil(['admin', 'tecnico']);
        $db = Database::getConnection();

        $where = [];
        $params = [];

        if (!empty($_GET['search'])) {
            $search = '%' . $_GET['search'] . '%';
            $where[] = "(u.nome LIKE :search OR u.email LIKE :search2)";
            $params[':search'] = $search;
            $params[':search2'] = $search;
        }
        if (!empty($_GET['id_perfil'])) {
            $where[] = "u.id_perfil = :perfil";
            $params[':perfil'] = (int)$_GET['id_perfil'];
        }
        if (isset($_GET['ativo']) && $_GET['ativo'] !== '') {
            $where[] = "u.ativo = :ativo";
            $params[':ativo'] = $_GET['ativo'] === 'true' ? 1 : 0;
        }

        $sql = "SELECT u.id, u.nome, u.email, u.id_perfil, u.id_setor, u.ramal,
                       u.ip_maquina, u.nome_maquina, u.ativo, u.ultimo_acesso,
                       p.nome AS perfil, s.nome AS setor
                FROM usuarios u
                JOIN perfis p ON p.id = u.id_perfil
                LEFT JOIN setores s ON s.id = u.id_setor";
        if ($where) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $sql .= " ORDER BY u.nome ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $usuarios = $stmt->fetchAll();

        echo json_encode($usuarios);
    }

    // POST /usuarios (admin apenas)
    public function criar() {
    $auth = AuthMiddleware::verificarPerfil(['admin']);
    $db = Database::getConnection();
    $data = json_decode(file_get_contents('php://input'), true);

    $nome = $data['nome'] ?? '';
    $email = $data['email'] ?? '';
    $senha = $data['senha'] ?? 'password';  // senha padrão se não enviada
    $id_perfil = $data['id_perfil'] ?? 3;
    $id_setor = $data['id_setor'] ?? null;
    $ramal = $data['ramal'] ?? null;

    if (empty($nome) || empty($email)) {
        http_response_code(400);
        echo json_encode(['erro' => 'Nome e e-mail são obrigatórios']);
        return;
    }

    // Verifica duplicidade de e-mail
    $check = $db->prepare("SELECT id FROM usuarios WHERE email = :email");
    $check->execute([':email' => $email]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(['erro' => 'E-mail já cadastrado']);
        return;
    }

    $senhaHash = password_hash($senha, PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO usuarios (nome, email, senha_hash, id_perfil, id_setor, ramal)
                          VALUES (:nome, :email, :senha, :perfil, :setor, :ramal)");
    $stmt->execute([
        ':nome' => $nome,
        ':email' => $email,
        ':senha' => $senhaHash,
        ':perfil' => (int)$id_perfil,
        ':setor' => $id_setor ? (int)$id_setor : null,
        ':ramal' => $ramal
    ]);

    $novoId = $db->lastInsertId();
    http_response_code(201);
    echo json_encode(['id' => $novoId, 'mensagem' => 'Usuário criado com sucesso']);
}

    // PUT /usuarios/{id}
    public function atualizar($id) {
        $auth = AuthMiddleware::verificarPerfil(['admin']);
        $db = Database::getConnection();
        $data = json_decode(file_get_contents('php://input'), true);

        $usuarioExiste = $db->prepare("SELECT id FROM usuarios WHERE id = :id");
        $usuarioExiste->execute([':id' => (int)$id]);
        if (!$usuarioExiste->fetch()) {
            http_response_code(404);
            echo json_encode(['erro' => 'Usuário não encontrado']);
            return;
        }

        $campos = [];
        $params = [':id' => (int)$id];

        if (isset($data['nome'])) {
            $campos[] = "nome = :nome";
            $params[':nome'] = $data['nome'];
        }
        if (isset($data['email'])) {
            // Verifica duplicidade
            $checkEmail = $db->prepare("SELECT id FROM usuarios WHERE email = :email AND id != :id");
            $checkEmail->execute([':email' => $data['email'], ':id' => (int)$id]);
            if ($checkEmail->fetch()) {
                http_response_code(409);
                echo json_encode(['erro' => 'E-mail já em uso']);
                return;
            }
            $campos[] = "email = :email";
            $params[':email'] = $data['email'];
        }
        if (isset($data['id_perfil'])) {
            $campos[] = "id_perfil = :perfil";
            $params[':perfil'] = (int)$data['id_perfil'];
        }
        if (isset($data['id_setor'])) {
            $campos[] = "id_setor = :setor";
            $params[':setor'] = $data['id_setor'] ? (int)$data['id_setor'] : null;
        }
        if (isset($data['ramal'])) {
            $campos[] = "ramal = :ramal";
            $params[':ramal'] = $data['ramal'];
        }
        if (isset($data['ip_maquina'])) {
            $campos[] = "ip_maquina = :ip";
            $params[':ip'] = $data['ip_maquina'];
        }
        if (isset($data['nome_maquina'])) {
            $campos[] = "nome_maquina = :maquina";
            $params[':maquina'] = $data['nome_maquina'];
        }
        if (isset($data['senha']) && !empty($data['senha'])) {
            $campos[] = "senha_hash = :senha";
            $params[':senha'] = password_hash($data['senha'], PASSWORD_BCRYPT);
        }

        if (empty($campos)) {
            http_response_code(400);
            echo json_encode(['erro' => 'Nenhum campo para atualizar']);
            return;
        }

        $sql = "UPDATE usuarios SET " . implode(', ', $campos) . ", updated_at = NOW() WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['mensagem' => 'Usuário atualizado com sucesso']);
    }

    // PATCH /usuarios/{id}/ativo
    public function toggleAtivo($id) {
        $auth = AuthMiddleware::verificarPerfil(['admin']);
        $db = Database::getConnection();

        $usuario = $db->prepare("SELECT id, ativo FROM usuarios WHERE id = :id");
        $usuario->execute([':id' => (int)$id]);
        $user = $usuario->fetch();
        if (!$user) {
            http_response_code(404);
            echo json_encode(['erro' => 'Usuário não encontrado']);
            return;
        }

        $novoEstado = $user['ativo'] ? 0 : 1;
        $db->prepare("UPDATE usuarios SET ativo = :ativo, updated_at = NOW() WHERE id = :id")
           ->execute([':ativo' => $novoEstado, ':id' => (int)$id]);

        echo json_encode(['ativo' => (bool)$novoEstado, 'mensagem' => $novoEstado ? 'Usuário ativado' : 'Usuário desativado']);
    }
}