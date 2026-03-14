import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authMiddleware from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import receiptRoutes from './routes/receipts.js';
import deliveryRoutes from './routes/deliveries.js';
import transferRoutes from './routes/transfers.js';
import adjustmentRoutes from './routes/adjustments.js';
import dashboardRoutes from './routes/dashboard.js';
import warehouseRoutes from './routes/warehouses.js';
import moveRoutes from './routes/moves.js';
import profileRoutes from './routes/profile.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/receipts', authMiddleware, receiptRoutes);
app.use('/api/deliveries', authMiddleware, deliveryRoutes);
app.use('/api/transfers', authMiddleware, transferRoutes);
app.use('/api/adjustments', authMiddleware, adjustmentRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/warehouses', authMiddleware, warehouseRoutes);
app.use('/api/moves', authMiddleware, moveRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 CoreInventory API running on http://localhost:${PORT}`);
});
