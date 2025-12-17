import Layout from "./Layout.jsx";

import Upload from "./Upload";

import Dashboard from "./Dashboard";

import Pricing from "./Pricing";

import PDFEditor from "./PDFEditor";

import Privacy from "./Privacy";

import Disclaimer from "./Disclaimer";

import FilenameCleaner from "./FilenameCleaner";

import AdminDashboard from "./AdminDashboard";

import ActivityDashboard from "./ActivityDashboard";

import DownloadCode from "./DownloadCode";

import StripeSuccess from "./StripeSuccess";

import AgenticAI from "./AgenticAI";

import FileToPPT from "./FileToPPT";

import DataModelCreator from "./DataModelCreator";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Upload: Upload,
    
    Dashboard: Dashboard,
    
    Pricing: Pricing,
    
    PDFEditor: PDFEditor,
    
    Privacy: Privacy,
    
    Disclaimer: Disclaimer,
    
    FilenameCleaner: FilenameCleaner,
    
    AdminDashboard: AdminDashboard,
    
    ActivityDashboard: ActivityDashboard,
    
    DownloadCode: DownloadCode,
    
    StripeSuccess: StripeSuccess,
    
    AgenticAI: AgenticAI,

    FileToPPT: FileToPPT,

    DataModelCreator: DataModelCreator,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Upload />} />
                
                
                <Route path="/Upload" element={<Upload />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Pricing" element={<Pricing />} />
                
                <Route path="/PDFEditor" element={<PDFEditor />} />
                
                <Route path="/Privacy" element={<Privacy />} />
                
                <Route path="/Disclaimer" element={<Disclaimer />} />
                
                <Route path="/FilenameCleaner" element={<FilenameCleaner />} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/ActivityDashboard" element={<ActivityDashboard />} />
                
                <Route path="/DownloadCode" element={<DownloadCode />} />
                
                <Route path="/StripeSuccess" element={<StripeSuccess />} />
                
                <Route path="/AgenticAI" element={<AgenticAI />} />

                <Route path="/FileToPPT" element={<FileToPPT />} />

                <Route path="/DataModelCreator" element={<DataModelCreator />} />

            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}