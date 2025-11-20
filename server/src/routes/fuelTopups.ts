import express from 'express';
import { prisma } from '../utils/database';
import { createError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = express.Router();

// GET /api/fuel-topups - Get all fuel topups
router.get('/', async (_req, res, next) => {
  try {
    const topups = await prisma.fuelTopup.findMany({
      orderBy: { date: 'desc' }
    });

    // Convert Decimal fields to numbers for JSON response
    const formattedTopups = topups.map(topup => ({
      ...topup,
      litres: Number(topup.litres),
      costPerLitre: Number(topup.costPerLitre),
      totalCost: Number(topup.totalCost),
      mileage: topup.mileage ? Number(topup.mileage) : undefined,
    }));

    res.json({
      success: true,
      data: formattedTopups
    });
  } catch (error) {
    next(createError('Failed to fetch fuel topups', 500));
  }
});

// GET /api/fuel-topups/:id - Get specific fuel topup
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const topup = await prisma.fuelTopup.findUnique({
      where: { id }
    });

    if (!topup) {
      return next(createError('Fuel topup not found', 404));
    }

    // Convert Decimal fields to numbers for JSON response
    const formattedTopup = {
      ...topup,
      litres: Number(topup.litres),
      costPerLitre: Number(topup.costPerLitre),
      totalCost: Number(topup.totalCost),
      mileage: topup.mileage ? Number(topup.mileage) : undefined,
    };

    res.json({
      success: true,
      data: formattedTopup
    });
  } catch (error) {
    next(createError('Failed to fetch fuel topup', 500));
  }
});

// POST /api/fuel-topups - Create new fuel topup
router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      vehicleId: z.string().min(1),
      litres: z.number().positive(),
      costPerLitre: z.number().nonnegative(),
      totalCost: z.number().nonnegative().optional(),
      mileage: z.number().nonnegative().optional(),
      date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date'),
      type: z.enum(['MANUAL', 'IMPORTED', 'ESTIMATED']).optional(),
      fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional(),
      notes: z.string().optional(),
      isFirstTopup: z.boolean().optional()
    });
    const parsed = schema.parse(req.body);

    // Calculate totalCost if not provided
    const totalCost = parsed.totalCost ?? (parsed.litres * parsed.costPerLitre);

    const newTopup = await prisma.fuelTopup.create({
      data: {
        vehicleId: String(parsed.vehicleId),
        litres: Number(parsed.litres),
        costPerLitre: Number(parsed.costPerLitre),
        totalCost: Number(totalCost),
        mileage: parsed.mileage ? Number(parsed.mileage) : null,
        date: new Date(parsed.date),
        type: parsed.type ?? 'MANUAL',
        fuelType: parsed.fuelType ?? null,
        notes: parsed.notes ?? null,
        isFirstTopup: parsed.isFirstTopup ?? false
      }
    });

    // Convert Decimal fields to numbers for JSON response
    const formattedTopup = {
      ...newTopup,
      litres: Number(newTopup.litres),
      costPerLitre: Number(newTopup.costPerLitre),
      totalCost: Number(newTopup.totalCost),
      mileage: newTopup.mileage ? Number(newTopup.mileage) : undefined,
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to('fuel-topups').emit('fuel-topup-added', formattedTopup);
    }

    res.status(201).json({
      success: true,
      data: formattedTopup
    });
  } catch (error) {
    // Log underlying error for debugging during development
    console.error('Create fuel topup failed:', error);
    if (error instanceof z.ZodError) {
      return next(createError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400));
    }
    next(error as any);
  }
});

