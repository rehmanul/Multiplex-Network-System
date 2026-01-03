/**
 * Multiplex Network System - Main App Component
 */

import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { NetworkExplorer } from './pages/NetworkExplorer';
import { Analytics } from './pages/Analytics';
import { PathFinder } from './pages/PathFinder';
import { Scraper } from './pages/Scraper';

export function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="network" element={<NetworkExplorer />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="paths" element={<PathFinder />} />
                <Route path="scraper" element={<Scraper />} />
            </Route>
        </Routes>
    );
}
