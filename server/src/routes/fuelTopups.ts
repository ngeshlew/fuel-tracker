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
      vatRate: topup.vatRate ? Number(topup.vatRate) : undefined,
      netPrice: topup.netPrice ? Number(topup.netPrice) : undefined,
      vatAmount: topup.vatAmount ? Number(topup.vatAmount) : undefined,
      latitude: topup.latitude ? Number(topup.latitude) : undefined,
      longitude: topup.longitude ? Number(topup.longitude) : undefined,
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
      vatRate: topup.vatRate ? Number(topup.vatRate) : undefined,
      netPrice: topup.netPrice ? Number(topup.netPrice) : undefined,
      vatAmount: topup.vatAmount ? Number(topup.vatAmount) : undefined,
      latitude: topup.latitude ? Number(topup.latitude) : undefined,
      longitude: topup.longitude ? Number(topup.longitude) : undefined,
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
      retailer: z.string().optional(),
      fuelGrade: z.enum(['UNLEADED', 'SUPER_UNLEADED', 'PREMIUM_DIESEL', 'STANDARD_DIESEL']).optional(),
      vatRate: z.number().min(0).max(100).optional(),
      netPrice: z.number().nonnegative().optional(),
      vatAmount: z.number().nonnegative().optional(),
      locationName: z.string().optional(),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      placeId: z.string().optional(),
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
        retailer: parsed.retailer ?? null,
        fuelGrade: parsed.fuelGrade ?? null,
        vatRate: parsed.vatRate ? Number(parsed.vatRate) : null,
        netPrice: parsed.netPrice ? Number(parsed.netPrice) : null,
        vatAmount: parsed.vatAmount ? Number(parsed.vatAmount) : null,
        locationName: parsed.locationName ?? null,
        address: parsed.address ?? null,
        latitude: parsed.latitude ? Number(parsed.latitude) : null,
        longitude: parsed.longitude ? Number(parsed.longitude) : null,
        placeId: parsed.placeId ?? null,
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
      vatRate: newTopup.vatRate ? Number(newTopup.vatRate) : undefined,
      netPrice: newTopup.netPrice ? Number(newTopup.netPrice) : undefined,
      vatAmount: newTopup.vatAmount ? Number(newTopup.vatAmount) : undefined,
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
      return next(createError(`Validation error: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`, 400));
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
      retailer: z.string().optional(),
      fuelGrade: z.enum(['UNLEADED', 'SUPER_UNLEADED', 'PREMIUM_DIESEL', 'STANDARD_DIESEL']).optional(),
      locationName: z.string().optional(),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      placeId: z.string().optional(),
      vatRate: z.number().min(0).max(100).optional(),
      netPrice: z.number().nonnegative().optional(),
      vatAmount: z.number().nonnegative().optional(),
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
        ...(parsed.retailer !== undefined && { retailer: parsed.retailer ?? null }),
        ...(parsed.fuelGrade !== undefined && { fuelGrade: parsed.fuelGrade ?? null }),
        ...(parsed.vatRate !== undefined && { vatRate: parsed.vatRate ? Number(parsed.vatRate) : null }),
        ...(parsed.netPrice !== undefined && { netPrice: parsed.netPrice ? Number(parsed.netPrice) : null }),
        ...(parsed.vatAmount !== undefined && { vatAmount: parsed.vatAmount ? Number(parsed.vatAmount) : null }),
        ...(parsed.locationName !== undefined && { locationName: parsed.locationName ?? null }),
        ...(parsed.address !== undefined && { address: parsed.address ?? null }),
        ...(parsed.latitude !== undefined && { latitude: parsed.latitude ? Number(parsed.latitude) : null }),
        ...(parsed.longitude !== undefined && { longitude: parsed.longitude ? Number(parsed.longitude) : null }),
        ...(parsed.placeId !== undefined && { placeId: parsed.placeId ?? null }),
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
      vatRate: updatedTopup.vatRate ? Number(updatedTopup.vatRate) : undefined,
      netPrice: updatedTopup.netPrice ? Number(updatedTopup.netPrice) : undefined,
      vatAmount: updatedTopup.vatAmount ? Number(updatedTopup.vatAmount) : undefined,
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
      return next(createError(`Validation error: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`, 400));
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

