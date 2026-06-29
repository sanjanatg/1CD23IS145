const axios = require('axios')
const { log } = require('../logging-middleware')

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJzYW5qYW5hdGcyMTI2QGdtYWlsLmNvbSIsImV4cCI6MTc4MjcxNTAyMCwiaWF0IjoxNzgyNzE0MTIwLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiZjY0YmQ0YWQtYmIzMy00OGNkLWJiN2ItNGZjZmZlNWRhOTQ1IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoic2FuamFuYSB0IGciLCJzdWIiOiI5YWNhODQwNi1iY2FlLTQwYzItOGExOC1jYWNkODAxMjA2NjIifSwiZW1haWwiOiJzYW5qYW5hdGcyMTI2QGdtYWlsLmNvbSIsIm5hbWUiOiJzYW5qYW5hIHQgZyIsInJvbGxObyI6IjFjZDIzaXMxNDUiLCJhY2Nlc3NDb2RlIjoiQXBucFRtIiwiY2xpZW50SUQiOiI5YWNhODQwNi1iY2FlLTQwYzItOGExOC1jYWNkODAxMjA2NjIiLCJjbGllbnRTZWNyZXQiOiJFUFZYWGViUnRTS0J2VEJRIn0.iLOlBnKA8mItv9b0Atjtp7913j7BPnLPVidEeTahTls"
const W = { Placement: 3, Result: 2, Event: 1 }

function score(n) {
  const hrs = (Date.now() - new Date(n.Timestamp)) / 36e5
  return (W[n.Type] || 1) * (1 / (hrs + 1))
}

function topN(notifs, n = 10) {
  return notifs
    .map(x => ({ ...x, score: score(x) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

async function main() {
  try {
    log('backend', 'info', 'service', 'fetching notifications for priority inbox')
    const r = await axios.get('http://4.224.186.213/evaluation-service/notifications', {
      headers: { Authorization: `Bearer ${TOKEN}` },
      
    })
    const top = topN(r.data.notifications, 10)
    log('backend', 'info', 'service', `top 10 priority notifications computed`)
    console.log(JSON.stringify(top, null, 2))
  } catch(e) {
    log('backend', 'error', 'service', `priority fetch failed: ${e.message}`)
    console.error(e.message)
  }
}

main()
