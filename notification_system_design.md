# Notification System Design

## Stage 1

### REST API Design

**Base URL:** `http://localhost:8080`

#### Endpoints

**GET /notifications**
- Query params: `limit`, `page`, `notification_type` (Event | Result | Placement)
- Headers: `Authorization: Bearer <token>`
- Response:
```json
{
  "notifications": [
    { "ID": "uuid", "Type": "Event", "Message": "farewell", "Timestamp": "2026-04-22T17:51:06Z" }
  ]
}
```

**GET /notifications/priority?n=10**
- Returns top n notifications ranked by type weight + recency
- Headers: `Authorization: Bearer <token>`
- Response: same shape as above with added `score` field

**PATCH /notifications/:id/read**
- Marks a notification as read
- Response: `{ "success": true }`

**PATCH /notifications/read-all**
- Marks all notifications as read
- Response: `{ "success": true }`

**GET /notifications/unread-count**
- Response: `{ "count": 5 }`

#### Real-time
WebSocket: `ws://localhost:8080/ws`
Server pushes notification object on new event.

---

## Stage 2

### DB Choice: PostgreSQL

Reasons:
- ACID transactions — reliable read/write
- Native UUID, ENUM support
- Good with indexed range queries on timestamps

### Schema

```sql
CREATE TYPE notif_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  type notif_type NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Scale problems and fixes

- At 5M rows, full table scans become slow
- Add composite index: `CREATE INDEX idx_notif ON notifications(student_id, is_read, created_at DESC);`
- Partition table by `created_at` (monthly)
- Archive notifications older than 6 months to cold storage

### SQL Queries

Fetch unread for a student:
```sql
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = $1 AND is_read = false
ORDER BY created_at DESC
LIMIT 20;
```

Fetch with type filter:
```sql
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = $1 AND type = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;
```

---

## Stage 3

### Query Analysis

Original query:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

**Problems:**
- `SELECT *` — fetches all columns, wasteful at scale
- No index on `(studentID, isRead)` — full table scan on 5M rows = O(n)
- Returns all rows, no limit

**Fixed:**
```sql
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at ASC
LIMIT 50;
```

**Add index:**
```sql
CREATE INDEX idx_notif_student_read ON notifications(student_id, is_read, created_at);
```

With index: O(log n) lookup. Without: O(n) full scan.

**Indexing every column:** BAD. Each index slows down INSERT/UPDATE, wastes disk, and confuses the query planner. Only index columns used in WHERE, ORDER BY, or JOIN.

**Students with placement notification in last 7 days:**
```sql
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'Placement'
AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

### Reducing DB load on page load

**Problem:** Every page load hits DB → DB overwhelmed at 50k students.

**Solutions:**

1. **Redis Cache**
   - Cache `notifications:studentId` with TTL of 60s
   - On new notification, invalidate that student's cache
   - Tradeoff: up to 60s staleness, but 90%+ cache hit rate

2. **Pagination**
   - Fetch only 10-20 at a time, not all
   - Tradeoff: needs scroll/pagination UI, but drastically reduces query cost

3. **HTTP Cache headers**
   - `Cache-Control: max-age=30` on GET /notifications
   - Tradeoff: browser caches, stale for 30s but zero DB hits on repeat loads

4. **CDN / Edge caching** for static notification metadata

**Best approach:** Redis + pagination. Redis absorbs repeated reads, pagination keeps each query cheap.

---

## Stage 5

### notify_all shortcoming

`send_email` failed midway for 200 students — rest of the 50k never notified.

**Problems:**
- Synchronous loop — one failure stops everything
- No retry mechanism
- Email and DB save are coupled — partial failures cause inconsistency

### Redesign with message queue

```
function notify_all(student_ids, message):
  for id in student_ids:
    queue.add({ student_id: id, message })

worker.process(job):
  save_to_db(job.student_id, job.message)   // DB first, source of truth
  try:
    send_email(job.student_id, job.message)
  catch error:
    log(backend, error, service, "email failed: " + job.student_id)
    queue.retry(job, max=3)
  push_to_app(job.student_id, job.message)
```

**Why queue:** Jobs are independent. One email failure doesn't block others. Failed jobs retry automatically. DB save and email are decoupled — DB is always consistent even if email fails.

**Should save_to_db and send_email happen together?** No. DB is source of truth and must always succeed. Email is best-effort. Coupling them means a failed email could roll back a valid DB write, which is wrong.

---

## Stage 6

### Priority Inbox

**Priority = weight × recency score**

Weights: Placement = 3, Result = 2, Event = 1

Score formula:
```
score = weight * (1 / (hours_since_created + 1))
```

Newer + higher weight = higher score.

**Top 10 efficiently with new notifications coming in:**
- Use a min-heap of size 10
- On each new notification, compute score and push to heap
- If heap size > 10, pop the lowest
- This keeps top 10 in O(log 10) = O(1) effectively

Implementation: see `priority.js`
