import React from 'react';
import { Group, Text, TextInput } from '@mantine/core';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export const Header: React.FC = () => {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        <Text size="xl" fw={700}>
          PUF Analyzer GUI
        </Text>
      </Group>
      
      <Group>
        <TextInput
          placeholder="Search..."
          size="sm"
          leftSection={<MagnifyingGlassIcon style={{ width: '1rem', height: '1rem' }} />}
          w={250}
        />
      </Group>
    </Group>
  );
};