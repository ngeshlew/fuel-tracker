import express from 'express';
import { prisma } from '../utils/database';
import { Decimal } from '@prisma/client/runtime/library';

const router = express.Router();

// GET all mileage entries
router.get('/', async (_req, res) => {
  try {
    const entries = await prisma.mileageEntry.findMany({
      orderBy: { date: 'desc' },
    });
    
    // Convert Decimal to number for JSON response
    const formattedEntries = entries.map(entry => ({
      ...entry,
      odometerReading: Number(entry.odometerReading),
      tripDistance: entry.tripDistance ? Number(entry.tripDistance) : null,
    }));
    
    return res.json({ success: true, data: formattedEntries });
  } catch (error) {
    console.error('Error fetching mileage entries:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch mileage entries' });
  }
});

// GET single mileage entry
router.get('/:id', async (req, res) => {
  try {
    const entry = await prisma.mileageEntry.findUnique({
      where: { id: req.params.id },
    });
    
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Mileage entry not found' });
    }
    
    return res.json({
      success: true,
      data: {
        ...entry,
        odometerReading: Number(entry.odometerReading),
        tripDistance: entry.tripDistance ? Number(entry.tripDistance) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching mileage entry:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch mileage entry' });
  }
});

// POST create mileage entry
router.post('/', async (req, res) => {
  try {
    const {
      vehicleId,
      date,
      odometerReading,
      tripDistance,
      tripPurpose,
      notes,
      linkedFuelTopupId,
      type = 'MANUAL',
    } = req.body;
    
    if (!vehicleId || !date || odometerReading === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vehicleId, date, odometerReading',
      });
    }
    
    const entry = await prisma.mileageEntry.create({
      data: {
        vehicleId,
        date: new Date(date),
        odometerReading: new Decimal(odometerReading),
        tripDistance: tripDistance ? new Decimal(tripDistance) : null,
        tripPurpose,
        notes,
        linkedFuelTopupId,
        type,
      },
    });
    
    return res.status(201).json({
      success: true,
      data: {
        ...entry,
        odometerReading: Number(entry.odometerReading),
        tripDistance: entry.tripDistance ? Number(entry.tripDistance) : null,
      },
    });
  } catch (error) {
    console.error('Error creating mileage entry:', error);
    return res.status(500).json({ success: false, error: 'Failed to create mileage entry' });
  }
});

// PUT update mileage entry
router.put('/:id', async (req, res) => {
  try {
    const {
      vehicleId,
      date,
      odometerReading,
      tripDistance,
      tripPurpose,
      notes,
      linkedFuelTopupId,
      type,
    } = req.body;
    
    const updateData: any = {};
    if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
    if (date !== undefined) updateData.date = new Date(date);
    if (odometerReading !== undefined) updateData.odometerReading = new Decimal(odometerReading);
    if (tripDistance !== undefined) updateData.tripDistance = tripDistance ? new Decimal(tripDistance) : null;
    if (tripPurpose !== undefined) updateData.tripPurpose = tripPurpose;
    if (notes !== undefined) updateData.notes = notes;
    if (linkedFuelTopupId !== undefined) updateData.linkedFuelTopupId = linkedFuelTopupId;
    if (type !== undefined) updateData.type = type;
    
    const entry = await prisma.mileageEntry.update({
      where: { id: req.params.id },
      data: updateData,
    });
    
    return res.json({
      success: true,
      data: {
        ...entry,
        odometerReading: Number(entry.odometerReading),
        tripDistance: entry.tripDistance ? Number(entry.tripDistance) : null,
      },
    });
  } catch (error) {
    console.error('Error updating mileage entry:', error);
    return res.status(500).json({ success: false, error: 'Failed to update mileage entry' });
  }
});

// DELETE mileage entry
router.delete('/:id', async (req, res) => {
  try {
    await prisma.mileageEntry.delete({
      where: { id: req.params.id },
    });
    
    return res.json({ success: true, message: 'Mileage entry deleted' });
  } catch (error) {
    console.error('Error deleting mileage entry:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete mileage entry' });
  }
});

// POST bulk create mileage entries (for migration)
router.post('/bulk', async (req, res) => {
  try {
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, error: 'entries array is required' });
    }
    
    const createdEntries = await prisma.mileageEntry.createMany({
      data: entries.map((entry: any) => ({
        vehicleId: entry.vehicleId || 'default-vehicle',
        date: new Date(entry.date),
        odometerReading: new Decimal(entry.odometerReading),
        tripDistance: entry.tripDistance ? new Decimal(entry.tripDistance) : null,
        tripPurpose: entry.tripPurpose || null,
        notes: entry.notes || null,
        linkedFuelTopupId: entry.linkedFuelTopupId || null,
        type: entry.type || 'MANUAL',
      })),
      skipDuplicates: true,
    });
    
    return res.status(201).json({
      success: true,
      message: `Created ${createdEntries.count} mileage entries`,
      count: createdEntries.count,
    });
  } catch (error) {
    console.error('Error bulk creating mileage entries:', error);
    return res.status(500).json({ success: false, error: 'Failed to bulk create mileage entries' });
  }
});

export default router;

