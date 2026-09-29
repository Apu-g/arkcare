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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";

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
            Upload PDF files for AI analysis and structured data extraction
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* File Input */}
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
                className="h-9 w-9 text-[var(--text-subtle)]"
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

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="grid gap-2">
              <h3 className="nm-card-title">
                Selected Files ({selectedFiles.length})
              </h3>
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
              className="flex items-center gap-2 rounded-[14px] border border-[rgba(191,67,67,0.3)] bg-[rgba(235,90,90,0.08)] p-3 text-[var(--destructive)]"
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
            <div className="cq-card-soft mt-2 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle
                  className="h-[18px] w-[18px] text-[var(--success)]"
                  strokeWidth={1.75}
                />
                <span className="nm-card-title">Processing Complete</span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Successfully processed {results.total_files_processed} PDF files
              </p>

              <div className="mt-4">
                {/* Summary */}
                <div className="nm-grid-3">
                  <div className="nm-stat">
                    <div className="nm-stat-value">
                      {results.total_files_processed || 0}
                    </div>
                    <div className="nm-stat-label">Files Processed</div>
                  </div>
                  <div className="nm-stat">
                    <div className="nm-stat-value">
                      {results.total_reports_merged || 0}
                    </div>
                    <div className="nm-stat-label">Reports Merged</div>
                  </div>
                  <div className="nm-stat">
                    <div className="nm-stat-value">
                      {results.unique_tests_found || 0}
                    </div>
                    <div className="nm-stat-label">Unique Tests Found</div>
                  </div>
                </div>

                {/* Download Links */}
                {results.pdf_download_urls &&
                  results.pdf_download_urls.length > 0 && (
                    <div className="mt-4 grid gap-2">
                      <h3 className="nm-card-title">Download Processed Reports</h3>
                      <div className="grid gap-2">
                        {results.pdf_download_urls.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]"
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
                              onClick={() =>
                                handleDownload(item.download_url, item.filename)
                              }
                              disabled={!item.download_url}
                            >
                              <Download className="h-[15px] w-[15px]" strokeWidth={1.75} />
                              {!item.download_url ? "N/A" : "Download"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Parsed Data Preview */}
                {results.parsed_json && results.parsed_json.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    <h3 className="nm-card-title">Extracted Data Preview</h3>
                    <ScrollArea className="h-48 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
                      {results.parsed_json.map((report, index) => (
                        <div
                          key={index}
                          className="mb-4 rounded-[14px] bg-[var(--surface-subtle)] p-3"
                        >
                          <div className="grid grid-cols-2 gap-2 text-[13px] text-[var(--text)]">
                            <div>
                              <strong>Patient:</strong>{" "}
                              {report.patient_info?.name || "N/A"}
                            </div>
                            <div>
                              <strong>Age:</strong> {report.patient_info?.age || "N/A"}
                            </div>
                            <div>
                              <strong>Report Type:</strong>{" "}
                              {report.report_type || "N/A"}
                            </div>
                            <div>
                              <strong>Tests:</strong> {report.test_results?.length || 0} tests
                            </div>
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
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
