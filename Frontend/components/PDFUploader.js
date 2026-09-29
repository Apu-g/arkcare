"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import {
    Upload,
    FileText,
    Download,
    CheckCircle,
    XCircle,
    Loader2,
    Trash2
} from "lucide-react";

/**
 * Report intake.
 *
 * The document scrolls: the selected-file list and the extracted-data preview
 * are ledgers that grow the page, not fixed-height scrollers. Clipping a
 * patient's own report list behind an internal scrollbar is exactly the
 * failure mode the editorial layer exists to remove.
 */
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
        <div className="mx-auto max-w-4xl">
            <Reveal as="section">
                <div className="section-rule">
                    <span>Report intake</span>
                </div>
                <div className="section-head">
                    <MaskedText as="h2" className="section-title">
                        Upload medical reports
                    </MaskedText>
                    <span className="cq-pixel-label">PDF · up to 5 files · 15MB each</span>
                </div>
                <p className="section-lede">
                    Upload PDF files of your medical reports for structured data
                    extraction. AI reads the report — it never diagnoses, prescribes or
                    changes a dose.
                </p>

                <div className="mt-5">
                    <div className="well border-dashed p-8 text-center">
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
                </div>

                {selectedFiles.length > 0 && (
                    <div className="mt-6">
                        <div className="section-rule">
                            <span>Selected files ({selectedFiles.length})</span>
                        </div>
                        <div className="ledger">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="ledger-row">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <FileText
                                            className="h-[18px] w-[18px] shrink-0 text-[var(--text-muted)]"
                                            strokeWidth={1.75}
                                        />
                                        <span className="ledger-title break-all">
                                            {file.name}
                                        </span>
                                    </div>
                                    <div className="ledger-actions">
                                        <Badge variant="outline">
                                            {formatFileSize(file.size)}
                                        </Badge>
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
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {uploading && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[var(--text-muted)]">
                                Processing files…
                            </span>
                            <span className="text-[12px] font-semibold text-[var(--text)]">
                                {uploadProgress}%
                            </span>
                        </div>
                        <div className="mt-2">
                            <Progress value={uploadProgress} aria-label="Upload progress" />
                        </div>
                    </div>
                )}

                {error && (
                    <div
                        role="alert"
                        className="mt-5 flex items-center gap-2 rounded-[14px] border border-[var(--destructive)] bg-[var(--destructive-soft)] p-3 text-[var(--destructive)]"
                    >
                        <XCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                        <span className="text-[13px]">{error}</span>
                    </div>
                )}

                <div className="mt-6">
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
                </div>
            </Reveal>

            {results && (
                <Reveal as="section" className="mt-10">
                    <div className="section-rule">
                        <span>Processing complete</span>
                    </div>
                    <div className="section-head">
                        <MaskedText as="h2" className="section-title">
                            {results.total_files_processed} file
                            {results.total_files_processed === 1 ? "" : "s"} processed
                        </MaskedText>
                        <span className="cq-pixel-label cq-real-label">
                            <CheckCircle className="h-[13px] w-[13px]" strokeWidth={1.75} />
                            Complete
                        </span>
                    </div>

                    <dl className="stat-strip mt-4">
                        <div className="stat-inline">
                            <dt>Reports analyzed</dt>
                            <dd>{results.parsed_json?.length || 0}</dd>
                        </div>
                        <div className="stat-inline">
                            <dt>Files processed</dt>
                            <dd>{results.total_files_processed}</dd>
                        </div>
                        <div className="stat-inline">
                            <dt>Downloads available</dt>
                            <dd>{results.pdf_download_urls?.length || 0}</dd>
                        </div>
                    </dl>

                    {results.pdf_download_urls && results.pdf_download_urls.length > 0 && (
                        <div className="mt-8">
                            <div className="section-rule">
                                <span>Download processed reports</span>
                            </div>
                            <div className="ledger">
                                {results.pdf_download_urls.map((item, index) => (
                                    <div key={index} className="ledger-row">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <FileText
                                                className="h-[18px] w-[18px] shrink-0 text-[var(--text-muted)]"
                                                strokeWidth={1.75}
                                            />
                                            <span className="ledger-title break-all">
                                                {item.filename}
                                            </span>
                                        </div>
                                        <div className="ledger-actions">
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
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.parsed_json && results.parsed_json.length > 0 && (
                        <div className="mt-8">
                            <div className="section-rule">
                                <span>Extracted data preview</span>
                            </div>
                            <div className="grid gap-4">
                                {results.parsed_json.map((report, index) => (
                                    <div key={index} className="well">
                                        <dl className="dl-grid">
                                            <dt>Patient</dt>
                                            <dd>{report.patient_info?.name || 'N/A'}</dd>
                                            <dt>Age</dt>
                                            <dd>{report.patient_info?.age || 'N/A'}</dd>
                                            <dt>Report type</dt>
                                            <dd>{report.report_type || 'N/A'}</dd>
                                            <dt>Tests</dt>
                                            <dd>{report.test_results?.length || 0} tests</dd>
                                        </dl>
                                        {report.summary && (
                                            <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                                                <div className="cq-kicker">Summary</div>
                                                <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
                                                    {report.summary}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Reveal>
            )}
        </div>
    );
}
