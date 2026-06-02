import json
import os
import hashlib
import secrets
import psycopg2


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def get_user_by_session(conn, session_id: str):
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = %s AND s.expires_at > NOW()",
        (session_id,)
    )
    row = cur.fetchone()
    if row:
        return {'id': row[0], 'email': row[1], 'name': row[2], 'role': row[3]}
    return None


def get_session_id(event):
    return event.get('headers', {}).get('x-session-id', '') or ''


def handler(event: dict, context) -> dict:
    """Авторизация: регистрация, вход, выход, получение текущего пользователя."""

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    method = event.get('httpMethod')
    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')
    conn = get_db()

    # GET — список пользователей (только admin)
    if method == 'GET' and (event.get('queryStringParameters') or {}).get('action') == 'users':
        session_id = get_session_id(event)
        user = get_user_by_session(conn, session_id) if session_id else None
        if not user or user['role'] != 'admin':
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет доступа'})}
        cur = conn.cursor()
        cur.execute("SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC")
        rows = cur.fetchall()
        users = [{'id': r[0], 'email': r[1], 'name': r[2], 'role': r[3], 'created_at': str(r[4])} for r in rows]
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'users': users})}

    # GET — получить текущего пользователя по токену
    if method == 'GET':
        session_id = get_session_id(event)
        if not session_id:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}
        user = get_user_by_session(conn, session_id)
        if not user:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Сессия истекла'})}
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps(user)}

    # Регистрация
    if method == 'POST' and action == 'register':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '').strip()
        name = body.get('name', '').strip()
        if not email or not password or not name:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Заполните все поля'}, ensure_ascii=False)}
        if len(password) < 6:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Пароль минимум 6 символов'}, ensure_ascii=False)}
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Email уже зарегистрирован'}, ensure_ascii=False)}
        cur.execute(
            "INSERT INTO users (email, password_hash, name) VALUES (%s, %s, %s) RETURNING id, email, name, role",
            (email, hash_password(password), name)
        )
        row = cur.fetchone()
        user = {'id': row[0], 'email': row[1], 'name': row[2], 'role': row[3]}
        session_id = secrets.token_hex(32)
        cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (session_id, user['id']))
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({**user, 'session_id': session_id})}

    # Вход
    if method == 'POST' and action == 'login':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '').strip()
        cur = conn.cursor()
        cur.execute("SELECT id, email, name, role FROM users WHERE email = %s AND password_hash = %s", (email, hash_password(password)))
        row = cur.fetchone()
        if not row:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный email или пароль'}, ensure_ascii=False)}
        user = {'id': row[0], 'email': row[1], 'name': row[2], 'role': row[3]}
        session_id = secrets.token_hex(32)
        cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (session_id, user['id']))
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({**user, 'session_id': session_id})}

    # Выход
    if method == 'POST' and action == 'logout':
        session_id = get_session_id(event)
        if session_id:
            cur = conn.cursor()
            cur.execute("UPDATE sessions SET expires_at = NOW() WHERE id = %s", (session_id,))
            conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}

    # Смена роли пользователя (только admin)
    if method == 'POST' and action == 'set_role':
        session_id = get_session_id(event)
        user = get_user_by_session(conn, session_id) if session_id else None
        if not user or user['role'] != 'admin':
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Нет доступа'})}
        target_id = body.get('user_id')
        new_role = body.get('role')
        if not target_id or new_role not in ('client', 'support', 'admin'):
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Неверные параметры'}, ensure_ascii=False)}
        if target_id == user['id']:
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Нельзя изменить свою роль'}, ensure_ascii=False)}
        cur = conn.cursor()
        cur.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, target_id))
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'success': True})}

    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}