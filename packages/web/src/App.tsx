import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Programs from './pages/Programs';
import Apply from './pages/Apply';
import FindCourse from './pages/FindCourse';
import './App.css';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/find-course" element={<FindCourse />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
