const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name must not exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email address'],
    index: true, // Ensure compound index for uniqueness
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't return password by default
  },
  avatar: {
    type: String,
    default: function() {
      // Properly encode the name for URL
      const encodedName = encodeURIComponent(this.name);
      return `https://ui-avatars.com/api/?name=${encodedName}&background=random&bold=true`;
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create compound unique index for email
userSchema.index({ email: 1 }, { unique: true });

// Hash password before saving (works for both new and updated documents)
userSchema.pre('save', async function (next) {
  // Only hash if password is new or modified
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    // Validate password strength
    if (this.passwordHash.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(11); // Round 11 for better security
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    // Pass error to Express error handler
    next(error);
  }
});

// Handle duplicate email errors
userSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    next(new Error(`A user with this ${field} already exists`));
  } else {
    next(error);
  }
});

// Handle duplicate email errors on update
userSchema.post('updateOne', function (error, result, next) {
  if (error && error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('A user with this email already exists'));
  } else {
    next(error);
  }
});

// Method to compare passwords during login
userSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.passwordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

module.exports = mongoose.model('User', userSchema);
