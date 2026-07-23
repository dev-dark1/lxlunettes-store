import { useRef, useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2 } from 'lucide-react';

interface Props {
  accept?: string;           // e.g. "image/*,video/*"
  onUploaded: (url: string, type: 'image' | 'video', name: string) => void;
  label?: string;
  className?: string;
  compact?: boolean;         // true = small icon-only button
}

export function FileUploadButton({
  accept = 'image/*,video/*',
  onUploaded,
  label = 'Importer un fichier',
  className = '',
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await adminApi.post('/api/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.url, data.type as 'image' | 'video', data.originalName || file.name);
      toast({ title: `Fichier importé ✓` });
    } catch (e: any) {
      toast({ title: e?.message || e?.response?.data?.error || 'Erreur lors de l\'import', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onClick = () => !uploading && inputRef.current?.click();

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <button
        type="button"
        onClick={onClick}
        disabled={uploading}
        className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          ${compact
            ? 'px-2.5 py-1.5 bg-muted/60 hover:bg-accent border border-border text-muted-foreground hover:text-foreground rounded-sm'
            : 'px-3 py-2 bg-muted/60 hover:bg-accent border border-border text-muted-foreground hover:text-foreground rounded-sm'
          } ${className}`}
        title={label}
      >
        {uploading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Upload className="w-3.5 h-3.5" />}
        {!compact && (uploading ? 'Import...' : label)}
      </button>
    </>
  );
}
