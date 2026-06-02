import json
import os
import psycopg2


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_user_by_session(conn, session_id: str):
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = %s AND s.expires_at > NOW()",
        (session_id,)
    )
    row = cur.fetchone()
    if row:
        return {'id': row[0], 'role': row[1]}
    return None


def handler(event: dict, context) -> dict:
    """Аналитика: трекинг просмотров страниц и получение статистики для админа."""

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    method = event.get('httpMethod')
    body = json.loads(event.get('body') or '{}')
    conn = get_db()
    cur = conn.cursor()

    # POST — записать просмотр страницы (публичный, без авторизации)
    if method == 'POST':
        path = body.get('path', '/')[:500]
        referrer = (body.get('referrer') or '')[:1000]
        utm_source = (body.get('utm_source') or '')[:255]
        utm_medium = (body.get('utm_medium') or '')[:255]
        cur.execute(
            "INSERT INTO page_views (path, referrer, utm_source, utm_medium) VALUES (%s, %s, %s, %s)",
            (path, referrer or None, utm_source or None, utm_medium or None)
        )
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}

    # GET — получить статистику (только админ)
    if method == 'GET':
        session_id = event.get('headers', {}).get('x-session-id', '')
        if not session_id:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}
        user = get_user_by_session(conn, session_id)
        if not user or user['role'] != 'admin':
            return {'statusCode': 403, 'headers': cors, 'body': json.dumps({'error': 'Доступ запрещён'})}

        # Просмотры по дням (последние 30 дней)
        cur.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as views
            FROM page_views
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY day ORDER BY day ASC
        """)
        views_by_day = [{'day': str(r[0]), 'views': r[1]} for r in cur.fetchall()]

        # Топ страниц
        cur.execute("""
            SELECT path, COUNT(*) as views
            FROM page_views
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY path ORDER BY views DESC LIMIT 10
        """)
        top_pages = [{'path': r[0], 'views': r[1]} for r in cur.fetchall()]

        # Источники трафика
        cur.execute("""
            SELECT
                CASE
                    WHEN utm_source IS NOT NULL AND utm_source != '' THEN utm_source
                    WHEN referrer IS NULL OR referrer = '' THEN 'Прямой переход'
                    WHEN referrer LIKE '%google%' THEN 'Google'
                    WHEN referrer LIKE '%yandex%' THEN 'Яндекс'
                    WHEN referrer LIKE '%vk.com%' THEN 'ВКонтакте'
                    WHEN referrer LIKE '%t.me%' OR referrer LIKE '%telegram%' THEN 'Telegram'
                    ELSE 'Другое'
                END as source,
                COUNT(*) as visits
            FROM page_views
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY source ORDER BY visits DESC
        """)
        traffic_sources = [{'source': r[0], 'visits': r[1]} for r in cur.fetchall()]

        # Регистрации по дням
        cur.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM users
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY day ORDER BY day ASC
        """)
        registrations_by_day = [{'day': str(r[0]), 'count': r[1]} for r in cur.fetchall()]

        # Заказы по дням
        cur.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY day ORDER BY day ASC
        """)
        orders_by_day = [{'day': str(r[0]), 'count': r[1]} for r in cur.fetchall()]

        # Итоговые цифры
        cur.execute("SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - INTERVAL '30 days'")
        total_views = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days'")
        total_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'")
        total_orders = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE role != 'admin'")
        all_users = cur.fetchone()[0]

        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({
                'total_views': total_views,
                'total_users': total_users,
                'total_orders': total_orders,
                'all_users': all_users,
                'views_by_day': views_by_day,
                'top_pages': top_pages,
                'traffic_sources': traffic_sources,
                'registrations_by_day': registrations_by_day,
                'orders_by_day': orders_by_day,
            }, ensure_ascii=False)
        }

    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
