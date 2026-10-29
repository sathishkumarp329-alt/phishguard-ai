import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { scanApi } from '@/services/api';
import { FileScanResult, Scan } from '@/types';
import { truncateUrl, getRiskScoreColor, formatBytes } from '@/utils/helpers';
import {
  FileSearch,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
  X,
  File,
} from 'lucide-react';

export const FileScanPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileScanResult | null>(null);

  const supportedExtensions = ['.pdf', '.docx', '.txt', '.csv', '.png', '.jpg', '.jpeg'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const validateAndSetFile = (file: File) => {
    setError(null);
    setResult(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supportedExtensions.includes(ext)) {
      setError(`Unsupported file type (${ext}). Supported: PDF, DOCX, TXT, CSV, PNG, JPG`);
      return;
    }

    if (file.size > maxSizeBytes) {
      setError(`File size exceeds limit (${formatBytes(file.size)} > 10 MB)`);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadAndScan = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await scanApi.uploadFile(selectedFile);
      setResult(data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(
        errorObj?.response?.data?.detail ||
        errorObj?.response?.data?.message ||
        'Failed to process file and extract hyperlinks. Please check file integrity.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || ext === 'docx') return <FileText className="w-8 h-8 text-cyan-400" />;
    if (ext === 'csv') return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />;
    if (['png', 'jpg', 'jpeg'].includes(ext || '')) return <Image className="w-8 h-8 text-violet-400" />;
    return <File className="w-8 h-8 text-gray-400" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b40] border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-1">
            <FileSearch className="w-3.5 h-3.5 text-cyan-400" />
            <span>Document & Image Deep Extractor</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">File & Document Scanner</h1>
          <p className="text-sm text-gray-400">
            Upload PDF invoices, Word documents, text payloads, or QR screenshots to extract and inspect hidden phishing URLs.
          </p>
        </div>

        {/* Drag-and-Drop Area */}
        <Card className="p-8">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
              dragOver
                ? 'border-cyan-400 bg-cyan-950/20'
                : 'border-[#1e2456] hover:border-cyan-500/50 bg-[#0d1137]/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="p-4 rounded-2xl bg-[#161b40] border border-[#1e2456] text-cyan-400 shadow-lg">
              <UploadCloud className="w-10 h-10" />
            </div>

            <div>
              <p className="text-base font-semibold text-white">
                Drag and drop your file here, or <span className="text-cyan-400 underline">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supported formats: PDF, DOCX, TXT, CSV, PNG, JPG (Max 10 MB)
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selected File Card */}
          {selectedFile && (
            <div className="mt-6 p-4 rounded-xl bg-[#0d1137] border border-[#1e2456] flex flex-col sm:flex-row items-center justify-between gap-4 animate-slideUp">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-2 rounded-lg bg-[#161b40] border border-[#1e2456]">
                  {getFileIcon(selectedFile.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {formatBytes(selectedFile.size)} &bull; Ready for URL extraction
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
                <Button
                  variant="primary"
                  size="md"
                  loading={loading}
                  onClick={handleUploadAndScan}
                >
                  {loading ? 'Extracting & Scanning URLs...' : 'Extract & Inspect URLs'}
                </Button>
              </div>
            </div>
          )}

          {/* Processing Status Banner */}
          {loading && (
            <div className="mt-6 p-6 rounded-xl bg-[#0d1137] border border-cyan-500/30 flex items-center justify-center gap-3 text-cyan-300 text-xs sm:text-sm animate-pulse-slow">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400 shrink-0" />
              <span>
                Parsing embedded anchors, hyperlinked objects, and QR visual tokens...
              </span>
            </div>
          )}
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-slideUp">
            {/* Summary Banner */}
            <Card className="p-6 bg-gradient-to-r from-[#161b40] to-[#101438] border-cyan-500/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono uppercase text-cyan-400">File Analysis Complete</span>
                  <h2 className="text-xl font-bold text-white mt-1 font-mono">{result.file_name}</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Extracted {result.extracted_urls_count} total destination links from document content.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-[#0d1137] border border-[#1e2456] text-center">
                    <p className="text-[10px] font-mono text-gray-400 uppercase">Extracted</p>
                    <p className="text-xl font-black text-cyan-400 font-mono">{result.extracted_urls_count}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Extracted URLs List & Their Scan Results */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">Extracted Links & Threat Assessments</h3>

              {result.results.length === 0 ? (
                <Card className="p-8 text-center text-gray-400">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">No URLs Found in File</p>
                  <p className="text-xs mt-1">This document does not appear to contain any hyperlinked web addresses or QR codes.</p>
                </Card>
              ) : (
                result.results.map((item: Scan) => (
                  <Card
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-cyan-500/40"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge verdict={item.verdict} size="sm" />
                        <span className={`text-xs font-mono font-bold ${getRiskScoreColor(item.risk_score)}`}>
                          Risk: {item.risk_score}/100
                        </span>
                      </div>
                      <p className="font-mono text-xs sm:text-sm text-cyan-200 truncate" title={item.url}>
                        {item.url}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {item.findings?.length || 0} findings &bull; {item.hostname || 'Analyzed Host'}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/scan/${item.id}`)}
                        icon={<ExternalLink className="w-3.5 h-3.5 text-cyan-400" />}
                      >
                        Deep Report
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FileScanPage;
