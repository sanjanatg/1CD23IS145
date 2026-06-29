const axios = require('axios')

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJzYW5qYW5hdGcyMTI2QGdtYWlsLmNvbSIsImV4cCI6MTc4MjcxNTAyMCwiaWF0IjoxNzgyNzE0MTIwLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiZjY0YmQ0YWQtYmIzMy00OGNkLWJiN2ItNGZjZmZlNWRhOTQ1IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoic2FuamFuYSB0IGciLCJzdWIiOiI5YWNhODQwNi1iY2FlLTQwYzItOGExOC1jYWNkODAxMjA2NjIifSwiZW1haWwiOiJzYW5qYW5hdGcyMTI2QGdtYWlsLmNvbSIsIm5hbWUiOiJzYW5qYW5hIHQgZyIsInJvbGxObyI6IjFjZDIzaXMxNDUiLCJhY2Nlc3NDb2RlIjoiQXBucFRtIiwiY2xpZW50SUQiOiI5YWNhODQwNi1iY2FlLTQwYzItOGExOC1jYWNkODAxMjA2NjIiLCJjbGllbnRTZWNyZXQiOiJFUFZYWGViUnRTS0J2VEJRIn0.iLOlBnKA8mItv9b0Atjtp7913j7BPnLPVidEeTahTls"

async function log(stack, level, pkg, msg) {
  try {
    await axios.post('http://4.224.186.213/evaluation-service/logs', {
      stack, level, package: pkg, message: msg
    }, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    })
  } catch(e) {}
}

module.exports = { log }
