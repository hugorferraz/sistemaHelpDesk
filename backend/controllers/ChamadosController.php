<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middlewares/AuthMiddleware.php';

class ChamadosController {

    // POST /chamados (criar um novo chamado – qualquer perfil logado)
    public function criar() {
    $auth = AuthMiddleware::autenticar();
    $db = Database::getConnection();

    $data = json_decode(file_get_contents('php://input'), true);

    // Campos obrigatórios
    $titulo = $data['titulo'] ?? '';
    $descricao = $data['descricao'] ?? '';
    $idCategoria = $data['id_categoria'] ?? null;
    $prioridade = $data['prioridade'] ?? 'media';

    if (empty($titulo) || empty($descricao) || !$idCategoria) {
        http_response_code(400);
        echo json_encode(['erro' => 'Título, descrição e categoria são obrigatórios']);
        return;
    }

    // Valida prioridade
    $prioridadesValidas = ['baixa', 'media', 'alta', 'critica'];
    if (!in_array($prioridade, $prioridadesValidas)) {
        $prioridade = 'media';
    }

    // Captura automática do IP real do usuário
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    // Calcula SLA conforme prioridade
    $slaPrazo = $this->calcularSla($db, $prioridade);

    $agora = date('Y-m-d H:i:s');

    // Insere o chamado
    $stmt = $db->prepare("INSERT INTO chamados 
        (id_solicitante, id_categoria, titulo, descricao, status, prioridade, ip_maquina, sla_prazo, aberto_em, created_at, updated_at)
        VALUES (:id_solicitante, :id_categoria, :titulo, :descricao, 'aberto', :prioridade, :ip, :sla, :aberto_em, :created_at, :updated_at)");

    $stmt->execute([
        ':id_solicitante' => $auth->sub,
        ':id_categoria'   => (int)$idCategoria,
        ':titulo'         => $titulo,
        ':descricao'      => $descricao,
        ':prioridade'     => $prioridade,
        ':ip'             => $ip,
        ':sla'            => $slaPrazo,
        ':aberto_em'      => $agora,
        ':created_at'     => $agora,
        ':updated_at'     => $agora
    ]);

    $idChamado = $db->lastInsertId();

    // Atualiza IP do usuário automaticamente
    $db->prepare("UPDATE usuarios SET ip_maquina = :ip WHERE id = :uid")
       ->execute([':ip' => $ip, ':uid' => $auth->sub]);

    // Registra abertura no histórico
    $db->prepare("INSERT INTO historico_chamados (id_chamado, id_usuario, tipo, descricao) VALUES (:cham, :uid, 'comentario', :desc)")
       ->execute([
           ':cham' => $idChamado,
           ':uid'  => $auth->sub,
           ':desc' => 'Chamado aberto via sistema.'
       ]);

    http_response_code(201);
    echo json_encode([
        'id' => $idChamado,
        'mensagem' => 'Chamado aberto com sucesso'
    ]);
}

    // GET /chamados (admin e técnico)
    public function listar() {
        $auth = AuthMiddleware::verificarPerfil(['admin', 'tecnico']);
        $db = Database::getConnection();

        $where = [];
        $params = [];

        if (!empty($_GET['status'])) {
            $where[] = "c.status = :status";
            $params[':status'] = $_GET['status'];
        }
        if (!empty($_GET['prioridade'])) {
            $where[] = "c.prioridade = :prioridade";
            $params[':prioridade'] = $_GET['prioridade'];
        }
        if (!empty($_GET['id_tecnico'])) {
            $where[] = "c.id_tecnico = :id_tecnico";
            $params[':id_tecnico'] = (int)$_GET['id_tecnico'];
        }
        if (!empty($_GET['id_solicitante'])) {
            $where[] = "c.id_solicitante = :id_solicitante";
            $params[':id_solicitante'] = (int)$_GET['id_solicitante'];
        }
        if (!empty($_GET['categoria'])) {
            $where[] = "cat.nome = :categoria";
            $params[':categoria'] = $_GET['categoria'];
        }
        if (!empty($_GET['search'])) {
            $search = '%' . $_GET['search'] . '%';
            $where[] = "(c.titulo LIKE :search OR c.id LIKE :search2 OR s.nome LIKE :search3)";
            $params[':search'] = $search;
            $params[':search2'] = $search;
            $params[':search3'] = $search;
        }

        $sql = "SELECT c.id, c.titulo, c.descricao, c.status, c.prioridade,
                    c.ip_maquina, c.nome_maquina, c.sla_prazo, c.sla_atendido,
                    c.aberto_em, c.atendido_em, c.resolvido_em, c.fechado_em,
                    s.id AS id_solicitante, s.nome AS solicitante,
                    t.id AS id_tecnico, t.nome AS tecnico,
                    cat.id AS id_categoria, cat.nome AS categoria
                FROM chamados c
                JOIN usuarios s ON s.id = c.id_solicitante
                LEFT JOIN usuarios t ON t.id = c.id_tecnico
                JOIN categorias cat ON cat.id = c.id_categoria";

        if ($where) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        $ordem = $_GET['ordem'] ?? 'recente';
        if ($ordem === 'antigo') {
            $sql .= " ORDER BY c.aberto_em ASC";
        } else {
            $sql .= " ORDER BY c.aberto_em DESC";
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $chamados = $stmt->fetchAll();

        $resumo = $this->obterResumoChamados($db);

        echo json_encode([
            'resumo' => $resumo,
            'chamados' => $chamados
        ]);
    }

    // GET /chamados/meus (colaborador)
    public function meus() {
        $auth = AuthMiddleware::autenticar();
        $db = Database::getConnection();

        $where = ["c.id_solicitante = :uid"];
        $params = [':uid' => $auth->sub];

        if (!empty($_GET['status'])) {
            $where[] = "c.status = :status";
            $params[':status'] = $_GET['status'];
        }
        if (!empty($_GET['search'])) {
            $search = '%' . $_GET['search'] . '%';
            $where[] = "(c.titulo LIKE :search OR c.id LIKE :search2)";
            $params[':search'] = $search;
            $params[':search2'] = $search;
        }

        $ordem = $_GET['ordem'] ?? 'recente';
        $orderBy = ($ordem === 'antigo') ? "c.aberto_em ASC" : "c.aberto_em DESC";

        $sql = "SELECT c.*, 
                CONVERT_TZ(c.aberto_em, @@session.time_zone, '-03:00') AS aberto_em,
                cat.nome AS categoria, 
                t.nome AS tecnico
            FROM chamados c
            JOIN categorias cat ON cat.id = c.id_categoria
            LEFT JOIN usuarios t ON t.id = c.id_tecnico
            WHERE " . implode(" AND ", $where) . "
            ORDER BY " . $orderBy;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $chamados = $stmt->fetchAll();

        $resumo = $this->obterResumoPessoal($db, $auth->sub);

        echo json_encode([
            'resumo' => $resumo,
            'chamados' => $chamados
        ]);
    }

    // GET /chamados/{id}
    public function detalhar($id) {
        $auth = AuthMiddleware::autenticar();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT c.*, s.nome AS solicitante, t.nome AS tecnico, cat.nome AS categoria
                              FROM chamados c
                              JOIN usuarios s ON s.id = c.id_solicitante
                              LEFT JOIN usuarios t ON t.id = c.id_tecnico
                              JOIN categorias cat ON cat.id = c.id_categoria
                              WHERE c.id = :id");
        $stmt->execute([':id' => (int)$id]);
        $chamado = $stmt->fetch();

        if (!$chamado) {
            http_response_code(404);
            echo json_encode(['erro' => 'Chamado não encontrado']);
            return;
        }

        if ($auth->perfil === 'colaborador' && $auth->sub != $chamado['id_solicitante']) {
            http_response_code(403);
            echo json_encode(['erro' => 'Acesso negado']);
            return;
        }

        $histStmt = $db->prepare("SELECT h.*, u.nome AS autor
                                  FROM historico_chamados h
                                  JOIN usuarios u ON u.id = h.id_usuario
                                  WHERE h.id_chamado = :id
                                  ORDER BY h.created_at ASC");
        $histStmt->execute([':id' => (int)$id]);
        $historico = $histStmt->fetchAll();

        $avaliacaoStmt = $db->prepare("SELECT * FROM avaliacoes WHERE id_chamado = :id");
        $avaliacaoStmt->execute([':id' => (int)$id]);
        $avaliacao = $avaliacaoStmt->fetch();

        echo json_encode([
            'chamado' => $chamado,
            'historico' => $historico,
            'avaliacao' => $avaliacao ?: null
        ]);
    }

    // POST /chamados/{id}/historico
    public function adicionarHistorico($id) {
        $auth = AuthMiddleware::autenticar();
        $db = Database::getConnection();

        $chamado = $this->obterChamado($db, $id);
        if (!$chamado) {
            http_response_code(404);
            echo json_encode(['erro' => 'Chamado não encontrado']);
            return;
        }
        if ($auth->perfil === 'colaborador' && $auth->sub != $chamado['id_solicitante']) {
            http_response_code(403);
            echo json_encode(['erro' => 'Acesso negado']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $tipo = trim($data['tipo'] ?? 'comentario'); // LIMPA ESPAÇOS
        $texto = trim($data['texto'] ?? '');

        if (empty($texto)) {
            http_response_code(400);
            echo json_encode(['erro' => 'O texto é obrigatório']);
            return;
        }

        // Força valor válido
        $tiposPermitidos = ['comentario', 'nota_interna', 'mudanca_status', 'mudanca_tecnico', 'mudanca_prioridade'];
        if (!in_array($tipo, $tiposPermitidos)) {
            $tipo = 'comentario';
        }
        
        // Apenas técnicos/admin podem criar notas internas
        if ($tipo === 'nota_interna' && $auth->perfil === 'colaborador') {
            http_response_code(403);
            echo json_encode(['erro' => 'Não permitido']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $tipo = $data['tipo'] ?? 'comentario';
        $texto = $data['texto'] ?? '';

        // LOG PARA DEBUG
        error_log("=== ADICIONAR HISTÓRICO ===");
        error_log("ID Chamado: " . (int)$id);
        error_log("ID Usuário: " . (int)$auth->sub);
        error_log("Tipo: '" . $tipo . "' (len=" . strlen($tipo) . ")");
        error_log("Texto: '" . substr($texto, 0, 100) . "'");

        // Força o tipo correto
        $tipo = 'comentario'; // TESTE: força o valor

        $stmt = $db->prepare("INSERT INTO historico_chamados (id_chamado, id_usuario, tipo, descricao) VALUES (:id, :uid, :tipo, :desc)");
        $stmt->execute([
            ':id'   => (int)$id,
            ':uid'  => (int)$auth->sub,
            ':tipo' => $tipo,
            ':desc' => $texto
        ]);
        $stmt = $db->prepare("INSERT INTO historico_chamados (id_chamado, id_usuario, tipo, descricao) VALUES (:id, :uid, :tipo, :desc)");
        $stmt->execute([
            ':id'   => (int)$id,
            ':uid'  => (int)$auth->sub,
            ':tipo' => $tipo,
            ':desc' => $texto
        ]);

        $db->prepare("UPDATE chamados SET updated_at = NOW() WHERE id = :id")->execute([':id' => (int)$id]);
        $this->criarNotificacao($db, $chamado, $auth, $tipo, $texto);

        echo json_encode(['mensagem' => 'Histórico adicionado com sucesso']);
    }

    // PATCH /chamados/{id}/status
    public function mudarStatus($id) {
        $auth = AuthMiddleware::verificarPerfil(['admin', 'tecnico']);
        $db = Database::getConnection();

        $chamado = $this->obterChamado($db, $id);
        if (!$chamado) {
            http_response_code(404);
            echo json_encode(['erro' => 'Chamado não encontrado']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $acao = $data['acao'] ?? '';
        $agora = date('Y-m-d H:i:s');

        error_log("=== AÇÃO: $acao ===");
        error_log("Chamado ID: $id");
        error_log("Status atual: " . $chamado['status']);

        try {
            switch ($acao) {
                case 'iniciar_atendimento':
                    if ($chamado['status'] !== 'aberto') {
                        http_response_code(400);
                        echo json_encode(['erro' => 'Chamado não está aberto']);
                        return;
                    }
                    $idTecnico = $chamado['id_tecnico'] ?? $auth->sub;
                    
                    $stmt = $db->prepare("UPDATE chamados SET status = ?, id_tecnico = ?, atendido_em = ?, updated_at = ? WHERE id = ?");
                    $stmt->execute(['em_atendimento', (int)$idTecnico, $agora, $agora, (int)$id]);
                    
                    $this->registrarMudancaHistoricoSimples($db, $id, $auth->sub, $acao, $chamado['status']);
                    break;

                case 'finalizar':
                    if (!in_array($chamado['status'], ['em_atendimento', 'aguardando_usuario'])) {
                        http_response_code(400);
                        echo json_encode(['erro' => 'Status não permite finalização']);
                        return;
                    }
                    
                    $stmt = $db->prepare("UPDATE chamados SET status = ?, resolvido_em = ?, updated_at = ? WHERE id = ?");
                    $stmt->execute(['resolvido', $agora, $agora, (int)$id]);
                    
                    $this->registrarMudancaHistoricoSimples($db, $id, $auth->sub, $acao, $chamado['status']);
                    $this->criarNotificacao($db, $chamado, $auth, 'resolvido', 'Seu chamado foi resolvido. Avalie o atendimento.');
                    break;

                case 'aguardar_usuario':
                    if ($chamado['status'] !== 'em_atendimento') {
                        http_response_code(400);
                        echo json_encode(['erro' => 'Chamado não está em atendimento']);
                        return;
                    }
                    
                    $stmt = $db->prepare("UPDATE chamados SET status = ?, updated_at = ? WHERE id = ?");
                    $stmt->execute(['aguardando_usuario', $agora, (int)$id]);
                    
                    $this->registrarMudancaHistoricoSimples($db, $id, $auth->sub, $acao, $chamado['status']);
                    break;

                case 'atribuir_tecnico':
                    $novoTecnico = $data['id_tecnico'] ?? null;
                    if (!$novoTecnico || !is_numeric($novoTecnico)) {
                        http_response_code(400);
                        echo json_encode(['erro' => 'ID do técnico inválido']);
                        return;
                    }
                    
                    $stmt = $db->prepare("UPDATE chamados SET id_tecnico = ?, updated_at = ? WHERE id = ?");
                    $stmt->execute([(int)$novoTecnico, $agora, (int)$id]);
                    break;

                default:
                    http_response_code(400);
                    echo json_encode(['erro' => 'Ação não reconhecida']);
                    return;
            }

            // Registra no histórico (se necessário)
            if (in_array($acao, ['iniciar_atendimento', 'finalizar', 'aguardar_usuario'])) {
                error_log("Chamando registrarMudancaHistorico...");
                $this->registrarMudancaHistoricoSimples($db, $id, $auth->sub, $acao, $chamado['status']);
            }

            error_log("=== SUCESSO ===");
            echo json_encode(['mensagem' => 'Status atualizado com sucesso']);

        } catch (PDOException $e) {
            error_log("ERRO SQL: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['erro' => 'Erro interno: ' . $e->getMessage()]);
        }
    }


    // ----- métodos auxiliares privados -----

    private function obterChamado($db, $id) {
        $stmt = $db->prepare("SELECT * FROM chamados WHERE id = :id");
        $stmt->execute([':id' => (int)$id]);
        return $stmt->fetch();
    }

    private function registrarMudancaHistorico($db, $idChamado, $idUsuario, $tipo, $valorAnterior, $valorNovo) {
        $descricao = "Status alterado de '$valorAnterior' para '$valorNovo'";
        
        $stmt = $db->prepare("INSERT INTO historico_chamados (id_chamado, id_usuario, tipo, descricao, valor_anterior, valor_novo)
                            VALUES (:id_chamado, :id_usuario, :tipo, :descricao, :valor_anterior, :valor_novo)");
        
        $stmt->execute([
            ':id_chamado'      => (int)$idChamado,
            ':id_usuario'      => (int)$idUsuario,
            ':tipo'            => $tipo,
            ':descricao'       => $descricao,
            ':valor_anterior'  => $valorAnterior,
            ':valor_novo'      => $valorNovo
        ]);
    }


    private function criarNotificacao($db, $chamado, $auth, $tipoEvento, $texto, $idDestinatario = null) {
        if ($idDestinatario === null) {
            if ($auth->sub == $chamado['id_solicitante']) {
                $idDestinatario = $chamado['id_tecnico'];
            } else {
                $idDestinatario = $chamado['id_solicitante'];
            }
        }
        if (!$idDestinatario) return;

        $stmt = $db->prepare("INSERT INTO notificacoes (id_usuario, id_chamado, tipo, texto) VALUES (:uid, :cham, :tipo, :texto)");
        $stmt->execute([
            ':uid' => $idDestinatario,
            ':cham' => (int)$chamado['id'],
            ':tipo' => $tipoEvento,
            ':texto' => $texto
        ]);
    }

    private function obterResumoChamados($db) {
        $stmt = $db->query("SELECT status, total FROM vw_totais_status");
        $totais = [];
        while ($row = $stmt->fetch()) {
            $totais[$row['status']] = (int)$row['total'];
        }
        return $totais;
    }

    private function obterResumoPessoal($db, $userId) {
        $stmt = $db->prepare("SELECT status, COUNT(*) AS total FROM chamados WHERE id_solicitante = :uid GROUP BY status");
        $stmt->execute([':uid' => $userId]);
        $totais = [];
        while ($row = $stmt->fetch()) {
            $totais[$row['status']] = (int)$row['total'];
        }
        return $totais;
    }

    // Calcula SLA com base nas configurações (tabela configuracoes)
    private function calcularSla($db, $prioridade) {
        $chave = 'sla_' . $prioridade . '_horas';
        $stmt = $db->prepare("SELECT valor FROM configuracoes WHERE chave = :chave");
        $stmt->execute([':chave' => $chave]);
        $row = $stmt->fetch();
        $horas = $row ? (int)$row['valor'] : 24; // default 24h
        $prazo = date('Y-m-d H:i:s', strtotime("+{$horas} hours"));
        return $prazo;
    }

    private function registrarMudancaHistoricoSimples($db, $idChamado, $idUsuario, $acao, $statusAnterior) {
        $descricao = "Ação: $acao (status anterior: $statusAnterior)";
        
        error_log("Histórico: cham=$idChamado, user=$idUsuario, desc=$descricao");
        
        $stmt = $db->prepare("INSERT INTO historico_chamados (id_chamado, id_usuario, tipo, descricao) VALUES (?, ?, 'mudanca_status', ?)");
        $stmt->execute([(int)$idChamado, (int)$idUsuario, $descricao]);
    }
}