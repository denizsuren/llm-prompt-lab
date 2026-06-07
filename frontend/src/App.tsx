import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ExperimentsPage from './pages/ExperimentsPage';
import ExperimentDetailPage from './pages/ExperimentDetailPage';
import RunsPage from './pages/RunsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ExperimentsPage />} />
        <Route path="experiments/:id" element={<ExperimentDetailPage />} />
        <Route path="runs" element={<RunsPage />} />
      </Route>
    </Routes>
  );
}
