import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { DataProvider } from './components/DataProvider';
import { Layout } from './components/Layout';
import { useProfileStore } from './stores/profile';
import { Home } from './pages/Home';
import { Collection } from './pages/Collection';
import { Matches } from './pages/Matches';
import { BeyDetail } from './pages/BeyDetail';
import { PartsDatabase } from './pages/PartsDatabase';
import { PartDetail } from './pages/PartDetail';
import { Builder } from './pages/Builder';
import { Builds } from './pages/Builds';
import { Simulator } from './pages/Simulator';
import { Profile } from './pages/Profile';
import { Import } from './pages/Import';
import { View } from './pages/View';

function App() {
  useEffect(() => {
    void useProfileStore.getState().init();
  }, []);

  return (
    <BrowserRouter>
      <DataProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/beys/:id" element={<BeyDetail />} />
            <Route path="/parts" element={<PartsDatabase />} />
            <Route path="/parts/:category/:id" element={<PartDetail />} />
            <Route path="/builder" element={<Builder />} />
            <Route path="/builds" element={<Builds />} />
            <Route path="/configurator" element={<Navigate to="/builder" replace />} />
            <Route path="/deck" element={<Navigate to="/builder?tab=deck" replace />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/import" element={<Import />} />
            <Route path="/view/:compressed" element={<View />} />
          </Routes>
        </Layout>
      </DataProvider>
    </BrowserRouter>
  );
}

export default App;
