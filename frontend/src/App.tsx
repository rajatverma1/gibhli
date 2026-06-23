import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Step1Page } from './pages/Step1Page';
import { Step2Page } from './pages/Step2Page';
import { Step3Page } from './pages/Step3Page';
import { Step4Page } from './pages/Step4Page';
import { Step5Page } from './pages/Step5Page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="lc/:id/step/1" element={<Step1Page />} />
          <Route path="lc/:id/step/2" element={<Step2Page />} />
          <Route path="lc/:id/step/3" element={<Step3Page />} />
          <Route path="lc/:id/step/4" element={<Step4Page />} />
          <Route path="lc/:id/step/5" element={<Step5Page />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
