import json
import os
import psycopg2


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


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


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}


def handler(event: dict, context) -> dict:
    """Система тех. поддержки: создание тикетов, просмотр, ответы администратора"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    headers = event.get('headers', {})
    session_id = (
        headers.get('x-session-id') or
        headers.get('x-authorization') or
        ''
    )
    conn = get_db()
    user = get_user_by_session(conn, session_id) if session_id else None

    try:
        # POST /  — создать тикет (публичный, без авторизации)
        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            action = body.get('action', 'create')

            if action == 'create':
                name = (body.get('name') or '').strip()
                email = (body.get('email') or '').strip()
                subject = (body.get('subject') or '').strip()
                message = (body.get('message') or '').strip()
                if not name or not email or not subject or not message:
                    return {'statusCode': 400, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'Заполните все поля'})}
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO support_tickets (name, email, subject, message) VALUES (%s, %s, %s, %s) RETURNING id",
                    (name, email, subject, message)
                )
                ticket_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS_HEADERS,
                        'body': json.dumps({'success': True, 'ticket_id': ticket_id})}

            if action == 'reply':
                if not user or user['role'] != 'admin':
                    return {'statusCode': 403, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'Нет доступа'})}
                ticket_id = body.get('ticket_id')
                text = (body.get('text') or '').strip()
                if not ticket_id or not text:
                    return {'statusCode': 400, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'Укажите ticket_id и text'})}
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO support_replies (ticket_id, text, is_admin) VALUES (%s, %s, TRUE) RETURNING id",
                    (ticket_id, text)
                )
                reply_id = cur.fetchone()[0]
                cur.execute(
                    "UPDATE support_tickets SET status = 'answered', updated_at = NOW() WHERE id = %s",
                    (ticket_id,)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS_HEADERS,
                        'body': json.dumps({'success': True, 'reply_id': reply_id})}

            return {'statusCode': 400, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Неизвестное действие'})}

        # PUT / — изменить статус тикета (только админ)
        if method == 'PUT':
            if not user or user['role'] != 'admin':
                return {'statusCode': 403, 'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'Нет доступа'})}
            body = json.loads(event.get('body') or '{}')
            ticket_id = body.get('ticket_id')
            status = body.get('status')
            allowed = ['open', 'answered', 'closed']
            if not ticket_id or status not in allowed:
                return {'statusCode': 400, 'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'Неверные параметры'})}
            cur = conn.cursor()
            cur.execute(
                "UPDATE support_tickets SET status = %s, updated_at = NOW() WHERE id = %s",
                (status, ticket_id)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS,
                    'body': json.dumps({'success': True})}

        # GET / — список тикетов (только админ) или один тикет с ответами
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            ticket_id = params.get('ticket_id')

            if ticket_id:
                # Один тикет + все ответы (публичный — для страницы проверки статуса)
                cur = conn.cursor()
                cur.execute(
                    "SELECT id, name, email, subject, message, status, created_at, updated_at FROM support_tickets WHERE id = %s",
                    (ticket_id,)
                )
                row = cur.fetchone()
                if not row:
                    return {'statusCode': 404, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'Тикет не найден'})}
                ticket = {
                    'id': row[0], 'name': row[1], 'email': row[2],
                    'subject': row[3], 'message': row[4], 'status': row[5],
                    'created_at': str(row[6]), 'updated_at': str(row[7])
                }
                cur.execute(
                    "SELECT id, text, is_admin, created_at FROM support_replies WHERE ticket_id = %s ORDER BY created_at ASC",
                    (ticket_id,)
                )
                replies = [{'id': r[0], 'text': r[1], 'is_admin': r[2], 'created_at': str(r[3])} for r in cur.fetchall()]
                return {'statusCode': 200, 'headers': CORS_HEADERS,
                        'body': json.dumps({'ticket': ticket, 'replies': replies})}

            # Список всех тикетов — только для админа
            if not user or user['role'] != 'admin':
                return {'statusCode': 403, 'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'Нет доступа'})}
            status_filter = params.get('status', '')
            cur = conn.cursor()
            if status_filter:
                cur.execute(
                    "SELECT id, name, email, subject, status, created_at, updated_at FROM support_tickets WHERE status = %s ORDER BY created_at DESC",
                    (status_filter,)
                )
            else:
                cur.execute(
                    "SELECT id, name, email, subject, status, created_at, updated_at FROM support_tickets ORDER BY created_at DESC"
                )
            rows = cur.fetchall()
            tickets = [
                {'id': r[0], 'name': r[1], 'email': r[2], 'subject': r[3],
                 'status': r[4], 'created_at': str(r[5]), 'updated_at': str(r[6])}
                for r in rows
            ]
            return {'statusCode': 200, 'headers': CORS_HEADERS,
                    'body': json.dumps({'tickets': tickets})}

    finally:
        conn.close()

    return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Метод не поддерживается'})}