// POST /api/fuel-topups/bulk - Bulk create fuel topups
router.post('/bulk', async (req, res, next) => {
  try {
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return next(createError('entries array is required', 400));
    }

    const schema = z.object({
      vehicleId: z.string().min(1),
      litres: z.number().positive(),
      costPerLitre: z.number().nonnegative(),
      totalCost: z.number().nonnegative().optional(),
      mileage: z.number().nonnegative().optional().nullable(),
      date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date'),
      type: z.enum(['MANUAL', 'IMPORTED', 'ESTIMATED']).optional(),
      fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional().nullable(),
      retailer: z.string().optional().nullable(),
      fuelGrade: z.enum(['UNLEADED', 'SUPER_UNLEADED', 'PREMIUM_DIESEL', 'STANDARD_DIESEL']).optional().nullable(),
      vatRate: z.number().min(0).max(100).optional().nullable(),
      netPrice: z.number().nonnegative().optional().nullable(),
      vatAmount: z.number().nonnegative().optional().nullable(),
      locationName: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      latitude: z.number().optional().nullable(),
      longitude: z.number().optional().nullable(),
      placeId: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      isFirstTopup: z.boolean().optional()
    });

    // Validate all entries
    const validatedEntries = entries.map((entry: any, index: number) => {
      try {
        return schema.parse(entry);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Entry ${index}: ${error.issues.map((e) => e.message).join(', ')}`);
        }
        throw error;
      }
    });

    // Create all entries
    const createdEntries = await prisma.fuelTopup.createMany({
      data: validatedEntries.map((entry) => ({
        vehicleId: String(entry.vehicleId),
        litres: Number(entry.litres),
        costPerLitre: Number(entry.costPerLitre),
        totalCost: entry.totalCost !== undefined ? Number(entry.totalCost) : Number(entry.litres) * Number(entry.costPerLitre),
        mileage: entry.mileage ? Number(entry.mileage) : null,
        date: new Date(entry.date),
        type: entry.type ?? 'MANUAL',
        fuelType: entry.fuelType ?? null,
        retailer: entry.retailer ?? null,
        fuelGrade: entry.fuelGrade ?? null,
        vatRate: entry.vatRate ? Number(entry.vatRate) : null,
        netPrice: entry.netPrice ? Number(entry.netPrice) : null,
        vatAmount: entry.vatAmount ? Number(entry.vatAmount) : null,
        locationName: entry.locationName ?? null,
        address: entry.address ?? null,
        latitude: entry.latitude ? Number(entry.latitude) : null,
        longitude: entry.longitude ? Number(entry.longitude) : null,
        placeId: entry.placeId ?? null,
        notes: entry.notes ?? null,
        isFirstTopup: entry.isFirstTopup ?? false,
      })),
      skipDuplicates: true,
    });

    res.status(201).json({
      success: true,
      message: `Created ${createdEntries.count} fuel topup entries`,
      count: createdEntries.count,
    });
  } catch (error) {
    console.error('Bulk create fuel topups failed:', error);
    if (error instanceof Error) {
      return next(createError(error.message, 400));
    }
    next(createError('Failed to bulk create fuel topups', 500));
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

      const consumptionItem: {
        date: string;
        litres: number;
        cost: number;
        topupId: string;
        mileage?: number;
        efficiency?: number;
      } = {
        date: dateOnly,
        litres: litres,
        cost: totalCost,
        topupId: topup.id,
      };

      if (topup.mileage) {
        consumptionItem.mileage = typeof (topup.mileage as any).toNumber === 'function'
          ? (topup.mileage as any).toNumber()
          : Number(topup.mileage as unknown as number);
      }

      if (efficiency !== undefined) {
        consumptionItem.efficiency = efficiency;
      }

      consumptionData.push(consumptionItem);
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

