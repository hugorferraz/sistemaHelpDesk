<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middlewares/AuthMiddleware.php';

class RelatoriosController {
    // GET /relatorios/chamados
    public function chamados() {
        $auth = AuthMiddleware::verificarPerfil(['admin', 'tecnico']);
        $db = Database::getConnection();

        $where = [];
        $params = [];

        // Filtros de período
        if (!empty($_GET['data_inicio'])) {
            $where[] = "c.aberto_em >= :inicio";
            $params[':inicio'] = $_GET['data_inicio'] . ' 00:00:00';
        }
        if (!empty($_GET['data_fim'])) {
            $where[] = "c.aberto_em <= :fim";
            $params[':fim'] = $_GET['data_fim'] . ' 23:59:59';
        }
        if (!empty($_GET['status'])) {
            $where[] = "c.status = :status";
            $params[':status'] = $_GET['status'];
        }
        if (!empty($_GET['id_tecnico'])) {
            $where[] = "c.id_tecnico = :tecnico";
            $params[':tecnico'] = (int)$_GET['id_tecnico'];
        }
        if (!empty($_GET['categoria'])) {
            $where[] = "cat.nome = :categoria";
            $params[':categoria'] = $_GET['categoria'];
        }

        $sql = "SELECT c.id, c.titulo, c.status, c.prioridade, c.aberto_em, c.sla_prazo, c.sla_atendido,
                       s.nome AS solicitante, t.nome AS tecnico, cat.nome AS categoria
                FROM chamados c
                JOIN usuarios s ON s.id = c.id_solicitante
                LEFT JOIN usuarios t ON t.id = c.id_tecnico
                JOIN categorias cat ON cat.id = c.id_categoria";

        if ($where) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $sql .= " ORDER BY c.aberto_em DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $chamados = $stmt->fetchAll();

        // Resumo
        $total = count($chamados);
        $slaCumprido = 0;
        $slaViolado = 0;
        foreach ($chamados as $c) {
            if ($c['sla_atendido'] == 1) $slaCumprido++;
            elseif (in_array($c['status'], ['aberto','em_atendimento','aguardando_usuario'])) $slaViolado++;
        }

        echo json_encode([
            'resumo' => [
                'total' => $total,
                'sla_cumprido' => $slaCumprido,
                'sla_violado' => $slaViolado
            ],
            'chamados' => $chamados
        ]);
    }
}