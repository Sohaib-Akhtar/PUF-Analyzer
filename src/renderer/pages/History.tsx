import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Button,
  Stack,
  Table,
  Badge,
  ActionIcon,
  TextInput,
  Loader,
  Center,
  Alert,
  Modal,
  ScrollArea,
  Code,
  Tooltip,
  Divider,
} from '@mantine/core';
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { notifications } from '@mantine/notifications';

interface AnalysisHistoryRow {
  id: number;
  device_id: number | null;
  device_name: string | null;
  analysis_type: string;
  parameters: string;
  result_data: string;
  execution_time: number;
  files_used: string;
  status: string;
  created_at: string;
}

const ANALYSIS_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  metrics: { label: 'Metrics', color: 'blue' },
  stable: { label: 'Stable Positions', color: 'teal' },
  extract: { label: 'Key Extraction', color: 'violet' },
  convert: { label: 'Binary Convert', color: 'orange' },
  hex: { label: 'Hex Convert', color: 'orange' },
  image: { label: 'Image Convert', color: 'pink' },
  augment: { label: 'Augment Data', color: 'cyan' },
  corrupt: { label: 'Corrupt Data', color: 'red' },
  fixlf: { label: 'Fix Line Feeds', color: 'gray' },
  nist: { label: 'NIST Average', color: 'indigo' },
  random: { label: 'Random Data', color: 'lime' },
  repeated: { label: 'Repeated Data', color: 'yellow' },
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const parseJsonSafe = (str: string): unknown => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

