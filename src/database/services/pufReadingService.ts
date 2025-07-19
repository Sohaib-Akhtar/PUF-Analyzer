import { Database } from 'better-sqlite3';
import { PufReading, CreatePufReadingDto } from '../../shared/types/database';

export class PufReadingService {
  constructor(private db: Database) {}

  createReading(readingData: CreatePufReadingDto): PufReading {
    try {
      const statement = this.db.prepare(`
        INSERT INTO puf_readings (device_id, filename, original_filename, binary_data, file_size, file_extension) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = statement.run(
        readingData.device_id,
        readingData.filename,
        readingData.original_filename,
        readingData.binary_data,
        readingData.file_size,
        readingData.file_extension
      );
      
      if (result.changes === 0) {
        throw new Error('Failed to create PUF reading');
      }
      
      return this.getReadingById(result.lastInsertRowid as number);
    } catch (error) {
      throw new Error(`Error creating PUF reading: ${error}`);
    }
  }

  getReadingById(id: number): PufReading {
    const statement = this.db.prepare('SELECT * FROM puf_readings WHERE id = ?');
    const reading = statement.get(id) as PufReading;
    
    if (!reading) {
      throw new Error('PUF reading not found');
    }
    
    return reading;
  }

  getReadingsByDeviceId(deviceId: number): PufReading[] {
    const statement = this.db.prepare('SELECT * FROM puf_readings WHERE device_id = ? ORDER BY upload_date DESC');
    return statement.all(deviceId) as PufReading[];
  }

  getAllReadings(): PufReading[] {
    const statement = this.db.prepare('SELECT * FROM puf_readings ORDER BY upload_date DESC');
    return statement.all() as PufReading[];
  }

  deleteReading(id: number): boolean {
    const statement = this.db.prepare('DELETE FROM puf_readings WHERE id = ?');
    const result = statement.run(id);
    return result.changes > 0;
  }

  deleteReadingsByDeviceId(deviceId: number): number {
    const statement = this.db.prepare('DELETE FROM puf_readings WHERE device_id = ?');
    const result = statement.run(deviceId);
    return result.changes;
  }

  getReadingCount(): number {
    const statement = this.db.prepare('SELECT COUNT(*) as count FROM puf_readings');
    const result = statement.get() as { count: number };
    return result.count;
  }

  getReadingCountByDevice(): Array<{ device_id: number; count: number }> {
    const statement = this.db.prepare(`
      SELECT device_id, COUNT(*) as count 
      FROM puf_readings 
      GROUP BY device_id
    `);
    return statement.all() as Array<{ device_id: number; count: number }>;
  }

  searchReadings(searchTerm: string): PufReading[] {
    const statement = this.db.prepare(`
      SELECT pr.* FROM puf_readings pr
      JOIN devices d ON pr.device_id = d.id
      WHERE pr.filename LIKE ? OR pr.original_filename LIKE ? OR d.name LIKE ?
      ORDER BY pr.upload_date DESC
    `);
    const searchPattern = `%${searchTerm}%`;
    return statement.all(searchPattern, searchPattern, searchPattern) as PufReading[];
  }

  updateReading(id: number, updates: Partial<Pick<PufReading, 'filename' | 'binary_data'>>): PufReading {
    const updateFields: string[] = [];
    const params: unknown[] = [];
    
    if (updates.filename !== undefined) {
      updateFields.push('filename = ?');
      params.push(updates.filename);
    }
    
    if (updates.binary_data !== undefined) {
      updateFields.push('binary_data = ?');
      params.push(updates.binary_data);
    }
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    params.push(id);
    
    const statement = this.db.prepare(`
      UPDATE puf_readings SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);
    
    const result = statement.run(...params);
    
    if (result.changes === 0) {
      throw new Error('PUF reading not found or no changes made');
    }
    
    return this.getReadingById(id);
  }
}