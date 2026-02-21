const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  },
  { timestamps: true }
);

conversationSchema.index({ members: 1 });
conversationSchema.index({ members: [1, 1] });

module.exports = mongoose.model('Conversation', conversationSchema);
