require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ⚡ VOLTIFY API running
  ─────────────────────
  Port:    ${PORT}
  Env:     ${process.env.NODE_ENV || 'development'}
  Health:  http://localhost:${PORT}/health
  `);
});
