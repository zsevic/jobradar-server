import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  FRONTEND_ORIGIN: Joi.string().uri().required(),
  BACKEND_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  GITHUB_CLIENT_ID: Joi.string().required(),
  GITHUB_CLIENT_SECRET: Joi.string().required(),
  GITHUB_SPONSOR_LOGIN: Joi.string().default('zsevic'),
  GITHUB_SPONSOR_CHECK_TOKEN: Joi.string().required(),
  GITHUB_OAUTH_REDIRECT_URI: Joi.string().uri().optional(),
  SPONSOR_CHECK_CACHE_TTL_SECONDS: Joi.number().integer().min(0).default(300),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  SMTP_HOST: Joi.string().default('sandbox.smtp.mailtrap.io'),
  SMTP_PORT: Joi.number().port().default(2525),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().default('JobRadar <noreply@jobradar.local>'),
  EMAIL_DIGEST_INTERVAL_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(1440)
    .default(15),
  EMAIL_DIGEST_MAX_JOBS: Joi.number().integer().min(1).max(100).default(25),
  SOURCE_POLLING_INTERVAL_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(1440)
    .default(30),
});
