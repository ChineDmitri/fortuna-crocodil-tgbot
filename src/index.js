import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { Store } from './store.js';
import { GameService } from './gameService.js';
import { createBot } from './bot.js';
import { createHttpServer } from './server.js';
import { SnapshotPublisher } from './snapshotPublisher.js';

const config = loadConfig();
const store = new Store(config.database.path);
const gameService = new GameService({ store, config });
const { bot, sendWordReadyMessage } = createBot({ config, gameService });
const snapshotPublisher = new SnapshotPublisher({
  telegram: bot.telegram,
  store,
  gameService,
  config
});

const app = createHttpServer({
  config,
  gameService,
  snapshotPublisher,
  telegram: bot.telegram,
  sendWordReadyMessage
});

const httpServer = createServer(app);

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Received ${signal}. Shutting down...`);

  try {
    bot.stop(signal);
  } catch {
    // Telegraf throws if it was not launched yet.
  }

  await new Promise((resolve) => httpServer.close(resolve));
  store.close();
}

process.once('SIGINT', () => {
  shutdown('SIGINT').then(() => process.exit(0));
});

process.once('SIGTERM', () => {
  shutdown('SIGTERM').then(() => process.exit(0));
});

httpServer.listen(config.http.port, async () => {
  console.log(`Croco web server listening on http://localhost:${config.http.port}`);
  console.log(`Public Mini App base URL: ${config.publicBaseUrl}`);

  try {
    await bot.launch({
      allowedUpdates: ['message', 'callback_query'],
      dropPendingUpdates: false
    });
    console.log('Telegram bot polling started.');
  } catch (error) {
    console.error('Could not start Telegram bot:', error);
    await shutdown('BOT_LAUNCH_FAILED');
    process.exit(1);
  }
});

