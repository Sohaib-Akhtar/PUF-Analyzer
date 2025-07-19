import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Title, 
  Text, 
  Grid, 
  Card, 
  Group, 
  Progress, 
  Stack,
  Button 
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  CpuChipIcon, 
  DocumentIcon,
  TrashIcon
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
  const [readingCount, setReadingCount] = useState<number>(0);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'loading'>('loading');

  const loadDashboardData = async () => {
    try {
      // Test database connectivity and get counts
      const devices = await window.electron.database.getAllDevices();
      const totalReadings = await window.electron.database.getReadingCount();
      setDeviceCount(devices.length);
      setReadingCount(totalReadings);
      setDbStatus('online');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setDbStatus('offline');
    }
  };

  const handleResetDatabase = async () => {
    if (window.confirm('Are you sure you want to reset the database? This will delete all devices and readings.')) {
      try {
        await window.electron.database.resetDatabase();
        notifications.show({
          title: 'Database Reset',
          message: 'Database has been reset successfully',
          color: 'green'
        });
        loadDashboardData();
      } catch (error) {
        notifications.show({
          title: 'Reset Failed',
          message: `Failed to reset database: ${error}`,
          color: 'red'
        });
      }
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
              icon={CpuChipIcon}
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <StatCard
              title="PUF Readings"
              value={readingCount.toLocaleString()}
              icon={DocumentIcon}
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
                <Button
                  leftSection={<TrashIcon style={{ width: '1rem', height: '1rem' }} />}
                  onClick={handleResetDatabase}
                  color="red"
                  variant="light"
                  size="sm"
                  fullWidth
                >
                  Reset Database
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};