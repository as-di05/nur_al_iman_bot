import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  locationCode: {
    type: Number,
    required: true
  },
  minutesBefore: {
    type: Number,
    default: 15,
    min: 0,
    max: 120
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export const User = mongoose.model('User', userSchema);
