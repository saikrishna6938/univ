import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Programs from './pages/Programs';
import Apply from './pages/Apply';
import FindCourse from './pages/FindCourse';
import StudentDashboard from './pages/StudentDashboard';
import LoginPage from './pages/LoginPage';
import ScholarshipBlogPage from './pages/ScholarshipBlogPage';
import StudyGuideBlogPage from './pages/StudyGuideBlogPage';
import ExamBlogPage from './pages/ExamBlogPage';
import AdminLayout from './layouts/AdminLayout';
import { AdminAuthProvider, useAdminAuth } from './layouts/AdminAuthContext';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProgramsPage from './pages/admin/AdminProgramsPage';
import AdminTasksPage from './pages/admin/AdminTasksPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminFeaturedUniversitiesPage from './pages/admin/AdminFeaturedUniversitiesPage';
import AdminEventsPage from './pages/admin/AdminEventsPage';
import AdminScholarshipsPage from './pages/admin/AdminScholarshipsPage';
import AdminStudyGuidesPage from './pages/admin/AdminStudyGuidesPage';
import AdminExamsPage from './pages/admin/AdminExamsPage';
import type { ReactElement } from 'react';
import './App.css';

function AdminOnly({ children }: { children: ReactElement }) {
  const { adminUser } = useAdminAuth();
  if (!adminUser) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function AdminGuestOnly({ children }: { children: ReactElement }) {
  const { adminUser } = useAdminAuth();
  if (adminUser) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

function RoleAllowed({
  roles,
  children
}: {
  roles: Array<'admin' | 'manager' | 'employee'>;
  children: ReactElement;
}) {
  const { adminUser } = useAdminAuth();
  if (!adminUser || !roles.includes(adminUser.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route
          path="/admin/login"
          element={
            <AdminGuestOnly>
              <AdminLoginPage />
            </AdminGuestOnly>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminOnly>
              <AdminLayout />
            </AdminOnly>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route
            path="programs"
            element={
              <RoleAllowed roles={['admin', 'manager', 'employee']}>
                <AdminProgramsPage />
              </RoleAllowed>
            }
          />
          <Route
            path="featured-universities"
            element={
              <RoleAllowed roles={['admin', 'manager']}>
                <AdminFeaturedUniversitiesPage />
              </RoleAllowed>
            }
          />
          <Route
            path="events"
            element={
              <RoleAllowed roles={['admin', 'manager']}>
                <AdminEventsPage />
              </RoleAllowed>
            }
          />
          <Route
            path="scholarships"
            element={
              <RoleAllowed roles={['admin', 'manager', 'employee']}>
                <AdminScholarshipsPage />
              </RoleAllowed>
            }
          />
          <Route
            path="study-guides"
            element={
              <RoleAllowed roles={['admin', 'manager', 'employee']}>
                <AdminStudyGuidesPage />
              </RoleAllowed>
            }
          />
          <Route
            path="exams"
            element={
              <RoleAllowed roles={['admin', 'manager', 'employee']}>
                <AdminExamsPage />
              </RoleAllowed>
            }
          />
          <Route
            path="users"
            element={
              <RoleAllowed roles={['admin', 'manager', 'employee']}>
                <AdminUsersPage />
              </RoleAllowed>
            }
          />
          <Route
            path="tasks"
            element={
              <RoleAllowed roles={['employee']}>
                <AdminTasksPage />
              </RoleAllowed>
            }
          />
        </Route>

        <Route
          path="/"
          element={
            <MainLayout>
              <Home />
            </MainLayout>
          }
        />
        <Route
          path="/programs"
          element={
            <MainLayout>
              <Programs />
            </MainLayout>
          }
        />
        <Route
          path="/apply"
          element={
            <MainLayout>
              <Apply />
            </MainLayout>
          }
        />
        <Route
          path="/find-course"
          element={
            <MainLayout>
              <FindCourse />
            </MainLayout>
          }
        />
        <Route
          path="/login"
          element={
            <MainLayout>
              <LoginPage />
            </MainLayout>
          }
        />
        <Route
          path="/student/dashboard"
          element={
            <MainLayout>
              <StudentDashboard />
            </MainLayout>
          }
        />
        <Route
          path="/scholarships/:id"
          element={
            <MainLayout>
              <ScholarshipBlogPage />
            </MainLayout>
          }
        />
        <Route
          path="/study-guides/:id"
          element={
            <MainLayout>
              <StudyGuideBlogPage />
            </MainLayout>
          }
        />
        <Route
          path="/exams/:id"
          element={
            <MainLayout>
              <ExamBlogPage />
            </MainLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}

export default App;
