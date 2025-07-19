import { Database } from 'better-sqlite3';
import { Device, CreateDeviceDto, DeviceWithReadings, PufReading } from '../../shared/types/database';

export class DeviceService {
  constructor(private db: Database) {}

  createDevice(deviceData: CreateDeviceDto): Device {
    try {
      const statement = this.db.prepare(`
        INSERT INTO devices (name, description, device_type, status, readings_count) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = statement.run(
        deviceData.name, 
        deviceData.description || null,
        deviceData.device_type || null,
        deviceData.status || 'active',
        0
      );
      
      if (result.changes === 0) {
        throw new Error('Failed to create device');
      }
      
      return this.getDeviceById(result.lastInsertRowid as number);
    } catch (error) {
      console.error('Error creating device:', error);
      throw error;
    }
  }

  getDeviceById(id: number): Device {
    const statement = this.db.prepare('SELECT * FROM devices WHERE id = ?');
    const device = statement.get(id) as Device;
    
    if (!device) {
      throw new Error('Device not found');
    }
    
    return device;
  }

  getAllDevices(): Device[] {
    const statement = this.db.prepare('SELECT * FROM devices ORDER BY created_at DESC');
    return statement.all() as Device[];
  }

  getDevicesByType(deviceType: string): Device[] {
    const statement = this.db.prepare('SELECT * FROM devices WHERE device_type = ? ORDER BY created_at DESC');
    return statement.all(deviceType) as Device[];
  }

  getDevicesByStatus(status: string): Device[] {
    const statement = this.db.prepare('SELECT * FROM devices WHERE status = ? ORDER BY created_at DESC');
    return statement.all(status) as Device[];
  }

  updateDevice(id: number, deviceData: Partial<CreateDeviceDto>): Device {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (deviceData.name !== undefined) {
      updates.push('name = ?');
      params.push(deviceData.name);
    }
    
    if (deviceData.description !== undefined) {
      updates.push('description = ?');
      params.push(deviceData.description);
    }
    
    if (deviceData.device_type !== undefined) {
      updates.push('device_type = ?');
      params.push(deviceData.device_type);
    }

    if (deviceData.status !== undefined) {
      updates.push('status = ?');
      params.push(deviceData.status);
    }
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    params.push(id);
    
    const statement = this.db.prepare(`
      UPDATE devices SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    const result = statement.run(...params);
    
    if (result.changes === 0) {
      throw new Error('Device not found or no changes made');
    }
    
    return this.getDeviceById(id);
  }

  deleteDevice(id: number): boolean {
    const statement = this.db.prepare('DELETE FROM devices WHERE id = ?');
    const result = statement.run(id);
    
    return result.changes > 0;
  }

  searchDevices(searchTerm: string): Device[] {
    const statement = this.db.prepare(`
      SELECT * FROM devices 
      WHERE name LIKE ? OR description LIKE ? OR device_type LIKE ?
      ORDER BY created_at DESC
    `);
    const searchPattern = `%${searchTerm}%`;
    return statement.all(searchPattern, searchPattern, searchPattern) as Device[];
  }

  getDeviceCount(): number {
    const statement = this.db.prepare('SELECT COUNT(*) as count FROM devices');
    const result = statement.get() as { count: number };
    return result.count;
  }

  getDeviceByName(name: string): Device | null {
    const statement = this.db.prepare('SELECT * FROM devices WHERE name = ?');
    const device = statement.get(name) as Device | undefined;
    return device || null;
  }

  getDeviceWithReadings(id: number): DeviceWithReadings {
    const device = this.getDeviceById(id);
    const readingsStatement = this.db.prepare('SELECT * FROM puf_readings WHERE device_id = ? ORDER BY upload_date DESC');
    const readings = readingsStatement.all(id) as PufReading[];
    
    return {
      ...device,
      readings
    };
  }

  createOrGetDevice(name: string, deviceType?: string): Device {
    const existingDevice = this.getDeviceByName(name);
    if (existingDevice) {
      return existingDevice;
    }

    return this.createDevice({
      name,
      device_type: deviceType || 'unknown',
      description: `Auto-created device from file upload`,
      status: 'active'
    });
  }
}