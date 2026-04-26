const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.userId = decoded.userId;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware;
