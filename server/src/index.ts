import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import fuelTopupRoutes from './routes/fuelTopups';
import analyticsRoutes from './routes/analytics';
import path from 'path';
import aiRoutes from './routes/ai';
import fuelPriceRoutes from './routes/fuelPrices';
import mileageRoutes from './routes/mileage';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env['PORT'] || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static serving for uploaded statements
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Root info endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'fuel-tracker-backend',
    endpoints: ['/health', '/api/ai/health', '/api/fuel-topups', '/api/analytics', '/api/fuel-prices', '/api/mileage'],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database test endpoint
app.get('/test-db', async (_req, res) => {
  try {
    const { prisma } = await import('./utils/database');
    await prisma.$connect();
    res.status(200).json({
      status: 'OK',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});



// API Routes
app.use('/api/fuel-topups', fuelTopupRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/fuel-prices', fuelPriceRoutes);
app.use('/api/mileage', mileageRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join fuel topups room for real-time updates
  socket.on('join-fuel-topups', () => {
    socket.join('fuel-topups');
    console.log(`Client ${socket.id} joined fuel-topups room`);
  });

  // Handle fuel topup updates
  socket.on('fuel-topup-added', (data) => {
    socket.to('fuel-topups').emit('fuel-topup-added', data);
  });

  socket.on('fuel-topup-updated', (data) => {
    socket.to('fuel-topups').emit('fuel-topup-updated', data);
  });

  socket.on('fuel-topup-deleted', (data) => {
    socket.to('fuel-topups').emit('fuel-topup-deleted', data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.io enabled for real-time updates`);
});

export { io };
