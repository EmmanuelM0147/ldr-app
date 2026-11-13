import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import {
  CalendarPage,
  CheckInsPage,
  ForgotPasswordPage,
  HomePage,
  LoginPage,
  MemoriesPage,
  NotificationsPage,
  RegisterPage,
  RequireAuth,
  ResetPasswordPage,
  SettingsPage,
  Shell,
  VisitsPage,
} from "./pages"
import { useSession } from "./session"

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route element={<RequireCouple />}>
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/visits" element={<VisitsPage />} />
            <Route path="/check-ins" element={<CheckInsPage />} />
            <Route path="/memories" element={<MemoriesPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

function RequireCouple() {
  const { couple, ready } = useSession()
  if (!ready) return null
  if (!couple) return <Navigate to="/" replace />
  return <Outlet />
}
