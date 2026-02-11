import mongoose from 'mongoose'

if (mongoose.models.Notification) {
  delete mongoose.models.Notification
}

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'pending-registration',
      'registration-approved',
      'registration-rejected',
      'project-submitted',
      'project-approved',
      'project-rejected',
      'guide-assigned',
      'guide-accepted',
      'guide-rejected',
      'report-submitted',
      'report-graded',
      'deadline-set',
      'deadline-reminder',
      'general'
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, // URL to navigate to
  relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectGroup' },
  relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed }, // Extra data
}, { timestamps: true })

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }) // Auto-delete after 90 days

// Static helper to create and emit notification
notificationSchema.statics.createAndEmit = async function(data) {
  const notification = await this.create(data)
  // Emit via socket if available
  if (global.io) {
    global.io.to(`user-${data.recipient}`).emit('notification', {
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
    })
  }
  return notification
}

// Static to create notifications for multiple recipients
notificationSchema.statics.createBulk = async function(recipients, data) {
  const notifications = await Promise.all(
    recipients.map(recipientId =>
      this.createAndEmit({ ...data, recipient: recipientId })
    )
  )
  return notifications
}

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)

export default Notification
