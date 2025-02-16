import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb://balaji:balaji1234@cluster0-shard-00-00.gqyfs.mongodb.net:27017,cluster0-shard-00-01.gqyfs.mongodb.net:27017,cluster0-shard-00-02.gqyfs.mongodb.net:27017/management?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority"
    );
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

export default connectDB; 