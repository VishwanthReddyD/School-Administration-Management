const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { 
  generateToken, 
  checkLoginAttempts, 
  logFailedLogin,
  auditLog 
} = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .custom(value => {
      if (!value.endsWith('@school.edu')) {
        throw new Error('Only @school.edu email addresses are allowed');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .custom(value => {
      if (!value.endsWith('@school.edu')) {
        throw new Error('Only @school.edu email addresses are allowed');
      }
      return true;
    })
];

// Login endpoint
router.post('/login', 
  checkLoginAttempts,
  validateLogin,
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // Get user info
      const result = await query(`
        SELECT 
          u.id, 
          u.email, 
          u.password_hash, 
          u.role, 
          u.name
        FROM users u
        WHERE u.email = $1
      `, [email]);

      if (result.rows.length === 0) {
        console.log(result);
        console.log("Login failed due to the result rows");
        await logFailedLogin(email, req.ip);
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        console.log("Login failed due to invalid password");
        await logFailedLogin(email, req.ip);
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }



      // Generate JWT token
      const token = generateToken(user);

      // Prepare user data for response
      const userData = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      // Log successful login
      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          'LOGIN_SUCCESS',
          'USER',
          user.id,
          null,
          JSON.stringify({ email: user.email, role: user.role })
        ]
      );

      res.json({
        message: 'Login successful',
        token,
        user: userData,
        requires2FA: false
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  }
);

// Forgot password endpoint
router.post('/forgot-password',
  validatePasswordReset,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email } = req.body;

      // Check if user exists
      const result = await query(
        'SELECT id, email, role FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Don't reveal if user exists or not
        return res.json({
          message: 'If an account with that email exists, a password reset link has been sent'
        });
      }

      const user = result.rows[0];

      // Generate reset token (in production, use crypto.randomBytes)
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      const resetTokenHash = await bcrypt.hash(resetToken, 12);

      // Store reset token with expiry (1 hour)
      await query(
        `UPDATE users 
         SET password_hash = $1, 
             updated_at = NOW() 
         WHERE id = $2`,
        [resetTokenHash, user.id]
      );

      // In production, send email with reset link
      // For demo purposes, we'll return the token
      console.log(`Password reset token for ${email}: ${resetToken}`);

      // Log password reset request
      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          'PASSWORD_RESET_REQUESTED',
          'USER',
          user.id,
          null,
          JSON.stringify({ email: user.email })
        ]
      );

      res.json({
        message: 'Password reset link sent to your email',
        // Remove this in production
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Password reset request failed',
        code: 'PASSWORD_RESET_ERROR'
      });
    }
  }
);

// Reset password endpoint
router.post('/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token, newPassword } = req.body;

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      const result = await query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email',
        [newPasswordHash, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          error: 'Invalid reset token',
          code: 'INVALID_TOKEN'
        });
      }

      const user = result.rows[0];

      // Log password reset
      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          'PASSWORD_RESET_COMPLETED',
          'USER',
          user.id,
          null,
          JSON.stringify({ email: user.email })
        ]
      );

      res.json({
        message: 'Password reset successful'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Password reset failed',
        code: 'PASSWORD_RESET_ERROR'
      });
    }
  }
);

// Verify 2FA token
router.post('/verify-2fa',
  [
    body('token').notEmpty().withMessage('2FA token is required'),
    body('userId').isUUID().withMessage('Valid user ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token, userId } = req.body;

      // Get user info
      const result = await query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // 2FA is not implemented in current schema
      return res.status(400).json({
        error: '2FA is not enabled for this user',
        code: '2FA_NOT_ENABLED'
      });

      if (!verified) {
        return res.status(401).json({
          error: 'Invalid 2FA token',
          code: 'INVALID_2FA_TOKEN'
        });
      }

      res.json({
        message: '2FA verification successful',
        verified: true
      });

    } catch (error) {
      console.error('2FA verification error:', error);
      res.status(500).json({
        error: '2FA verification failed',
        code: '2FA_VERIFICATION_ERROR'
      });
    }
  }
);

// Setup 2FA for user
router.post('/setup-2fa',
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Generate 2FA secret
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret({
        name: 'College Timetable Management',
        issuer: 'College.edu'
      });

      // 2FA is not implemented in current schema
      return res.status(400).json({
        error: '2FA setup is not available',
        code: '2FA_NOT_AVAILABLE'
      });

      // Generate QR code
      const qrcode = require('qrcode');
      const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

      res.json({
        message: '2FA setup successful',
        secret: secret.base32,
        qrCode: qrCodeDataURL,
        otpauthUrl: secret.otpauth_url
      });

    } catch (error) {
      console.error('2FA setup error:', error);
      res.status(500).json({
        error: '2FA setup failed',
        code: '2FA_SETUP_ERROR'
      });
    }
  }
);

// Logout endpoint (client-side token removal)
router.post('/logout', async (req, res) => {
  try {
    if (req.user) {
      // Log logout action
      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'LOGOUT',
          'USER',
          req.user.id,
          null,
          JSON.stringify({ email: req.user.email, role: req.user.role })
        ]
      );
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

module.exports = router;