// PUT /api/fuel-topups/:id - Update fuel topup
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if topup exists
    const existingTopup = await prisma.fuelTopup.findUnique({
      where: { id }
    });

    if (!existingTopup) {
      return next(createError('Fuel topup not found', 404));
    }

    const schema = z.object({
      vehicleId: z.string().min(1).optional(),
      litres: z.number().positive().optional(),
      costPerLitre: z.number().nonnegative().optional(),
      totalCost: z.number().nonnegative().optional(),
      mileage: z.number().nonnegative().optional(),
      date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date').optional(),
      type: z.enum(['MANUAL', 'IMPORTED', 'ESTIMATED']).optional(),
      fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional(),
      notes: z.string().optional(),
      isFirstTopup: z.boolean().optional()
    });
    const parsed = schema.parse(req.body);

    // Recalculate totalCost if litres or costPerLitre changed
    let updateData: any = {};
    if (parsed.litres !== undefined || parsed.costPerLitre !== undefined) {
      const litres = parsed.litres ?? Number(existingTopup.litres);
      const costPerLitre = parsed.costPerLitre ?? Number(existingTopup.costPerLitre);
      updateData.totalCost = litres * costPerLitre;
    } else if (parsed.totalCost !== undefined) {
      updateData.totalCost = parsed.totalCost;
    }

    const updatedTopup = await prisma.fuelTopup.update({
      where: { id },
      data: {
        ...(parsed.vehicleId && { vehicleId: String(parsed.vehicleId) }),
        ...(parsed.litres !== undefined && { litres: Number(parsed.litres) }),
        ...(parsed.costPerLitre !== undefined && { costPerLitre: Number(parsed.costPerLitre) }),
        ...(updateData.totalCost !== undefined && { totalCost: updateData.totalCost }),
        ...(parsed.mileage !== undefined && { mileage: parsed.mileage ? Number(parsed.mileage) : null }),
        ...(parsed.date && { date: new Date(parsed.date) }),
        ...(parsed.type && { type: parsed.type }),
        ...(parsed.fuelType !== undefined && { fuelType: parsed.fuelType ?? null }),
        ...(parsed.notes !== undefined && { notes: parsed.notes ?? null }),
        ...(parsed.isFirstTopup !== undefined && { isFirstTopup: parsed.isFirstTopup })
      }
    });

    // Convert Decimal fields to numbers for JSON response
    const formattedTopup = {
      ...updatedTopup,
      litres: Number(updatedTopup.litres),
      costPerLitre: Number(updatedTopup.costPerLitre),
      totalCost: Number(updatedTopup.totalCost),
      mileage: updatedTopup.mileage ? Number(updatedTopup.mileage) : undefined,
    };

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to('fuel-topups').emit('fuel-topup-updated', formattedTopup);
    }

    res.json({
      success: true,
      data: formattedTopup
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(createError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400));
    }
    next(createError('Failed to update fuel topup', 500));
  }
});

// DELETE /api/fuel-topups/:id - Delete fuel topup
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if topup exists
    const existingTopup = await prisma.fuelTopup.findUnique({
      where: { id }
    });

    if (!existingTopup) {
      return next(createError('Fuel topup not found', 404));
    }

    await prisma.fuelTopup.delete({
      where: { id }
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to('fuel-topups').emit('fuel-topup-deleted', { id });
    }

    res.json({
      success: true,
      message: 'Fuel topup deleted successfully'
    });
  } catch (error) {
    next(createError('Failed to delete fuel topup', 500));
  }
});

// GET /api/fuel-topups/analytics/consumption - Get consumption analytics
router.get('/analytics/consumption', async (req, res, next) => {
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

    // Calculate consumption data (litres added per topup)
    const consumptionData: Array<{ 
      date: string; 
      litres: number; 
      cost: number; 
      topupId: string;
      mileage?: number;
      efficiency?: number;
    }> = [];
    
    for (let i = 0; i < topups.length; i++) {
      const topup = topups[i];
      if (!topup) continue;

      // Skip first topup if marked as first
      if (topup.isFirstTopup && i === 0) {
        continue;
      }

      const litres = typeof (topup.litres as any).toNumber === 'function'
        ? (topup.litres as any).toNumber()
        : Number(topup.litres as unknown as number);
      const totalCost = typeof (topup.totalCost as any).toNumber === 'function'
        ? (topup.totalCost as any).toNumber()
        : Number(topup.totalCost as unknown as number);

      const isoString = topup.date.toISOString();
      const dateParts = isoString.split('T');
      const dateOnly = dateParts[0] ?? isoString;

      // Calculate efficiency if mileage is tracked
      let efficiency: number | undefined = undefined;
      if (i > 0 && topup.mileage && topups[i - 1]?.mileage) {
        const prevMileage = typeof (topups[i - 1]!.mileage as any).toNumber === 'function'
          ? (topups[i - 1]!.mileage as any).toNumber()
          : Number(topups[i - 1]!.mileage as unknown as number);
        const currentMileage = typeof (topup.mileage as any).toNumber === 'function'
          ? (topup.mileage as any).toNumber()
          : Number(topup.mileage as unknown as number);
        
        const milesDriven = currentMileage - prevMileage;
        if (milesDriven > 0 && litres > 0) {
          efficiency = milesDriven / litres; // Miles per litre
        }
      }

      consumptionData.push({
        date: dateOnly,
        litres: litres,
        cost: totalCost,
        topupId: topup.id,
        mileage: topup.mileage ? (typeof (topup.mileage as any).toNumber === 'function'
          ? (topup.mileage as any).toNumber()
          : Number(topup.mileage as unknown as number)) : undefined,
        efficiency: efficiency
      });
    }

    res.json({
      success: true,
      data: consumptionData
    });
  } catch (error) {
    next(createError('Failed to fetch consumption analytics', 500));
  }
});

export default router;

