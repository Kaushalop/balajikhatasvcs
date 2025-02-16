import mongoose from 'mongoose';
const { Schema } = mongoose;

const StockSchema = new Schema({
  id: String,
  quality: String,
  quantity: Schema.Types.Mixed,
  packets: Number,
  ProductName: String,
  alt: String
}, {
  timestamps: true
});

// Define text index for search
StockSchema.index({ quality: 'text', id: 'text', ProductName: 'text' });

export default mongoose.model("Stock", StockSchema, "stock"); 