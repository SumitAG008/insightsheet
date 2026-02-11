// components/dashboard/DataGrid.jsx - Interactive data table display (fixed empty headers)
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DataGrid({ data }) {
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 20;
  
  if (!data || !data.rows) return null;

  // Filter out empty headers and ensure valid data
  const validHeaders = data.headers.filter(header => header && header.trim() !== '');
  
  const totalPages = Math.ceil(data.rows.length / rowsPerPage);
  const startIdx = currentPage * rowsPerPage;
  const endIdx = Math.min(startIdx + rowsPerPage, data.rows.length);
  const currentRows = data.rows.slice(startIdx, endIdx);

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-800/10 rounded-2xl blur-xl" />
      
      <div className="relative bg-blue-900/80 backdrop-blur-xl border border-blue-700/40 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-blue-700/40">
          <h2 className="text-xl font-bold text-blue-50">Data Preview</h2>
          <p className="text-sm text-blue-200/70 mt-1">
            Showing {startIdx + 1}-{endIdx} of {data.rows.length} rows • {validHeaders.length} columns
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-blue-700/40 hover:bg-blue-800/30">
                {validHeaders.map((header, idx) => (
                  <TableHead key={idx} className="text-blue-50 font-semibold whitespace-nowrap">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentRows.map((row, rowIdx) => (
                <TableRow key={rowIdx} className="border-blue-800/20 hover:bg-blue-900/20">
                  {validHeaders.map((header, colIdx) => (
                    <TableCell key={colIdx} className="text-blue-50/90">
                      {row[header] !== undefined && row[header] !== null ? String(row[header]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-blue-700/40 flex items-center justify-between">
            <Button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              variant="outline"
              size="sm"
              className="border-blue-700/60 text-blue-100 hover:bg-blue-900/30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-sm text-blue-200/70">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <Button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              variant="outline"
              size="sm"
              className="border-blue-700/60 text-blue-100 hover:bg-blue-900/30"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}