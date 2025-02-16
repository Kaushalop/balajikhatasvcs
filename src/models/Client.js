import mongoose from 'mongoose';
const { Schema } = mongoose;

const ClientSchema = new Schema({
  id: String,
  name: String,
  number: String,
  address: String,
  accountOwner: String
}, {
  timestamps: true
});

ClientSchema.index({ name: 'text', id: 'text', accountOwner: 'text' });

export default mongoose.model("Client", ClientSchema, "client"); 