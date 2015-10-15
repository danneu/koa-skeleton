'use strict';

exports.NODE_ENV = process.env.NODE_ENV || 'development';
exports.PORT = Number.parseInt(process.env.PORT, 10) || 3000;
exports.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/koa-skeleton';

// Set the HOSTNAME in production for basic CSRF prevention
//
// Ex: example.com, subdomain.example.com
exports.HOSTNAME = process.env.HOSTNAME;
if (exports.NODE_ENV === 'development' && !exports.HOSTNAME) {
  console.warn('Warn: CSRF checks are disabled in development mode since there is no HOSTNAME environment variable provided');
}
if (exports.NODE_ENV === 'production' && !exports.HOSTNAME) {
  throw new Error('Refusing to boot until you set the HOSTNAME environment variable');
}

exports.RECAPTCHA_SITEKEY = process.env.RECAPTCHA_SITEKEY;
exports.RECAPTCHA_SITESECRET = process.env.RECAPTCHA_SITESECRET;
if (!exports.RECAPTCHA_SITEKEY)
  console.warn('Warn: Recaptcha will not work since RECAPTCHA_SITEKEY is not set');
if (!exports.RECAPTCHA_SITESECRET)
  console.warn('Warn: Recaptcha will not work since RECAPTCHA_SITESECRET is not set');

////////////////////////////////////////////////////////////

// Output config object in development to help with sanity-checking
if (exports.NODE_ENV === 'development') {
  console.log(exports);
}
