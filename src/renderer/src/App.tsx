import React from 'react';
import { AppShell } from '@mantine/core';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from '@/renderer/components/Navbar';
import { Header } from '@/renderer/components/Header';
import { Footer } from '@/renderer/components/Footer';
import { Dashboard } from '@/renderer/pages/Dashboard';
import { Devices } from '@/renderer/pages/Devices';

const App: React.FC = () => {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm' }}
      footer={{ height: 40 }}
      padding="md"
    >
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      
      <AppShell.Navbar p="md">
        <Navbar />
      </AppShell.Navbar>
      
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
        </Routes>
      </AppShell.Main>
      
      <AppShell.Footer p="md">
        <Footer />
      </AppShell.Footer>
    </AppShell>
  );
};

export default App;