/**
 * Multiplex Network - Scraper Page
 */

import { useState } from 'react';

interface Bill {
    billNumber: string;
    url: string;
    congress: string;
    title: string;
    sponsor: string;
    latestAction: string;
    publicLaw: string;
}

const API_KEY = 'quJAfK3p2m3Lc3fs77oQJA6RvW21RiQhzY6b310E';

export function Scraper() {
    const [apiKey, setApiKey] = useState(API_KEY);
    const [bills, setBills] = useState<Bill[]>([]);
    const [allLinks, setAllLinks] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => parseCSV(e.target?.result as string);
        reader.readAsText(file);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim());
        const parsed: Bill[] = [];

        for (let i = 4; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const matches = line.match(/("([^"]*)"|[^,]+)/g);
            if (!matches || matches.length < 4) continue;

            const clean = (s: string) => s ? s.replace(/^"|"$/g, '').trim() : '';
            const billNumber = clean(matches[0]);
            const url = clean(matches[1]);
            const congress = clean(matches[2]);
            const title = clean(matches[3]);
            const sponsor = clean(matches[4] || '');
            const latestAction = clean(matches[7] || '');
            const publicLawMatch = latestAction.match(/Public Law No: (\d+-\d+)/);
            const publicLaw = publicLawMatch ? publicLawMatch[1] : '';

            if (billNumber && url) {
                parsed.push({ billNumber, url, congress, title, sponsor, latestAction, publicLaw });
            }
        }

        generateLinks(parsed);
        setBills(parsed);
    };

    const generateLinks = (bills: Bill[]) => {
        const baseApi = 'https://api.congress.gov/v3';
        const typeMap: Record<string, string> = {
            'H.R.': 'hr', 'S.': 's', 'H.J.Res.': 'hjres', 'S.J.Res.': 'sjres',
            'H.Con.Res.': 'hconres', 'S.Con.Res.': 'sconres', 'H.Res.': 'hres', 'S.Res.': 'sres'
        };

        const links: string[] = [];

        bills.forEach(bill => {
            const match = bill.billNumber.match(/^([A-Z.]+)\s*(\d+)/i);
            if (!match) return;

            const billType = typeMap[match[1]] || match[1].toLowerCase().replace('.', '');
            const billNum = match[2];
            const congress = '119';

            links.push(`# ${bill.billNumber}`);
            links.push(`${baseApi}/bill/${congress}/${billType}/${billNum}?api_key=${apiKey}`);
            links.push(`${baseApi}/bill/${congress}/${billType}/${billNum}/text?api_key=${apiKey}`);
            links.push(`${baseApi}/bill/${congress}/${billType}/${billNum}/actions?api_key=${apiKey}`);
            links.push(`${baseApi}/bill/${congress}/${billType}/${billNum}/cosponsors?api_key=${apiKey}`);
            links.push(`${baseApi}/bill/${congress}/${billType}/${billNum}/subjects?api_key=${apiKey}`);
            links.push('');
        });

        setAllLinks(links);
    };

    const copyAllLinks = () => {
        navigator.clipboard.writeText(allLinks.join('\n'));
        alert('All links copied to clipboard!');
    };

    return (
        <div className="scraper-page">
            <header className="page-header">
                <h1>🏛️ Congress Bill Scraper</h1>
                <p>Upload Congress.gov CSV export to generate API links for data extraction</p>
            </header>

            <div className="panel" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Congress.gov API Key</label>
                <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-bg-tertiary)',
                        borderRadius: 8,
                        color: 'var(--color-text-primary)',
                        fontSize: 14,
                        marginTop: 8
                    }}
                />
            </div>

            <div
                className={`panel dropzone ${dragOver ? 'dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => document.getElementById('fileInput')?.click()}
                style={{
                    border: '2px dashed var(--color-bg-tertiary)',
                    padding: 48,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderColor: dragOver ? 'var(--color-accent)' : undefined,
                    background: dragOver ? 'rgba(59, 130, 246, 0.1)' : undefined
                }}
            >
                <h3>📁 Drop CSV File Here</h3>
                <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>or click to select file</p>
                <input
                    type="file"
                    id="fileInput"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
            </div>

            {bills.length > 0 && (
                <>
                    <div className="metrics-grid" style={{ marginTop: 24 }}>
                        <div className="metric-card">
                            <div className="metric-card-title">Bills Found</div>
                            <div className="metric-card-value">{bills.length}</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-card-title">Public Laws</div>
                            <div className="metric-card-value">{bills.filter(b => b.publicLaw).length}</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-card-title">House Bills</div>
                            <div className="metric-card-value">{bills.filter(b => b.billNumber.startsWith('H.')).length}</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-card-title">Senate Bills</div>
                            <div className="metric-card-value">{bills.filter(b => b.billNumber.startsWith('S.')).length}</div>
                        </div>
                    </div>

                    <div className="panel" style={{ marginTop: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2>📋 All API Links</h2>
                            <button className="btn btn-primary" onClick={copyAllLinks}>Copy All Links</button>
                        </div>
                        <div style={{
                            background: 'var(--color-bg-primary)',
                            border: '1px solid var(--color-bg-tertiary)',
                            borderRadius: 8,
                            padding: 16,
                            fontFamily: 'monospace',
                            fontSize: 11,
                            maxHeight: 300,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        }}>
                            {allLinks.join('\n')}
                        </div>
                    </div>

                    <div className="panel" style={{ marginTop: 24 }}>
                        <h2>Bills</h2>
                        {bills.map((bill, i) => (
                            <div key={i} style={{
                                background: 'var(--color-bg-primary)',
                                borderRadius: 8,
                                padding: 16,
                                marginTop: 12
                            }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                                    {bill.billNumber} {bill.publicLaw && <span style={{ color: 'var(--color-success)' }}>✓ Public Law {bill.publicLaw}</span>}
                                </div>
                                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>{bill.title}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                    <a href={bill.url} target="_blank" rel="noopener" className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                                        🌐 Congress.gov
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <style>{`
        .scraper-page { max-width: 1200px; margin: 0 auto; }
        .page-header { margin-bottom: 24px; }
        .page-header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .page-header p { color: var(--color-text-secondary); }
      `}</style>
        </div>
    );
}
