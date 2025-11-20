# Railway Backend Migration Guide: Electricity → Fuel Tracker

This guide outlines all the changes needed in your Railway backend to support the fuel tracker API.

## 📋 Overview

The backend needs to be updated to:
1. **Database Schema**: Change from `meter_readings` to `fuel_topups` table
2. **API Routes**: Update endpoints from `/api/meter-readings` to `/api/fuel-topups`
3. **Socket.io Events**: Update real-time event names
4. **Data Models**: Update Prisma schema and validation

---

## 1. Database Schema Migration (Prisma)

### Update `server/prisma/schema.prisma`

Replace the `MeterReading` model with `FuelTopup`:

```prisma
model FuelTopup {
  id            String   @id @default(cuid())
  vehicleId     String   @map("vehicle_id")
  litres        Decimal
  costPerLitre  Decimal  @map("cost_per_litre")
  totalCost     Decimal  @map("total_cost")
  mileage       Decimal? // Optional mileage tracking
  date          DateTime
  type          TopupType
  fuelType      FuelType? @map("fuel_type")
  notes         String?
  isFirstTopup  Boolean  @default(false) @map("is_first_topup")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("fuel_topups")
}

// Update UserPreferences to remove electricity-specific fields
model UserPreferences {
  id             String   @id @default(cuid())
  userId         String   @map("user_id")
  theme          String   @default("dark")
  currency       String   @default("GBP")
  defaultFuelType FuelType? @map("default_fuel_type")
  trackMileage   Boolean  @default(false) @map("track_mileage")
  notifications  Boolean  @default(true)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("user_preferences")
}

// Update ConsumptionAnalytics to use litres instead of kWh
model ConsumptionAnalytics {
  id                String      @id @default(cuid())
  periodType        PeriodType  @map("period_type")
  periodDate        DateTime    @map("period_date")
  litres            Decimal     // Changed from kwh
  cost              Decimal
  averageDailyUsage Decimal?    @map("average_daily_usage")
  averageEfficiency Decimal?    @map("average_efficiency") // Miles per litre
  trend             TrendType?
  createdAt         DateTime    @default(now()) @map("created_at")

  @@map("consumption_analytics")
}

// Add new enums
enum TopupType {
  MANUAL
  IMPORTED
  ESTIMATED
}

enum FuelType {
  PETROL
  DIESEL
  ELECTRIC
  HYBRID
}

// Keep existing enums
enum PeriodType {
  DAILY
  WEEKLY
  MONTHLY
}

enum TrendType {
  INCREASING
  DECREASING
  STABLE
}
```

### Migration Steps

1. **Create Migration**:
   ```bash
   cd server
   npx prisma migrate dev --name migrate_to_fuel_topups
   ```

2. **Or if you want to reset the database** (⚠️ **WARNING: This deletes all data**):
   ```bash
   cd server
   npx prisma migrate reset
   npx prisma migrate dev --name init_fuel_topups
   ```

3. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

---

## 2. API Routes Update

### Create New Route File: `server/src/routes/fuelTopups.ts`

Replace `meterReadings.ts` with this new file:

```typescript
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
      totalCost: z.number().nonnegative(),
      mileage: z.number().nonnegative().optional(),
      date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date'),
      type: z.enum(['MANUAL', 'IMPORTED', 'ESTIMATED']).optional(),
      fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional(),
      notes: z.string().optional(),
      isFirstTopup: z.boolean().optional()
    });
    const parsed = schema.parse(req.body);

    const newTopup = await prisma.fuelTopup.create({
      data: {
        vehicleId: String(parsed.vehicleId),
        litres: Number(parsed.litres),
        costPerLitre: Number(parsed.costPerLitre),
        totalCost: Number(parsed.totalCost),
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
    if (error instanceof z.ZodError) {
      return next(createError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400));
    }
    next(createError('Failed to create fuel topup', 500));
  }
});

// PUT /api/fuel-topups/:id - Update fuel topup
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
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
      const existing = await prisma.fuelTopup.findUnique({ where: { id } });
      if (existing) {
        const litres = parsed.litres ?? Number(existing.litres);
        const costPerLitre = parsed.costPerLitre ?? Number(existing.costPerLitre);
        updateData.totalCost = litres * costPerLitre;
      }
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
    const { startDate, endDate, period } = req.query;
    
    // Implementation for consumption analytics
    // This should calculate litres consumed, costs, and efficiency
    // Similar to the old meter-readings analytics but adapted for fuel
    
    res.json({
      success: true,
      data: [] // Implement analytics logic here
    });
  } catch (error) {
    next(createError('Failed to fetch consumption analytics', 500));
  }
});

export default router;
```

