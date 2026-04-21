import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './modules/auth/LoginPage';
import SuperAdminDashboard from './modules/superadmin/SuperAdminDashboard';
import Overview from './modules/shared/Overview';
import TeacherManagement from './modules/collegeadmin/TeacherManagement';
import InstructorManagement from './modules/collegeadmin/InstructorManagement';
import DivisionManagementPage from './modules/instructor/DivisionManagementPage';
import WorkshopHubPage from './modules/collegeadmin/WorkshopHubPage';
import LiveWorkshopSessionPage from './modules/instructor/LiveWorkshopSessionPage';
import StudentRegistrationPage from './modules/student/StudentRegistrationPage';
import AttendanceCheckinPage from './modules/student/AttendanceCheckinPage';
import StudentDashboard from './modules/student/StudentDashboard';
import StudentProgressPage from './modules/student/StudentProgressPage';
import ProtectedRoute from './components/ProtectedRoute';
import AssignmentSubmissionPage from './modules/student/AssignmentSubmissionPage';
import { ThemeProvider } from './components/ThemeProvider';
import InstructorWorkshopConfig from './modules/instructor/InstructorWorkshopConfig';
import TeacherDivisionHub from './modules/teacher/TeacherDivisionHub';
import TeacherRegistry from './modules/teacher/TeacherRegistry';
import TeacherClassroom from './modules/teacher/TeacherClassroom';
import MediaFeedPage from './modules/media/MediaFeedPage';
import LearningCenterPage from './modules/learning/LearningCenterPage';
import InstructorPortal from './modules/instructor/InstructorPortal';
import InstructorWorkshopManage from './modules/instructor/InstructorWorkshopManage';
import InstructorSessionMaterials from './modules/instructor/InstructorSessionMaterials';
import AssignmentManagement from './modules/teacher/AssignmentManagement';
import DashboardLayout from './components/layouts/DashboardLayout';
import ForumHubPage from './modules/forum/ForumHubPage';
import ProjectLanding from './modules/sandbox/ProjectLanding';
import ProjectEditor from './modules/sandbox/ProjectEditor';
import ExpiredPage from './modules/shared/ExpiredPage';
import NaacReportManager from './modules/naac/NaacReportManager';
import CollegeNaacReports from './modules/naac/CollegeNaacReports';
import GlobalRules from './modules/shared/GlobalRules';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/check-in/:id" element={<AttendanceCheckinPage />} />
          <Route path="/submit/:id" element={<AssignmentSubmissionPage />} />
          <Route path="/expired" element={<ExpiredPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Standalone Fullscreen Sandbox */}
          <Route path="/sandbox/fullscreen/:id" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR', 'STUDENT']}>
              <ProjectEditor isFullscreen={true} />
            </ProtectedRoute>
          } />

          {/* Persistent Layout Wrapper */}
          <Route element={
            <ProtectedRoute>
              <DashboardLayout>
                <Outlet />
              </DashboardLayout>
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR']}>
                <Overview />
              </ProtectedRoute>
            } />

            <Route path="/colleges" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/instructors" element={
              <ProtectedRoute allowedRoles={['COLLEGE_ADMIN']}>
                <InstructorManagement />
              </ProtectedRoute>
            } />

            <Route path="/teachers" element={
              <ProtectedRoute allowedRoles={['COLLEGE_ADMIN', 'INSTRUCTOR']}>
                <TeacherManagement />
              </ProtectedRoute>
            } />

            <Route path="/divisions" element={
              <ProtectedRoute allowedRoles={['COLLEGE_ADMIN', 'INSTRUCTOR']}>
                <DivisionManagementPage />
              </ProtectedRoute>
            } />

            <Route path="/workshops" element={
              <ProtectedRoute allowedRoles={['COLLEGE_ADMIN', 'INSTRUCTOR']}>
                <WorkshopHubPage />
              </ProtectedRoute>
            } />

            <Route path="/workshops/:id/configure" element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <InstructorWorkshopConfig />
              </ProtectedRoute>
            } />

            <Route path="/media-feed" element={
              <ProtectedRoute allowedRoles={['TEACHER', 'INSTRUCTOR', 'STUDENT']}>
                <MediaFeedPage />
              </ProtectedRoute>
            } />

            <Route path="/forum" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR', 'STUDENT']}>
                <ForumHubPage />
              </ProtectedRoute>
            } />

            <Route path="/learning-center" element={
              <ProtectedRoute allowedRoles={['TEACHER', 'INSTRUCTOR', 'STUDENT']}>
                <LearningCenterPage />
              </ProtectedRoute>
            } />

            <Route path="/teacher/divisions" element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherDivisionHub />
              </ProtectedRoute>
            } />

            <Route path="/teacher/divisions/:id/registry" element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherRegistry />
              </ProtectedRoute>
            } />

            <Route path="/teacher/divisions/:id/classroom" element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherClassroom />
              </ProtectedRoute>
            } />

            <Route path="/teacher/assignments/:id" element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <AssignmentManagement />
              </ProtectedRoute>
            } />

            {/* Instructor Routes */}
            <Route path="/instructor/portal" element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <InstructorPortal />
              </ProtectedRoute>
            } />

            <Route path="/instructor/workshop/:id/manage" element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <InstructorWorkshopManage />
              </ProtectedRoute>
            } />

            <Route path="/instructor/workshop/:workshopId/session/:sessionId/materials" element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <InstructorSessionMaterials />
              </ProtectedRoute>
            } />

            <Route path="/workshops/:id/live" element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR', 'TEACHER']}>
                <LiveWorkshopSessionPage />
              </ProtectedRoute>
            } />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />

            <Route path="/student/progress" element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentProgressPage />
              </ProtectedRoute>
            } />

            <Route path="/sandbox" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR', 'STUDENT']}>
                <ProjectLanding />
              </ProtectedRoute>
            } />

            <Route path="/sandbox/projects/:id" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR', 'STUDENT']}>
                <ProjectEditor />
              </ProtectedRoute>
            } />


            <Route path="/dashboard/settings" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_ADMIN']}>
                <GlobalRules />
              </ProtectedRoute>
            } />

            {/* NAAC Reports — both SA and CA can generate */}
            <Route path="/naac-reports" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_ADMIN']}>
                <NaacReportManager />
              </ProtectedRoute>
            } />

            <Route path="/naac-reports/view" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_ADMIN']}>
                <CollegeNaacReports />
              </ProtectedRoute>
            } />

          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
