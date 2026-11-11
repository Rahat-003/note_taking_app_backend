const { HttpError } = require('../utils/errors');

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
      return next(new HttpError(400, message));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