### Update `server/src/index.ts`

Replace the meter readings route import:

```typescript
// Change this:
import meterReadingRoutes from './routes/meterReadings';

// To this:
import fuelTopupRoutes from './routes/fuelTopups';

// And update the route registration:
// app.use('/api/meter-readings', meterReadingRoutes);
app.use('/api/fuel-topups', fuelTopupRoutes);
```

---

## 3. Socket.io Events Update

### Update `server/src/index.ts` Socket.io Setup

```typescript
// Update the socket room joining
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Change from 'join-meter-readings' to 'join-fuel-topups'
  socket.on('join-fuel-topups', () => {
    socket.join('fuel-topups');
    console.log(`Client ${socket.id} joined fuel-topups room`);
  });
  
  // Remove old meter-readings room handler
  // socket.on('join-meter-readings', () => { ... });
});
```

---

## 4. Analytics Routes Update

### Update `server/src/routes/analytics.ts`

Change all references from `kwh` to `litres` and update calculations:

```typescript
// Update analytics to use litres instead of kWh
// Change totalKwh → totalLitres
// Update consumption calculations to use fuel topup data
```

---

## 5. Railway Deployment Steps

### Option A: Update Existing Service (Recommended)

1. **Update Code in Repository**:
   - Make all the changes above
   - Commit and push to your GitHub repository

2. **Railway will Auto-Deploy**:
   - Railway watches your GitHub repo
   - It will automatically detect changes and redeploy

3. **Run Database Migration**:
   - After deployment, connect to your Railway Postgres service
   - Run the Prisma migration:
   ```bash
   # In Railway, you can use the CLI or add a migration script
   npx prisma migrate deploy
   ```

### Option B: Create New Service (If you want to keep both)

1. **Create New Railway Service**:
   - In Railway dashboard, click "+ New" → "GitHub Repo"
   - Select your fuel-tracker repository
   - Create a new service

2. **Link to Same Database** (or create new):
   - If using same database: Add the existing Postgres service as a dependency
   - If new database: Create a new Postgres service

3. **Set Environment Variables**:
   - `DATABASE_URL`: Your Postgres connection string
   - `PORT`: Usually Railway sets this automatically
   - Any other environment variables your app needs

---

## 6. Environment Variables

No new environment variables are needed. Just ensure:
- `DATABASE_URL` is set correctly
- `PORT` is set (Railway usually handles this)

---

## 7. Testing Checklist

After deployment, test:

- [ ] `GET /api/fuel-topups` - Returns list of topups
- [ ] `POST /api/fuel-topups` - Creates new topup
- [ ] `PUT /api/fuel-topups/:id` - Updates topup
- [ ] `DELETE /api/fuel-topups/:id` - Deletes topup
- [ ] Socket.io events fire correctly
- [ ] Database migrations ran successfully
- [ ] Frontend can connect to new endpoints

---

## 8. Rollback Plan

If something goes wrong:

1. **Revert Code**: Push previous version to GitHub
2. **Database Rollback**: 
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```
3. **Or Restore from Backup**: If you have database backups

---

## 📝 Notes

- **Data Migration**: If you have existing meter reading data, you'll need a migration script to convert it to fuel topup format (if applicable)
- **Backward Compatibility**: Consider keeping old endpoints temporarily if you need to support both during transition
- **Testing**: Test thoroughly in a staging environment before production deployment

---

## 🚀 Quick Start Commands

```bash
# 1. Update Prisma schema
cd server
npx prisma migrate dev --name migrate_to_fuel_topups

# 2. Generate Prisma client
npx prisma generate

# 3. Test locally
npm run dev

# 4. Deploy to Railway (auto-deploys on push)
git add .
git commit -m "Migrate backend to fuel topups"
git push origin main
```

---

**Need Help?** Check Railway logs in the dashboard if deployment fails, or review the Prisma migration output for database errors.

