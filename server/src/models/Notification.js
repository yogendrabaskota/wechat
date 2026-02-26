const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      required: true,
      enum: ['group_invite', 'group_invite_accepted', 'group_invite_rejected', 'group_member_left', 'post_like', 'post_comment', 'message', 'friend_request', 'friend_request_accepted'],
    },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    friendRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'FriendRequest' },
    message: { type: String },
    read: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
