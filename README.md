# Rate Limiter API

Uses sliding window counter.

Stores rate limit config in memory that can be updated without restarting.

Setup:

```bash
npm i
```

Start:

```bash
npm start
```

## Regular request (rate limited by IP, default)

GET /

## Check default configuration

GET /admin/config/default

## Set default configuration

POST /admin/config/default

{"limit": 100, "windowMs": 300000}

## User-based rate limiting

GET /?user=alice

GET / -H "X-User: bob"

## Configure limits for specific users

POST /admin/config/user:alice

{"limit": 100, "windowMs": 60000}

## Configure limits for specific IPs

POST /admin/config/ip:192.168.1.100

{"limit": 50, "windowMs": 60000}

## View status of all keys

GET /admin/status

## Health check

GET /health
