import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { BranchProvider } from './contexts/BranchContext';
import { SuperadminAuthProvider } from './contexts/SuperadminAuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import Settings from './pages/Settings';
import SettingsMain from './pages/settings/SettingsMain';
import ServicesPage from './pages/settings/services/ServicesPage';
import ServiceNewPage from './pages/settings/services/ServiceNewPage';
import ServiceCategoryPage from './pages/settings/services/ServiceCategoryPage';
import ServiceEditPage from './pages/settings/services/ServiceEditPage';
import PositionsPage from './pages/settings/positions/PositionsPage';
import PositionFormPage from './pages/settings/positions/PositionFormPage';
import StaffPage from './pages/settings/staff/StaffPage';
import StaffFormPage from './pages/settings/staff/StaffFormPage';
import EmployeeDetailPage from './pages/employee/EmployeeDetailPage';
import ResourcesPage from './pages/settings/resources/ResourcesPage';
import WorkSchedulePage from './pages/settings/work-schedule/WorkSchedulePage';
import CategoriesPage from './pages/settings/categories/CategoriesPage';
import ClientCategoriesPage from './pages/settings/categories/ClientCategoriesPage';
import AppointmentCategoriesPage from './pages/settings/categories/AppointmentCategoriesPage';
import EventCategoriesPage from './pages/settings/categories/EventCategoriesPage';
import ExpenseCategoriesPage from './pages/settings/categories/ExpenseCategoriesPage';
import LocationSettingsPage from './pages/settings/location-settings/LocationSettingsPage';
import BranchManagementPage from './pages/settings/branches/BranchManagementPage';
import BranchFormPage from './pages/settings/branches/BranchFormPage';
import AppointmentCalendarSettingsPage from './pages/settings/appointment-calendar/AppointmentCalendarSettingsPage';
import WhatsAppSettingsPage from './pages/settings/whatsapp/WhatsAppSettingsPage';
import Profile from './pages/Profile';
import Clients from './pages/Clients';
import ContactsPage from './pages/contacts/ContactsPage';
import ExpenseContactsPage from './pages/contacts/ExpenseContactsPage';
import BookingLinks from './pages/BookingLinks';
import OnlineBooking from './pages/OnlineBooking';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import SetupWizard from './components/SetupWizard/SetupWizard';
import PrivateRoute from './components/PrivateRoute';
import { ClientAuthProvider } from './contexts/ClientAuthContext';
import ClientProtectedRoute from './components/client/ClientProtectedRoute';
import ClientLogin from './pages/client/ClientLogin';
import ClientVerify from './pages/client/ClientVerify';
import ClientDashboard from './pages/client/ClientDashboard';
import ProductsPage from './pages/products/ProductsPage';
import ProductFormPage from './pages/products/ProductFormPage';
import ProductCategoriesPage from './pages/products/ProductCategoriesPage';
import BarcodePrintPage from './pages/products/BarcodePrintPage';
import FinanceAccountsPage from './pages/finance/FinanceAccountsPage';
import FinanceTransactionsPage from './pages/finance/FinanceTransactionsPage';
import TransfersPage from './pages/finance/TransfersPage';
import FinanceReportsPageEnhanced from './pages/finance/FinanceReportsPageEnhanced';
import InvoicesPage from './pages/finance/InvoicesPage';
import InvoiceFormPage from './pages/finance/InvoiceFormPage';
import InvoiceDetailPage from './pages/finance/InvoiceDetailPage';
import InventoryPage from './pages/inventory/InventoryPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import POSPage from './pages/pos/POSPage';
import CashRegisterPage from './pages/register/CashRegisterPage';
import ExpenseManagementPage from './pages/finance/expense/ExpenseManagementPage';
import FinanceExpenseCategoriesPage from './pages/finance/expense/ExpenseCategoriesPage';
import NewExpensePage from './pages/finance/expense/NewExpensePage';
import FinanceOverviewPage from './pages/finance/FinanceOverviewPage';

