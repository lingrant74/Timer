import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { recordMediaUrl } from '../api';

export default function FilePreview({ file, lang, onClose }) {
  const dialog = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(false);
  const zh = lang === 'zh';
  const url = recordMediaUrl(file.id);

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
        <a href={url} target="_blank" rel="noreferrer" download={file.name || true}>{zh ? '下载' : 'Download'}</a>
        <button type="button" onClick={onClose} aria-label={zh ? '关闭预览' : 'Close preview'}>×</button>
      </div>
      <div className="attachment-content">
        {error ? <p role="alert">{zh ? '无法加载文件，请重试。' : 'Could not load this file. Please try again.'}</p>
          : !preview ? <p role="status">{zh ? '加载中…' : 'Loading…'}</p>
          : preview.kind === 'text' ? <pre>{preview.text}</pre>
          : preview.kind === 'image' ? <img src={preview.url} alt={file.name || ''} />
          : preview.kind === 'video' ? <video src={preview.url} controls />
          : preview.kind === 'audio' ? <audio src={preview.url} controls />
          : preview.kind === 'pdf' ? <iframe src={preview.url} title={file.name || 'PDF'} />
          : <p>{zh ? '此文件格式暂不支持预览。请下载后在相应应用中打开。' : 'Preview is not available for this format. Download it to open in its app.'}</p>}
      </div>
    </dialog>, document.body,
  );
}