const exportAsJson = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const History: React.FC = () => {
  const [rows, setRows] = useState<AnalysisHistoryRow[]>([]);
  const [filtered, setFiltered] = useState<AnalysisHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState<AnalysisHistoryRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.electron.analysis.getHistory(200);
      setRows(data);
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to load analysis history',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Filter rows when search changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFiltered(rows);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFiltered(
      rows.filter(
        (r) =>
          r.analysis_type.toLowerCase().includes(term) ||
          (r.device_name && r.device_name.toLowerCase().includes(term)) ||
          r.files_used.toLowerCase().includes(term) ||
          r.status.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, rows]);

  const handleDelete = async (id: number) => {
    try {
      await window.electron.analysis.deleteResult(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      notifications.show({ title: 'Deleted', message: 'Analysis result removed', color: 'green' });
      if (selectedRow?.id === id) {
        setDetailOpen(false);
        setSelectedRow(null);
      }
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete result', color: 'red' });
    }
  };

  const openDetail = (row: AnalysisHistoryRow) => {
    setSelectedRow(row);
    setDetailOpen(true);
  };

  const handleExport = (row: AnalysisHistoryRow) => {
    const exportData = {
      id: row.id,
      analysis_type: row.analysis_type,
      device_name: row.device_name,
      result_data: parseJsonSafe(row.result_data),
    };
    const safeName = `analysis_${row.analysis_type}_${row.id}`;
    exportAsJson(exportData, `${safeName}.json`);
    notifications.show({ title: 'Exported', message: `Saved ${safeName}.json`, color: 'green' });
  };

  const handleExportAll = () => {
    if (filtered.length === 0) return;
    const exportData = filtered.map((row) => ({
      id: row.id,
      analysis_type: row.analysis_type,
      device_name: row.device_name,
      result_data: parseJsonSafe(row.result_data),
    }));
    exportAsJson(exportData, `analysis_history_${Date.now()}.json`);
    notifications.show({
      title: 'Exported',
      message: `Exported ${filtered.length} analysis result(s)`,
      color: 'green',
    });
  };

  // ─── Detail modal ───
  const renderDetailModal = () => {
    if (!selectedRow) return null;
    const resultData = parseJsonSafe(selectedRow.result_data) as Record<string, unknown>;
    const filesUsed = parseJsonSafe(selectedRow.files_used) as string[] | null;
    const typeInfo = ANALYSIS_TYPE_LABELS[selectedRow.analysis_type] || {
      label: selectedRow.analysis_type,
      color: 'gray',
    };

    return (
      <Modal
        opened={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={
          <Group gap="sm">
            <Badge color={typeInfo.color} variant="filled" size="lg">
              {typeInfo.label}
            </Badge>
            <Text size="sm" c="dimmed">
              #{selectedRow.id}
            </Text>
          </Group>
        }
        size="xl"
      >
        <Stack gap="md">
          {/* Summary row */}
          <Group gap="lg">
            <div>
              <Text size="xs" c="dimmed">Date</Text>
              <Text size="sm">{formatDate(selectedRow.created_at)}</Text>
            </div>
            {selectedRow.device_name && (
              <div>
                <Text size="xs" c="dimmed">Device</Text>
                <Text size="sm">{selectedRow.device_name}</Text>
              </div>
            )}
            <div>
              <Text size="xs" c="dimmed">Execution Time</Text>
              <Text size="sm">{selectedRow.execution_time}ms</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Status</Text>
              <Badge size="sm" color={selectedRow.status === 'completed' ? 'green' : 'red'}>
                {selectedRow.status}
              </Badge>
            </div>
          </Group>

          {/* Files used */}
          {Array.isArray(filesUsed) && filesUsed.length > 0 && (
            <>
              <Divider label="Files Used" labelPosition="left" />
              <Group gap="xs">
                {filesUsed.map((f, i) => (
                  <Badge key={i} variant="light" size="sm">
                    {f}
                  </Badge>
                ))}
              </Group>
            </>
          )}

          {/* Result data */}
          <Divider label="Result Data" labelPosition="left" />
          <ScrollArea.Autosize mah={400}>
            <Code block>{JSON.stringify(resultData, null, 2)}</Code>
          </ScrollArea.Autosize>

          {/* Action buttons */}
          <Group justify="flex-end">
            <Button
              variant="light"
              leftSection={<ArrowDownTrayIcon style={{ width: '1rem' }} />}
              onClick={() => handleExport(selectedRow)}
            >
              Export JSON
            </Button>
            <Button
              variant="light"
              color="red"
              leftSection={<TrashIcon style={{ width: '1rem' }} />}
              onClick={() => handleDelete(selectedRow.id)}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    );
  };

  // ─── Main render ───
  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>Analysis History</Title>
            <Text size="sm" c="dimmed">
              View, search, and export past analysis results
            </Text>
          </div>
          <Group gap="xs">
            <Tooltip label="Refresh">
              <ActionIcon variant="light" onClick={loadHistory}>
                <ArrowPathIcon style={{ width: '1rem' }} />
              </ActionIcon>
            </Tooltip>
            <Button
              variant="light"
              size="sm"
              leftSection={<ArrowDownTrayIcon style={{ width: '1rem' }} />}
              onClick={handleExportAll}
              disabled={filtered.length === 0}
            >
              Export All ({filtered.length})
            </Button>
          </Group>
        </Group>

        {/* Search */}
        <TextInput
          placeholder="Search by type, device, filename..."
          leftSection={<MagnifyingGlassIcon style={{ width: '1rem' }} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
        />

        {/* Empty state */}
        {rows.length === 0 && !loading && (
          <Alert
            icon={<ExclamationTriangleIcon style={{ width: '1rem' }} />}
            color="yellow"
          >
            No analysis results yet. Run an analysis from the Analysis page — results are saved automatically.
          </Alert>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <Card withBorder p={0}>
            <ScrollArea>
              <Table striped highlightOnHover withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Device</Table.Th>
                    <Table.Th>Files</Table.Th>
                    <Table.Th>Time</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ width: 120 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.map((row) => {
                    const typeInfo = ANALYSIS_TYPE_LABELS[row.analysis_type] || {
                      label: row.analysis_type,
                      color: 'gray',
                    };
                    const filesUsed = parseJsonSafe(row.files_used);
                    const fileCount = Array.isArray(filesUsed) ? filesUsed.length : 0;
                    const fileNames = Array.isArray(filesUsed)
                      ? filesUsed.slice(0, 2).join(', ') + (filesUsed.length > 2 ? ` +${filesUsed.length - 2}` : '')
                      : '—';

                    return (
                      <Table.Tr
                        key={row.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openDetail(row)}
                      >
                        <Table.Td>
                          <Badge color={typeInfo.color} variant="light" size="sm">
                            {typeInfo.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{row.device_name || '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label={Array.isArray(filesUsed) ? filesUsed.join(', ') : ''} disabled={fileCount <= 2}>
                            <Text size="sm" truncate="end" maw={200}>
                              {fileCount > 0 ? `${fileNames} (${fileCount})` : '—'}
                            </Text>
                          </Tooltip>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            <ClockIcon style={{ width: '0.75rem', opacity: 0.5 }} />
                            <Text size="sm">{row.execution_time}ms</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDate(row.created_at)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            color={row.status === 'completed' ? 'green' : 'red'}
                            variant="dot"
                          >
                            {row.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} onClick={(e) => e.stopPropagation()}>
                            <Tooltip label="View details">
                              <ActionIcon variant="subtle" size="sm" onClick={() => openDetail(row)}>
                                <EyeIcon style={{ width: '0.9rem' }} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Export JSON">
                              <ActionIcon variant="subtle" size="sm" onClick={() => handleExport(row)}>
                                <ArrowDownTrayIcon style={{ width: '0.9rem' }} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Delete">
                              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(row.id)}>
                                <TrashIcon style={{ width: '0.9rem' }} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        )}

        {/* No results for filter */}
        {rows.length > 0 && filtered.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">
            No results match "{searchTerm}"
          </Text>
        )}
      </Stack>

      {renderDetailModal()}
    </Container>
  );
};
