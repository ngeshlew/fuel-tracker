import express from 'express';
import { z } from 'zod';
import { Prisma, MileageEntry } from '@prisma/client';
import { prisma } from '../utils/database';
import { requireDriveToken } from '../middleware/driveAuth';

const router = express.Router();
router.use(requireDriveToken);

const DEFAULT_VEHICLE_ID = 'default-vehicle';

const optionalText = z.string().trim().max(200).nullish();

const createSchema = z.object({
  date: z.iso.datetime({ offset: true }),
  odometer: z.number().positive().max(10_000_000),
  trip_distance_gps: z.number().nonnegative().max(100_000).nullish(),
  from: optionalText,
  to: optionalText,
  photo_url: z.null().optional(),
  source: z.string().trim().min(1).max(50).default('drive-ios'),
});

const idempotencyKeySchema = z.uuid();

const sinceSchema = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

const created = (entry: MileageEntry) => ({ id: entry.id, status: 'created' });

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

router.post('/', async (req, res) => {
  const key = idempotencyKeySchema.safeParse(req.get('idempotency-key'));
  if (!key.success) {
    return res.status(400).json({ error: 'invalid_idempotency_key', message: 'Idempotency-Key header must be a UUID' });
  }

  const body = createSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: 'invalid_body', issues: z.flattenError(body.error).fieldErrors });
  }

  try {
    const existing = await prisma.mileageEntry.findUnique({ where: { idempotencyKey: key.data } });
    if (existing) return res.status(201).json(created(existing));

    const { date, odometer, trip_distance_gps, from, to, source } = body.data;
    const takenAt = new Date(date);

    const previous = await prisma.mileageEntry.findFirst({
      where: { vehicleId: DEFAULT_VEHICLE_ID, date: { lte: takenAt } },
      orderBy: [{ date: 'desc' }, { odometerReading: 'desc' }],
    });
    if (previous && Number(previous.odometerReading) > odometer) {
      console.warn(
        `Drive odometer ${odometer} at ${date} is below previous reading ${previous.odometerReading} (entry ${previous.id})`
      );
    }

    const entry = await prisma.mileageEntry.create({
      data: {
        vehicleId: DEFAULT_VEHICLE_ID,
        date: takenAt,
        odometerReading: new Prisma.Decimal(odometer),
        gpsTripDistance: trip_distance_gps == null ? null : new Prisma.Decimal(trip_distance_gps),
        fromPlace: from ?? null,
        toPlace: to ?? null,
        photoUrl: null,
        tripPurpose: null,
        source,
        idempotencyKey: key.data,
        type: 'MANUAL',
      },
    });
    return res.status(201).json(created(entry));
  } catch (error) {
    // Two retries with the same key raced past the lookup; return the row the other one created.
    if (isUniqueViolation(error)) {
      const winner = await prisma.mileageEntry.findUnique({ where: { idempotencyKey: key.data } });
      if (winner) return res.status(201).json(created(winner));
    }
    console.error('Drive mileage create failed:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/', async (req, res) => {
  const since = sinceSchema.safeParse(req.query['since']);
  if (!since.success) {
    return res.status(400).json({ error: 'invalid_since', message: 'since must be YYYY-MM-DD or an ISO 8601 timestamp' });
  }

  try {
    const entries = await prisma.mileageEntry.findMany({
      where: { date: { gte: new Date(since.data) } },
      orderBy: [{ date: 'asc' }, { odometerReading: 'asc' }],
    });
    return res.json({
      entries: entries.map((e) => ({
        id: e.id,
        date: e.date.toISOString(),
        odometer: Number(e.odometerReading),
        trip_distance_gps: e.gpsTripDistance == null ? null : Number(e.gpsTripDistance),
        from: e.fromPlace,
        to: e.toPlace,
        photo_url: e.photoUrl,
        source: e.source,
      })),
    });
  } catch (error) {
    console.error('Drive mileage list failed:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
