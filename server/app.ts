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

// Keep request bodies small everywhere except the profile photo upload,
// which carries a resized image as a base64 data URL.
export const AVATAR_UPLOAD_PATH = '/api/auth/profile/avatar';
const smallJson = express.json({limit: '10kb'});
const avatarJson = express.json({limit: '300kb'});
app.use((req, res, next) =>
  req.path === AVATAR_UPLOAD_PATH
    ? avatarJson(req, res, next)
    : smallJson(req, res, next)
);
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
