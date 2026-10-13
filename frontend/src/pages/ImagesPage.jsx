import { useEffect, useRef, useState } from 'react';
import { createImage, deleteImage, getImages } from '../api';

const MAX_SIDE = 1600;

function prepareImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.onload = () => {
      const source = new Image();
      source.onerror = () => reject(new Error('This image format is not supported.'));
      source.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({ mimeType: 'image/jpeg', data: dataUrl.split(',')[1] });
      };
      source.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImagesPage({ t }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    getImages().then(setImages).catch(() => setError(t.imagesLoadError));
  }, [t.imagesLoadError]);

  async function upload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        const prepared = await prepareImage(file);
        const saved = await createImage({ name: file.name, ...prepared });
        setImages((current) => [saved, ...current]);
      }
    } catch (err) {
      setError(err.message || t.imagesUploadError);
    } finally {
      setUploading(false);
    }
  }

  async function remove(image) {
    if (!window.confirm(t.imageDeleteConfirm)) return;
    try {
      await deleteImage(image.id);
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch {
      setError(t.imagesDeleteError);
    }
  }

  return (
    <section className="page images-page">
      <div className="images-header">
        <div>
          <h1>{t.imagesTitle}</h1>
          <p>{t.imagesDescription}</p>
        </div>
        <button className="btn btn-primary images-add" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? t.imagesUploading : t.imagesAdd}
        </button>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={upload} />
      </div>

      {error && <div className="images-error">{error}</div>}
      {!images.length && !error ? (
        <button className="images-empty" onClick={() => inputRef.current?.click()}>
          <span className="images-empty-icon">＋</span>
          <strong>{t.imagesEmpty}</strong>
          <small>{t.imagesEmptySub}</small>
        </button>
      ) : (
        <div className="image-grid">
          {images.map((image) => (
            <article className="image-card" key={image.id}>
              <a href={`data:${image.mimeType};base64,${image.data}`} target="_blank" rel="noreferrer">
                <img src={`data:${image.mimeType};base64,${image.data}`} alt={image.name || t.imageAlt} />
              </a>
              <div className="image-card-footer">
                <span title={image.name}>{image.name || t.imageAlt}</span>
                <button className="image-delete" onClick={() => remove(image)} aria-label={t.deleteBtn}>×</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
