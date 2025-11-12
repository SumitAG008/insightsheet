// pages/PDFEditor.js - PDF form filling page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Download, Upload as UploadIcon, AlertCircle, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PDFEditor() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [formFields, setFormFields] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  // Common form fields for TPA/Insurance forms
  const commonFields = [
    { id: 'hospital_name', label: 'Hospital Name', type: 'text' },
    { id: 'hospital_address', label: 'Hospital Address', type: 'text' },
    { id: 'contact_person', label: 'Contact Person', type: 'text' },
    { id: 'phone', label: 'Phone Number', type: 'tel' },
    { id: 'email', label: 'Email Address', type: 'email' },
    { id: 'gstin', label: 'GSTIN', type: 'text' },
    { id: 'pan', label: 'PAN Number', type: 'text' },
    { id: 'registration_number', label: 'Hospital Registration No.', type: 'text' },
    { id: 'bank_name', label: 'Bank Name', type: 'text' },
    { id: 'account_number', label: 'Account Number', type: 'text' },
    { id: 'ifsc_code', label: 'IFSC Code', type: 'text' },
    { id: 'authorized_signatory', label: 'Authorized Signatory', type: 'text' },
    { id: 'date', label: 'Date', type: 'date' }
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file only');
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setPdfFile(file);
      setPdfUrl(file_url);
    } catch (error) {
      alert('Error uploading file. Please try again.');
    }
    setIsUploading(false);
  };

  const handleFieldChange = (fieldId, value) => {
    setFormFields(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleDownload = () => {
    // Create a text file with filled data
    const content = Object.entries(formFields)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `filled_form_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('Form data downloaded! Please manually fill your PDF using this data.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-slate-800 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-3">
            PDF Form Filler
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Upload your PDF, fill the form fields, and download the data
          </p>
        </div>

        {/* Privacy Notice */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Shield className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-slate-700">
            <strong className="text-blue-700">Privacy First:</strong> Your PDF is processed in your browser only. 
            We never store your files on our servers. Close this tab to permanently delete all data.
          </AlertDescription>
        </Alert>

        {/* Upload Area */}
        {!pdfUrl && (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {isUploading ? 'Uploading...' : 'Upload PDF Document'}
                  </h3>
                  <p className="text-slate-600">
                    Click to select your PDF file (e.g., TPA MOU, Insurance forms)
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* PDF Viewer and Form */}
        {pdfUrl && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* PDF Preview */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-800" />
                PDF Preview
              </h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-[600px]"
                  title="PDF Preview"
                />
              </div>
              <Button
                onClick={() => {
                  setPdfFile(null);
                  setPdfUrl('');
                  setFormFields({});
                }}
                variant="outline"
                className="w-full mt-4 border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload Different PDF
              </Button>
            </div>

            {/* Form Fields */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">
                Fill Form Fields
              </h2>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {commonFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {field.label}
                    </label>
                    <Input
                      type={field.type}
                      value={formFields[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="border-slate-300 focus:border-slate-300 focus:ring-purple-500"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-slate-800 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Filled Data
                </Button>

                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800">
                    <strong>Note:</strong> Due to browser limitations, we cannot directly edit PDF files. 
                    The filled data will be downloaded as a text file. Please manually transfer this data to your PDF.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 bg-slate-100 rounded-xl p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-3">⚠️ Important Disclaimer</h3>
          <div className="text-sm text-slate-700 space-y-2">
            <p>
              • This tool helps you organize form data but does NOT directly edit PDF files
            </p>
            <p>
              • For actual PDF editing, use Adobe Acrobat or similar PDF editors
            </p>
            <p>
              • All data processing happens in your browser - nothing is stored on our servers
            </p>
            <p>
              • Always verify filled information before submitting official documents
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}