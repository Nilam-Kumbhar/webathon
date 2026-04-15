/**
 * Central error-handling middleware.
 *
 * Express recognises this as an error handler because it has 4 parameters.
 * All `next(err)` calls and unhandled rejections in async route handlers
 * should land here.
 */
const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  // Mongoose validation error → 400
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
  }

  // Mongoose duplicate-key error → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res
      .status(409)
      .json({ success: false, message: `Duplicate value for field: ${field}` });
  }

  // Mongoose cast error (e.g. invalid ObjectId) → 400
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }

  // Default to 500
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

export default errorHandler;
