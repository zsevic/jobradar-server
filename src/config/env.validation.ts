import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  FRONTEND_ORIGIN: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  GUMROAD_PRODUCT_ID: Joi.string().required(),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
});
