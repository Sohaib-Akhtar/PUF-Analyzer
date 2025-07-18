import React from 'react';
import { Group, Text } from '@mantine/core';

export const Footer: React.FC = () => {
  return (
    <Group justify="space-between" h="100%" px="md">
      <Text size="xs" c="dimmed">
        © 2024 PUF Analyzer Desktop. All rights reserved.
      </Text>
      <Text size="xs" c="dimmed">
        Version 1.0.0
      </Text>
    </Group>
  );
};