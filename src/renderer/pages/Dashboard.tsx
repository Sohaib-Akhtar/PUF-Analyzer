import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Title, 
  Text, 
  Grid, 
  Card, 
  Group, 
  Progress, 
  Stack 
} from '@mantine/core';
import { 
  ComputerDesktopIcon, 
  DocumentIcon
} from '@heroicons/react/24/outline';

const StatCard: React.FC<{ 
  title: string; 
  value: string; 
  icon: React.FC<any>; 
  progress?: number;
}> = ({ title, value, icon: Icon, progress }) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder>
    <Group justify="space-between" mb="xs">
      <Text fw={500} size="sm" c="dimmed">
        {title}
      </Text>
      <Icon style={{ width: '1.2rem', height: '1.2rem' }} />
    </Group>
    <Text fw={700} size="xl" mb="xs">
      {value}
    </Text>
    {progress !== undefined && (
      <Progress value={progress} size="sm" />
    )}
  </Card>
);

export const Dashboard: React.FC = () => {
  const [deviceCount, setDeviceCount] = useState<number>(0);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'loading'>('loading');

  const loadDashboardData = async () => {
    try {
      // Test database connectivity and get device count
      const devices = await window.electron.database.getAllDevices();
      setDeviceCount(devices.length);
      setDbStatus('online');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setDbStatus('offline');
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={1} mb="xs">
            Welcome to PUF Analyzer Desktop
          </Title>
          <Text c="dimmed" size="lg">
            Analyze and manage your PUF (Physically Unclonable Function) data with ease.
          </Text>
        </div>
        
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <StatCard
              title="Total Devices"
              value={deviceCount.toString()}
              icon={ComputerDesktopIcon}
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <StatCard
              title="Analyzed Files"
              value="1,234"
              icon={DocumentIcon}
              progress={90}
            />
          </Grid.Col>
        </Grid>
        
        {/* Recent Activity - Commented out for now
        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={500} size="lg">
                  Recent Activity
                </Text>
              </Group>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm">Device "Arduino Uno #1" analyzed</Text>
                  <Text size="xs" c="dimmed">2 minutes ago</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">New PUF data uploaded</Text>
                  <Text size="xs" c="dimmed">5 minutes ago</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Analysis completed for Device #5</Text>
                  <Text size="xs" c="dimmed">10 minutes ago</Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
        */}
          
        <Grid>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={500} size="lg">
                  System Status
                </Text>
              </Group>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm">Database</Text>
                  <Text 
                    size="sm" 
                    c={dbStatus === 'online' ? 'green' : dbStatus === 'offline' ? 'red' : 'yellow'}
                  >
                    {dbStatus === 'online' ? 'Online' : dbStatus === 'offline' ? 'Offline' : 'Loading...'}
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};