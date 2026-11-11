// npm run migrate            apply pending migrations
// npm run migrate -- status  list applied and pending migrations
// npm run migrate -- down    revert the last applied migration
const mongoose = require('mongoose');
const config = require('../config');
const { connect } = require('../db');
const { applied, pending, migrate, rollback } = require('../migrator');

async function main(command = 'up') {
  await connect(config.mongoUri);
  try {
    if (command === 'up') {
      const ran = await migrate();
      console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Nothing to migrate');
    } else if (command === 'down') {
      const reverted = await rollback();
      console.log(reverted ? `Reverted: ${reverted}` : 'Nothing to revert');
    } else if (command === 'status') {
      for (const name of await applied()) console.log(`applied  ${name}`);
      for (const name of await pending()) console.log(`pending  ${name}`);
    } else {
      throw new Error(`Unknown command "${command}" (use up, down or status)`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main(process.argv[2]).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
