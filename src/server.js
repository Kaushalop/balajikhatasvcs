import express from "express";
import errorHandler from "api-error-handler";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import { fileURLToPath } from "url";
import { dirname } from "path";
import connectDB from './config/database.js';

// Import routes
import orderRoutes from './routes/orderRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import clientRoutes from './routes/clientRoutes.js';

const app = express();

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

// Static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use("/public", express.static(__dirname + "/public"));

// Connect to database
connectDB();

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/clients', clientRoutes);

// Base route
app.get('/api', (req, res) => {
  res.json({ message: "Welcome to Balaji Pratishthan API!" });
});

// Error handling
app.use(errorHandler());

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Export for Vercel
export default app;

// Start server if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
}); 