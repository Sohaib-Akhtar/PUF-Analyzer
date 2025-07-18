import React from 'react';
import { Group, Text } from '@mantine/core';

export const Footer: React.FC = () => {
  return (
    <Group justify="space-between" h="100%" px="md">
      <Text size="xs" c="dimmed">
        © 2025 PUF Analyzer Desktop. All rights reserved.
      </Text>
      <Text size="xs" c="dimmed">
        Version 0.0.1
      </Text>
    </Group>
  );
};