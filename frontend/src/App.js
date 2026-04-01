import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './landing_page/home/HomePage';
import OurTeam from './landing_page/home/OurTeam';
import SignUp from './landing_page/signup/SignUp';
import SignIn from './landing_page/auth/SignIn';
import DoctorSignup from './landing_page/auth/DoctorSignup';
import HospitalSignup from './landing_page/auth/HospitalSignup';
import DonorSignin from './landing_page/auth/DonorSignin';
import VerificationPending from './landing_page/auth/VerificationPending';
import AdminDashboard from './pages/admin/AdminDashboard';
import DoctorApprovals from './pages/admin/DoctorApprovals';
import BloodInventoryPage from './pages/admin/BloodInventoryPage';
import BloodRequestsPage from './pages/admin/BloodRequestsPage';
import EmergencyInterHospitalCoordination from './pages/admin/EmergencyInterHospitalCoordination';
import DonorManagement from './pages/admin/DonorManagement';
import UrgencyDetails from './pages/admin/UrgencyDetails';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';
import MLIntelligencePage from './pages/admin/MLIntelligencePage';
import DigitalTwinPage from './pages/admin/DigitalTwinPage';
import RLAgentPage from './pages/admin/RLAgentPage';
import GraphIntelligencePage from './pages/admin/GraphIntelligencePage';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import TestSuperAdmin from './pages/superadmin/TestSuperAdmin';
import TestHospitalRegistration from './pages/test/TestHospitalRegistration';
import TestSuperAdminAPI from './pages/test/TestSuperAdminAPI';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PublicUserRegister from './pages/public/PublicUserRegister';
import PublicUserLogin from './pages/public/PublicUserLogin';
import PublicVerificationPending from './pages/public/VerificationPending';
import PublicDashboard from './pages/public/PublicDashboard';
import MyCertificates from './pages/public/MyCertificates';

// Blood Camp Community Pages
import CommunityPage from './pages/public/CommunityPage';
import HospitalsPage from './pages/public/HospitalsPage';
import BloodCampsPage from './pages/public/BloodCampsPage';
import CampDetailsPage from './pages/public/CampDetailsPage';
import OrganizeCampPage from './pages/public/OrganizeCampPage';
import BookAppointmentPage from './pages/public/BookAppointmentPage';
import MyAppointmentsPage from './pages/public/MyAppointmentsPage';
import NotificationsPage from './pages/public/NotificationsPage';

// Emergency Intelligence Pages
import EmergencyDashboard from './pages/emergency/EmergencyDashboard';
import CreateScenario from './pages/emergency/CreateScenario';
import ScenarioDetails from './pages/emergency/ScenarioDetails';

// Geolocation Intelligence
import GeoIntelligence from './pages/public/GeoIntelligence';
import DonorLogin from './pages/donor/DonorLogin';
import ChangePassword from './pages/donor/ChangePassword';
import DonorDashboardPage from './pages/donor/DonorDashboard';
import DonationHistory from './pages/donor/DonationHistory';
import Certificates from './pages/donor/Certificates';
import EmergencyMessages from './pages/donor/EmergencyMessages';
import DonorManagementCard from './components/DonorManagementCard';
import ProtectedRoute from './components/common/ProtectedRoute';
import Chatbot from './components/common/Chatbot';

