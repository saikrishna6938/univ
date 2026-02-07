import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/', (_req, res) => {
  const dataPath = path.join(__dirname, '../../data/events.json');
  try {
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const json = JSON.parse(raw);
    res.json(json);
  } catch (err) {
    console.error('Failed to read events.json', err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

export default router;
