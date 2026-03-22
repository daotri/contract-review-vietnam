'use client';
// Drag-drop file upload with validation (PDF/DOCX, max 10MB)
import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_EXT = ['.pdf', '.docx'];

interface UploadFormProps {
  onSubmit: (file: File) => void;
  loading: boolean;
}

export function UploadForm({ onSubmit, loading }: UploadFormProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(f: File): string | null {
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
    if (!ALLOWED_TYPES.includes(f.type) && !ALLOWED_EXT.includes(ext)) {
      return 'Chỉ chấp nhận file PDF hoặc DOCX.';
    }
    if (f.size > MAX_SIZE_BYTES) {
      return 'File không được vượt quá 10MB.';
    }
    return null;
  }

  function handleFile(f: File) {
    const err = validate(f);
    setValidationError(err);
    setFile(err ? null : f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  }

  function clearFile() {
    setFile(null);
    setValidationError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleSubmit() {
    if (file && !loading) onSubmit(file);
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={[
          'glass-card border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer',
          dragging ? 'border-purple-500/50 bg-purple-500/5 glow-hover' : 'border-white/20 hover:border-purple-500/50',
          file ? 'cursor-default' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={onInputChange}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-primary shrink-0" />
            <span className="text-sm font-medium truncate max-w-[240px]">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Xóa file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Kéo thả file vào đây hoặc <span className="text-primary underline">chọn file</span></p>
            <p className="text-xs text-muted-foreground">Hỗ trợ PDF, DOCX — tối đa 10MB</p>
          </div>
        )}
      </div>

      {validationError && (
        <p className="text-sm text-destructive text-center">{validationError}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!file || loading}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-700 hover:to-blue-600 disabled:opacity-50"
        size="lg"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang phân tích...</>
        ) : (
          'Kiểm tra hợp đồng'
        )}
      </Button>
    </div>
  );
}
