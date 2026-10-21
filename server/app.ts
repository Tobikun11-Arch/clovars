import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {env} from './api/config/env';
import routes from './api/routes/index';
import {errorHandler} from './api/middleware/errorHandler';
import {sanitize} from './api/middleware/sanitize';
import {requestLogger} from './api/middleware/requestLogger';
import {csrfProtection} from './api/middleware/csrf';
import {httpsRedirect} from './api/middleware/httpsRedirect';

const app = express();

const configuredOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map(o => o.trim().replace(/\/+$/, ''))
  : ['http://localhost:3000'];

app.use(helmet());
app.use(httpsRedirect);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (configuredOrigins.includes(origin)) return callback(null, true);
      // Allow any localhost dev server port in development.
      if (
        env.NODE_ENV !== 'production' &&
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-csrf-token']
  })
);

app.use(express.json({limit: '10kb'}));
app.use(cookieParser());
app.use(sanitize);
app.use(requestLogger);
app.use(csrfProtection);

app.use('/api', routes);

app.get('/', async (_req, res) => {
  res.send('test production!');
});

app.use(errorHandler);

export default app;
