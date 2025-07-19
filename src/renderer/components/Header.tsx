import React from 'react';
import { Group, Text, ActionIcon } from '@mantine/core';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/renderer/providers/ThemeProvider';

export const Header: React.FC = () => {
  const { colorScheme, toggleColorScheme } = useTheme();

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        <Text size="xl" fw={700}>
          PUF Analyzer GUI
        </Text>
      </Group>
      
      <Group>
        <ActionIcon
          onClick={toggleColorScheme}
          variant="subtle"
          size="lg"
          aria-label="Toggle color scheme"
        >
          {colorScheme === 'dark' ? (
            <SunIcon style={{ width: '1.2rem', height: '1.2rem' }} />
          ) : (
            <MoonIcon style={{ width: '1.2rem', height: '1.2rem' }} />
          )}
        </ActionIcon>
      </Group>
    </Group>
  );
};