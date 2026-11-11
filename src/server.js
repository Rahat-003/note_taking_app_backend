const config = require('./config');
const app = require('./app');
const { connect } = require('./db');
const { pending } = require('./migrator');

async function start() {
  await connect(config.mongoUri);
  const todo = await pending();
  if (todo.length) throw new Error(`Pending migrations: ${todo.join(', ')}. Run "npm run setup" first.`);
  app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
