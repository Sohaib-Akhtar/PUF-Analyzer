import React from 'react';
import { NavLink, Stack, Group, Text } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ChartBarIcon, 
  CpuChipIcon,
  BeakerIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: ChartBarIcon },
  { path: '/devices', label: 'Devices', icon: CpuChipIcon },
  { path: '/analysis', label: 'Analysis', icon: BeakerIcon },
  { path: '/history', label: 'History', icon: ClockIcon },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Stack gap="xs">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <NavLink
            key={item.path}
            active={isActive}
            label={
              <Group gap="sm">
                <Icon style={{ width: '1rem', height: '1rem' }} />
                <Text size="sm">
                  {item.label}
                </Text>
              </Group>
            }
            onClick={() => navigate(item.path)}
          />
        );
      })}
    </Stack>
  );
};