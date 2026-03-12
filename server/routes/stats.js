import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/top', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at, u.completed_at,
        (SELECT COUNT(*) FROM user_locations ul WHERE ul.user_id = u.id) as unlocked_count
       FROM users u
       WHERE u.completed_at IS NOT NULL
       ORDER BY unlocked_count DESC, u.completed_at ASC
       LIMIT $1`,
      [limit]
    );

    const topUsers = result.rows.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
      completed_at: user.completed_at,
      unlocked_count: parseInt(user.unlocked_count),
      time_to_complete: user.completed_at && user.created_at 
        ? Math.floor((new Date(user.completed_at) - new Date(user.created_at)) / (1000 * 60))
        : null
    }));

    res.json({ top_users: topUsers });
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/location-stats', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.id, l.name, l.token,
        COUNT(ul.user_id) as unlock_count
       FROM locations l
       LEFT JOIN user_locations ul ON l.id = ul.location_id
       GROUP BY l.id, l.name, l.token
       ORDER BY l.id`
    );

    res.json({ location_stats: result.rows });
  } catch (error) {
    console.error('Get location stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export/csv', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.phone, u.created_at, u.completed_at,
        (SELECT COUNT(*) FROM user_locations ul WHERE ul.user_id = u.id) as unlocked_count
       FROM users u
       WHERE u.completed_at IS NOT NULL
       ORDER BY u.completed_at ASC`
    );

    const csvHeader = 'USER,EMAIL,THOI_GIAN_UNLOCK_13_LOCATION (phut),NGAY_HOAN_THANH\n';
    
    const csvRows = result.rows.map(user => {
      const timeToComplete = user.completed_at && user.created_at 
        ? Math.floor((new Date(user.completed_at) - new Date(user.created_at)) / (1000 * 60))
        : '';
      const completedDate = user.completed_at 
        ? new Date(user.completed_at).toISOString().split('T')[0]
        : '';
      
      return `${user.username},${user.email},${timeToComplete},${completedDate}`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=top_users_completed.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']);
    const completedUsers = await pool.query('SELECT COUNT(*) FROM users WHERE completed_at IS NOT NULL');
    const totalLocations = await pool.query('SELECT COUNT(*) FROM locations');
    const totalUnlocks = await pool.query('SELECT COUNT(*) FROM user_locations');

    res.json({
      overview: {
        total_users: parseInt(totalUsers.rows[0].count),
        completed_users: parseInt(completedUsers.rows[0].count),
        total_locations: parseInt(totalLocations.rows[0].count),
        total_unlocks: parseInt(totalUnlocks.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
