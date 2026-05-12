<?php
// middlewares/AuthMiddleware.php

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

class AuthMiddleware {

    public static function autenticar(): object {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            http_response_code(401);
            echo json_encode(['erro' => 'Token não fornecido']);
            exit;
        }

        $token = $matches[1];
        try {
            $decoded = JWT::decode($token, new Key(JWT_SECRET, 'HS256'));
            return $decoded;
        } catch (ExpiredException $e) {
            http_response_code(401);
            echo json_encode(['erro' => 'Token expirado']);
            exit;
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['erro' => 'Token inválido']);
            exit;
        }
    }

    public static function verificarPerfil(array $perfisPermitidos): object {
        $usuario = self::autenticar();
        if (!in_array($usuario->perfil, $perfisPermitidos)) {
            http_response_code(403);
            echo json_encode(['erro' => 'Acesso negado']);
            exit;
        }
        return $usuario;
    }
}