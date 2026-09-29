"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import Reveal from "@/components/motion/Reveal";
import {
    Upload,
    FileText,
    Download,
    CheckCircle,
    XCircle,
    Loader2,
    Trash2
} from "lucide-react";

export default function PDFUploader() {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        const MAX_FILE_SIZE = 15 * 1024 * 1024;
        const pdfFiles = files
            .filter(file => file.type === 'application/pdf')
            .filter(file => file.size <= MAX_FILE_SIZE)
            .slice(0, 5);

        if (pdfFiles.length !== files.length) {
            alert('Choose up to 5 PDF files, maximum 15MB each.');
        }

        setSelectedFiles(pdfFiles);
        setResults(null);
        setError(null);
    };

    const removeFile = (index) => {
        setSelectedFiles(files => files.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        setUploadProgress(10);
        setError(null);

        try {
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            setUploadProgress(30);

            const response = await fetch('/api/pdf-processor', {
                method: 'POST',
                body: formData,
            });

            setUploadProgress(80);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            setUploadProgress(100);
            setResults(data);
            setSelectedFiles([]);

            const fileInput = document.getElementById('pdf-input');
            if (fileInput) fileInput.value = '';

        } catch (error) {
            console.error('Upload error:', error);
            setError(error.message);
        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 2000);
        }
    };

    const handleDownload = (downloadUrl, filename) => {
        if (!downloadUrl) {
            alert('No download link available');
            return;
        }

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename || 'report.pdf';
        link.target = '_blank';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="mx-auto grid max-w-4xl gap-6">
            <Reveal>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        <span>Upload Medical Reports</span>
                    </CardTitle>
                    <CardDescription>
                        Upload PDF files of your medical reports for structured data extraction. AI reads the report — it never
                        diagnoses, prescribes or changes a dose.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pb-6">
                    <div className="rounded-[18px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-8 text-center">
                        <input
                            id="pdf-input"
                            type="file"
                            multiple
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={uploading}
                        />
                        <label
                            htmlFor="pdf-input"
                            className="flex cursor-pointer flex-col items-center gap-2"
                        >
                            <Upload
                                className="h-9 w-9 text-[var(--celadon)]"
                                strokeWidth={1.75}
                            />
                            <p className="text-[14px] font-semibold text-[var(--text-strong)]">
                                Click to upload PDF files
                            </p>
                            <p className="text-[12px] text-[var(--text-muted)]">
                                Up to 5 PDFs, maximum 15MB each
                            </p>
                        </label>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="grid gap-2">
                            <h3 className="nm-card-title">Selected Files ({selectedFiles.length})</h3>
                            <ScrollArea className="h-32 rounded-[14px] border border-[var(--border)] bg-[var(--surface-subtle)] p-2">
                                {selectedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between gap-2 rounded-[12px] p-2 transition-colors hover:bg-[var(--surface-muted)]"
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <FileText
                                                className="h-[18px] w-[18px] shrink-0 text-[var(--text-muted)]"
                                                strokeWidth={1.75}
                                            />
                                            <span className="truncate text-[13px] font-medium text-[var(--text)]">
                                                {file.name}
                                            </span>
                                            <Badge variant="outline">{formatFileSize(file.size)}</Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFile(index)}
                                            disabled={uploading}
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
                                        </Button>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}

                    {uploading && (
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-[var(--text-muted)]">
                                    Processing files…
                                </span>
                                <span className="text-[12px] font-semibold text-[var(--text)]">
                                    {uploadProgress}%
                                </span>
                            </div>
                            <Progress value={uploadProgress} aria-label="Upload progress" />
                        </div>
                    )}

                    {error && (
                        <div
                            role="alert"
                            className="flex items-center gap-2 rounded-[14px] border border-[var(--destructive)] bg-[var(--destructive-soft)] p-3 text-[var(--destructive)]"
                        >
                            <XCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                            <span className="text-[13px]">{error}</span>
                        </div>
                    )}

                    <Button
                        onClick={uploadFiles}
                        disabled={selectedFiles.length === 0 || uploading}
                        size="lg"
                        className="w-full"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} />
                                Processing {selectedFiles.length} files…
                            </>
                        ) : (
                            <>
                                <Upload className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                Upload &amp; Process {selectedFiles.length} PDFs
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
            </Reveal>

            {results && (
                <Reveal>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle
                                className="h-[18px] w-[18px] text-[var(--success)]"
                                strokeWidth={1.75}
                            />
                            <span>Processing Complete</span>
                        </CardTitle>
                        <CardDescription>
                            Successfully processed {results.total_files_processed} PDF files
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 pb-6">
                        <div className="nm-grid-3">
                            <div className="nm-stat">
                                <div className="nm-stat-value">
                                    {results.parsed_json?.length || 0}
                                </div>
                                <div className="nm-stat-label">Reports Analyzed</div>
                            </div>
                            <div className="nm-stat">
                                <div className="nm-stat-value">
                                    {results.total_files_processed}
                                </div>
                                <div className="nm-stat-label">Files Processed</div>
                            </div>
                            <div className="nm-stat">
                                <div className="nm-stat-value">
                                    {results.pdf_download_urls?.length || 0}
                                </div>
                                <div className="nm-stat-label">Downloads Available</div>
                            </div>
                        </div>

                        {results.pdf_download_urls && results.pdf_download_urls.length > 0 && (
                            <div className="grid gap-2">
                                <h3 className="nm-card-title">Download Processed Reports</h3>
                                <div className="grid gap-2">
                                    {results.pdf_download_urls.map((item, index) => (
                                        <div
                                            key={index}
                                            className="glass-data flex items-center justify-between gap-3 rounded-[14px] p-3"
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <FileText
                                                    className="h-[18px] w-[18px] shrink-0 text-[var(--text-muted)]"
                                                    strokeWidth={1.75}
                                                />
                                                <span className="truncate text-[13px] font-medium text-[var(--text)]">
                                                    {item.filename}
                                                </span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="default"
                                                onClick={() => handleDownload(item.download_url, item.filename)}
                                                disabled={!item.download_url}
                                            >
                                                <Download className="h-[15px] w-[15px]" strokeWidth={1.75} />
                                                {!item.download_url ? 'N/A' : 'Download'}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.parsed_json && results.parsed_json.length > 0 && (
                            <div className="grid gap-2">
                                <h3 className="nm-card-title">Extracted Data Preview</h3>
                                <ScrollArea className="h-48 rounded-[14px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                                    {results.parsed_json.map((report, index) => (
                                        <div
                                            key={index}
                                            className="glass-data mb-4 rounded-[14px] p-3"
                                        >
                                            <div className="grid grid-cols-2 gap-2 text-[13px] text-[var(--text)]">
                                                <div><strong>Patient:</strong> {report.patient_info?.name || 'N/A'}</div>
                                                <div><strong>Age:</strong> {report.patient_info?.age || 'N/A'}</div>
                                                <div><strong>Report Type:</strong> {report.report_type || 'N/A'}</div>
                                                <div><strong>Tests:</strong> {report.test_results?.length || 0} tests</div>
                                            </div>
                                            {report.summary && (
                                                <div className="mt-2">
                                                    <strong className="text-[13px] text-[var(--text)]">
                                                        Summary:
                                                    </strong>
                                                    <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                                                        {report.summary}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </ScrollArea>
                            </div>
                        )}
                    </CardContent>
                </Card>
                </Reveal>
            )}
        </div>
    );
}
