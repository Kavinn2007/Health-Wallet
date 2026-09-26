import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { DoctorLayout } from './components/layout/DoctorLayout';
import { LabLayout } from './components/layout/LabLayout';

// Patient Page Views
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { HealthRecords } from './pages/HealthRecords';
import { ScanReport } from './pages/ScanReport';
import { PatientAccessRequests } from './pages/PatientAccessRequests';
import { AccessHistory } from './pages/AccessHistory';
import { Notifications } from './pages/Notifications';
import { Medicines } from './pages/Medicines';
import { Family } from './pages/Family';
import { BloodDonation } from './pages/BloodDonation';
import { OrganDonation } from './pages/OrganDonation';
import { Emergency } from './pages/Emergency';
import { OfflineWallet } from './pages/OfflineWallet';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';

// Doctor Page Views (Phase 5, 6, 7 & 8)
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPatientSearch } from './pages/doctor/DoctorPatientSearch';
import { DoctorAccessRequests } from './pages/doctor/DoctorAccessRequests';
import { DoctorPatientRecords } from './pages/doctor/DoctorPatientRecords';
import { DoctorClinicalWorkspace } from './pages/doctor/DoctorClinicalWorkspace';
import { DoctorActivity } from './pages/doctor/DoctorActivity';
import { DoctorProfilePage } from './pages/doctor/DoctorProfilePage';

// Lab Page Views (Phase 9)
import { LabLogin } from './pages/lab/LabLogin';
import { LabRegister } from './pages/lab/LabRegister';
import { LabDashboard } from './pages/lab/LabDashboard';
import { LabPatientSearch } from './pages/lab/LabPatientSearch';
import { LabCreateReport } from './pages/lab/LabCreateReport';
import { LabReportDetail } from './pages/lab/LabReportDetail';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Patient & Doctor Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public Lab Authentication Routes */}
          <Route path="/lab/login" element={<LabLogin />} />
          <Route path="/lab/register" element={<LabRegister />} />

          {/* Patient Application Shell (Role: PATIENT only) */}
          <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/health-records" element={<HealthRecords />} />
              <Route path="/scan-report" element={<ScanReport />} />
              <Route path="/access-requests" element={<PatientAccessRequests />} />
              <Route path="/access-history" element={<AccessHistory />} />
              <Route path="/notifications" element={<Notifications />} />
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

          {/* Doctor Application Shell (Role: DOCTOR only) */}
          <Route path="/doctor" element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
            <Route element={<DoctorLayout />}>
              <Route index element={<Navigate to="/doctor/dashboard" replace />} />
              <Route path="dashboard" element={<DoctorDashboard />} />
              <Route path="patients" element={<DoctorPatientSearch />} />
              <Route path="patients/:patientId/records" element={<DoctorPatientRecords />} />
              <Route path="patients/:patientId/clinical" element={<DoctorClinicalWorkspace />} />
              <Route path="access-requests" element={<DoctorAccessRequests />} />
              <Route path="activity" element={<DoctorActivity />} />
              <Route path="notifications" element={<Notifications isDoctor />} />
              <Route path="profile" element={<DoctorProfilePage />} />
            </Route>
          </Route>

          {/* Lab Application Shell (Role: LAB only) */}
          <Route path="/lab" element={<ProtectedRoute allowedRoles={['LAB']} />}>
            <Route element={<LabLayout />}>
              <Route index element={<Navigate to="/lab/dashboard" replace />} />
              <Route path="dashboard" element={<LabDashboard />} />
              <Route path="patients" element={<LabPatientSearch />} />
              <Route path="reports/new" element={<LabCreateReport />} />
              <Route path="reports/:id" element={<LabReportDetail />} />
              <Route path="notifications" element={<Notifications />} />
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
