import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Stack,
  Text,
  Divider,
  Alert,
  List,
  Badge,
  ActionIcon,
} from '@mantine/core';
import { InformationCircleIcon, DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Device, CreateDeviceDto, FileUploadResult } from '../../shared/types/database';
import { notifications } from '@mantine/notifications';

interface DeviceModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (deviceData: CreateDeviceDto) => void;
  onRefresh?: () => void;
  device?: Device | null;
  title: string;
}

const deviceTypes = [
  { value: 'fpga', label: 'FPGA' },
  { value: 'microcontroller', label: 'Microcontroller' },
  { value: 'soc', label: 'System on Chip' },
  { value: 'asic', label: 'ASIC' },
  { value: 'other', label: 'Other' }
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const DeviceModal: React.FC<DeviceModalProps> = ({
  opened,
  onClose,
  onSave,
  onRefresh,
  device,
  title
}) => {
  const [formData, setFormData] = useState<CreateDeviceDto>({
    name: '',
    description: '',
    device_type: '',
    status: 'active'
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<FileUploadResult[]>([]);

  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name,
        description: device.description || '',
        device_type: device.device_type || '',
        status: device.status
      });
    } else {
      setFormData({
        name: '',
        description: '',
        device_type: '',
        status: 'active'
      });
    }
    setErrors({});
    setUploadResults([]);
    setUploading(false);
  }, [device, opened]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData['name'].trim()) {
      newErrors['name'] = 'Device name is required';
    }
    
    if (!formData['device_type']) {
      newErrors['device_type'] = 'Device type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleInputChange = (field: keyof CreateDeviceDto, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handlePufFileUpload = async () => {
    try {
      setUploading(true);
      setUploadResults([]);
      
      const results = await window.electron.filesystem.uploadPufFiles();
      setUploadResults(results);
      
      if (results.length > 0) {
        const successCount = results.filter((r: FileUploadResult) => r.success).length;
        const totalReadings = results.reduce((sum: number, r: FileUploadResult) => sum + r.readingsAdded, 0);
        
        if (successCount > 0) {
          notifications.show({
            title: 'Upload Successful',
            message: `Created ${successCount} devices with ${totalReadings} readings`,
            color: 'green',
          });
          
          if (onRefresh) {
            onRefresh();
          }
        }
        
        const errorCount = results.filter((r: FileUploadResult) => !r.success).length;
        if (errorCount > 0) {
          notifications.show({
            title: 'Upload Errors',
            message: `${errorCount} files had errors during upload`,
            color: 'orange',
          });
        }
      }
    } catch (error) {
      notifications.show({
        title: 'Upload Failed',
        message: `Failed to upload files: ${error}`,
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveResult = (index: number) => {
    setUploadResults(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600} size="lg">{title}</Text>}
      size="lg"
      centered
    >
      <Stack gap="md">
        <TextInput
          label="Device Name"
          placeholder="Enter device name"
          value={formData.name}
          onChange={(event) => handleInputChange('name', event.currentTarget.value)}
          error={errors['name']}
          required
        />

        <Textarea
          label="Description"
          placeholder="Enter device description (optional)"
          value={formData.description}
          onChange={(event) => handleInputChange('description', event.currentTarget.value)}
          minRows={3}
          maxRows={5}
        />

        <Select
          label="Device Type"
          placeholder="Select device type"
          data={deviceTypes}
          value={formData.device_type || null}
          onChange={(value) => handleInputChange('device_type', value || '')}
          error={errors['device_type']}
          required
        />

        <Select
          label="Status"
          placeholder="Select status"
          data={statusOptions}
          value={formData.status || null}
          onChange={(value) => handleInputChange('status', value || 'active')}
          required
        />

        {!device && (
          <>
            <Divider label="OR" labelPosition="center" my="md" />
            
            <Alert icon={<InformationCircleIcon className="h-4 w-4" />} color="blue">
              <Text size="sm">
                Upload multiple .bin or .txt files containing PUF readings. Devices will be automatically detected from filenames (e.g., "tiva_new1.bin" creates device "tiva_new1").
              </Text>
            </Alert>

            <Button
              leftSection={<DocumentArrowUpIcon className="h-4 w-4" />}
              onClick={handlePufFileUpload}
              loading={uploading}
              size="lg"
              variant="outline"
            >
              {uploading ? 'Processing Files...' : 'Upload PUF Files'}
            </Button>

            {uploadResults.length > 0 && (
              <Stack gap="sm">
                <Text fw={500}>Upload Results:</Text>
                <List spacing="xs">
                  {uploadResults.map((result, index) => (
                    <List.Item key={index}>
                      <Group justify="space-between">
                        <Group>
                          <Badge color={result.success ? 'green' : 'red'} size="sm">
                            {result.deviceName}
                          </Badge>
                          <Text size="sm">
                            {result.success 
                              ? `${result.readingsAdded} readings added`
                              : 'Failed'
                            }
                          </Text>
                        </Group>
                        <ActionIcon
                          variant="light"
                          color="red"
                          size="sm"
                          onClick={() => handleRemoveResult(index)}
                          title="Remove result"
                        >
                          <XMarkIcon style={{ width: '0.75rem', height: '0.75rem' }} />
                        </ActionIcon>
                      </Group>
                      {result.errors && (
                        <List spacing="xs" mt="xs">
                          {result.errors.map((error, errorIndex) => (
                            <List.Item key={errorIndex}>
                              <Text size="xs" c="red">{error}</Text>
                            </List.Item>
                          ))}
                        </List>
                      )}
                    </List.Item>
                  ))}
                </List>
              </Stack>
            )}
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {device ? 'Update Device' : 'Add Device'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};