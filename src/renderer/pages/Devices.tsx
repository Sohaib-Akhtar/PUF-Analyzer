import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Title, 
  Text, 
  Card, 
  Group, 
  Button, 
  Stack,
  Grid,
  Badge,
  ActionIcon,
  TextInput,
  Loader,
  Center,
  Alert
} from '@mantine/core';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';
import { DeviceModal } from '../components/DeviceModal';
import { ReadingsModal } from '../components/ReadingsModal';
import { Device, CreateDeviceDto } from '../../shared/types/database';
import { notifications } from '@mantine/notifications';

export const Devices: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpened, setModalOpened] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [readingsModalOpened, setReadingsModalOpened] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string>('');

  const loadDevices = async () => {
    try {
      setLoading(true);
      const allDevices = await window.electron.database.getAllDevices();
      setDevices(allDevices);
      setError('');
    } catch (err) {
      console.error('Failed to load devices:', err);
      setError('Failed to load devices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      loadDevices();
      return;
    }
    
    try {
      const searchResults = await window.electron.database.searchDevices(term);
      setDevices(searchResults);
    } catch (err) {
      console.error('Search failed:', err);
      notifications.show({
        title: 'Search Error',
        message: 'Failed to search devices',
        color: 'red'
      });
    }
  };

  const handleAddDevice = () => {
    setEditingDevice(null);
    setModalOpened(true);
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setModalOpened(true);
  };

  const handleViewReadings = (device: Device) => {
    setSelectedDevice(device);
    setReadingsModalOpened(true);
  };

  const handleDeleteDevice = async (device: Device) => {
    if (window.confirm(`Are you sure you want to delete "${device.name}"?`)) {
      try {
        await window.electron.database.deleteDevice(device.id);
        loadDevices();
        notifications.show({
          title: 'Success',
          message: `Device "${device.name}" deleted successfully`,
          color: 'green'
        });
      } catch (err) {
        console.error('Failed to delete device:', err);
        notifications.show({
          title: 'Error',
          message: 'Failed to delete device',
          color: 'red'
        });
      }
    }
  };

  const handleSaveDevice = async (deviceData: CreateDeviceDto) => {
    try {
      if (editingDevice) {
        await window.electron.database.updateDevice(editingDevice.id, deviceData);
        notifications.show({
          title: 'Success',
          message: `Device "${deviceData.name}" updated successfully`,
          color: 'green'
        });
      } else {
        await window.electron.database.createDevice(deviceData);
        notifications.show({
          title: 'Success',
          message: `Device "${deviceData.name}" created successfully`,
          color: 'green'
        });
      }
      loadDevices();
    } catch (err) {
      console.error('Failed to save device:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to save device',
        color: 'red'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'maintenance': return 'yellow';
      case 'retired': return 'red';
      default: return 'blue';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    loadDevices();
  }, []);

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={1} mb="xs">
              Devices
            </Title>
            <Text c="dimmed" size="lg">
              Manage your PUF devices and their configurations.
            </Text>
          </div>
          <Button 
            leftSection={<PlusIcon style={{ width: '1rem', height: '1rem' }} />}
            onClick={handleAddDevice}
          >
            Add Device
          </Button>
        </Group>

        <TextInput
          placeholder="Search devices..."
          value={searchTerm}
          onChange={(event) => handleSearch(event.currentTarget.value)}
          leftSection={<MagnifyingGlassIcon style={{ width: '1rem', height: '1rem' }} />}
        />

        {error && (
          <Alert icon={<ExclamationTriangleIcon style={{ width: '1rem', height: '1rem' }} />} color="red">
            {error}
          </Alert>
        )}

        {devices.length === 0 ? (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text ta="center" c="dimmed" size="md">
              {searchTerm ? 'No devices found matching your search.' : 'No devices registered yet. Click "Add Device" to get started.'}
            </Text>
          </Card>
        ) : (
          <Grid>
            {devices.map((device) => (
              <Grid.Col key={device.id} span={{ base: 12, sm: 6, lg: 4 }}>
                <Card 
                  shadow="sm" 
                  padding="lg" 
                  radius="md" 
                  withBorder 
                  h="100%" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleViewReadings(device)}
                >
                  <Stack gap="sm" h="100%">
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Text fw={600} size="lg" lineClamp={1}>
                          {device.name}
                        </Text>
                        {device.device_type && (
                          <Text size="sm" c="dimmed" tt="uppercase">
                            {device.device_type}
                          </Text>
                        )}
                      </div>
                      <Badge 
                        color={getStatusColor(device.status)} 
                        variant="filled"
                        size="sm"
                      >
                        {device.status}
                      </Badge>
                    </Group>

                    {device.description && (
                      <Text size="sm" c="dimmed" lineClamp={3} style={{ flex: 1 }}>
                        {device.description}
                      </Text>
                    )}

                    <Group>
                      <DocumentTextIcon style={{ width: '1rem', height: '1rem' }} />
                      <Text size="sm" fw={500}>
                        {device.readings_count || 0} readings
                      </Text>
                    </Group>

                    <div style={{ marginTop: 'auto' }}>
                      <Text size="xs" c="dimmed" mb="sm">
                        Created: {formatDate(device.created_at)}
                      </Text>
                      
                      <Group justify="flex-end" gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDevice(device);
                          }}
                          title="Edit device"
                        >
                          <PencilIcon style={{ width: '1rem', height: '1rem' }} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDevice(device);
                          }}
                          title="Delete device"
                        >
                          <TrashIcon style={{ width: '1rem', height: '1rem' }} />
                        </ActionIcon>
                      </Group>
                    </div>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}

        <DeviceModal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          onSave={handleSaveDevice}
          onRefresh={loadDevices}
          device={editingDevice}
          title={editingDevice ? 'Edit Device' : 'Add New Device'}
        />

        <ReadingsModal
          opened={readingsModalOpened}
          onClose={() => setReadingsModalOpened(false)}
          device={selectedDevice}
        />
      </Stack>
    </Container>
  );
};