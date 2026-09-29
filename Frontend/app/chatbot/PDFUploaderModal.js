"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";

/**
 * Report upload, presented as a dialog.
 *
 * SCROLLING: this is the one place an inner scroller is legitimate — a modal
 * must not grow taller than the viewport, and `DialogContent` is the single
 * scroll container for the whole body. There are deliberately NO nested
 * fixed-height scrollers inside it any more: the selected-file list and the
 * extracted-data preview used to each clip their own content behind
 * `h-32` / `h-48` boxes with no way to reach the rest.
 */
export default function PDFUploaderModal({ isOpen, onClose }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const pdfFiles = files.filter((file) => file.type === "application/pdf");

    if (pdfFiles.length !== files.length) {
      alert("Only PDF files are allowed!");
    }

    setSelectedFiles(pdfFiles);
    setResults(null);
    setError(null);
  };

  const removeFile = (index) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      setUploadProgress(30);

      const response = await fetch("/api/pdf-processor", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setUploadProgress(100);
      setResults(data);
      setSelectedFiles([]); // Clear selected files

      // Reset file input
      const fileInput = document.getElementById("pdf-input");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      setError(error.message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleDownload = (downloadUrl, filename) => {
    if (!downloadUrl) {
      return;
    }

    // downloadUrl is already a full absolute URL from the backend (via AI_SERVER_URL)
    console.log("Downloading from:", downloadUrl);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename || "report.pdf";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleClose = () => {
    // Reset state when closing
    setSelectedFiles([]);
    setResults(null);
    setError(null);
    setUploading(false);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span>Upload Medical Reports</span>
          </DialogTitle>
          <DialogDescription>
            Upload PDF files for structured data extraction. AI reads the report — it
            never diagnoses, prescribes or changes a dose.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* File Input */}
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
                Support for multiple PDFs up to 50MB each
              </p>
            </label>
          </div>

          {/* Selected Files List — a ledger, not a fixed-height box. */}
          {selectedFiles.length > 0 && (
            <div className="grid gap-2">
              <div className="section-rule mt-2">
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
                      <span className="ledger-title break-all">{file.name}</span>
                    </div>
                    <div className="ledger-actions">
                      <Badge variant="outline">{formatFileSize(file.size)}</Badge>
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

          {/* Upload Progress */}
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
              <Progress
                value={uploadProgress}
                aria-label="Upload progress"
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-[14px] border border-[var(--destructive)] bg-[var(--destructive-soft)] p-3 text-[var(--destructive)]"
            >
              <XCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              <span className="text-[13px]">{error}</span>
            </div>
          )}

          {/* Upload Button */}
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

          {/* Results Section */}
          {results && (
            <div className="mt-2">
              <div className="section-rule mt-2">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  Processing complete
                </span>
              </div>
              <p className="text-[12px] text-[var(--text-muted)]">
                Successfully processed {results.total_files_processed} PDF files
              </p>

              <dl className="stat-strip mt-4">
                <div className="stat-inline">
                  <dt>Files processed</dt>
                  <dd>{results.total_files_processed || 0}</dd>
                </div>
                <div className="stat-inline">
                  <dt>Reports merged</dt>
                  <dd>{results.total_reports_merged || 0}</dd>
                </div>
                <div className="stat-inline">
                  <dt>Unique tests found</dt>
                  <dd>{results.unique_tests_found || 0}</dd>
                </div>
              </dl>

              {/* Download Links */}
              {results.pdf_download_urls &&
                results.pdf_download_urls.length > 0 && (
                  <div className="mt-6">
                    <div className="section-rule mt-2">
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
                              onClick={() =>
                                handleDownload(item.download_url, item.filename)
                              }
                              disabled={!item.download_url}
                            >
                              <Download className="h-[15px] w-[15px]" strokeWidth={1.75} />
                              {!item.download_url ? "N/A" : "Download"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Parsed Data Preview — one well per report, page grows. */}
              {results.parsed_json && results.parsed_json.length > 0 && (
                <div className="mt-6">
                  <div className="section-rule mt-2">
                    <span>Extracted data preview</span>
                  </div>
                  <div className="grid gap-3">
                    {results.parsed_json.map((report, index) => (
                      <div key={index} className="well">
                        <dl className="dl-grid">
                          <dt>Patient</dt>
                          <dd>{report.patient_info?.name || "N/A"}</dd>
                          <dt>Age</dt>
                          <dd>{report.patient_info?.age || "N/A"}</dd>
                          <dt>Report type</dt>
                          <dd>{report.report_type || "N/A"}</dd>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
