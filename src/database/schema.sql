CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    device_type TEXT,
    status TEXT DEFAULT 'active',
    readings_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS puf_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    binary_data TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_extension TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_puf_readings_device_id ON puf_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name);
CREATE INDEX IF NOT EXISTS idx_puf_readings_filename ON puf_readings(filename);

CREATE TRIGGER IF NOT EXISTS update_device_readings_count_insert
AFTER INSERT ON puf_readings
BEGIN
    UPDATE devices SET readings_count = (
        SELECT COUNT(*) FROM puf_readings WHERE device_id = NEW.device_id
    ) WHERE id = NEW.device_id;
END;

CREATE TRIGGER IF NOT EXISTS update_device_readings_count_delete
AFTER DELETE ON puf_readings
BEGIN
    UPDATE devices SET readings_count = (
        SELECT COUNT(*) FROM puf_readings WHERE device_id = OLD.device_id
    ) WHERE id = OLD.device_id;
END;