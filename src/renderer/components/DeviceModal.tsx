import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Stack,
  Text
} from '@mantine/core';
import { Device, CreateDeviceDto } from '../../shared/types/database';

interface DeviceModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (deviceData: CreateDeviceDto) => void;
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
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' }
];

export const DeviceModal: React.FC<DeviceModalProps> = ({
  opened,
  onClose,
  onSave,
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
  }, [device, opened]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Device name is required';
    }
    
    if (!formData.device_type) {
      newErrors.device_type = 'Device type is required';
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
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600} size="lg">{title}</Text>}
      size="md"
      centered
    >
      <Stack gap="md">
        <TextInput
          label="Device Name"
          placeholder="Enter device name"
          value={formData.name}
          onChange={(event) => handleInputChange('name', event.currentTarget.value)}
          error={errors.name}
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
          value={formData.device_type}
          onChange={(value) => handleInputChange('device_type', value || '')}
          error={errors.device_type}
          required
        />

        <Select
          label="Status"
          placeholder="Select status"
          data={statusOptions}
          value={formData.status}
          onChange={(value) => handleInputChange('status', value || 'active')}
          required
        />

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