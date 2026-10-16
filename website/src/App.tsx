import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { SiteNav } from './components/SiteNav';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <BrowserRouter>
      <SiteNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/signup" element={<Navigate to="/checkout" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
