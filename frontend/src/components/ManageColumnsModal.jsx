import { useRef, useState } from 'react';

const COLUMN_TYPES = ['text', 'textarea', 'tel', 'number', 'date', 'dropdown', 'checkbox', 'reminder'];

function typeLabel(type, lang) {
  const labels = {
    text: { en: 'Text', zh: '文本' },
    textarea: { en: 'Long text', zh: '长文本' },
    tel: { en: 'Phone', zh: '电话' },
    number: { en: 'Number', zh: '数字' },
    date: { en: 'Date', zh: '日期' },
    dropdown: { en: 'Dropdown', zh: '下拉' },
    checkbox: { en: 'Checkbox', zh: '复选框' },
    reminder: { en: 'Reminder', zh: '提醒' },
  };
  return labels[type]?.[lang] || type;
}

export default function ManageColumnsModal({ columns, setColumns, lang, t, onClose }) {
  const [orderedColumns, setOrderedColumns] = useState(columns);
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameZh, setNewNameZh] = useState('');
  const [newType, setNewType] = useState('text');
  const [draggingId, setDraggingId] = useState(null);
  const orderedColumnsRef = useRef(columns);
  const draggingIdRef = useRef(null);

  function applyColumns(next, save = true) {
    orderedColumnsRef.current = next;
    setOrderedColumns(next);
    if (save) setColumns(next);
  }

  function handleAdd() {
    if (!newNameEn && !newNameZh) return;
    const id = 'col_' + crypto.randomUUID().slice(0, 8);
    applyColumns([
      ...orderedColumnsRef.current,
      { id, name: { en: newNameEn || newNameZh, zh: newNameZh || newNameEn }, type: newType },
    ]);
    setNewNameEn('');
    setNewNameZh('');
    setNewType('text');
  }

  function handleDelete(id) {
    if (window.confirm(t.deleteColumnConfirm)) {
      applyColumns(orderedColumnsRef.current.filter((col) => col.id !== id));
    }
  }

  function handleRename(id, langKey, value) {
    applyColumns(
      orderedColumnsRef.current.map((col) =>
        col.id === id ? { ...col, name: { ...col.name, [langKey]: value } } : col
      )
    );
  }

  function handleTypeChange(id, type) {
    applyColumns(
      orderedColumnsRef.current.map((col) => (col.id === id ? { ...col, type } : col))
    );
  }

  function handleDragStart(event, id) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingIdRef.current = id;
    setDraggingId(id);
  }

  function handleDragMove(event) {
    const activeId = draggingIdRef.current;
    if (!activeId) return;
    const targetItem = document.elementFromPoint(event.clientX, event.clientY)?.closest('.column-item');
    const targetId = targetItem?.dataset.columnId;
    if (!targetId || targetId === activeId) return;

    const next = [...orderedColumnsRef.current];
    const from = next.findIndex((column) => column.id === activeId);
    const to = next.findIndex((column) => column.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    applyColumns(next, false);
  }

  function handleDragEnd(event) {
    if (!draggingIdRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingIdRef.current = null;
    setDraggingId(null);
    setColumns(orderedColumnsRef.current);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t.manageColumns}</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="columns-list">
            {orderedColumns.map((col) => (
              <div
                key={col.id}
                data-column-id={col.id}
                className={`column-item ${draggingId === col.id ? 'is-dragging' : ''}`}
              >
                <button
                  type="button"
                  className="column-drag-handle"
                  aria-label={t.dragToReorder}
                  title={t.dragToReorder}
                  onPointerDown={(event) => handleDragStart(event, col.id)}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                >⠿</button>
                <div className="column-names">
                  <input
                    type="text"
                    className="col-name-input"
                    value={col.name.en}
                    onChange={(e) => handleRename(col.id, 'en', e.target.value)}
                    placeholder="English name"
                  />
                  <input
                    type="text"
                    className="col-name-input"
                    value={col.name.zh}
                    onChange={(e) => handleRename(col.id, 'zh', e.target.value)}
                    placeholder="中文名称"
                  />
                </div>
                <select
                  className="col-type-select"
                  value={col.type}
                  onChange={(e) => handleTypeChange(col.id, e.target.value)}
                >
                  {COLUMN_TYPES.map((ctype) => (
                    <option key={ctype} value={ctype}>{typeLabel(ctype, lang)}</option>
                  ))}
                </select>
                <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(col.id)}>×</button>
              </div>
            ))}
          </div>

          <div className="add-column-form">
            <h3>{t.addColumn}</h3>
            <div className="add-column-fields">
              <input
                type="text"
                className="col-name-input"
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder="English name"
              />
              <input
                type="text"
                className="col-name-input"
                value={newNameZh}
                onChange={(e) => setNewNameZh(e.target.value)}
                placeholder="中文名称"
              />
              <select
                className="col-type-select"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                {COLUMN_TYPES.map((ctype) => (
                  <option key={ctype} value={ctype}>{typeLabel(ctype, lang)}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleAdd}>{t.addColumn}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
