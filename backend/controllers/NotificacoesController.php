<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middlewares/AuthMiddleware.php';

class NotificacoesController {
    // GET /notificacoes
    public function listar() {
        $auth = AuthMiddleware::autenticar();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT n.*, c.titulo AS titulo_chamado
                              FROM notificacoes n
                              LEFT JOIN chamados c ON c.id = n.id_chamado
                              WHERE n.id_usuario = :uid
                              ORDER BY n.criado_em DESC");
        $stmt->execute([':uid' => $auth->sub]);
        $notificacoes = $stmt->fetchAll();

        echo json_encode($notificacoes);
    }

    // PATCH /notificacoes/{id}/ler
    public function marcarLida($id) {
        $auth = AuthMiddleware::autenticar();
        $db = Database::getConnection();

        // Verifica se pertence ao usuário
        $notif = $db->prepare("SELECT id, lida FROM notificacoes WHERE id = :id AND id_usuario = :uid");
        $notif->execute([':id' => (int)$id, ':uid' => $auth->sub]);
        $row = $notif->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['erro' => 'Notificação não encontrada']);
            return;
        }

        $db->prepare("UPDATE notificacoes SET lida = 1 WHERE id = :id")->execute([':id' => (int)$id]);
        echo json_encode(['mensagem' => 'Marcada como lida']);
    }

    // PATCH /notificacoes/ler-todas
    public function marcarTodasLidas() {
        $auth = AuthMiddleware::autenticar();
        $db = Database::getConnection();

        $db->prepare("UPDATE notificacoes SET lida = 1 WHERE id_usuario = :uid AND lida = 0")
           ->execute([':uid' => $auth->sub]);

        echo json_encode(['mensagem' => 'Todas as notificações foram marcadas como lidas']);
    }
}