// Import debug utilities (development only)
if (import.meta.env.DEV) {
  import('./debug/checkAppointment');
  import('./debug/checkBranches');
  import('./debug/checkAppointmentQueries');
  import('./debug/fixBranchData');
  import('./debug/debugBranchIssue');
  import('./debug/checkStaffAssignments');
  import('./debug/checkAppointmentData');
}
import DashboardLayout from './layouts/DashboardLayout';
import SuperadminLayout from './layouts/SuperadminLayout';
import SuperadminLogin from './pages/superadmin/SuperadminLogin';
import SuperadminDashboard from './pages/superadmin/SuperadminDashboard';
import BusinessListPage from './pages/superadmin/BusinessListPage';
import BusinessDetailPage from './pages/superadmin/BusinessDetailPage';
import PricingManagementPage from './pages/superadmin/PricingManagementPage';
import AnnouncementsPage from './pages/superadmin/AnnouncementsPage';
import SuperadminProtectedRoute from './components/superadmin/SuperadminProtectedRoute';
import CreateSuperadminTemp from './components/superadmin/CreateSuperadminTemp';
import PageTransition from './components/PageTransition';
import PublicBookingWrapper from './pages/public/PublicBookingWrapper';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toastify-rtl.css';
import './styles/sidebar.css';
import './styles/rtl-layout.css';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import './utils/clientBranchFix'; // Import for global debugging functions
import './utils/createSuperadminDev'; // Import for superadmin creation in dev
import './utils/fixBookingLinkUrls'; // Import for fixing booking link URLs
import './utils/debugBookingLinks'; // Import for debugging booking links
import './utils/syncStaffBranches'; // Import for syncing staff-branch assignments
import './utils/fixMissingClients'; // Import for fixing missing clients from online booking
import './utils/debugSidebar'; // Import for debugging sidebar menu items

// Make utility functions available globally in development
if (import.meta.env.DEV) {
  import('./utils/createSuperadminDev').then(module => {
    (window as any).createSuperadminDev = module.createSuperadminDev;
    console.log('✅ Superadmin creation tool loaded. Use createSuperadminDev() in console.');
  });
  
  import('./utils/fixBookingLinkUrls').then(module => {
    (window as any).fixBookingLinkUrls = module.fixBookingLinkUrls;
    console.log('✅ Booking link URL fix tool loaded. Use fixBookingLinkUrls() in console.');
  });
  
  import('./utils/debugBookingLinks').then(module => {
    (window as any).debugBookingLinks = module.debugBookingLinks;
    console.log('✅ Booking link debug tool loaded. Use debugBookingLinks(companyId) in console.');
  });
}

// RTL support
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';

// Create rtl cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

