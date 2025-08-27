const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
    errorCode = 'DUPLICATE_ENTRY';
  } else if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    statusCode = 400;
    message = 'Referenced resource does not exist';
    errorCode = 'REFERENCE_VIOLATION';
  } else if (err.code === '23514') { // PostgreSQL check constraint violation
    statusCode = 400;
    message = 'Data validation failed';
    errorCode = 'VALIDATION_ERROR';
  } else if (err.code === '42P01') { // PostgreSQL undefined table
    statusCode = 500;
    message = 'Database configuration error';
    errorCode = 'DB_CONFIG_ERROR';
  } else if (err.code === 'ENOTFOUND') { // Network error
    statusCode = 503;
    message = 'Service temporarily unavailable';
    errorCode = 'SERVICE_UNAVAILABLE';
  } else if (err.code === 'ECONNREFUSED') { // Connection refused
    statusCode = 503;
    message = 'Database connection failed';
    errorCode = 'DB_CONNECTION_ERROR';
  } else if (err.name === 'ValidationError') { // Validation error
    statusCode = 400;
    message = err.message || 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError') { // JWT error
    statusCode = 401;
    message = 'Authentication failed';
    errorCode = 'AUTHENTICATION_ERROR';
  } else if (err.status) { // Express error with status
    statusCode = err.status;
    message = err.message || 'Request failed';
    errorCode = err.code || 'REQUEST_ERROR';
  }

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name,
      url: req.url,
      method: req.method,
      user: req.user?.id,
      timestamp: new Date().toISOString()
    });
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      code: errorCode,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    }
  });
};

module.exports = { errorHandler };
