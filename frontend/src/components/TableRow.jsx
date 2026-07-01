import CellInput from './CellInput';

export default function TableRow({
  row, columns, lang, t, mode,
  onCellChange, onDelete,
  onAddCustomField, onCustomFieldChange, onDeleteCustomField,
}) {
  const customFields = row.customFields || [];
  const placeholder = lang === 'zh' ? '点击编辑' : 'Click to edit';

  if (mode === 'card') {
    return (
      <div className="record-card">
        {columns.map((col) => (
          <div key={col.id} className="card-field">
            <label>{col.name[lang] || col.name.en || col.name.zh}</label>
            <CellInput
              type={col.type}
              value={row[col.id] || ''}
              onChange={(val) => onCellChange(row.id, col.id, val)}
              lang={lang}
              t={t}
              placeholder={placeholder}
            />
          </div>
        ))}
        {customFields.map((field, i) => (
          <div key={i} className="card-field custom-field">
            <div className="custom-field-header">
              <input
                type="text"
                className="custom-field-name"
                value={field.name}
                onChange={(e) => onCustomFieldChange(row.id, i, 'name', e.target.value)}
                placeholder={t.fieldName}
              />
              <button
                className="btn-icon btn-icon-sm btn-danger-icon"
                onClick={() => onDeleteCustomField(row.id, i)}
              >×</button>
            </div>
            <input
              type="text"
              className="cell-input"
              value={field.value}
              onChange={(e) => onCustomFieldChange(row.id, i, 'value', e.target.value)}
              placeholder={t.fieldValue}
            />
          </div>
        ))}
        <div className="card-actions">
          <button className="btn btn-small btn-ghost" onClick={() => onAddCustomField(row.id)}>
            {t.addField}
          </button>
          <button className="btn-row-action danger" onClick={() => onDelete(row.id)}>
            {t.deleteBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <tr>
        {columns.map((col) => (
          <td key={col.id}>
            <CellInput
              type={col.type}
              value={row[col.id] || ''}
              onChange={(val) => onCellChange(row.id, col.id, val)}
              lang={lang}
              t={t}
              placeholder={placeholder}
            />
          </td>
        ))}
        <td className="col-actions">
          <div className="actions-group">
            <button
              className="btn-row-action"
              onClick={() => onAddCustomField(row.id)}
              title={t.addField}
            >{t.addField}</button>
            <button
              className="btn-row-action danger"
              onClick={() => onDelete(row.id)}
            >{t.deleteBtn}</button>
          </div>
        </td>
      </tr>
      {customFields.length > 0 && (
        <tr className="custom-fields-row">
          <td colSpan={columns.length + 1}>
            <div className="custom-fields-inline">
              {customFields.map((field, i) => (
                <div key={i} className="inline-custom-field">
                  <input
                    type="text"
                    className="custom-field-name"
                    value={field.name}
                    onChange={(e) => onCustomFieldChange(row.id, i, 'name', e.target.value)}
                    placeholder={t.fieldName}
                  />
                  <input
                    type="text"
                    className="cell-input"
                    value={field.value}
                    onChange={(e) => onCustomFieldChange(row.id, i, 'value', e.target.value)}
                    placeholder={t.fieldValue}
                  />
                  <button
                    className="btn-icon btn-icon-sm btn-danger-icon"
                    onClick={() => onDeleteCustomField(row.id, i)}
                  >×</button>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
