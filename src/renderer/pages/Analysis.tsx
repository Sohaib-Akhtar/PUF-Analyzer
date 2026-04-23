import React, { useState, useCallback, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Tabs,
  Card,
  Group,
  Button,
  Stack,
  NumberInput,
  TextInput,
  Switch,
  Select,
  FileButton,
  Badge,
  Table,
  Code,
  Loader,
  Alert,
  ActionIcon,
  ScrollArea,
  Divider,
  Collapse,
  Tooltip,
  SegmentedControl,
  Checkbox,
  Radio
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  BeakerIcon,
  KeyIcon,
  ArrowsRightLeftIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  ChartBarIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentPlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ServerIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';

interface FileEntry {
  name: string;
  data: string; // base64
  size: number;
}

interface DeviceInfo {
  id: number;
  name: string;
  device_type?: string;
  readings_count: number;
}

interface ReadingInfo {
  id: number;
  device_id: number;
  filename: string;
  original_filename: string;
  binary_data: string;
  file_size: number;
  file_extension: string;
  upload_date: string;
}

// ─── Clean error message from CLI exceptions ───
const cleanErrorMessage = (error: any): string => {
  const msg = error?.message || String(error) || 'An unknown error occurred';
  // Strip Java exception class names for cleaner messages
  const cleaned = msg
    .replace(/^Error invoking remote method '[^']+': /, '')
    .replace(/CLI command failed \(exit code \d+\): /, 'CLI Error: ')
    .replace(/java\.\w+\.\w+(Exception|Error): /, '')
    .replace(/\r?\n.*$/, '') // only first line
    .trim();
  return cleaned || msg;
};

// ─── Toast helpers ───
const showSuccess = (title: string, message: string) => {
  notifications.show({
    title,
    message,
    color: 'green',
    icon: <CheckCircleIcon style={{ width: '1.2rem' }} />,
    autoClose: 5000,
  });
};

const showError = (title: string, error: any) => {
  const message = cleanErrorMessage(error);
  notifications.show({
    title,
    message,
    color: 'red',
    icon: <ExclamationTriangleIcon style={{ width: '1.2rem' }} />,
    autoClose: 8000,
  });
  return message;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const downloadBase64File = async (filename: string, base64: string) => {
  try {
    const filePath = await window.electron.filesystem.saveGeneratedFile(filename, base64);
    if (filePath) {
      showSuccess('Download Complete', `File saved to ${filePath}`);
    }
  } catch (error) {
    showError('Download Failed', error);
  }
};

const downloadAllGeneratedFiles = async (files: Array<{ filename: string; content: string }>) => {
  try {
    const saved = await window.electron.filesystem.saveGeneratedFiles(files);
    if (saved && saved.length > 0) {
      showSuccess('Download Complete', `Saved ${saved.length} file(s)`);
    }
  } catch (error) {
    showError('Download Failed', error);
  }
};

// ─── Reusable file upload component ───
const FileUploadZone: React.FC<{
  files: FileEntry[];
  setFiles: React.Dispatch<React.SetStateAction<FileEntry[]>>;
  accept?: string;
  multiple?: boolean;
  label?: string;
}> = ({ files, setFiles, accept, multiple = true, label = 'Upload Files' }) => {
  const handleFiles = useCallback(async (selectedFiles: File[]) => {
    const entries: FileEntry[] = [];
    for (const f of selectedFiles) {
      const data = await fileToBase64(f);
      entries.push({ name: f.name, data, size: f.size });
    }
    setFiles(prev => [...prev, ...entries]);
  }, [setFiles]);

  return (
    <Stack gap="xs">
      <Group>
        <FileButton
          onChange={(f) => f && handleFiles(Array.isArray(f) ? f : [f])}
          accept={accept}
          multiple={multiple}
        >
          {(props) => (
            <Button variant="light" leftSection={<DocumentPlusIcon style={{ width: '1rem', height: '1rem' }} />} {...props}>
              {label}
            </Button>
          )}
        </FileButton>
        {files.length > 0 && (
          <Button variant="subtle" color="red" size="xs" onClick={() => setFiles([])}>
            Clear all
          </Button>
        )}
      </Group>
      {files.length > 0 && (
        <Stack gap={4}>
          {files.map((f, i) => (
            <Group key={i} gap="xs">
              <Badge variant="light" size="sm">{f.name}</Badge>
              <Text size="xs" c="dimmed">{(f.size / 1024).toFixed(1)} KB</Text>
              <ActionIcon size="xs" variant="subtle" color="red" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                <XMarkIcon style={{ width: '0.75rem', height: '0.75rem' }} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

// ─── Device readings selector component ───
const DeviceReadingsPicker: React.FC<{
  files: FileEntry[];
  setFiles: React.Dispatch<React.SetStateAction<FileEntry[]>>;
  multiple?: boolean;
}> = ({ files, setFiles, multiple = true }) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [readings, setReadings] = useState<ReadingInfo[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingReadings, setLoadingReadings] = useState(false);

  useEffect(() => {
    const loadDevices = async () => {
      setLoadingDevices(true);
      try {
        const allDevices = await window.electron.database.getAllDevices();
        setDevices(allDevices.filter((d: DeviceInfo) => d.readings_count > 0));
      } catch (e) {
        showError('Failed to load devices', e);
      } finally {
        setLoadingDevices(false);
      }
    };
    loadDevices();
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) {
      setReadings([]);
      return;
    }
    const loadReadings = async () => {
      setLoadingReadings(true);
      try {
        const deviceReadings = await window.electron.database.getDeviceReadings(Number(selectedDeviceId));
        setReadings(deviceReadings);
      } catch (e) {
        showError('Failed to load readings', e);
      } finally {
        setLoadingReadings(false);
      }
    };
    loadReadings();
  }, [selectedDeviceId]);

  const toggleReading = (reading: ReadingInfo) => {
    setFiles(prev => {
      const exists = prev.some(f => f.name === reading.filename);
      if (exists) {
        return prev.filter(f => f.name !== reading.filename);
      } else {
        const entry: FileEntry = {
          name: reading.filename,
          data: btoa(reading.binary_data),
          size: reading.file_size,
        };
        if (multiple) {
          return [...prev, entry];
        } else {
          return [entry];
        }
      }
    });
  };

  const selectAll = () => {
    const entries: FileEntry[] = readings.map(r => ({
      name: r.filename,
      data: btoa(r.binary_data),
      size: r.file_size,
    }));
    setFiles(entries);
  };

  if (loadingDevices) return <Loader size="sm" />;

  if (devices.length === 0) {
    return (
      <Alert color="yellow" icon={<ExclamationTriangleIcon style={{ width: '1rem' }} />}>
        No devices with readings found. Upload PUF readings on the Devices page first.
      </Alert>
    );
  }

  return (
    <Stack gap="xs">
      <Select
        label="Select Device"
        placeholder="Choose a device..."
        data={devices.map(d => ({
          value: String(d.id),
          label: `${d.name}${d.device_type ? ` (${d.device_type})` : ''} — ${d.readings_count} reading(s)`
        }))}
        value={selectedDeviceId}
        onChange={setSelectedDeviceId}
        searchable
        leftSection={<ServerIcon style={{ width: '1rem' }} />}
      />
      {loadingReadings && <Loader size="sm" />}
      {readings.length > 0 && (
        <Card withBorder p="xs">
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>Readings ({readings.length})</Text>
            {multiple && (
              <Group gap="xs">
                <Button size="xs" variant="subtle" onClick={selectAll}>Select all</Button>
                <Button size="xs" variant="subtle" color="red" onClick={() => setFiles([])}>Clear</Button>
              </Group>
            )}
          </Group>
          <Stack gap={4}>
            {readings.map(r => {
              const isSelected = files.some(f => f.name === r.filename);
              return (
                <Group key={r.id} gap="xs" style={{ cursor: 'pointer' }} onClick={() => toggleReading(r)}>
                  <Checkbox checked={isSelected} onChange={() => {}} size="xs" style={{ pointerEvents: 'none' }} />
                  <Badge variant={isSelected ? 'filled' : 'light'} size="sm">{r.original_filename}</Badge>
                  <Text size="xs" c="dimmed">{(r.file_size / 1024).toFixed(1)} KB</Text>
                  <Text size="xs" c="dimmed">({new Date(r.upload_date).toLocaleDateString()})</Text>
                </Group>
              );
            })}
          </Stack>
        </Card>
      )}
      {files.length > 0 && (
        <Text size="xs" c="teal">{files.length} reading(s) selected</Text>
      )}
    </Stack>
  );
};

// ─── Inter/Intra device picker for Metrics ───
const InterIntraDevicePicker: React.FC<{
  files: FileEntry[];
  setFiles: React.Dispatch<React.SetStateAction<FileEntry[]>>;
}> = ({ files, setFiles }) => {
  const [mode, setMode] = useState<string>('intra');
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [allReadings, setAllReadings] = useState<Map<number, ReadingInfo[]>>(new Map());
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingReadings, setLoadingReadings] = useState(false);

  useEffect(() => {
    const loadDevices = async () => {
      setLoadingDevices(true);
      try {
        const all = await window.electron.database.getAllDevices();
        setDevices(all.filter((d: DeviceInfo) => d.readings_count > 0));
      } catch (e) {
        showError('Failed to load devices', e);
      } finally {
        setLoadingDevices(false);
      }
    };
    loadDevices();
  }, []);

  // Reset selections when switching mode
  useEffect(() => {
    setFiles([]);
    setSelectedDeviceId(null);
    setSelectedDeviceIds([]);
    setAllReadings(new Map());
  }, [mode]);

  // Load readings for intra-device mode (single device)
  useEffect(() => {
    if (mode !== 'intra' || !selectedDeviceId) return;
    const load = async () => {
      setLoadingReadings(true);
      try {
        const readings = await window.electron.database.getDeviceReadings(Number(selectedDeviceId));
        setAllReadings(new Map([[Number(selectedDeviceId), readings]]));
      } catch (e) {
        showError('Failed to load readings', e);
      } finally {
        setLoadingReadings(false);
      }
    };
    load();
  }, [mode, selectedDeviceId]);

  // Load readings for inter-device mode (multiple devices)
  useEffect(() => {
    if (mode !== 'inter' || selectedDeviceIds.length === 0) return;
    const load = async () => {
      setLoadingReadings(true);
      try {
        const newMap = new Map<number, ReadingInfo[]>();
        for (const id of selectedDeviceIds) {
          const readings = await window.electron.database.getDeviceReadings(Number(id));
          newMap.set(Number(id), readings);
        }
        setAllReadings(newMap);
      } catch (e) {
        showError('Failed to load readings', e);
      } finally {
        setLoadingReadings(false);
      }
    };
    load();
  }, [mode, selectedDeviceIds]);

  const toggleReading = (reading: ReadingInfo) => {
    setFiles(prev => {
      const exists = prev.some(f => f.name === reading.filename);
      if (exists) {
        return prev.filter(f => f.name !== reading.filename);
      } else {
        const entry: FileEntry = {
          name: reading.filename,
          data: btoa(reading.binary_data),
          size: reading.file_size,
        };
        return [...prev, entry];
      }
    });
  };

  const selectAllFromDevice = (deviceId: number) => {
    const readings = allReadings.get(deviceId) || [];
    const entries: FileEntry[] = readings.map(r => ({
      name: r.filename,
      data: btoa(r.binary_data),
      size: r.file_size,
    }));
    // Add entries not yet in files
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newEntries = entries.filter(e => !existingNames.has(e.name));
      return [...prev, ...newEntries];
    });
  };

  const toggleDevice = (deviceId: string) => {
    setSelectedDeviceIds(prev => {
      if (prev.includes(deviceId)) {
        // When unchecking a device, also remove its readings from files
        const readings = allReadings.get(Number(deviceId)) || [];
        const names = new Set(readings.map(r => r.filename));
        setFiles(prevFiles => prevFiles.filter(f => !names.has(f.name)));
        return prev.filter(id => id !== deviceId);
      }
      return [...prev, deviceId];
    });
  };

  if (loadingDevices) return <Loader size="sm" />;

  if (devices.length === 0) {
    return (
      <Alert color="yellow" icon={<ExclamationTriangleIcon style={{ width: '1rem' }} />}>
        No devices with readings found. Upload PUF readings on the Devices page first.
      </Alert>
    );
  }

  const readingsForDisplay = Array.from(allReadings.entries());

  return (
    <Stack gap="sm">
      <Radio.Group
        value={mode}
        onChange={(v) => setMode(v)}
        label="Comparison Mode"
        description={mode === 'intra'
          ? 'Compare readings within the same device (reliability)'
          : 'Compare readings across different devices (uniqueness)'
        }
      >
        <Group mt="xs">
          <Radio value="intra" label="Intra-device" />
          <Radio value="inter" label="Inter-device" />
        </Group>
      </Radio.Group>

      {mode === 'intra' ? (
        <Select
          label="Select Device"
          placeholder="Choose a device..."
          data={devices.map(d => ({
            value: String(d.id),
            label: `${d.name}${d.device_type ? ` (${d.device_type})` : ''} — ${d.readings_count} reading(s)`
          }))}
          value={selectedDeviceId}
          onChange={(v) => { setSelectedDeviceId(v); setFiles([]); }}
          searchable
          leftSection={<ServerIcon style={{ width: '1rem' }} />}
        />
      ) : (
        <Stack gap="xs">
          <Text size="sm" fw={500}>Select Devices (2 or more)</Text>
          {devices.map(d => (
            <Group key={d.id} gap="xs" style={{ cursor: 'pointer' }} onClick={() => toggleDevice(String(d.id))}>
              <Checkbox
                checked={selectedDeviceIds.includes(String(d.id))}
                onChange={() => toggleDevice(String(d.id))}
                size="xs"
              />
              <Text size="sm">
                {d.name}{d.device_type ? ` (${d.device_type})` : ''} — {d.readings_count} reading(s)
              </Text>
            </Group>
          ))}
          {selectedDeviceIds.length > 0 && selectedDeviceIds.length < 2 && (
            <Text size="xs" c="orange">Select at least 2 devices for inter-device comparison</Text>
          )}
        </Stack>
      )}

      {loadingReadings && <Loader size="sm" />}

      {readingsForDisplay.map(([deviceId, readings]) => {
        const device = devices.find(d => d.id === deviceId);
        if (!readings || readings.length === 0) return null;
        return (
          <Card withBorder p="xs" key={deviceId}>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <CircleStackIcon style={{ width: '0.9rem' }} />
                <Text size="sm" fw={500}>
                  {device?.name || `Device ${deviceId}`}
                  {device?.device_type && <Text span size="xs" c="dimmed"> ({device.device_type})</Text>}
                </Text>
                <Badge size="xs" variant="light">{readings.length} readings</Badge>
              </Group>
              <Group gap="xs">
                <Button size="xs" variant="subtle" onClick={() => selectAllFromDevice(deviceId)}>Select all</Button>
                <Button size="xs" variant="subtle" color="red" onClick={() => {
                  const names = new Set(readings.map(r => r.filename));
                  setFiles(prev => prev.filter(f => !names.has(f.name)));
                }}>Clear</Button>
              </Group>
            </Group>
            <Stack gap={4}>
              {readings.map(r => {
                const isSelected = files.some(f => f.name === r.filename);
                return (
                  <Group key={r.id} gap="xs" style={{ cursor: 'pointer' }} onClick={() => toggleReading(r)}>
                    <Checkbox checked={isSelected} onChange={() => {}} size="xs" style={{ pointerEvents: 'none' }} />
                    <Badge variant={isSelected ? 'filled' : 'light'} size="sm">{r.original_filename}</Badge>
                    <Text size="xs" c="dimmed">{(r.file_size / 1024).toFixed(1)} KB</Text>
                  </Group>
                );
              })}
            </Stack>
          </Card>
        );
      })}

      {files.length > 0 && (
        <Text size="xs" c="teal">{files.length} reading(s) selected from {mode === 'intra' ? '1 device' : `${selectedDeviceIds.length} device(s)`}</Text>
      )}
    </Stack>
  );
};

// ─── Combined file source selector (upload or from device) ───
const FileSourceSelector: React.FC<{
  files: FileEntry[];
  setFiles: React.Dispatch<React.SetStateAction<FileEntry[]>>;
  accept?: string;
  multiple?: boolean;
  label?: string;
  showDeviceOption?: boolean;
  metricsMode?: boolean;
}> = ({ files, setFiles, accept, multiple = true, label = 'Upload Files', showDeviceOption = true, metricsMode = false }) => {
  const [source, setSource] = useState<string>('upload');

  const handleSourceChange = (value: string) => {
    setSource(value);
    setFiles([]); // clear when switching
  };

  return (
    <Stack gap="sm">
      {showDeviceOption && (
        <SegmentedControl
          value={source}
          onChange={handleSourceChange}
          data={[
            { value: 'upload', label: 'Upload Files' },
            { value: 'device', label: 'From Device' },
          ]}
          size="sm"
        />
      )}
      {source === 'upload' ? (
        <FileUploadZone files={files} setFiles={setFiles} accept={accept} multiple={multiple} label={label} />
      ) : metricsMode ? (
        <InterIntraDevicePicker files={files} setFiles={setFiles} />
      ) : (
        <DeviceReadingsPicker files={files} setFiles={setFiles} multiple={multiple} />
      )}
    </Stack>
  );
};

// ─── Result display ───
const ResultDisplay: React.FC<{ result: any; loading: boolean; error: string | null }> = ({ result, loading, error }) => {
  if (loading) return <Loader size="sm" />;
  if (error) return <Alert color="red" icon={<ExclamationTriangleIcon style={{ width: '1rem' }} />}>{error}</Alert>;
  if (!result) return null;
  return (
    <Card withBorder mt="md">
      <Stack gap="xs">
        <Group gap="xs">
          <CheckCircleIcon style={{ width: '1rem', color: 'green' }} />
          <Text fw={500} size="sm">Result</Text>
          {result.executionTime && (
            <Badge variant="light" size="xs" leftSection={<ClockIcon style={{ width: '0.7rem' }} />}>
              {result.executionTime}ms
            </Badge>
          )}
        </Group>
        <ScrollArea.Autosize mah={400}>
          <Code block>{JSON.stringify(result, null, 2)}</Code>
        </ScrollArea.Autosize>
      </Stack>
    </Card>
  );
};

// ─── Generated files download section ───
const GeneratedFilesSection: React.FC<{ files?: Array<{ filename: string; content: string; size: number }> }> = ({ files }) => {
  if (!files || files.length === 0) return null;
  return (
    <Card withBorder mt="sm">
      <Group justify="space-between" mb="xs">
        <Text fw={500} size="sm">Generated Files ({files.length})</Text>
        {files.length > 1 && (
          <Button size="xs" variant="light" leftSection={<ArrowDownTrayIcon style={{ width: '0.75rem' }} />}
            onClick={() => downloadAllGeneratedFiles(files.map(f => ({ filename: f.filename, content: f.content })))}>
            Download All
          </Button>
        )}
      </Group>
      <Stack gap={4}>
        {files.map((f, i) => (
          <Group key={i} justify="space-between">
            <Group gap="xs">
              <Badge variant="light" size="sm">{f.filename}</Badge>
              <Text size="xs" c="dimmed">{(f.size / 1024).toFixed(1)} KB</Text>
            </Group>
            <Button size="xs" variant="light" leftSection={<ArrowDownTrayIcon style={{ width: '0.75rem' }} />}
              onClick={() => downloadBase64File(f.filename, f.content)}>
              Download
            </Button>
          </Group>
        ))}
      </Stack>
    </Card>
  );
};

// ─── Metrics Tab ───
const MetricsTab: React.FC = () => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [onlyTotal, setOnlyTotal] = useState(false);
  const [startIndicator, setStartIndicator] = useState(',');
  const [initValue, setInitValue] = useState('00000000');
  const [jobs, setJobs] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (files.length === 0) {
      showError('No Files', 'Please upload at least one file or select readings from a device');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await window.electron.analysis.runMetrics({
        files, onlyTotal, startIndicator, initValue, jobs
      });
      setResult(res);
      showSuccess('Metrics Complete', `Analyzed ${files.length} file(s) in ${res.executionTime}ms`);

      // Auto-save to history
      try {
        await window.electron.analysis.saveResult({
          device_id: null,
          analysis_type: 'metrics',
          parameters: { onlyTotal, startIndicator, initValue, jobs },
          result_data: res,
          execution_time: res.executionTime,
          files_used: files.map(f => f.name),
        });
      } catch {
        // Silently ignore save failures — don't block the user
      }
    } catch (e: any) {
      const msg = showError('Metrics Analysis Failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">Compute PUF quality metrics (Hamming weight, entropy, bitflip %) across binary memory dumps.</Text>
      <FileSourceSelector files={files} setFiles={setFiles} accept=".bin,.txt" metricsMode />
      {/* Filters commented out for now — kept for future use
      <Group>
        <Switch label="Only Total" checked={onlyTotal} onChange={(e) => setOnlyTotal(e.currentTarget.checked)} />
      </Group>
      <Group>
        <TextInput label="Start Indicator" value={startIndicator} onChange={(e) => setStartIndicator(e.target.value)} size="xs" w={100} />
        <TextInput label="Init Value (hex)" value={initValue} onChange={(e) => setInitValue(e.target.value)} size="xs" w={120} />
        <NumberInput label="Jobs" value={jobs} onChange={(v) => setJobs(Number(v) || 4)} size="xs" w={80} min={1} max={16} />
      </Group>
      */}
      <Button onClick={run} loading={loading} disabled={files.length === 0}>Run Metrics Analysis</Button>
      <ResultDisplay result={result} loading={false} error={error} />
    </Stack>
  );
};

// ─── Stable Tab ───
const StableTab: React.FC = () => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [keyLength, setKeyLength] = useState<number>(256);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (files.length < 2) {
      showError('Insufficient Readings', 'At least 2 PUF readings are needed to identify stable positions');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await window.electron.analysis.generateStable({ files, keyLength });
      setResult(res);
      showSuccess('Stable Positions Found', `Found ${res.positions?.length || 0} stable positions from ${files.length} readings in ${res.executionTime}ms`);
    } catch (e: any) {
      const msg = showError('Stable Generation Failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">Identify stable bit positions across multiple PUF readings for key extraction.</Text>
      <FileSourceSelector files={files} setFiles={setFiles} accept=".bin,.txt" />
      <NumberInput label="Key Size (bits)" value={keyLength} onChange={(v) => setKeyLength(Number(v) || 256)} min={8} max={1024} w={150} />
      <Button onClick={run} loading={loading} disabled={files.length < 2}>Generate Stable Positions</Button>
      <ResultDisplay result={result} loading={false} error={error} />
    </Stack>
  );
};

// ─── Extract Key Tab ───
const ExtractTab: React.FC = () => {
  const [binFiles, setBinFiles] = useState<FileEntry[]>([]);
  const [stableFiles, setStableFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (binFiles.length === 0 || stableFiles.length === 0) {
      showError('Missing Files', 'Please provide both a binary memory dump and a stable positions (.pos) file');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await window.electron.analysis.extractKey({
        binFile: binFiles[0],
        stableFile: stableFiles[0]
      });
      setResult(res);
      showSuccess('Key Extracted', `Extracted ${res.key?.length || 0}-bit key in ${res.executionTime}ms`);
    } catch (e: any) {
      const msg = showError('Key Extraction Failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">Extract a cryptographic key from a binary dump using previously generated stable positions.</Text>
      <Text fw={500} size="sm">Binary Memory Dump</Text>
      <FileSourceSelector files={binFiles} setFiles={setBinFiles} accept=".bin,.txt" multiple={false} label="Upload Binary File" />
      <Text fw={500} size="sm">Stable Positions File</Text>
      <FileUploadZone files={stableFiles} setFiles={setStableFiles} accept=".pos" multiple={false} label="Upload .pos File" />
      <Button onClick={run} loading={loading} disabled={binFiles.length === 0 || stableFiles.length === 0}>Extract Key</Button>
      <ResultDisplay result={result} loading={false} error={error} />
    </Stack>
  );
};

// ─── Binary Conversion Tab ───
const BinaryConvertTab: React.FC = () => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [from, setFrom] = useState<string>('bin');
  const [lineMode, setLineMode] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!lineMode && files.length === 0) {
      showError('No Input', 'Upload files, select readings from a device, or use line mode');
      return;
    }
    if (lineMode && !input.trim()) {
      showError('No Input', 'Please enter the binary/text data in line mode');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await window.electron.analysis.convertBinary({
        files: lineMode ? undefined : files,
        input: lineMode ? input : undefined,
        from, line: lineMode
      });
      setResult(res);
      showSuccess('Conversion Complete', `Converted ${res.filesProcessed || 1} file(s) from ${from} in ${res.executionTime}ms`);
    } catch (e: any) {
      const msg = showError('Binary Conversion Failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">Convert between binary (.bin) and text (.txt) representations.</Text>
      <Select label="From Format" data={[{ value: 'bin', label: 'Binary (.bin)' }, { value: 'txt', label: 'Text (.txt)' }]} value={from} onChange={(v) => setFrom(v || 'bin')} w={200} />
      <Switch label="Line Mode (inline text)" checked={lineMode} onChange={(e) => setLineMode(e.currentTarget.checked)} />
      {lineMode ? (
        <TextInput label="Input Text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter binary/text data" />
      ) : (
        <FileSourceSelector files={files} setFiles={setFiles} accept=".bin,.txt" />
      )}
      <Button onClick={run} loading={loading}>Convert</Button>
      <ResultDisplay result={result} loading={false} error={error} />
      {result?.generatedFiles && <GeneratedFilesSection files={result.generatedFiles} />}
    </Stack>
  );
};

// ─── Hex Conversion Tab ───
const HexConvertTab: React.FC = () => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [from, setFrom] = useState<string>('hex');
  const [lineMode, setLineMode] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!lineMode && files.length === 0) {
      showError('No Input', 'Upload files, select readings from a device, or use line mode');
      return;
    }
    if (lineMode && !input.trim()) {
      showError('No Input', 'Please enter the hex/text data in line mode');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await window.electron.analysis.convertHex({
        files: lineMode ? undefined : files,
        input: lineMode ? input : undefined,
        from, line: lineMode
      });
      setResult(res);
      showSuccess('Conversion Complete', `Converted ${res.filesProcessed || 1} file(s) from ${from} in ${res.executionTime}ms`);
    } catch (e: any) {
      const msg = showError('Hex Conversion Failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">Convert between hexadecimal (.hex) and text binary (.txt) representations.</Text>
      <Select label="From Format" data={[{ value: 'hex', label: 'Hex (.hex)' }, { value: 'txt', label: 'Text (.txt)' }]} value={from} onChange={(v) => setFrom(v || 'hex')} w={200} />
      <Switch label="Line Mode (inline text)" checked={lineMode} onChange={(e) => setLineMode(e.currentTarget.checked)} />
      {lineMode ? (
        <TextInput label="Input Text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter hex/text data" />
      ) : (
        <FileSourceSelector files={files} setFiles={setFiles} accept=".hex,.txt" />
      )}
      <Button onClick={run} loading={loading}>Convert</Button>
      <ResultDisplay result={result} loading={false} error={error} />
      {result?.generatedFiles && <GeneratedFilesSection files={result.generatedFiles} />}
    </Stack>
  );
};

// ─── Corrupt Data Tab ───
const CorruptTab: React.FC = () => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [corruptPercentage, setCorruptPercentage] = useState<number>(15);
  const [bits, setBits] = useState<number>(262144);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Each of the 3 regions (top/middle/bottom) gets corruptPercentage/3 % zeroed out
  const bitsPerRegion = Math.round((corruptPercentage / 100 / 3) * bits);
  const totalCorrupted = bitsPerRegion * 3;

  const PRESETS = [5, 10, 15, 25, 50];

  const run = async () => {
    if (files.length === 0) {
      showError('No Files', 'Please upload at least one file or select readings from a device');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await window.electron.analysis.corruptData({
        files, corruptPercentage, bits
      });
      setResult(res);
      showSuccess('Corruption Complete', `Generated ${res.generatedFiles?.length || 0} corrupted file(s) at ${corruptPercentage}% in ${res.executionTime}ms`);
    } catch (e: any) {
      const msg = showError('Data Corruption Failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Zero out bits at the top, middle, and bottom thirds of each dump to simulate partial memory corruption.
      </Text>
      <FileSourceSelector files={files} setFiles={setFiles} accept=".bin,.txt" />
      <Group align="flex-end">
        <NumberInput
          label="Corruption level"
          description={`≈ ${totalCorrupted.toLocaleString()} bits zeroed (${bitsPerRegion.toLocaleString()} × 3 regions)`}
          value={corruptPercentage}
          onChange={(v) => setCorruptPercentage(Math.min(100, Math.max(1, Number(v) || 15)))}
          min={1}
          max={100}
          step={1}
          suffix="%"
          w={200}
        />
        <NumberInput
          label="File size (bits)"
          description="Expected size of each input file"
          value={bits}
          onChange={(v) => setBits(Number(v) || 262144)}
          min={8}
          step={8}
          w={180}
        />
      </Group>
      <Group gap="xs">
        <Text size="xs" c="dimmed">Presets:</Text>
        {PRESETS.map((p) => (
          <Button
            key={p}
            size="xs"
            variant={corruptPercentage === p ? 'filled' : 'light'}
            onClick={() => setCorruptPercentage(p)}
          >
            {p}%
          </Button>
        ))}
      </Group>
      <Button onClick={run} loading={loading} disabled={files.length === 0}>Corrupt Data</Button>
      <ResultDisplay result={result} loading={false} error={error} />
      {result?.generatedFiles && <GeneratedFilesSection files={result.generatedFiles} />}
    </Stack>
  );
};

// ─── NIST Average Tab ───
const NistTab: React.FC = () => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (files.length === 0) {
      showError('No Files', 'Please upload at least one NIST randomness test result file');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await window.electron.analysis.nistAverage({ files });
      setResult(res);
      const passed = res.tests?.filter((t: any) => t.passed).length || 0;
      showSuccess('NIST Average Complete', `${passed}/${res.tests?.length || 0} tests passed across ${files.length} file(s) in ${res.executionTime}ms`);
    } catch (e: any) {
      const msg = showError('NIST Average Failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">Average results from the NIST Randomness Test Suite across multiple test result files.</Text>
      <FileUploadZone files={files} setFiles={setFiles} accept=".txt" />
      <Button onClick={run} loading={loading} disabled={files.length === 0}>Compute NIST Average</Button>
      {result && result.tests && result.tests.length > 0 && (
        <Card withBorder mt="md">
          <Text fw={500} size="sm" mb="xs">NIST Test Results</Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Test</Table.Th>
                <Table.Th>p-Value</Table.Th>
                <Table.Th>Result</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {result.tests.map((t: any, i: number) => (
                <Table.Tr key={i}>
                  <Table.Td>{t.testName}</Table.Td>
                  <Table.Td>{t.pValue.toFixed(6)}</Table.Td>
                  <Table.Td>
                    <Badge color={t.passed ? 'green' : 'red'} size="sm">
                      {t.passed ? 'PASS' : 'FAIL'}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
      {error && <Alert color="red" icon={<ExclamationTriangleIcon style={{ width: '1rem' }} />}>{error}</Alert>}
    </Stack>
  );
};

// ─── Random Data Tab ───
const RandomTab: React.FC = () => {
  const [bits, setBits] = useState<number>(262144);
  const [hwPercent, setHwPercent] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // CLI expects hammingWeightMultiplier / hammingWeight as the fraction of 1-bits.
  // We expose a simple 0–100% input and convert: multiplier=hwPercent, denominator=100.
  const expectedOnes = Math.round((hwPercent / 100) * bits);

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await window.electron.analysis.generateRandom({
        bits,
        hammingWeight: 100,
        hammingWeightMultiplier: hwPercent,
      });
      setResult(res);
      showSuccess('Random Data Generated', `Generated ${res.generatedFiles?.length || 0} file(s) with ${bits} bits in ${res.executionTime}ms`);
    } catch (e: any) {
      const msg = showError('Random Generation Failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">Generate random binary data with a configurable Hamming weight (fraction of 1-bits).</Text>
      <Group align="flex-end">
        <NumberInput
          label="Bits to generate"
          value={bits}
          onChange={(v) => setBits(Number(v) || 262144)}
          min={8}
          step={8}
          w={160}
        />
        <NumberInput
          label="Hamming weight (%)"
          description={`≈ ${expectedOnes.toLocaleString()} ones out of ${bits.toLocaleString()} bits`}
          value={hwPercent}
          onChange={(v) => setHwPercent(Math.min(100, Math.max(0, Number(v) || 50)))}
          min={0}
          max={100}
          step={1}
          suffix="%"
          w={200}
        />
      </Group>
      <Button onClick={run} loading={loading}>Generate Random Data</Button>
      <ResultDisplay result={result} loading={false} error={error} />
      {result?.generatedFiles && <GeneratedFilesSection files={result.generatedFiles} />}
    </Stack>
  );
};

// ─── Repeated Data Tab ───
const RepeatedTab: React.FC = () => {
  const [bits, setBits] = useState<number>(262144);
  const [data, setData] = useState('00000000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const patternValid = /^[01]+$/.test(data.trim());
  const patternLength = data.trim().length;
  const patternOnes = (data.match(/1/g) || []).length;
  const patternHW = patternLength > 0 ? ((patternOnes / patternLength) * 100).toFixed(1) : '0.0';
  const repeatCount = patternLength > 0 ? Math.ceil(bits / patternLength) : 0;

  const PRESETS = [
    { label: 'All 0s', value: '00000000' },
    { label: 'All 1s', value: '11111111' },
    { label: 'Alternating', value: '01010101' },
    { label: '25% HW', value: '00010001' },
    { label: '75% HW', value: '11101110' },
  ];

  const handlePatternChange = (val: string) => {
    // Strip any non-binary characters as user types
    setData(val.replace(/[^01]/g, ''));
  };

  const run = async () => {
    if (!data.trim() || !patternValid) {
      showError('Invalid Pattern', 'Pattern must contain only 0s and 1s');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await window.electron.analysis.generateRepeated({ bits, data: data.trim() });
      setResult(res);
      showSuccess('Repeated Data Generated', `Generated file with pattern "${data.trim()}" × ${repeatCount} repetitions in ${res.executionTime}ms`);
    } catch (e: any) {
      const msg = showError('Repeated Generation Failed', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">Generate a binary dump by repeating a bit pattern to fill the specified size.</Text>
      <Group align="flex-end">
        <NumberInput
          label="Bits to generate"
          value={bits}
          onChange={(v) => setBits(Number(v) || 262144)}
          min={8}
          step={8}
          w={160}
        />
        <TextInput
          label="Bit pattern"
          description={
            patternLength === 0
              ? 'Enter a sequence of 0s and 1s'
              : patternValid
              ? `${patternLength} bits · ${patternHW}% Hamming weight · repeated ${repeatCount}×`
              : 'Only 0 and 1 characters allowed'
          }
          value={data}
          onChange={(e) => handlePatternChange(e.target.value)}
          placeholder="00000000"
          error={data.length > 0 && !patternValid ? 'Invalid characters' : undefined}
          w={280}
        />
      </Group>
      <Group gap="xs">
        <Text size="xs" c="dimmed">Presets:</Text>
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            size="xs"
            variant={data === p.value ? 'filled' : 'light'}
            onClick={() => setData(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </Group>
      <Button onClick={run} loading={loading} disabled={!patternValid || patternLength === 0}>Generate Repeated Data</Button>
      <ResultDisplay result={result} loading={false} error={error} />
      {result?.generatedFile && <GeneratedFilesSection files={[result.generatedFile]} />}
    </Stack>
  );
};

// ─── Main Analysis Page ───
export const Analysis: React.FC = () => {
  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={1} mb="xs">PUF Analysis</Title>
          <Text c="dimmed" size="lg">
            Run analysis operations on PUF data using the Java CLI engine.
          </Text>
        </div>

        <Tabs defaultValue="metrics" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="metrics" leftSection={<BeakerIcon style={{ width: '1rem' }} />}>Metrics</Tabs.Tab>
            <Tabs.Tab value="stable" leftSection={<KeyIcon style={{ width: '1rem' }} />}>Stable Positions</Tabs.Tab>
            <Tabs.Tab value="extract" leftSection={<KeyIcon style={{ width: '1rem' }} />}>Extract Key</Tabs.Tab>
            <Tabs.Tab value="binary" leftSection={<ArrowsRightLeftIcon style={{ width: '1rem' }} />}>Binary Conv.</Tabs.Tab>
            <Tabs.Tab value="hex" leftSection={<ArrowsRightLeftIcon style={{ width: '1rem' }} />}>Hex Conv.</Tabs.Tab>
            <Tabs.Tab value="corrupt" leftSection={<WrenchScrewdriverIcon style={{ width: '1rem' }} />}>Corrupt</Tabs.Tab>
            <Tabs.Tab value="nist" leftSection={<ChartBarIcon style={{ width: '1rem' }} />}>NIST</Tabs.Tab>
            <Tabs.Tab value="random" leftSection={<CubeIcon style={{ width: '1rem' }} />}>Random</Tabs.Tab>
            <Tabs.Tab value="repeated" leftSection={<CubeIcon style={{ width: '1rem' }} />}>Repeated</Tabs.Tab>
          </Tabs.List>

          <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
            <Tabs.Panel value="metrics"><MetricsTab /></Tabs.Panel>
            <Tabs.Panel value="stable"><StableTab /></Tabs.Panel>
            <Tabs.Panel value="extract"><ExtractTab /></Tabs.Panel>
            <Tabs.Panel value="binary"><BinaryConvertTab /></Tabs.Panel>
            <Tabs.Panel value="hex"><HexConvertTab /></Tabs.Panel>
            <Tabs.Panel value="corrupt"><CorruptTab /></Tabs.Panel>
            <Tabs.Panel value="nist"><NistTab /></Tabs.Panel>
            <Tabs.Panel value="random"><RandomTab /></Tabs.Panel>
            <Tabs.Panel value="repeated"><RepeatedTab /></Tabs.Panel>
          </Card>
        </Tabs>
      </Stack>
    </Container>
  );
};
