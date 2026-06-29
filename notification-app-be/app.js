const express = require('express')
const axios = require('axios')
const { log } = require('../logging-middleware')

const app = express()
app.use(express.json())

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJzYW5qYW5hdGcyMTI2QGdtYWlsLmNvbSIsImV4cCI6MTc4MjcxNTAyMCwiaWF0IjoxNzgyNzE0MTIwLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiZjY0YmQ0YWQtYmIzMy00OGNkLWJiN2ItNGZjZmZlNWRhOTQ1IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoic2FuamFuYSB0IGciLCJzdWIiOiI5YWNhODQwNi1iY2FlLTQwYzItOGExOC1jYWNkODAxMjA2NjIifSwiZW1haWwiOiJzYW5qYW5hdGcyMTI2QGdtYWlsLmNvbSIsIm5hbWUiOiJzYW5qYW5hIHQgZyIsInJvbGxObyI6IjFjZDIzaXMxNDUiLCJhY2Nlc3NDb2RlIjoiQXBucFRtIiwiY2xpZW50SUQiOiI5YWNhODQwNi1iY2FlLTQwYzItOGExOC1jYWNkODAxMjA2NjIiLCJjbGllbnRTZWNyZXQiOiJFUFZYWGViUnRTS0J2VEJRIn0.iLOlBnKA8mItv9b0Atjtp7913j7BPnLPVidEeTahTls"
const BASE = 'http://4.224.186.213/evaluation-service'
const headers = () => ({ Authorization: `Bearer ${TOKEN}` })

// GET /notifications
app.get('/notifications', async (req, res) => {
  const { limit, page, notification_type } = req.query
  const params = {}
  if (limit) params.limit = limit
  if (page) params.page = page
  if (notification_type) params.notification_type = notification_type

  try {
    log('backend', 'info', 'handler', `fetching notifications: ${JSON.stringify(params)}`)
    const r = await axios.get(`${BASE}/notifications`, { headers: headers(), params })
    log('backend', 'info', 'service', `fetched ${r.data.notifications?.length} notifications`)
    res.json(r.data)
  } catch(e) {
    log('backend', 'error', 'handler', `fetch notifications failed: ${e.message}`)
    res.status(500).json({ error: 'failed to fetch notifications' })
  }
})

// GET /notifications/priority?n=10
app.get('/notifications/priority', async (req, res) => {
  const n = parseInt(req.query.n) || 10
  const W = { Placement: 3, Result: 2, Event: 1 }

  function score(notif) {
    const hrs = (Date.now() - new Date(notif.Timestamp)) / 36e5
    return (W[notif.Type] || 1) * (1 / (hrs + 1))
  }

  try {
    log('backend', 'info', 'handler', `fetching top ${n} priority notifications`)
    const r = await axios.get(`${BASE}/notifications`, { headers: headers(),  })
    const top = r.data.notifications
      .map(x => ({ ...x, score: score(x) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
    log('backend', 'info', 'service', `priority inbox built, top ${n} returned`)
    res.json({ notifications: top })
  } catch(e) {
    log('backend', 'error', 'handler', `priority fetch failed: ${e.message}`)
    res.status(500).json({ error: 'failed' })
  }
})

app.listen(8080, () => {
  log('backend', 'info', 'route', 'server started on port 8080')
  console.log('running on http://localhost:8080')
})
