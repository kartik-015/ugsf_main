import mongoose from 'mongoose'

const principalChatSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // admin target (or mainadmin)
  roleFrom: { type: String, enum: ['principal','admin','mainadmin'], required: true },
  page: { type: String, required: true }, // pathname where message originated
  pageTitle: { type: String },
  message: { type: String, required: true, trim: true },
  readAt: { type: Date },
}, { timestamps: true })

principalChatSchema.index({ page: 1, createdAt: -1 })
principalChatSchema.index({ to: 1, readAt: 1 })

const PrincipalChat = mongoose.models.PrincipalChat || mongoose.model('PrincipalChat', principalChatSchema)
export default PrincipalChat
