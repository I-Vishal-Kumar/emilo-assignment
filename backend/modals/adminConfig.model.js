import { Schema, model } from 'mongoose';

const adminConfigSchema = new Schema({
  
  perViewRate: { type: Number, required: true, default : 5 },
  
  perLikeRate: { type: Number, required: true, default : 10 }

}, { timestamps: true });

export const ADMIN_CONFIG =  model('AdminConfig', adminConfigSchema);
