import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import EmergencyInterCloud from './pages/admin/EmergencyInterCloud';
import DonorManagement from './pages/admin/DonorManagement';
import UrgencyDetails from './pages/admin/UrgencyDetails';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';
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

import './App.css';

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
          <Route path="/auth/hospital" element={<HospitalSignup />} />
          <Route path="/auth/donor" element={<DonorSignin />} />
          <Route path="/verification-pending" element={<VerificationPending />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/approvals" element={<DoctorApprovals />} />
          <Route path="/admin/blood-inventory" element={<BloodInventoryPage />} />
          <Route path="/admin/blood-requests" element={<BloodRequestsPage />} />
          <Route path="/admin/emergency" element={<EmergencyInterCloud />} />
          <Route path="/admin/donors" element={<DonorManagement />} />
          <Route path="/admin/donor-management" element={<DonorManagementCard />} />
          <Route path="/admin/urgency-details" element={<UrgencyDetails />} />
          <Route path="/admin/logs" element={<AuditLogs />} />
          <Route path="/admin/settings" element={<Settings />} />
          
          {/* Doctor Routes */}
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/pending-approval" element={<VerificationPending />} />
          
          {/* Donor Routes */}
          <Route path="/donor/login" element={<DonorLogin />} />
          <Route path="/donor/change-password" element={<ChangePassword />} />
          <Route path="/donor/dashboard" element={<DonorDashboardPage />} />
          <Route path="/donor/history" element={<DonationHistory />} />
          <Route path="/donor/certificates" element={<Certificates />} />
          <Route path="/donor/messages" element={<EmergencyMessages />} />
          
          {/* Public User Routes */}
          <Route path="/public/register" element={<PublicUserRegister />} />
          <Route path="/public/login" element={<PublicUserLogin />} />
          <Route path="/public/verification-pending" element={<PublicVerificationPending />} />
          <Route path="/public/dashboard" element={<PublicDashboard />} />
          <Route path="/public/certificates" element={<MyCertificates />} />
          
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
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/test" element={<TestSuperAdmin />} />
          
          {/* Test Routes */}
          <Route path="/test/hospital" element={<TestHospitalRegistration />} />
          <Route path="/test/superadmin" element={<TestSuperAdminAPI />} />
          
          {/* Emergency Intelligence Routes (Super Admin & Hospital Admin) */}
          <Route path="/emergency-intelligence" element={<EmergencyDashboard />} />
          <Route path="/emergency-intelligence/create" element={<CreateScenario />} />
          <Route path="/emergency-intelligence/scenario/:id" element={<ScenarioDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
