import { v4 as uuidv4 } from 'uuid';
import pool from './config/db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...\n');
  
  // Seed 13 locations
  const locations = [
    { name: 'Location 1', x_position: 15, y_position: 25 },
    { name: 'Location 2', x_position: 30, y_position: 20 },
    { name: 'Location 3', x_position: 50, y_position: 18 },
    { name: 'Location 4', x_position: 70, y_position: 22 },
    { name: 'Location 5', x_position: 85, y_position: 30 },
    { name: 'Location 6', x_position: 80, y_position: 50 },
    { name: 'Location 7', x_position: 65, y_position: 55 },
    { name: 'Location 8', x_position: 45, y_position: 50 },
    { name: 'Location 9', x_position: 25, y_position: 52 },
    { name: 'Location 10', x_position: 12, y_position: 48 },
    { name: 'Location 11', x_position: 20, y_position: 70 },
    { name: 'Location 12', x_position: 50, y_position: 75 },
    { name: 'Location 13', x_position: 75, y_position: 72 },
  ];

  console.log('Adding 13 locations...');
  for (const loc of locations) {
    const token = uuidv4().replace(/-/g, '').substring(0, 16);
    try {
      await pool.query(
        'INSERT INTO locations (name, token, x_position, y_position) VALUES ($1, $2, $3, $4)',
        [loc.name, token, loc.x_position, loc.y_position]
      );
      console.log(`✓ ${loc.name}`);
    } catch (err) {
      if (err.code !== '23505') console.error(`Error: ${err.message}`);
    }
  }

  // Seed admin account
  console.log('\nCreating admin account...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  try {
    await pool.query(
      `INSERT INTO users (username, email, phone, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (username) DO UPDATE SET role = 'admin'`,
      ['admin', 'admin@qrcheckout.com', '0000000000', adminPassword, 'admin']
    );
    console.log('✓ Admin account: admin / admin123');
  } catch (err) {
    console.error('Admin error:', err.message);
  }

  console.log('\n✅ Seed complete!');
  process.exit(0);
}

seed();
