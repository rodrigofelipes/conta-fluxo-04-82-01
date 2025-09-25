import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Upload, Download, File, Trash2, FileText, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTaskFiles } from '@/hooks/useTaskFiles';

interface TaskFilesProps {
  taskId: string;
}

export function TaskFiles({ taskId }: TaskFilesProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { files, loading, uploading, uploadFile, downloadFile, deleteFile } = useTaskFiles(taskId);
  const { toast } = useToast();

  const handleFileUpload = async (selectedFiles: FileList) => {
    if (selectedFiles.length === 0) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Verificar tamanho do arquivo (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: `O arquivo "${file.name}" excede o limite de 10MB.`,
          variant: 'destructive'
        });
        continue;
      }

      try {
        await uploadFile(file);
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFileUpload(droppedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const getFileIcon = (contentType?: string) => {
    if (!contentType) return File;
    
    if (contentType.startsWith('image/')) return Image;
    if (contentType.startsWith('video/')) return Video;
    if (contentType.includes('pdf') || contentType.includes('document')) return FileText;
    
    return File;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Tamanho desconhecido';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando arquivos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Área de upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Enviar Arquivos</h3>
        <p className="text-muted-foreground mb-4">
          Arraste e solte arquivos aqui ou clique para selecionar
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
        >
          {uploading ? 'Enviando...' : 'Selecionar Arquivos'}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Máximo 10MB por arquivo
        </p>
      </div>

      {/* Lista de arquivos */}
      {files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum arquivo anexado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-medium">Arquivos Anexados ({files.length})</h3>
          <div className="space-y-2">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.content_type);
              
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {formatDate(file.created_at)} • 
                        {file.uploader?.full_name || file.uploader?.username || 'Usuário'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFile(file.id, file.storage_path)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}