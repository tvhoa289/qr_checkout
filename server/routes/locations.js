import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import pool from '../config/db.js';
import { authenticate, requireAdmin, getUserFromToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    
    const locationsResult = await pool.query(
      'SELECT id, name, x_position, y_position, created_at FROM locations ORDER BY id'
    );

    const userLocationsResult = await pool.query(
      `SELECT ul.location_id, ul.unlocked_at 
       FROM user_locations ul
       INNER JOIN locations l ON ul.location_id = l.id
       WHERE ul.user_id = $1`,
      [user.id]
    );

    const unlockedMap = {};
    userLocationsResult.rows.forEach(ul => {
      unlockedMap[ul.location_id] = ul.unlocked_at;
    });

    const locations = locationsResult.rows.map(loc => ({
      id: loc.id,
      name: loc.name,
      x_position: loc.x_position,
      y_position: loc.y_position,
      unlocked: !!unlockedMap[loc.id],
      unlocked_at: unlockedMap[loc.id] || null
    }));

    const completedCount = Object.keys(unlockedMap).length;
    const totalLocations = locationsResult.rows.length;
    const isCompleted = completedCount === totalLocations && totalLocations > 0;
    
    let userCompletedAt = null;
    if (isCompleted) {
      const userResult = await pool.query('SELECT completed_at FROM users WHERE id = $1', [user.id]);
      userCompletedAt = userResult.rows[0]?.completed_at;
    }

    res.json({
      locations,
      progress: {
        completed: completedCount,
        total: totalLocations,
        is_completed: isCompleted
      }
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/scan', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await getUserFromToken(req);

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const locationResult = await pool.query(
      'SELECT id, name FROM locations WHERE token = $1',
      [token]
    );

    if (locationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid QR token' });
    }

    const location = locationResult.rows[0];

    const existingUnlock = await pool.query(
      'SELECT id FROM user_locations WHERE user_id = $1 AND location_id = $2',
      [user.id, location.id]
    );

    if (existingUnlock.rows.length > 0) {
      return res.status(200).json({
        message: 'Location already unlocked',
        location: { id: location.id, name: location.name },
        already_unlocked: true
      });
    }

    await pool.query(
      'INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2)',
      [user.id, location.id]
    );

    const totalLocations = await pool.query('SELECT COUNT(*) FROM locations');
    const userLocations = await pool.query(
      `SELECT COUNT(*) FROM user_locations ul 
       INNER JOIN locations l ON ul.location_id = l.id 
       WHERE ul.user_id = $1`,
      [user.id]
    );

    const completedCount = parseInt(userLocations.rows[0].count);
    const totalCount = parseInt(totalLocations.rows[0].count);

    if (completedCount === totalCount && totalCount > 0) {
      await pool.query(
        'UPDATE users SET completed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET completed_at = NULL WHERE id = $1',
        [user.id]
      );
    }

    res.status(200).json({
      message: 'Location unlocked successfully!',
      location: { id: location.id, name: location.name },
      already_unlocked: false,
      progress: {
        completed: completedCount,
        total: totalCount,
        is_completed: completedCount === totalCount
      }
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/all', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, token, x_position, y_position, created_at FROM locations ORDER BY id'
    );
    res.json({ locations: result.rows });
  } catch (error) {
    console.error('Get all locations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, x_position, y_position } = req.body;

    const countResult = await pool.query('SELECT COUNT(*) FROM locations');
    const currentCount = parseInt(countResult.rows[0].count);

    if (currentCount >= 13) {
      return res.status(400).json({ error: 'Tối đa 13 location' });
    }

    const token = uuidv4().replace(/-/g, '').substring(0, 16);

    const result = await pool.query(
      'INSERT INTO locations (name, token, x_position, y_position) VALUES ($1, $2, $3, $4) RETURNING *',
      [name || null, token, x_position || 0, y_position || 0]
    );

    res.status(201).json({
      message: 'Location created',
      location: result.rows[0]
    });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, x_position, y_position } = req.body;

    const result = await pool.query(
      'UPDATE locations SET name = COALESCE($1, name), x_position = COALESCE($2, x_position), y_position = COALESCE($3, y_position) WHERE id = $4 RETURNING *',
      [name, x_position, y_position, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ location: result.rows[0] });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedLocation = await pool.query('SELECT id FROM locations WHERE id = $1', [id]);
    if (deletedLocation.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await pool.query('DELETE FROM user_locations WHERE location_id = $1', [id]);
    await pool.query('DELETE FROM locations WHERE id = $1', [id]);

    const remainingLocations = await pool.query(
      'SELECT id FROM locations ORDER BY id'
    );

    for (let i = 0; i < remainingLocations.rows.length; i++) {
      const newId = i + 1;
      const oldId = remainingLocations.rows[i].id;
      if (oldId !== newId) {
        await pool.query('UPDATE locations SET id = $1 WHERE id = $2', [newId, oldId]);
        await pool.query('UPDATE user_locations SET location_id = $1 WHERE location_id = $2', [newId, oldId]);
      }
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM locations');
    const currentCount = parseInt(countResult.rows[0].count);
    await pool.query(`SELECT setval('locations_id_seq', ${currentCount})`);

    res.json({ message: 'Location deleted and renumbered' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/qr', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM locations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const location = result.rows[0];
    const baseUrl = process.env.SERVER_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const qrData = `${baseUrl}/scan?token=${location.token}`;
    
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      location: { id: location.id, name: location.name, token: location.token },
      qr_code: qrCodeDataUrl,
      scan_url: qrData
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/qr/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, token, x_position, y_position FROM locations ORDER BY id'
    );

    const qrCodes = await Promise.all(
      result.rows.map(async (location) => {
        const baseUrl = process.env.SERVER_URL || process.env.CLIENT_URL || 'http://localhost:5173';
        const qrData = `${baseUrl}/scan?token=${location.token}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2
        });
        return {
          id: location.id,
          name: location.name,
          token: location.token,
          x_position: location.x_position,
          y_position: location.y_position,
          qr_code: qrCodeDataUrl,
          scan_url: qrData
        };
      })
    );

    res.json({ locations: qrCodes });
  } catch (error) {
    console.error('Generate all QR error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-ids', authenticate, requireAdmin, async (req, res) => {
  try {
    const locations = await pool.query('SELECT id FROM locations ORDER BY id');
    
    for (let i = 0; i < locations.rows.length; i++) {
      const newId = i + 1;
      const oldId = locations.rows[i].id;
      if (oldId !== newId) {
        await pool.query('UPDATE locations SET id = $1 WHERE id = $2', [newId, oldId]);
        await pool.query('UPDATE user_locations SET location_id = $1 WHERE location_id = $2', [newId, oldId]);
      }
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM locations');
    const currentCount = parseInt(countResult.rows[0].count);
    await pool.query(`SELECT setval('locations_id_seq', ${currentCount})`);

    res.json({ message: 'Đã đánh số lại location 1-' + currentCount });
  } catch (error) {
    console.error('Reset IDs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
