import { useState } from 'react';

const COLUMN_TYPES = ['text', 'number', 'date', 'dropdown', 'checkbox', 'reminder'];

function typeLabel(type, lang) {
  const labels = {
    text: { en: 'Text', zh: '文本' },
    number: { en: 'Number', zh: '数字' },
    date: { en: 'Date', zh: '日期' },
    dropdown: { en: 'Dropdown', zh: '下拉' },
    checkbox: { en: 'Checkbox', zh: '复选框' },
    reminder: { en: 'Reminder', zh: '提醒' },
  };
  return labels[type]?.[lang] || type;
}

export default function ManageColumnsModal({ columns, setColumns, lang, t, onClose }) {
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameZh, setNewNameZh] = useState('');
  const [newType, setNewType] = useState('text');

  function handleAdd() {
    if (!newNameEn && !newNameZh) return;
    const id = 'col_' + crypto.randomUUID().slice(0, 8);
    setColumns((prev) => [
      ...prev,
      { id, name: { en: newNameEn || newNameZh, zh: newNameZh || newNameEn }, type: newType },
    ]);
    setNewNameEn('');
    setNewNameZh('');
    setNewType('text');
  }

  function handleDelete(id) {
    if (window.confirm(t.deleteColumnConfirm)) {
      setColumns((prev) => prev.filter((col) => col.id !== id));
    }
  }

  function handleRename(id, langKey, value) {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === id ? { ...col, name: { ...col.name, [langKey]: value } } : col
      )
    );
  }

  function handleTypeChange(id, type) {
    setColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, type } : col))
    );
  }

  function handleMove(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    setColumns((prev) => {
      const arr = [...prev];
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
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
            {columns.map((col, index) => (
              <div key={col.id} className="column-item">
                <div className="column-move">
                  <button
                    className="btn-icon btn-icon-sm"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                  >↑</button>
                  <button
                    className="btn-icon btn-icon-sm"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === columns.length - 1}
                  >↓</button>
                </div>
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
