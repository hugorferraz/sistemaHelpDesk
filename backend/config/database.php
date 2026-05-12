<?php
// config/database.php – Conexão PDO simples

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $host = DB_HOST;
            $port = DB_PORT;
            $db   = DB_NAME;
            $user = DB_USER;
            $pass = DB_PASS;

            $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
            self::$instance = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
        return self::$instance;
    }
}