function App() {
  const urlHash = import.meta.env.VITE_SUPERADMIN_URL_HASH;
  const superadminBasePath = `/sa-${urlHash}`;

  return (
    <CacheProvider value={cacheRtl}>
      <Router>
        <SuperadminAuthProvider>
          <AuthProvider>
            <ThemeProvider>
              <WebSocketProvider autoConnect={true}>
                <BranchProvider>
                <CssBaseline />
                <SessionTimeoutWarning />
                <Routes>
                  {/* Public Booking Routes - No Auth Required */}
                  <Route path="/book/:companySlug/:linkSlug" element={
                    <PageTransition>
                      <PublicBookingWrapper />
                    </PageTransition>
                  } />
                  
                  {/* Client Portal Routes */}
                  <Route path="/client/login" element={
                    <ClientAuthProvider>
                      <PageTransition>
                        <ClientLogin />
                      </PageTransition>
                    </ClientAuthProvider>
                  } />
                  <Route path="/client/verify" element={
                    <ClientAuthProvider>
                      <PageTransition>
                        <ClientVerify />
                      </PageTransition>
                    </ClientAuthProvider>
                  } />
                  <Route path="/client/dashboard" element={
                    <ClientAuthProvider>
                      <ClientProtectedRoute>
                        <PageTransition>
                          <ClientDashboard />
                        </PageTransition>
                      </ClientProtectedRoute>
                    </ClientAuthProvider>
                  } />
                  <Route path="/client" element={<Navigate to="/client/login" replace />} />
                  {/* Regular Routes */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/login" element={
                    <PageTransition>
                      <Login />
                    </PageTransition>
                  } />
                  <Route path="/signup" element={
                    <PageTransition>
                      <Signup />
                    </PageTransition>
                  } />
                  <Route path="/forgot-password" element={
                    <PageTransition>
                      <ForgotPassword />
                    </PageTransition>
                  } />
                  
                  {/* TEMPORARY - Remove in production */}
                  <Route path="/create-superadmin-temp" element={
                    <PageTransition>
                      <CreateSuperadminTemp />
                    </PageTransition>
                  } />
                  
                  {/* Superadmin Routes */}
                  <Route path={`${superadminBasePath}/login`} element={
                    <PageTransition>
                      <SuperadminLogin />
                    </PageTransition>
                  } />
                  <Route
                    path={`${superadminBasePath}/*`}
                    element={
                      <SuperadminProtectedRoute>
                        <SuperadminLayout />
                      </SuperadminProtectedRoute>
                    }
                  >
                    <Route path="dashboard" element={
                      <PageTransition>
                        <SuperadminDashboard />
                      </PageTransition>
                    } />
                    <Route path="businesses" element={
                      <PageTransition>
                        <BusinessListPage />
                      </PageTransition>
                    } />
                    <Route path="businesses/active" element={
                      <PageTransition>
                        <BusinessListPage />
                      </PageTransition>
                    } />
                    <Route path="businesses/suspended" element={
                      <PageTransition>
                        <BusinessListPage />
                      </PageTransition>
                    } />
                    <Route path="businesses/pending" element={
                      <PageTransition>
                        <BusinessListPage />
                      </PageTransition>
                    } />
                    <Route path="businesses/:businessId" element={
                      <PageTransition>
                        <BusinessDetailPage />
                      </PageTransition>
                    } />
                    <Route path="pricing/plans" element={
                      <PageTransition>
                        <PricingManagementPage />
                      </PageTransition>
                    } />
                    <Route path="pricing/overrides" element={
                      <PageTransition>
                        <PricingManagementPage />
                      </PageTransition>
                    } />
                    <Route path="pricing/addons" element={
                      <PageTransition>
                        <PricingManagementPage />
                      </PageTransition>
                    } />
                    <Route path="pricing/promotions" element={
                      <PageTransition>
                        <PricingManagementPage />
                      </PageTransition>
                    } />
                    <Route path="communications/announcements" element={
                      <PageTransition>
                        <AnnouncementsPage />
                      </PageTransition>
                    } />
                    <Route path="" element={<Navigate to="dashboard" replace />} />
                  </Route>
              <Route
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route path="/dashboard" element={
                  <PageTransition>
                    <Dashboard />
                  </PageTransition>
                } />
                <Route path="/clients" element={
                  <PageTransition>
                    <Clients />
                  </PageTransition>
                } />
                <Route path="/contacts" element={
                  <PageTransition>
                    <ContactsPage />
                  </PageTransition>
                } />
                <Route path="/booking-links" element={
                  <PageTransition>
                    <BookingLinks />
                  </PageTransition>
                } />
                <Route path="/online-booking" element={
                  <PageTransition>
                    <OnlineBooking />
                  </PageTransition>
                } />
                <Route path="/appointments" element={
                  <PageTransition>
                    <AppointmentsPage />
                  </PageTransition>
                } />
                <Route path="/analytics" element={
                  <PageTransition>
                    <AnalyticsPage />
                  </PageTransition>
                } />
                <Route path="/projects" element={
                  <PageTransition>
                    <div>Projects Page - Coming Soon</div>
                  </PageTransition>
                } />
                <Route path="/inventory" element={
                  <PageTransition>
                    <InventoryPage />
                  </PageTransition>
                } />
                <Route path="/products" element={
                  <PageTransition>
                    <ProductsPage />
                  </PageTransition>
                } />
                <Route path="/products/new" element={
                  <PageTransition>
                    <ProductFormPage />
                  </PageTransition>
                } />
                <Route path="/products/:productId/edit" element={
                  <PageTransition>
                    <ProductFormPage />
                  </PageTransition>
                } />
                <Route path="/products/categories" element={
                  <PageTransition>
                    <ProductCategoriesPage />
                  </PageTransition>
                } />
                <Route path="/products/barcode-printing" element={
                  <PageTransition>
                    <BarcodePrintPage />
                  </PageTransition>
                } />
                <Route path="/finance" element={
                  <PageTransition>
                    <FinanceOverviewPage />
                  </PageTransition>
                } />
                <Route path="/finance/accounts" element={
                  <PageTransition>
                    <FinanceAccountsPage />
                  </PageTransition>
                } />
                <Route path="/finance/transactions" element={
                  <PageTransition>
                    <FinanceTransactionsPage />
                  </PageTransition>
                } />
                <Route path="/finance/transfers" element={
                  <PageTransition>
                    <TransfersPage />
                  </PageTransition>
                } />
                <Route path="/finance/pos" element={
                  <PageTransition>
                    <POSPage />
                  </PageTransition>
                } />
                
                {/* Cash Register */}
                <Route path="/register" element={
                  <PageTransition>
                    <CashRegisterPage />
                  </PageTransition>
                } />
                
                <Route path="/finance/reports" element={
                  <PageTransition>
                    <FinanceReportsPageEnhanced />
                  </PageTransition>
                } />
                <Route path="/finance/cash-register" element={
                  <PageTransition>
                    <CashRegisterPage />
                  </PageTransition>
                } />
                <Route path="/finance/expenses" element={
                  <PageTransition>
                    <ExpenseManagementPage />
                  </PageTransition>
                } />
                <Route path="/finance/expense/categories" element={
                  <PageTransition>
                    <FinanceExpenseCategoriesPage />
                  </PageTransition>
                } />
                <Route path="/finance/expense/new" element={
                  <PageTransition>
                    <NewExpensePage />
                  </PageTransition>
                } />
                <Route path="/finance/expense/contacts" element={
                  <PageTransition>
                    <ExpenseContactsPage />
                  </PageTransition>
                } />
                <Route path="/finance/invoices" element={
                  <PageTransition>
                    <InvoicesPage />
                  </PageTransition>
                } />
                <Route path="/finance/invoices/new" element={
                  <PageTransition>
                    <InvoiceFormPage />
                  </PageTransition>
                } />
                <Route path="/finance/invoices/:invoiceId/edit" element={
                  <PageTransition>
                    <InvoiceFormPage />
                  </PageTransition>
                } />
                <Route path="/finance/invoices/:invoiceId" element={
                  <PageTransition>
                    <InvoiceDetailPage />
                  </PageTransition>
                } />
                <Route path="/settings" element={
                  <PageTransition>
                    <SettingsMain />
                  </PageTransition>
                } />
                <Route path="/settings/company" element={
                  <PageTransition>
                    <Settings />
                  </PageTransition>
                } />
                <Route path="/settings/services" element={
                  <PageTransition>
                    <ServicesPage />
                  </PageTransition>
                } />
                <Route path="/settings/services/new" element={
                  <PageTransition>
                    <ServiceNewPage />
                  </PageTransition>
                } />
                <Route path="/settings/services/category/:categoryId" element={
                  <PageTransition>
                    <ServiceCategoryPage />
                  </PageTransition>
                } />
                <Route path="/settings/services/edit/:serviceId" element={
                  <PageTransition>
                    <ServiceEditPage />
                  </PageTransition>
                } />
                <Route path="/settings/positions" element={
                  <PageTransition>
                    <PositionsPage />
                  </PageTransition>
                } />
                <Route path="/settings/positions/new" element={
                  <PageTransition>
                    <PositionFormPage />
                  </PageTransition>
                } />
                <Route path="/settings/positions/edit/:positionId" element={
                  <PageTransition>
                    <PositionFormPage />
                  </PageTransition>
                } />
                <Route path="/settings/staff" element={
                  <PageTransition>
                    <StaffPage />
                  </PageTransition>
                } />
                <Route path="/settings/staff/new" element={
                  <PageTransition>
                    <StaffFormPage />
                  </PageTransition>
                } />
                <Route path="/settings/staff/edit/:staffId" element={
                  <PageTransition>
                    <StaffFormPage />
                  </PageTransition>
                } />
                <Route path="/employee/:employeeId" element={
                  <PageTransition>
                    <EmployeeDetailPage />
                  </PageTransition>
                } />
                <Route path="/settings/resources" element={
                  <PageTransition>
                    <ResourcesPage />
                  </PageTransition>
                } />
                <Route path="/settings/work-schedule" element={
                  <PageTransition>
                    <WorkSchedulePage />
                  </PageTransition>
                } />
                <Route path="/settings/categories" element={
                  <PageTransition>
                    <CategoriesPage />
                  </PageTransition>
                } />
                <Route path="/settings/categories/clients" element={
                  <PageTransition>
                    <ClientCategoriesPage />
                  </PageTransition>
                } />
                <Route path="/settings/categories/appointments" element={
                  <PageTransition>
                    <AppointmentCategoriesPage />
                  </PageTransition>
                } />
                <Route path="/settings/categories/events" element={
                  <PageTransition>
                    <EventCategoriesPage />
                  </PageTransition>
                } />
                <Route path="/settings/categories/expenses" element={
                  <PageTransition>
                    <ExpenseCategoriesPage />
                  </PageTransition>
                } />
                <Route path="/settings/location-settings" element={
                  <PageTransition>
                    <LocationSettingsPage />
                  </PageTransition>
                } />
                <Route path="/settings/branches" element={
                  <PageTransition>
                    <BranchManagementPage />
                  </PageTransition>
                } />
                <Route path="/settings/branches/new" element={
                  <PageTransition>
                    <BranchFormPage />
                  </PageTransition>
                } />
                <Route path="/settings/branches/:branchId/edit" element={
                  <PageTransition>
                    <BranchFormPage />
                  </PageTransition>
                } />
                <Route path="/settings/appointment-calendar" element={
                  <PageTransition>
                    <AppointmentCalendarSettingsPage />
                  </PageTransition>
                } />
                <Route path="/settings/whatsapp" element={
                  <PageTransition>
                    <WhatsAppSettingsPage />
                  </PageTransition>
                } />
                <Route path="/employee/:employeeId/schedule" element={
                  <PageTransition>
                    <EmployeeDetailPage />
                  </PageTransition>
                } />
                <Route path="/profile" element={
                  <PageTransition>
                    <Profile />
                  </PageTransition>
                } />
              </Route>
              <Route path="/landing" element={
                <PageTransition>
                  <LandingPage />
                </PageTransition>
              } />
              <Route path="/setup" element={
                <PrivateRoute>
                  <PageTransition>
                    <SetupWizard />
                  </PageTransition>
                </PrivateRoute>
              } />
                </Routes>
                <ToastContainer
                  position="top-center"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  rtl
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="colored"
                  style={{
                    fontFamily: 'Tajawal, sans-serif',
                  }}
                />
                </BranchProvider>
              </WebSocketProvider>
            </ThemeProvider>
          </AuthProvider>
        </SuperadminAuthProvider>
      </Router>
    </CacheProvider>
  );
}

export default App;