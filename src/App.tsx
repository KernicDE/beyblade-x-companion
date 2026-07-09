import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './components/DataProvider';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { BeyDatabase } from './pages/BeyDatabase';
import { BeyDetail } from './pages/BeyDetail';
import { PartsDatabase } from './pages/PartsDatabase';
import { PartDetail } from './pages/PartDetail';
import { Configurator } from './pages/Configurator';
import { Profile } from './pages/Profile';
import { Import } from './pages/Import';
import { View } from './pages/View';

function App() {
  return (
    <HashRouter>
      <DataProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/beys" element={<BeyDatabase />} />
            <Route path="/beys/:id" element={<BeyDetail />} />
            <Route path="/parts" element={<PartsDatabase />} />
            <Route path="/parts/:category/:id" element={<PartDetail />} />
            <Route path="/configurator" element={<Configurator />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/import" element={<Import />} />
            <Route path="/view/:compressed" element={<View />} />
          </Routes>
        </Layout>
      </DataProvider>
    </HashRouter>
  );
}

export default App;
