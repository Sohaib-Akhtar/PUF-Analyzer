import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Group,
  Stack,
  Text,
  Badge,
  ActionIcon,
  TextInput,
  Loader,
  Center,
  Alert,
  Menu
} from '@mantine/core';
import { 
  ArrowDownTrayIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { Device, PufReading } from '../../shared/types/database';
import { notifications } from '@mantine/notifications';

interface ReadingsModalProps {
  opened: boolean;
  onClose: () => void;
  device: Device | null;
}

export const ReadingsModal: React.FC<ReadingsModalProps> = ({
  opened,
  onClose,
  device
}) => {
  const [readings, setReadings] = useState<PufReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReadings, setFilteredReadings] = useState<PufReading[]>([]);

  const loadReadings = async () => {
    if (!device) return;
    
    try {
      setLoading(true);
      const deviceReadings = await window.electron.database.getDeviceReadings(device.id);
      setReadings(deviceReadings);
      setFilteredReadings(deviceReadings);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load device readings',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredReadings(readings);
    } else {
      const filtered = readings.filter(reading => 
        reading.filename.toLowerCase().includes(term.toLowerCase()) ||
        reading.original_filename.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredReadings(filtered);
    }
  };

  const handleDownload = async (reading: PufReading, format: 'bin' | 'txt') => {
    try {
      const filePath = await window.electron.filesystem.downloadReading(reading.id, format);
      if (filePath) {
        notifications.show({
          title: 'Download Complete',
          message: `File saved to ${filePath}`,
          color: 'green'
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Download Failed',
        message: `Failed to download reading: ${error}`,
        color: 'red'
      });
    }
  };

  const handleDelete = async (reading: PufReading) => {
    if (window.confirm(`Are you sure you want to delete "${reading.filename}"?`)) {
      try {
        await window.electron.database.deleteReading(reading.id);
        notifications.show({
          title: 'Success',
          message: `Reading "${reading.filename}" deleted successfully`,
          color: 'green'
        });
        loadReadings();
      } catch (error) {
        notifications.show({
          title: 'Error',
          message: 'Failed to delete reading',
          color: 'red'
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (opened && device) {
      loadReadings();
    }
  }, [opened, device]);

  useEffect(() => {
    handleSearch(searchTerm);
  }, [readings]);

  if (!device) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Stack gap="xs">
          <Text fw={600} size="lg">PUF Readings</Text>
          <Text size="sm" c="dimmed">{device.name} • {readings.length} readings</Text>
        </Stack>
      }
      size="xl"
      centered
    >
      <Stack gap="md">
        <TextInput
          placeholder="Search readings..."
          value={searchTerm}
          onChange={(event) => handleSearch(event.currentTarget.value)}
          leftSection={<MagnifyingGlassIcon style={{ width: '1rem', height: '1rem' }} />}
        />

        {loading ? (
          <Center h={200}>
            <Loader size="md" />
          </Center>
        ) : filteredReadings.length === 0 ? (
          <Alert icon={<ExclamationTriangleIcon style={{ width: '1rem', height: '1rem' }} />} color="blue">
            {searchTerm ? 'No readings found matching your search.' : 'No readings available for this device.'}
          </Alert>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Filename</Table.Th>
                <Table.Th>Size</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Upload Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredReadings.map((reading) => (
                <Table.Tr key={reading.id}>
                  <Table.Td>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>{reading.filename}</Text>
                      {reading.original_filename !== reading.filename && (
                        <Text size="xs" c="dimmed">Original: {reading.original_filename}</Text>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatFileSize(reading.file_size)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="sm">
                      {reading.file_extension.toUpperCase()}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDate(reading.upload_date)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Menu>
                        <Menu.Target>
                          <ActionIcon variant="light" size="sm">
                            <ArrowDownTrayIcon style={{ width: '0.875rem', height: '0.875rem' }} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item onClick={() => handleDownload(reading, 'bin')}>
                            Download as .bin
                          </Menu.Item>
                          <Menu.Item onClick={() => handleDownload(reading, 'txt')}>
                            Download as .txt
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                      
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(reading)}
                        title="Delete reading"
                      >
                        <TrashIcon style={{ width: '0.875rem', height: '0.875rem' }} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};