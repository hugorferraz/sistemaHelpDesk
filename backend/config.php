<?php
// config.php – Configurações manuais (sem Dotenv)

define('DB_HOST', 'localhost');
define('DB_PORT', '3300');
define('DB_NAME', 'helpdesk_funada');
define('DB_USER', 'root');          // seu usuário do MariaDB
define('DB_PASS', 'admin');      // sua senha

define('JWT_SECRET', '$2y$12$MMX4t84lm/t7BPFGI/p9JupO2asiHgwc5DSqiPt4qZogzQizSxO32');
define('JWT_EXPIRE', 28800);        // 8 horas

define('APP_URL', 'http://localhost:8000');