import './App.css';
import BloodTracingDashboard from './pages/BloodTracingDashboard';
import QRScanner from './components/QRScanner';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/our-team" element={<OurTeam />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/auth/doctor" element={<DoctorSignup />} />
          
                    {/* Blood Tracing Routes (Public - No Auth Required) */}
                    <Route path="/trace" element={<QRScanner />} />
                    <Route path="/trace/:unitId" element={<BloodTracingDashboard />} />
          <Route path="/auth/hospital" element={<HospitalSignup />} />
          <Route path="/auth/donor" element={<DonorSignin />} />
          <Route path="/verification-pending" element={<VerificationPending />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['hospital_admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['hospital_admin']}><DoctorApprovals /></ProtectedRoute>} />
          <Route path="/admin/blood-inventory" element={<ProtectedRoute allowedRoles={['hospital_admin']}><BloodInventoryPage /></ProtectedRoute>} />
          <Route path="/admin/blood-requests" element={<ProtectedRoute allowedRoles={['hospital_admin']}><BloodRequestsPage /></ProtectedRoute>} />
          <Route path="/admin/appointments" element={<ProtectedRoute allowedRoles={['hospital_admin']}><BloodRequestsPage /></ProtectedRoute>} />
          <Route path="/admin/emergency" element={<ProtectedRoute allowedRoles={['hospital_admin']}><EmergencyInterHospitalCoordination /></ProtectedRoute>} />
          <Route path="/admin/donors" element={<ProtectedRoute allowedRoles={['hospital_admin']}><DonorManagement /></ProtectedRoute>} />
          <Route path="/admin/donor-management" element={<ProtectedRoute allowedRoles={['hospital_admin']}><DonorManagementCard /></ProtectedRoute>} />
          <Route path="/admin/urgency-details" element={<ProtectedRoute allowedRoles={['hospital_admin']}><UrgencyDetails /></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={['hospital_admin']}><AuditLogs /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['hospital_admin']}><Settings /></ProtectedRoute>} />
          <Route
            path="/admin/ml-intelligence"
            element={
              <ProtectedRoute allowedRoles={['hospital_admin', 'super_admin', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
                <Navigate to="/admin/ml-intelligence/demand" replace />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/ml-intelligence/:tabId" element={<ProtectedRoute allowedRoles={['hospital_admin', 'super_admin', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}><MLIntelligencePage /></ProtectedRoute>} />
          <Route path="/admin/digital-twin" element={<ProtectedRoute allowedRoles={['hospital_admin', 'super_admin', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}><DigitalTwinPage /></ProtectedRoute>} />
          <Route path="/admin/rl-agent" element={<ProtectedRoute allowedRoles={['hospital_admin', 'super_admin', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}><RLAgentPage /></ProtectedRoute>} />
          <Route path="/admin/graph-intelligence" element={<ProtectedRoute allowedRoles={['hospital_admin', 'super_admin', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}><GraphIntelligencePage /></ProtectedRoute>} />
          
          {/* Doctor Routes */}
          <Route path="/doctor/dashboard" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/doctor/pending-approval" element={<ProtectedRoute allowedRoles={['doctor']}><VerificationPending /></ProtectedRoute>} />
          
          {/* Donor Routes */}
          <Route path="/donor/login" element={<DonorLogin />} />
          <Route path="/donor/change-password" element={<ProtectedRoute allowedRoles={['donor']}><ChangePassword /></ProtectedRoute>} />
          <Route path="/donor/dashboard" element={<ProtectedRoute allowedRoles={['donor']}><DonorDashboardPage /></ProtectedRoute>} />
          <Route path="/donor/history" element={<ProtectedRoute allowedRoles={['donor']}><DonationHistory /></ProtectedRoute>} />
          <Route path="/donor/certificates" element={<ProtectedRoute allowedRoles={['donor']}><Certificates /></ProtectedRoute>} />
          <Route path="/donor/messages" element={<ProtectedRoute allowedRoles={['donor']}><EmergencyMessages /></ProtectedRoute>} />
          
          {/* Public User Routes */}
          <Route path="/public/register" element={<PublicUserRegister />} />
          <Route path="/public/login" element={<PublicUserLogin />} />
          <Route path="/public/verification-pending" element={<PublicVerificationPending />} />
          <Route path="/public/dashboard" element={<ProtectedRoute allowedRoles={['PUBLIC_USER']}><PublicDashboard /></ProtectedRoute>} />
          <Route path="/public/certificates" element={<ProtectedRoute allowedRoles={['PUBLIC_USER']}><MyCertificates /></ProtectedRoute>} />
          
          {/* Community & Hospital Routes (Public Access) */}
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/hospitals" element={<HospitalsPage />} />
          <Route path="/blood-camps" element={<BloodCampsPage />} />
          <Route path="/blood-camps/:id" element={<CampDetailsPage />} />
          <Route path="/organize-camp" element={<OrganizeCampPage />} />
          <Route path="/appointments/book" element={<BookAppointmentPage />} />
          <Route path="/appointments/my-appointments" element={<MyAppointmentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          
          {/* Geolocation Intelligence */}
          <Route path="/geo-intelligence" element={<GeoIntelligence />} />
          
          {/* Alternative signin route for public users */}
          <Route path="/signin/public-user" element={<PublicUserLogin />} />
          
          {/* Super Admin Routes */}
          <Route path="/superadmin/dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/test" element={<ProtectedRoute allowedRoles={['super_admin']}><TestSuperAdmin /></ProtectedRoute>} />
          
          {/* Test Routes */}
          <Route path="/test/hospital" element={<TestHospitalRegistration />} />
          <Route path="/test/superadmin" element={<TestSuperAdminAPI />} />
          
          {/* Emergency Intelligence Routes (Super Admin & Hospital Admin) */}
          <Route path="/emergency-intelligence" element={<EmergencyDashboard />} />
          <Route path="/emergency-intelligence/create" element={<CreateScenario />} />
          <Route path="/emergency-intelligence/scenario/:id" element={<ScenarioDetails />} />
        </Routes>
        <Chatbot />
      </div>
    </Router>
  );
}

export default App;
