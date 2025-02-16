import mongoose from 'mongoose';
const { Schema } = mongoose;

const OrderSchema = new Schema({
  id: String,
  quality: String,
  quantity: Number,
  buyer: String,
  buyerNumber: String,
  consignee: String,
  placedTime: Date,
  shipped: {
    type: String,
    default: "NO"
  },
  packets: Number,
  price: Number
}, {
  timestamps: true
});

OrderSchema.index({ quality: 'text', buyer: 'text', id: 'text' });

export default mongoose.model("Order", OrderSchema, "order"); 