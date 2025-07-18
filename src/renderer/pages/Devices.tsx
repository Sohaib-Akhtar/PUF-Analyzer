import React from 'react';
import { Container, Title, Text, Card, Group, Button, Stack } from '@mantine/core';
import { PlusIcon } from '@heroicons/react/24/outline';

export const Devices: React.FC = () => {
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
          <Button leftSection={<PlusIcon style={{ width: '1rem', height: '1rem' }} />}>
            Add Device
          </Button>
        </Group>
        
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text ta="center" c="dimmed" size="md">
            No devices registered yet. Click "Add Device" to get started.
          </Text>
        </Card>
      </Stack>
    </Container>
  );
};