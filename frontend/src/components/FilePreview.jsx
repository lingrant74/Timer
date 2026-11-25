import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { recordMediaUrl } from '../api';

const PdfPreview = lazy(() => import('./PdfPreview'));

export default function FilePreview({ file, lang, onClose }) {
  const dialog = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(false);
  const zh = lang === 'zh';
  const url = file._pendingMedia ? `data:${file.mimeType};base64,${file.data}` : recordMediaUrl(file.id);

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    dialog.current.showModal();
    const controller = new AbortController();
    let objectUrl;
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('File unavailable');
        const blob = await response.blob();
        const mime = blob.type.split(';')[0];
        const extension = (file.name || '').split('.').pop().toLowerCase();
        const kind = mime.startsWith('image/') && mime !== 'image/svg+xml' ? 'image'
          : mime.startsWith('video/') ? 'video'
          : mime.startsWith('audio/') ? 'audio'
          : mime === 'application/pdf' || extension === 'pdf' ? 'pdf'
          : mime.startsWith('text/') || ['txt', 'csv', 'json', 'md', 'log'].includes(extension) ? 'text' : 'unsupported';
        if (kind === 'text') {
          const text = await blob.text();
          if (!controller.signal.aborted) setPreview({ kind, text });
        } else if (!controller.signal.aborted) {
          // Only allow known passive formats into the preview; never execute uploaded HTML.
          objectUrl = URL.createObjectURL(new Blob([blob], { type: kind === 'pdf' ? 'application/pdf' : mime }));
          setPreview({ kind, url: objectUrl });
        }
      } catch (err) {
        if (err.name !== 'AbortError') setError(true);
      }
    }
    load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, file.name]);

  return createPortal(
    <dialog ref={dialog} className="attachment-dialog" onCancel={onClose} onClose={onClose}>
      <div className="attachment-toolbar">
        <strong>{file.name || (zh ? '文件' : 'File')}</strong>
        <button type="button" onClick={onClose} aria-label={zh ? '关闭预览' : 'Close preview'}>×</button>
      </div>
      <div className="attachment-content">
        {error ? <p role="alert">{zh ? '无法加载文件，请重试。' : 'Could not load this file. Please try again.'}</p>
          : !preview ? <p role="status">{zh ? '加载中…' : 'Loading…'}</p>
          : preview.kind === 'text' ? <pre>{preview.text}</pre>
          : preview.kind === 'image' ? <img src={preview.url} alt={file.name || ''} />
          : preview.kind === 'video' ? <video src={preview.url} controls />
          : preview.kind === 'audio' ? <audio src={preview.url} controls />
          : preview.kind === 'pdf' ? <Suspense fallback={<p role="status">{zh ? '加载 PDF…' : 'Loading PDF…'}</p>}><PdfPreview url={preview.url} zh={zh} /></Suspense>
          : <p>{zh ? '此文件格式暂不支持预览。请在设备上使用相应应用打开原始文件。' : 'Preview is not available for this format. Open the original file in its app on your device.'}</p>}
      </div>
    </dialog>, document.body,
  );
}
