import React, { useState, useEffect } from 'react';
import { Group, Text } from '@mantine/core';

export const Footer: React.FC = () => {
  const [version, setVersion] = useState('0.0.0');

  useEffect(() => {
    window.electron.getAppVersion().then(setVersion).catch(() => setVersion('0.0.0'));
  }, []);

  return (
    <Group justify="space-between" h="100%" px="md">
      <Text size="xs" c="dimmed">
        &copy; {new Date().getFullYear()} PUF Analyzer Desktop. All rights reserved.
      </Text>
      <Text size="xs" c="dimmed">
        Version {version}
      </Text>
    </Group>
  );
};