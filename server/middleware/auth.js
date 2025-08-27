const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// JWT token expiry times based on role
const TOKEN_EXPIRY = {
  TEACHER: '15m',
  PRINCIPAL: '4h',
  SUPER_ADMIN: '8h'
};

// Generate JWT token
const generateToken = (user) => {
  const expiry = TOKEN_EXPIRY[user.role] || '1h';
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: expiry }
  );
};

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get fresh user data from database
    const result = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || result.rows[0].is_active === false) {
      return res.status(401).json({ 
        error: 'User not found or inactive',
        code: 'USER_INVALID'
      });
    }

    // Normalize role to uppercase for consistent authorization checks
    req.user = {
      ...result.rows[0],
      role: (result.rows[0].role || '').toUpperCase()
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const allowedRolesUpper = roles.map(r => (r || '').toUpperCase());
    const currentRoleUpper = (req.user.role || '').toUpperCase();

    if (!allowedRolesUpper.includes(currentRoleUpper)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRolesUpper,
        current: currentRoleUpper
      });
    }

    next();
  };
};

// Specific role middlewares
const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
const requirePrincipal = requireRole(['SUPER_ADMIN', 'PRINCIPAL']);
const requireTeacher = requireRole(['SUPER_ADMIN', 'PRINCIPAL', 'TEACHER']);

// Teacher data isolation middleware
const teacherDataIsolation = async (req, res, next) => {
  if (req.user.role === 'TEACHER') {
    // Teachers can only access their own data
    if (req.params.id && req.params.id !== req.user.id) {
      return res.status(403).json({ 
        error: 'Access denied to other teachers\' data',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Set teacher_id filter for queries
    req.teacherFilter = req.user.id;
  }
  
  next();
};

// Rate limiting for failed login attempts
const checkLoginAttempts = async (req, res, next) => {
  // Simplified version - no rate limiting for now
  next();
};

// Log failed login attempt
const logFailedLogin = async (email, ipAddress) => {
  // Simplified version - no logging for now
  console.log(`Failed login attempt for ${email} from ${ipAddress}`);
};

// Audit logging middleware
const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response is sent
      setTimeout(async () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            await query(
              `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                req.user?.id,
                action,
                entityType,
                req.params.id || req.body.id,
                req.method === 'PUT' || req.method === 'DELETE' ? JSON.stringify(req.body) : null,
                req.method === 'POST' || req.method === 'PUT' ? JSON.stringify(req.body) : null,
                req.ip,
                req.get('User-Agent')
              ]
            );
          }
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      }, 100);
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  requireSuperAdmin,
  requirePrincipal,
  requireTeacher,
  teacherDataIsolation,
  checkLoginAttempts,
  logFailedLogin,
  auditLog
};
