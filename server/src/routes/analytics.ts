import express from 'express';
import { prisma } from '../utils/database';
import { createError } from '../middleware/errorHandler';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// File storage setup for statement uploads
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type'));
  }
});

// Serve uploads statically
router.use('/uploads', express.static(uploadsDir));

// GET /api/analytics/summary - Get summary analytics
router.get('/summary', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause: any = {};
    
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const topups = await prisma.fuelTopup.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    // Calculate total consumption (litres added)
    let totalConsumption = 0;
    let totalCost = 0;

    // For fuel, consumption is the litres added in each topup (not a delta)
    topups.forEach((topup) => {
      if (topup.isFirstTopup) return; // Skip first topup
      
      const litres = typeof (topup.litres as any).toNumber === 'function'
        ? (topup.litres as any).toNumber()
        : Number(topup.litres as unknown as number);
      const cost = typeof (topup.totalCost as any).toNumber === 'function'
        ? (topup.totalCost as any).toNumber()
        : Number(topup.totalCost as unknown as number);

      totalConsumption += litres;
      totalCost += cost;
    });

    // Calculate daily average
    let days = 0;
    if (topups.length > 1) {
      const first = topups[0];
      const last = topups[topups.length - 1];
      if (first && last) {
        days = Math.ceil((last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    const dailyAverage = days > 0 ? totalConsumption / days : 0;

    // Determine trend
    let trend = 'stable';
    if (topups.length >= 4) {
      const firstHalf = topups.slice(0, Math.floor(topups.length / 2));
      const secondHalf = topups.slice(Math.floor(topups.length / 2));
      
      const computeAvg = (arr: any[]): number => {
        let sum = 0;
        let count = 0;
        arr.forEach((topup) => {
          if (topup.isFirstTopup) return;
          const litres = typeof (topup.litres as any).toNumber === 'function'
            ? (topup.litres as any).toNumber()
            : Number(topup.litres as unknown as number);
          sum += litres;
          count++;
        });
        return count > 0 ? sum / count : 0;
      };

      const firstHalfAvg = computeAvg(firstHalf);
      const secondHalfAvg = computeAvg(secondHalf);
      
      const difference = secondHalfAvg - firstHalfAvg;
      const threshold = firstHalfAvg * 0.05; // 5% threshold
      
      if (difference > threshold) trend = 'increasing';
      else if (difference < -threshold) trend = 'decreasing';
    }

    // Calculate average efficiency (miles per litre)
    let averageEfficiency: number | undefined = undefined;
    if (topups.length > 1) {
      let totalEfficiency = 0;
      let efficiencyCount = 0;
      for (let i = 1; i < topups.length; i++) {
        const prev = topups[i - 1];
        const curr = topups[i];
        if (!prev || !curr || !prev.mileage || !curr.mileage) continue;
        const prevMileage = typeof (prev.mileage as any).toNumber === "function"
          ? (prev.mileage as any).toNumber()
          : Number(prev.mileage as unknown as number);
        const currMileage = typeof (curr.mileage as any).toNumber === "function"
          ? (curr.mileage as any).toNumber()
          : Number(curr.mileage as unknown as number);
        const litres = typeof (curr.litres as any).toNumber === "function"
          ? (curr.litres as any).toNumber()
          : Number(curr.litres as unknown as number);
        const milesDriven = currMileage - prevMileage;
        if (milesDriven > 0 && litres > 0) {
          totalEfficiency += milesDriven / litres;
          efficiencyCount++;
        }
      }
      if (efficiencyCount > 0) {
        averageEfficiency = totalEfficiency / efficiencyCount;
      }
    }

        res.json({
          success: true,
          data: {
            totalLitres: Math.round(totalConsumption * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            dailyAverage: Math.round(dailyAverage * 100) / 100,
            averageEfficiency: averageEfficiency ? Math.round(averageEfficiency * 100) / 100 : undefined,
            trend,
            topupCount: topups.length,
            period: {
              start: topups[0]?.date || null,
              end: topups[topups.length - 1]?.date || null
            }
          }
        });
  } catch (error) {
    next(createError('Failed to fetch summary analytics', 500));
  }
});

// GET /api/analytics/trends - Get trend analysis
router.get('/trends', async (req, res, next) => {
  try {
    const { period = 'monthly' } = req.query;

    const topups = await prisma.fuelTopup.findMany({
      orderBy: { date: 'asc' }
    });

    // Group topups by period
    const groupedData = new Map<string, any[]>();
    
    topups.forEach((topup: any) => {
      if (topup.isFirstTopup) return; // Skip first topup
      
      const litres = typeof (topup.litres as any).toNumber === 'function'
        ? (topup.litres as any).toNumber()
        : Number(topup.litres as unknown as number);
      const cost = typeof (topup.totalCost as any).toNumber === 'function'
        ? (topup.totalCost as any).toNumber()
        : Number(topup.totalCost as unknown as number);
      
      if (litres > 0) {
        let key: string;
        const date = new Date(topup.date);
        
        const toDateOnly = (d: Date): string => {
          const iso = d.toISOString();
          const parts = iso.split('T');
          return parts[0] ?? iso;
        };

        switch (String(period)) {
          case 'daily':
            key = toDateOnly(date);
            break;
          case 'weekly':
            {
              const weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay());
              key = toDateOnly(weekStart);
            }
            break;
          case 'monthly':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            key = toDateOnly(date);
        }
        
        const list = groupedData.get(key) ?? [];
        list.push({
          date: topup.date,
          consumption: litres,
          cost: cost
        });
        groupedData.set(key, list);
      }
    });

    // Calculate aggregated data for each period
    const trendData = Array.from(groupedData.entries()).map(([period, data]) => {
      const totalLitres = data.reduce((sum, item) => sum + item.consumption, 0);
      const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
      const averageDaily = totalLitres / data.length;
      
      return {
        period,
        totalLitres: Math.round(totalLitres * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        averageDaily: Math.round(averageDaily * 100) / 100,
        dataCount: data.length
      };
    });

    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    next(createError('Failed to fetch trend analytics', 500));
  }
});

// GET /api/analytics/export - Export analytics data
router.get('/export', async (req, res, next) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;

    const whereClause: any = {};
    
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const topups = await prisma.fuelTopup.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    // Calculate consumption data (litres added per topup)
    const consumptionData: Array<{ date: string; litres: number; cost: number; topupId: string }> = [];
    topups.forEach((topup) => {
      if (topup.isFirstTopup) return; // Skip first topup
      
      const litres = typeof (topup.litres as any).toNumber === 'function'
        ? (topup.litres as any).toNumber()
        : Number(topup.litres as unknown as number);
      const cost = typeof (topup.totalCost as any).toNumber === 'function'
        ? (topup.totalCost as any).toNumber()
        : Number(topup.totalCost as unknown as number);
      
      if (litres > 0) {
        const iso = topup.date.toISOString();
        const parts = iso.split('T');
        const dateOnly = parts[0] ?? iso;
        consumptionData.push({
          date: dateOnly,
          litres: Math.round(litres * 100) / 100,
          cost: Math.round(cost * 100) / 100,
          topupId: topup.id
        });
      }
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Date,Litres,Cost,Topup ID\n';
      const csvData = consumptionData.map(item => 
        `${item.date},${item.litres},${item.cost},${item.topupId}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=consumption-data.csv');
      res.send(csvHeader + csvData);
    } else {
      res.json({
        success: true,
        data: consumptionData,
        metadata: {
          totalRecords: consumptionData.length,
          exportDate: new Date().toISOString(),
          format: 'json'
        }
      });
    }
  } catch (error) {
    next(createError('Failed to export analytics data', 500));
  }
});

export default router;

// Statements API
// POST /api/analytics/statements/upload - Upload statement files
router.post('/statements/upload', upload.array('files', 5), async (req, res, next) => {
  try {
    const files = (req as any).files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return next(createError('No files uploaded', 400));
    }

    const created = await Promise.all(files.map(async (file) => {
      const statement = await prisma.energyStatement.create({
        data: {
          supplier: 'Unknown',
          periodStart: new Date(),
          periodEnd: new Date(),
          totalKwh: 0,
          totalCost: 0,
          unitRate: 0,
          standingCharge: 0,
          fileUrl: `/uploads/${path.basename(file.path)}`,
        }
      });
      return statement;
    }));

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(createError('Failed to upload statements', 500));
  }
});

// GET /api/analytics/statements - List statements
router.get('/statements', async (_req, res, next) => {
  try {
    const statements = await prisma.energyStatement.findMany({ orderBy: { importedAt: 'desc' } });
    res.json({ success: true, data: statements });
  } catch (error) {
    next(createError('Failed to fetch statements', 500));
  }
});

// DELETE /api/analytics/statements/:id - Delete statement
router.delete('/statements/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const statement = await prisma.energyStatement.findUnique({ where: { id } });
    if (!statement) return next(createError('Statement not found', 404));

    // Best-effort file deletion
    if (statement.fileUrl) {
      const filePath = path.resolve(process.cwd(), statement.fileUrl.replace(/^\//, ''));
      fs.unlink(filePath, () => {});
    }

    await prisma.energyStatement.delete({ where: { id } });
    res.json({ success: true, message: 'Statement deleted' });
  } catch (error) {
    next(createError('Failed to delete statement', 500));
  }
});
