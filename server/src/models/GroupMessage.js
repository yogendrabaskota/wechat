const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    type: { type: String, enum: ['message', 'system'], default: 'message' },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

groupMessageSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
