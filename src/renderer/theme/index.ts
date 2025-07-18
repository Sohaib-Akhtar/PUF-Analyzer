import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: 'Inter, system-ui, sans-serif',
  primaryColor: 'blue_green',
  colors: {
    sky_blue: [
      '#e8f4fa',
      '#d2eaf5',
      '#bbdff0',
      '#a5d5eb',
      '#8ecae6',
      '#51aed9',
      '#288ab7',
      '#1b5c7a',
      '#0d2e3d',
      '#0a252f'
    ],
    blue_green: [
      '#ceeef6',
      '#9cddee',
      '#6bcce5',
      '#39bcdc',
      '#219ebc',
      '#1a7d95',
      '#145d70',
      '#0d3e4b',
      '#071f25',
      '#051820'
    ],
    prussian_blue: [
      '#a9e1fd',
      '#54c3fb',
      '#06a3f1',
      '#04699b',
      '#023047',
      '#012638',
      '#011c2a',
      '#01131c',
      '#00090e',
      '#000709'
    ],
    selective_yellow: [
      '#fff1cd',
      '#ffe39b',
      '#ffd569',
      '#ffc637',
      '#ffb703',
      '#d09500',
      '#9c7000',
      '#684b00',
      '#342500',
      '#281c00'
    ],
    ut_orange: [
      '#ffe7cb',
      '#ffce97',
      '#ffb663',
      '#ff9e2f',
      '#fb8500',
      '#c86b00',
      '#965000',
      '#643500',
      '#321b00',
      '#261500'
    ]
  },
  defaultRadius: 'md',
  loader: 'bars',
  components: {
    AppShell: {
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-gray-0)',
        }
      }
    }
  }
});