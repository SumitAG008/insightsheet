import Layout from "./Layout.jsx";

import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import VerifyEmail from "./VerifyEmail";

import Upload from "./Upload";

import Dashboard from "./Dashboard";

import Landing from "./Landing";
import Pricing from "./Pricing";

import PDFEditor from "./PDFEditor";

import Privacy from "./Privacy";

import Security from "./Security";

import Disclaimer from "./Disclaimer";

import FilenameCleaner from "./FilenameCleaner";

import AdminDashboard from "./AdminDashboard";

import ActivityDashboard from "./ActivityDashboard";

import DownloadCode from "./DownloadCode";

import StripeSuccess from "./StripeSuccess";

import AgenticAI from "./AgenticAI";

import FileToPPT from "./FileToPPT";
import OCRConverter from "./OCRConverter";
import PdfDocConverter from "./PdfDocConverter";

import DataModelCreator from "./DataModelCreator";

import PLBuilder from "./PLBuilder";

import FileAnalyzer from "./FileAnalyzer";
import Reviews from "./Reviews";
import DatabaseConnection from "./DatabaseConnection";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';

const PAGES = {
    
    Upload: Upload,
    
    Dashboard: Dashboard,
    
    Pricing: Pricing,
    
    PDFEditor: PDFEditor,
    
    Privacy: Privacy,

    Security: Security,

    Disclaimer: Disclaimer,
    
    FilenameCleaner: FilenameCleaner,
    
    AdminDashboard: AdminDashboard,
    
    ActivityDashboard: ActivityDashboard,
    
    DownloadCode: DownloadCode,
    
    StripeSuccess: StripeSuccess,
    
    AgenticAI: AgenticAI,

    FileToPPT: FileToPPT,
    OCRConverter: OCRConverter,
    PdfDocConverter: PdfDocConverter,

    DataModelCreator: DataModelCreator,

    PLBuilder: PLBuilder,

    FileAnalyzer: FileAnalyzer,

    Reviews: Reviews,

    DatabaseConnection: DatabaseConnection,

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

    // Routes without layout (Landing, Pricing, Login/Register/ForgotPassword/ResetPassword/VerifyEmail)
    const noLayoutRoutes = ['/', '/pricing', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
    const isNoLayoutRoute = noLayoutRoutes.some(route => {
        const path = location.pathname.toLowerCase();
        const routeLower = route.toLowerCase();
        // Exact match or starts with route (but not /dashboard which starts with /)
        return path === routeLower || (routeLower !== '/' && path.startsWith(routeLower + '/'));
    });

    if (isNoLayoutRoute) {
        return (
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/Pricing" element={<Pricing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
            </Routes>
        );
    }

    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                {/* Public routes - no auth required */}
                <Route path="/Privacy" element={<Privacy />} />
                <Route path="/privacy" element={<Privacy />} />

                <Route path="/Security" element={<Security />} />
                <Route path="/security" element={<Security />} />

                <Route path="/Disclaimer" element={<Disclaimer />} />
                <Route path="/disclaimer" element={<Disclaimer />} />

                {/* Protected routes - require authentication */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/Dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                <Route path="/PDFEditor" element={<ProtectedRoute><PDFEditor /></ProtectedRoute>} />
                <Route path="/pdfeditor" element={<ProtectedRoute><PDFEditor /></ProtectedRoute>} />

                <Route path="/FilenameCleaner" element={<ProtectedRoute><FilenameCleaner /></ProtectedRoute>} />
                <Route path="/filenamecleaner" element={<ProtectedRoute><FilenameCleaner /></ProtectedRoute>} />

                <Route path="/AdminDashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admindashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

                <Route path="/ActivityDashboard" element={<ProtectedRoute><ActivityDashboard /></ProtectedRoute>} />
                <Route path="/activitydashboard" element={<ProtectedRoute><ActivityDashboard /></ProtectedRoute>} />

                <Route path="/DownloadCode" element={<ProtectedRoute><DownloadCode /></ProtectedRoute>} />
                <Route path="/downloadcode" element={<ProtectedRoute><DownloadCode /></ProtectedRoute>} />

                <Route path="/StripeSuccess" element={<ProtectedRoute><StripeSuccess /></ProtectedRoute>} />
                <Route path="/stripesuccess" element={<ProtectedRoute><StripeSuccess /></ProtectedRoute>} />

                <Route path="/AgenticAI" element={<ProtectedRoute><AgenticAI /></ProtectedRoute>} />
                <Route path="/agenticai" element={<ProtectedRoute><AgenticAI /></ProtectedRoute>} />

                <Route path="/FileToPPT" element={<ProtectedRoute><FileToPPT /></ProtectedRoute>} />
                <Route path="/filetoppt" element={<ProtectedRoute><FileToPPT /></ProtectedRoute>} />

                <Route path="/OCRConverter" element={<ProtectedRoute><OCRConverter /></ProtectedRoute>} />
                <Route path="/ocrconverter" element={<ProtectedRoute><OCRConverter /></ProtectedRoute>} />

                <Route path="/PdfDocConverter" element={<ProtectedRoute><PdfDocConverter /></ProtectedRoute>} />
                <Route path="/pdfdocconverter" element={<ProtectedRoute><PdfDocConverter /></ProtectedRoute>} />

                <Route path="/FileAnalyzer" element={<ProtectedRoute><FileAnalyzer /></ProtectedRoute>} />
                <Route path="/fileanalyzer" element={<ProtectedRoute><FileAnalyzer /></ProtectedRoute>} />

                <Route path="/PLBuilder" element={<ProtectedRoute><PLBuilder /></ProtectedRoute>} />
                <Route path="/plbuilder" element={<ProtectedRoute><PLBuilder /></ProtectedRoute>} />

                <Route path="/DataModelCreator" element={<ProtectedRoute><DataModelCreator /></ProtectedRoute>} />
                <Route path="/datamodelcreator" element={<ProtectedRoute><DataModelCreator /></ProtectedRoute>} />

                <Route path="/Reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
                <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />

                <Route path="/DatabaseConnection" element={<ProtectedRoute><DatabaseConnection /></ProtectedRoute>} />
                <Route path="/databaseconnection" element={<ProtectedRoute><DatabaseConnection /></ProtectedRoute>} />

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