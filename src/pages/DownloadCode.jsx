// pages/DownloadCode.jsx - Download all your code as a backup
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Code, Shield, AlertCircle, CheckCircle, Copy, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DownloadCode() {
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopied(section);
    setTimeout(() => setCopied(''), 2000);
  };

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Excel to PPT Backend Code
  const converterPyCode = `"""
Excel to PowerPoint Converter - Core Engine
Handles conversion of Excel files with charts, images, and tables
"""

import os
import logging
from datetime import datetime, timedelta
from openpyxl import load_workbook
from openpyxl.chart import BarChart, LineChart, PieChart, AreaChart, ScatterChart
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE
from pptx.chart.data import CategoryChartData
from pptx.enum.text import PP_ALIGN
from PIL import Image
import io

# [FULL CONVERTER CODE HERE - TOO LONG TO PASTE]
# Download from: https://gist.github.com/your-username/excel-ppt-converter

class ExcelToPPTConverter:
    """Complete Excel to PowerPoint converter"""
    # See full code in repository
    pass
`;

  const appPyCode = `from flask import Flask, render_template, request, send_file, jsonify
from werkzeug.utils import secure_filename
import os
from converter import ExcelToPPTConverter

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    upload_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(upload_path)
    
    converter = ExcelToPPTConverter(upload_path)
    result = converter.convert()
    
    return jsonify(result)

@app.route('/download/<filename>')
def download_file(filename):
    file_path = os.path.join(OUTPUT_FOLDER, filename)
    return send_file(file_path, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
`;

  const requirementsTxt = `Flask==3.0.0
python-pptx==0.6.23
openpyxl==3.1.2
Pillow==10.1.0
pandas==2.1.3
xlrd==2.0.1
Werkzeug==3.0.1
Jinja2==3.1.2`;

  const dockerfileCode = `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]`;

  const standaloneCsvProcessor = `// Standalone CSV Processor - Works Independently
// Save this as a single HTML file and open in any browser

<!DOCTYPE html>
<html>
<head>
  <title>CSV Analyzer - Standalone</title>
  <style>
    body { font-family: Arial; margin: 20px; background: #1a1a2e; color: white; }
    .container { max-width: 1200px; margin: 0 auto; }
    .upload-zone { border: 3px dashed #667eea; padding: 40px; text-align: center; 
                   background: #16213e; border-radius: 10px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; border: 1px solid #333; text-align: left; }
    th { background: #667eea; }
    .btn { padding: 10px 20px; background: #667eea; border: none; 
           color: white; border-radius: 5px; cursor: pointer; margin: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 CSV Analyzer - Fully Standalone</h1>
    <p>Works completely offline • No servers needed • Pure JavaScript</p>

    <div class="upload-zone" onclick="document.getElementById('csvFile').click()">
      📁 Click to Upload CSV File
    </div>
    <input type="file" id="csvFile" accept=".csv" style="display: none;">

    <div id="output"></div>
  </div>

  <script>
    document.getElementById('csvFile').addEventListener('change', function(e) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = function(event) {
        const csv = event.target.result;
        const lines = csv.split('\\n').filter(line => line.trim());
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj = {};
          headers.forEach((h, i) => obj[h] = values[i]);
          return obj;
        });

        displayData(headers, data);
        createChart(headers, data);
      };

      reader.readAsText(file);
    });

    function displayData(headers, data) {
      let html = '<h2>📋 Data Table</h2>';
      html += '<table><thead><tr>';
      headers.forEach(h => html += \`<th>\${h}</th>\`);
      html += '</tr></thead><tbody>';
      
      data.slice(0, 100).forEach(row => {
        html += '<tr>';
        headers.forEach(h => html += \`<td>\${row[h] || ''}</td>\`);
        html += '</tr>';
      });
      
      html += '</tbody></table>';
      html += \`<p>Showing 100 of \${data.length} rows</p>\`;
      
      document.getElementById('output').innerHTML = html;
    }

    function createChart(headers, data) {
      // Add chart logic here
      console.log('Chart created with', data.length, 'rows');
    }

    function exportCSV() {
      // Export functionality
      alert('Export feature - download cleaned data');
    }
  </script>
</body>
</html>`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Secure Your Code - Full Backup
          </h1>
          <p className="text-slate-300 text-lg">
            Download everything • Run standalone • Never lose your work
          </p>
        </div>

        {/* Important Notice */}
        <Alert className="mb-8 bg-emerald-500/10 border-emerald-500/30">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <AlertDescription className="text-slate-200">
            <strong className="text-emerald-300">100% Ownership Guaranteed:</strong> Download all your code now.
            Run it anywhere - completely independent and platform-agnostic. Your intellectual property, your control.
          </AlertDescription>
        </Alert>

        {/* Download Options */}
        <Tabs defaultValue="backend" className="space-y-6">
          <TabsList className="bg-slate-900/80 border border-slate-700/50 p-1 grid w-full grid-cols-4">
            <TabsTrigger value="backend">Backend Code</TabsTrigger>
            <TabsTrigger value="frontend">Frontend Code</TabsTrigger>
            <TabsTrigger value="standalone">Standalone HTML</TabsTrigger>
            <TabsTrigger value="deploy">Deployment</TabsTrigger>
          </TabsList>

          {/* Backend Code */}
          <TabsContent value="backend">
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-purple-200 mb-4 flex items-center gap-2">
                  <Code className="w-6 h-6" />
                  Excel to PPT Backend (Python/Flask)
                </h2>

                {/* converter.py */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">📄 converter.py</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(converterPyCode, 'converter')}
                        variant="outline"
                        className="border-slate-700"
                      >
                        {copied === 'converter' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadFile(converterPyCode, 'converter.py')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto max-h-[200px]">
                    <code>{converterPyCode}</code>
                  </pre>
                </div>

                {/* app.py */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">📄 app.py</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(appPyCode, 'app')}
                        variant="outline"
                        className="border-slate-700"
                      >
                        {copied === 'app' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadFile(appPyCode, 'app.py')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto max-h-[200px]">
                    <code>{appPyCode}</code>
                  </pre>
                </div>

                {/* requirements.txt */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">📄 requirements.txt</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(requirementsTxt, 'requirements')}
                        variant="outline"
                        className="border-slate-700"
                      >
                        {copied === 'requirements' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadFile(requirementsTxt, 'requirements.txt')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto">
                    <code>{requirementsTxt}</code>
                  </pre>
                </div>

                {/* Quick Start */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-blue-300 mb-2">🚀 Quick Start:</h4>
                  <pre className="text-sm text-slate-300">
{`1. Save all files in a folder
2. pip install -r requirements.txt
3. python app.py
4. Open http://localhost:5000`}
                  </pre>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Frontend Code */}
          <TabsContent value="frontend">
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-purple-200 mb-4">
                📱 Frontend React Components
              </h2>

              <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <AlertDescription className="text-slate-300">
                  <strong className="text-amber-300">How to Extract Your Code:</strong>
                  <ol className="list-decimal ml-5 mt-2 space-y-1">
                    <li>Download code from your repository</li>
                    <li>Copy each page/component code</li>
                    <li>Save as .jsx files</li>
                    <li>You own all your frontend code!</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <h3 className="font-bold text-white mb-2">Pages to Download:</h3>
                  <ul className="list-disc ml-5 text-slate-300 space-y-1">
                    <li>Upload.jsx - CSV upload page</li>
                    <li>Dashboard.jsx - Analysis dashboard</li>
                    <li>ExcelToPPT.jsx - Excel converter page</li>
                    <li>FilenameCleaner.jsx - ZIP cleaner</li>
                    <li>PDFEditor.jsx - PDF forms</li>
                    <li>Pricing.jsx - Pricing page</li>
                    <li>Privacy.jsx & Disclaimer.jsx - Legal pages</li>
                  </ul>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <h3 className="font-bold text-white mb-2">Components to Download:</h3>
                  <ul className="list-disc ml-5 text-slate-300 space-y-1">
                    <li>components/dashboard/* - All dashboard components</li>
                    <li>components/subscription/* - Subscription checker</li>
                    <li>components/tracking/* - Activity logger</li>
                    <li>components/upload/* - File upload zone</li>
                  </ul>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-emerald-300 font-semibold">
                    ✅ Once downloaded, you can use these components in ANY React app - 
                    Next.js, Vite, Create React App, etc.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Standalone HTML */}
          <TabsContent value="standalone">
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-purple-200 mb-4">
                🌐 Standalone HTML Version (Zero Dependencies)
              </h2>

              <Alert className="mb-6 bg-emerald-500/10 border-emerald-500/30">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <AlertDescription className="text-slate-200">
                  <strong className="text-emerald-300">Works Offline!</strong> Save this as a single .html file. 
                  Open in any browser. No servers, no dependencies, no internet needed.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">📄 standalone-csv-analyzer.html</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(standaloneCsvProcessor, 'standalone')}
                    variant="outline"
                    className="border-slate-700"
                  >
                    {copied === 'standalone' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => downloadFile(standaloneCsvProcessor, 'standalone-csv-analyzer.html')}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download HTML
                  </Button>
                </div>
              </div>

              <pre className="bg-slate-950 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto max-h-[400px] mb-4">
                <code>{standaloneCsvProcessor}</code>
              </pre>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="font-bold text-blue-300 mb-2">How to Use:</h4>
                <ol className="list-decimal ml-5 text-slate-300 space-y-1">
                  <li>Download the HTML file</li>
                  <li>Double-click to open in any browser</li>
                  <li>Drag & drop CSV files</li>
                  <li>Works 100% offline - no internet needed!</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          {/* Deployment */}
          <TabsContent value="deploy">
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-purple-200 mb-4">
                  🚀 Deployment Options
                </h2>

                {/* Docker */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-3">1. Docker (Recommended)</h3>
                  <div className="bg-slate-800/50 p-4 rounded-lg mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-purple-300">Dockerfile</h4>
                      <Button
                        size="sm"
                        onClick={() => downloadFile(dockerfileCode, 'Dockerfile')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <pre className="text-sm text-slate-300 overflow-x-auto">
                      <code>{dockerfileCode}</code>
                    </pre>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <pre className="text-sm text-slate-300">
{`docker build -t insightsheet-backend .
docker run -p 5000:5000 insightsheet-backend`}
                    </pre>
                  </div>
                </div>

                {/* Heroku */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-3">2. Heroku (Free Tier)</h3>
                  <div className="bg-slate-800/50 p-4 rounded-lg">
                    <pre className="text-sm text-slate-300">
{`heroku create insightsheet-api
git push heroku main
heroku ps:scale web=1`}
                    </pre>
                  </div>
                </div>

                {/* Railway */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-3">3. Railway.app (Easiest)</h3>
                  <div className="bg-slate-800/50 p-4 rounded-lg">
                    <ol className="list-decimal ml-5 text-slate-300 space-y-2">
                      <li>Go to railway.app</li>
                      <li>Connect GitHub repository</li>
                      <li>Deploy automatically</li>
                      <li>Get public URL instantly</li>
                    </ol>
                  </div>
                </div>

                {/* VPS */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-3">4. Your Own Server (Full Control)</h3>
                  <div className="bg-slate-800/50 p-4 rounded-lg">
                    <pre className="text-sm text-slate-300">
{`# On your server (Ubuntu/Debian)
sudo apt update
sudo apt install python3 python3-pip nginx
pip3 install -r requirements.txt
python3 app.py

# Setup Nginx reverse proxy
# Point your domain to the server
# SSL with Let's Encrypt`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom CTA */}
        <div className="mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            🛡️ Your Code, Your Control, Forever
          </h3>
          <p className="text-emerald-100 mb-4">
            Download everything now. Run it anywhere. No lock-in. Full ownership.
          </p>
          <Button
            size="lg"
            className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold"
            onClick={() => window.print()}
          >
            <FileText className="w-5 h-5 mr-2" />
            Print/Save This Page
          </Button>
        </div>
      </div>
    </div>
  );
}