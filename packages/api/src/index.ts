import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { connectToDatabase } from './config/database';
import notesRouter from './routes/notes';
import programsRouter from './routes/programs';
import applicationsRouter from './routes/applications';
import authRouter from './routes/auth';
import countriesRouter from './routes/countries';
import featuredRouter from './routes/featured';
import subscribersRouter from './routes/subscribers';
import concentrationsRouter from './routes/concentrations';
import eventsRouter from './routes/events';

async function start() {
  await connectToDatabase();
  const app = express();

  const allowed = env.corsAllowedOrigins;
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow same-origin / server-side
        if (!allowed.length || allowed.includes(origin)) return callback(null, true);
        callback(new Error('CORS blocked'));
      }
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: env.nodeEnv });
  });

  app.use('/api/notes', notesRouter);
  app.use('/api/programs', programsRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/countries', countriesRouter);
  app.use('/api/featured', featuredRouter);
  app.use('/api/subscribers', subscribersRouter);
  app.use('/api/concentrations', concentrationsRouter);
  app.use('/api/events', eventsRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
