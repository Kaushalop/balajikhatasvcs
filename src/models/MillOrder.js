import mongoose from 'mongoose';
const { Schema } = mongoose;

const MillOrderSchema = new Schema({
  id: String,
  millName: String,
  quality: String,
  quantity: Number,
  status: {
    type: String,
    enum: ['pending', 'processing', 'delivered', 'cancelled'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDeliveryDate: Date,
  deliveryDate: Date,
  price: Number,
  actualQuantity: Number,
  notes: String
}, {
  timestamps: true
});

MillOrderSchema.index({ millName: 'text', quality: 'text', id: 'text' });

export default mongoose.model("MillOrder", MillOrderSchema, "millOrder"); 