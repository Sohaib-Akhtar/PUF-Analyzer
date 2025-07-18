import React from 'react';
import { Group, Text, TextInput, ActionIcon, Menu, Avatar } from '@mantine/core';
import { MagnifyingGlassIcon, BellIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export const Header: React.FC = () => {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        <Text size="xl" fw={700}>
          PUF Analyzer Desktop
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
      
      <Group>
        <ActionIcon variant="subtle" size="lg">
          <BellIcon style={{ width: '1.2rem', height: '1.2rem' }} />
        </ActionIcon>
        
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Group style={{ cursor: 'pointer' }} gap="xs">
              <Avatar size="sm">
                JD
              </Avatar>
              <Text size="sm">
                John Doe
              </Text>
              <ChevronDownIcon style={{ width: '1rem', height: '1rem' }} />
            </Group>
          </Menu.Target>
          
          <Menu.Dropdown>
            <Menu.Item>Profile</Menu.Item>
            <Menu.Item>Settings</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red">Logout</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
};