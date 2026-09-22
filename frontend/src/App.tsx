import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Page Views
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { HealthRecords } from './pages/HealthRecords';
import { ScanReport } from './pages/ScanReport';
import { Medicines } from './pages/Medicines';
import { Family } from './pages/Family';
import { BloodDonation } from './pages/BloodDonation';
import { OrganDonation } from './pages/OrganDonation';
import { Emergency } from './pages/Emergency';
import { OfflineWallet } from './pages/OfflineWallet';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated Application Shell (Protected) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/health-records" element={<HealthRecords />} />
              <Route path="/scan-report" element={<ScanReport />} />
              <Route path="/medicines" element={<Medicines />} />
              <Route path="/family" element={<Family />} />
              <Route path="/blood-donation" element={<BloodDonation />} />
              <Route path="/organ-donation" element={<OrganDonation />} />
              <Route path="/emergency" element={<Emergency />} />
              <Route path="/offline-wallet" element={<OfflineWallet />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
