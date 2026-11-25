import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

function PdfPage({ document, number, zh }) {
  const container = useRef(null);
  const canvas = useRef(null);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [ratio, setRatio] = useState(1.414);
  const [error, setError] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '600px' });
    const resize = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(container.current);
    resize.observe(container.current);
    return () => { observer.disconnect(); resize.disconnect(); };
  }, []);

  useEffect(() => {
    if (!visible || !width) return;
    let cancelled = false;
    let task;
    async function render() {
      try {
        const page = await document.getPage(number);
        if (cancelled) return;
        const natural = page.getViewport({ scale: 1 });
        setRatio(natural.height / natural.width);
        // Bound canvas memory on high-density mobile screens.
        const scale = Math.min(window.devicePixelRatio || 1, 2, 1800 / width);
        const viewport = page.getViewport({ scale: width / natural.width * scale });
        const target = canvas.current;
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        task = page.render({ canvasContext: target.getContext('2d'), viewport });
        await task.promise;
      } catch (err) {
        if (!cancelled && err.name !== 'RenderingCancelledException') setError(true);
      }
    }
    render();
    return () => {
      cancelled = true;
      task?.cancel();
      if (canvas.current) { canvas.current.width = 0; canvas.current.height = 0; }
    };
  }, [document, number, visible, width]);

  return <section className="pdf-page" ref={container} aria-label={zh ? `第 ${number} 页` : `Page ${number}`}>
    <div className="pdf-page-number">{zh ? `第 ${number} 页` : `Page ${number}`}</div>
    <div style={{ aspectRatio: `1 / ${ratio}` }}>
      {error ? <p role="alert">{zh ? '此页无法显示，请在设备上打开原始文件。' : 'Could not display this page. Open the original file on your device.'}</p> : <canvas ref={canvas} role="img" aria-label={zh ? `第 ${number} 页内容` : `Page ${number} content`} />}
    </div>
  </section>;
}

export default function PdfPreview({ url, zh }) {
  const [document, setDocument] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setDocument(null);
    setError(false);
    const task = getDocument({ url, isEvalSupported: false });
    task.promise.then((pdf) => { if (!cancelled) setDocument(pdf); }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; task.destroy(); };
  }, [url]);

  if (error) return <p role="alert">{zh ? '无法打开此 PDF（可能已加密）。请在设备上打开原始文件。' : 'Could not open this PDF. It may be password protected. Open the original file on your device.'}</p>;
  if (!document) return <p role="status">{zh ? '加载 PDF…' : 'Loading PDF…'}</p>;
  return <div className="pdf-pages">
    <div className="pdf-page-count" role="status">{zh ? `共 ${document.numPages} 页 · 向下滚动查看` : `${document.numPages} pages · Scroll to view all pages`}</div>
    {Array.from({ length: document.numPages }, (_, index) => <PdfPage key={index} document={document} number={index + 1} zh={zh} />)}
  </div>;
}
