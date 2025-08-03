import { Schema, model } from 'mongoose';

const userSchema = new Schema({

  username: { type: String, required: true, unique: true },
  
  password : {type : String, required : true, select : false},
  
  role: { type: String, enum: ['REVIEWER', 'PUBLIC', 'ADMIN'], default: 'PUBLIC' },
  
  totalEarnings: { type: Number, default: 0 }

}, { timestamps: true });

export const USER =  model('User', userSchema);
