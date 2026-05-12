<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middlewares/AuthMiddleware.php';

class DashboardController {
    // GET /dashboard/summary
    public function summary() {
        $auth = AuthMiddleware::verificarPerfil(['admin', 'tecnico']);
        $db = Database::getConnection();

        // Totais por status (view)
        $totaisStatus = $db->query("SELECT status, total FROM vw_totais_status")->fetchAll();
        $totais = [];
        foreach ($totaisStatus as $row) {
            $totais[$row['status']] = (int)$row['total'];
        }

        // Chamados por categoria (gráfico)
        $categorias = $db->query("SELECT cat.nome, COUNT(*) AS total FROM chamados c JOIN categorias cat ON cat.id = c.id_categoria GROUP BY cat.nome")->fetchAll();

        // Chamados críticos/urgentes pendentes
        $criticos = $db->query("SELECT c.id, c.titulo, c.prioridade, c.status, s.nome AS solicitante
                                FROM chamados c
                                JOIN usuarios s ON s.id = c.id_solicitante
                                WHERE c.prioridade IN ('critica','alta') AND c.status IN ('aberto','em_atendimento')
                                ORDER BY c.prioridade = 'critica' DESC, c.aberto_em ASC
                                LIMIT 10")->fetchAll();

        // SLA violados (abertos ou em atendimento com prazo vencido e sla_atendido = 0)
        $slaViolados = $db->query("SELECT COUNT(*) AS total FROM chamados WHERE sla_atendido = 0 AND status IN ('aberto','em_atendimento') AND sla_prazo < NOW()")->fetch()['total'];

        echo json_encode([
            'totais' => $totais,
            'categorias' => $categorias,
            'chamados_criticos' => $criticos,
            'sla_violados' => (int)$slaViolados
        ]);
    }

    // GET /dashboard/tecnico (desempenho)
    public function desempenhoTecnicos() {
        $auth = AuthMiddleware::verificarPerfil(['admin']);
        $db = Database::getConnection();

        // Usa a view vw_desempenho_tecnicos (criada no script complementar)
        $result = $db->query("SELECT * FROM vw_desempenho_tecnicos")->fetchAll();
        echo json_encode($result);
    }
}