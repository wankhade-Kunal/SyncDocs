const express = require('express');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { User } = require('../models');

const router = express.Router();

// Generate JWT token with expiration
const generateToken = (userId, email, name) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured in environment variables');
  }

  return jwt.sign(
    { userId: userId.toString(), email, name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

// Validate password strength
const isPasswordStrong = (password) => {
  // At least 8 chars, 1 uppercase, 1 number
  const strongRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongRegex.test(password);
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Input validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        fields: ['name', 'email', 'password', 'confirmPassword'],
      });
    }

    // Sanitize inputs
    const trimmedName = validator.trim(name);
    const trimmedEmail = validator.trim(email).toLowerCase();

    // Validate name
    if (trimmedName.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Name must not exceed 100 characters' });
    }

    // Validate email format
    if (!validator.isEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Validate password strength
    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters, include uppercase letter and number',
      });
    }

    // Check if user already exists (before creating document)
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = new User({
      name: trimmedName,
      email: trimmedEmail,
      passwordHash: password,
    });

    // Save user (password will be hashed in pre-save hook)
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.email, user.name);

    // Return success response
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);

    // Handle specific error types
    if (error.message.includes('Password')) {
      return res.status(400).json({ error: error.message });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages[0] });
    }

    // Generic error
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Sanitize email
    const trimmedEmail = validator.trim(email).toLowerCase();

    // Validate email format
    if (!validator.isEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Find user and explicitly select password (it's normally hidden)
    const user = await User.findOne({ email: trimmedEmail }).select('+passwordHash');

    // User not found or password invalid (generic message for security)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id, user.email, user.name);

    // Return success response
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(500).json({ error: 'Token generation failed' });
    }

    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
