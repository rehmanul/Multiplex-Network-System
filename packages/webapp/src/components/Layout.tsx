/**
 * Multiplex Network - Layout Component
 */

import { Outlet, NavLink } from 'react-router-dom';

export function Layout() {
    return (
        <div className="app-layout">
            <aside className="app-sidebar">
                <div className="nav-header">
                    <div className="nav-logo">Multiplex Network</div>
                </div>

                <nav className="nav-links">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <DashboardIcon />
                        Dashboard
                    </NavLink>
                    <NavLink to="/network" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <NetworkIcon />
                        Network Explorer
                    </NavLink>
                    <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <AnalyticsIcon />
                        Analytics
                    </NavLink>
                    <NavLink to="/paths" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <PathIcon />
                        Path Finder
                    </NavLink>
                    <NavLink to="/scraper" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <ScraperIcon />
                        Bill Scraper
                    </NavLink>
                </nav>
            </aside>

            <main className="app-main">
                <Outlet />
            </main>
        </div>
    );
}

function DashboardIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}

function NetworkIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <circle cx="19" cy="5" r="2" />
            <circle cx="5" cy="5" r="2" />
            <circle cx="19" cy="19" r="2" />
            <circle cx="5" cy="19" r="2" />
            <line x1="12" y1="9" x2="12" y2="5" />
            <line x1="14.5" y1="13.5" x2="17" y2="17" />
            <line x1="9.5" y1="13.5" x2="7" y2="17" />
        </svg>
    );
}

function AnalyticsIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

function PathIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h4l3-9 4 18 3-9h4" />
        </svg>
    );
}

function ScraperIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    );
}

