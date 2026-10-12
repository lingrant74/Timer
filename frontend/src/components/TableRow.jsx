import { useState, useEffect } from 'react';
import CellInput from './CellInput';
import { getDueStatus } from '../dueWarningSettings';

const AGENT_FIELD_IDS = ['agentName', 'agentCompany', 'agentPhone'];

export default function TableRow({
  row, columns, lang, t, mode,
  onCellChange, onDelete,
  onAddCustomField, onCustomFieldChange, onDeleteCustomField, dueWarningSettings,
}) {
  const customFields = row.customFields || [];
  const placeholder = lang === 'zh' ? '点击编辑' : 'Click to edit';
  const [, setClockTick] = useState(0);
  const [isExpanded, setIsExpanded] = useState(Boolean(row._isNew));

  useEffect(() => {
    if (mode !== 'card' || !row.dueDate) return undefined;
    const timer = setInterval(() => setClockTick((tick) => tick + 1), 60000);
    return () => clearInterval(timer);
  }, [mode, row.dueDate]);

  if (mode === 'card') {
    const isPaid = row.paid === true || row.paid === 'true';
    const dueStatus = isPaid ? '' : getDueStatus(row.dueDate, dueWarningSettings);
    const agentColumns = columns.filter((col) => AGENT_FIELD_IDS.includes(col.id));
    const reminderColumns = columns.filter((col) => col.id === 'reminder');
    const otherColumns = columns.filter(
      (col) => !AGENT_FIELD_IDS.includes(col.id) && col.id !== 'reminder'
    );
    const nameIndex = otherColumns.findIndex((col) => col.id === 'name');
    const fieldsBeforeAgent = nameIndex >= 0 ? otherColumns.slice(0, nameIndex + 1) : [];
    const fieldsAfterAgent = nameIndex >= 0 ? otherColumns.slice(nameIndex + 1) : otherColumns;

    const renderCardField = (col) => (
      <div key={col.id} className="card-field">
        <label>{col.name[lang] || col.name.en || col.name.zh}</label>
        <CellInput
          type={col.type}
          value={row[col.id] || ''}
          onChange={(val) => onCellChange(row.id, col.id, val)}
          lang={lang}
          t={t}
          placeholder={placeholder}
          dueWarningSettings={dueWarningSettings}
          isPaid={isPaid}
        />
      </div>
    );

    const title = row.name || row.address || t.untitledRecord;
    const dueLabel = row.dueDate
      ? new Date(row.dueDate.includes('T') ? row.dueDate : `${row.dueDate}T23:59:59`).toLocaleDateString()
      : t.noDueDate;

    return (
      <div className={`record-card ${isPaid ? 'record-card-paid' : `due-card-${dueStatus}`}`}>
        <div className="record-card-header">
          <div className="record-card-summary">
            <strong>{title}</strong>
            <span className="record-card-meta">
              {row.amount ? `${lang === 'zh' ? '¥' : '$'}${row.amount} · ` : ''}{dueLabel}
              <em className={`paid-status ${isPaid ? 'is-paid' : ''}`}>{isPaid ? t.paid : t.unpaid}</em>
            </span>
          </div>
          <button
            type="button"
            className="record-expand-btn"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? t.collapseRecord : t.editRecord}
            <span className={`expand-chevron ${isExpanded ? 'is-open' : ''}`}>⌄</span>
          </button>
        </div>
        {isExpanded && (
          <div className="record-card-body">
            {fieldsBeforeAgent.map(renderCardField)}
            {agentColumns.map(renderCardField)}
            {fieldsAfterAgent.map(renderCardField)}
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
            {reminderColumns.map(renderCardField)}
          </div>
        )}
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
              dueWarningSettings={dueWarningSettings}
              isPaid={row.paid === true || row.paid === 'true'}
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
