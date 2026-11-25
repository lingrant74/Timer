import { useState, useEffect, useCallback, useRef } from 'react';
import { getRecords, createRecord, updateRecord, deleteRecord, getRecordColumns, saveRecordColumns, linkRecordsSubscription, createRecordMedia } from '../api';
import { compareRecordPriority, compareDueTime } from '../recordPriority';
import DataTable from '../components/DataTable';
import ManageColumnsModal from '../components/ManageColumnsModal';

const POLL_INTERVAL = 300000; // 5 minutes

const URL_COLUMN = { id: 'websiteUrl', name: { en: 'URL / Link', zh: '网址 / 链接' }, type: 'url' };

const DEFAULT_COLUMNS = [
  { id: 'paid', name: { en: 'Paid', zh: '已付款' }, type: 'checkbox' },
  { id: 'address', name: { en: 'Address', zh: '地址' }, type: 'text' },
  { id: 'idNumber', name: { en: 'ID', zh: '编号' }, type: 'text' },
  { id: 'topCustom1', name: { en: 'Top Field 1', zh: '上方自定义 1' }, type: 'text' },
  { id: 'topCustom2', name: { en: 'Top Field 2', zh: '上方自定义 2' }, type: 'text' },
  { id: 'topCustom3', name: { en: 'Top Field 3', zh: '上方自定义 3' }, type: 'text' },
  { id: 'topCustom4', name: { en: 'Top Field 4', zh: '上方自定义 4' }, type: 'text' },
  { id: 'topCustom5', name: { en: 'Top Field 5', zh: '上方自定义 5' }, type: 'text' },
  { id: 'name', name: { en: 'Name', zh: '姓名' }, type: 'text' },
  { id: 'agentName', name: { en: 'Agent Name', zh: '经纪人姓名' }, type: 'text' },
  { id: 'agentCompany', name: { en: 'Company', zh: '经纪人公司' }, type: 'text' },
  { id: 'agentPhone', name: { en: 'Phone', zh: '电话号码' }, type: 'tel' },
  { id: 'mainCustom1', name: { en: 'Custom 1', zh: '自定义 1' }, type: 'text' },
  { id: 'mainCustom2', name: { en: 'Custom 2', zh: '自定义 2' }, type: 'text' },
  { id: 'mainCustom3', name: { en: 'Custom 3', zh: '自定义 3' }, type: 'text' },
  { id: 'mainCustom4', name: { en: 'Custom 4', zh: '自定义 4' }, type: 'text' },
  { id: 'mainCustom5', name: { en: 'Custom 5', zh: '自定义 5' }, type: 'text' },
  { id: 'personInCharge', name: { en: 'Person in Charge', zh: '经办人' }, type: 'text' },
  { id: 'handlerSignature', name: { en: 'Handler Signature', zh: '经手签名' }, type: 'text' },
  { id: 'remarks', name: { en: 'Remarks', zh: '备注' }, type: 'textarea' },
  { id: 'amount', name: { en: 'Amount', zh: '金额' }, type: 'number' },
  { id: 'dueDate', name: { en: 'Due Date', zh: '到期日' }, type: 'date' },
  { id: 'reminder', name: { en: 'Reminder', zh: '提醒' }, type: 'reminder' },
  URL_COLUMN,
];

export default function RecordsPage({ t, lang, subscriptionId, notificationsEnabled, enableNotifications, pushError, dueWarningSettings }) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(() => {
    const saved = localStorage.getItem('recordsSortV2') || 'priority-time';
    const previousOptions = {
      'amount-high': 'column:amount:desc',
      'amount-low': 'column:amount:asc',
      'due-earliest': 'column:dueDate:asc',
      'due-latest': 'column:dueDate:desc',
    };
    return previousOptions[saved] || saved;
  });
  const [showManage, setShowManage] = useState(false);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState('idle');
  const pending = useRef(false);
  const saving = useRef(false);
  const dirtyIds = useRef(new Set());
  const deletedIds = useRef(new Set());
  const columnsDirty = useRef(false);
  const version = useRef(0);

  function markDirty(id) {
    pending.current = true;
    version.current += 1;
    if (id) dirtyIds.current.add(id);
    setSaveState('dirty');
  }

  useEffect(() => {
    function warn(event) {
      if (!pending.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // Load data from backend
  const loadData = useCallback(async () => {
    if (pending.current || saving.current) return;
    const loadedVersion = version.current;
    try {
      const [cols, records] = await Promise.all([getRecordColumns(), getRecords()]);
      if (pending.current || saving.current || version.current !== loadedVersion) return;
      const loadedColumns = cols.length ? cols : DEFAULT_COLUMNS;
      if (loadedColumns.some((column) => column.type === 'url')) {
        setColumns(loadedColumns);
      } else {
        // Add a shared URL field without replacing any existing column or record value.
        let id = URL_COLUMN.id;
        while (loadedColumns.some((column) => column.id === id)) id += '_link';
        setColumns([...loadedColumns, { ...URL_COLUMN, id }]);
        columnsDirty.current = true;
      }
      setRows(records.map(recordToRow));
      setError(null);
    } catch {
      setError(t.errorBackend);
    }
  }, [t.errorBackend]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadData]);

  useEffect(() => {
    if (!subscriptionId) return;
    linkRecordsSubscription(subscriptionId)
      .then(() => {
        setRows((current) => current.map((row) => ({ ...row, _subscriptionId: subscriptionId })));
      })
      .catch(() => setError(t.errorCreate));
  }, [subscriptionId, t.errorCreate]);

  // Reload on tab focus
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') loadData();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loadData]);

  // Convert API record to flat row for UI
  function recordToRow(record) {
    return {
      id: record.id,
      ...record.data,
      reminder: record.reminder || '',
      dueDate: record.dueDate || '',
      customFields: record.customFields || [],
      _subscriptionId: record.subscriptionId,
      _createdAt: Number(record.createdAt) || 0,
    };
  }

  // Convert flat row to API shape for saving
  function rowToPayload(row) {
    const { id, customFields, reminder, dueDate, _subscriptionId, _createdAt, _isNew, ...data } = row;
    return { data, customFields: customFields || [], reminder: reminder || '', dueDate: dueDate || '' };
  }

  const handleAddRow = () => {
    const id = `draft-${crypto.randomUUID()}`;
    const data = {};
    columns.forEach((col) => { data[col.id] = ''; });
    markDirty(id);
    setRows((prev) => [{ ...data, id, customFields: [], reminder: '', dueDate: '', _createdAt: Date.now(), _isNew: true }, ...prev]);
  };

  const handleCellChange = useCallback((rowId, key, value) => {
    markDirty(rowId);
    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== rowId) return row;
        if (key === 'paid' && value === true) {
          return { ...row, paid: true, reminder: '' };
        }
        return { ...row, [key]: value };
      });
      return updated;
    });
  }, [columns]);

  const handleCustomFieldChange = useCallback((rowId, fieldIndex, key, value) => {
    markDirty(rowId);
    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== rowId) return row;
        const customFields = [...(row.customFields || [])];
        customFields[fieldIndex] = { ...customFields[fieldIndex], [key]: value };
        return { ...row, customFields };
      });
      return updated;
    });
  }, []);

  const handleAddCustomField = useCallback((rowId) => {
    markDirty(rowId);
    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== rowId) return row;
        const customFields = [...(row.customFields || []), { name: '', value: '' }];
        return { ...row, customFields };
      });
      return updated;
    });
  }, []);

  const handleDeleteCustomField = useCallback((rowId, fieldIndex) => {
    markDirty(rowId);
    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== rowId) return row;
        const customFields = (row.customFields || []).filter((_, i) => i !== fieldIndex);
        return { ...row, customFields };
      });
      return updated;
    });
  }, []);

  const handleDelete = (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    if (!rows.find((row) => row.id === id)?._isNew) deletedIds.current.add(id);
    dirtyIds.current.delete(id);
    markDirty();
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleClearAll = () => {
    if (!window.confirm(t.clearConfirm)) return;
    rows.forEach((row) => { if (!row._isNew) deletedIds.current.add(row.id); });
    dirtyIds.current.clear();
    markDirty();
    setRows([]);
  };

  const handleColumnsChange = (newColumns) => {
    columnsDirty.current = true;
    markDirty();
    setColumns(newColumns);
  };

  const handleSaveAll = async () => {
    if (saving.current || !pending.current) return;
    saving.current = true;
    setSaveState('saving');
    try {
      // Save sequentially so successful writes can be acknowledged even if a later request fails.
      for (const row of rows) {
        if (!dirtyIds.current.has(row.id)) continue;
        const prepared = { ...row };
        for (const [key, value] of Object.entries(prepared)) {
          if (value && typeof value === 'object' && value._pendingMedia) {
            const media = await createRecordMedia({ name: value.name, mimeType: value.mimeType, data: value.data });
            prepared[key] = media;
          }
        }
        const payload = rowToPayload(prepared);
        const saved = row._isNew
          ? await createRecord({ ...payload, subscriptionId: subscriptionId || null })
          : await updateRecord(row.id, payload);
        dirtyIds.current.delete(row.id);
        setRows((current) => current.map((item) => item.id === row.id ? recordToRow(saved) : item));
      }
      for (const id of [...deletedIds.current]) {
        await deleteRecord(id);
        deletedIds.current.delete(id);
      }
      if (columnsDirty.current) {
        await saveRecordColumns(columns);
        columnsDirty.current = false;
      }
      pending.current = false;
      setError(null);
      setSaveState('saved');
    } catch {
      setSaveState('dirty');
      setError(t.errorSave || t.errorCreate);
    } finally {
      saving.current = false;
    }
  };

  const searchLower = search.toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (!searchLower) return true;
    return columns.some((col) => {
      const val = row[col.id];
      return val && String(val).toLowerCase().includes(searchLower);
    });
  });

  function compareOptional(a, b, direction = 1) {
    const aMissing = a === null || a === undefined || a === '' || Number.isNaN(a);
    const bMissing = b === null || b === undefined || b === '' || Number.isNaN(b);
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return (a < b ? -1 : a > b ? 1 : 0) * direction;
  }

  const sortedRows = [...filteredRows].sort((a, b) => {
    const priority = compareRecordPriority(a, b, dueWarningSettings);
    if (priority) return priority;
    if (sortBy === 'priority-time') {
      return compareDueTime(a, b) || compareOptional(a._createdAt, b._createdAt, -1);
    }

    if (sortBy.startsWith('column:')) {
      const [, columnId, directionName] = sortBy.split(':');
      const column = columns.find((item) => item.id === columnId);
      const direction = directionName === 'desc' ? -1 : 1;
      let aValue = a[columnId];
      let bValue = b[columnId];
      if (column?.type === 'number') {
        aValue = Number.parseFloat(aValue);
        bValue = Number.parseFloat(bValue);
      } else if (column?.type === 'checkbox') {
        aValue = aValue === true || aValue === 'true' ? 1 : 0;
        bValue = bValue === true || bValue === 'true' ? 1 : 0;
      } else {
        aValue = aValue == null ? '' : String(aValue).toLocaleLowerCase(lang);
        bValue = bValue == null ? '' : String(bValue).toLocaleLowerCase(lang);
      }
      return compareOptional(aValue, bValue, direction);
    }
    if (sortBy === 'oldest') return compareOptional(a._createdAt, b._createdAt, 1);
    if (sortBy === 'amount-high') return compareOptional(Number.parseFloat(a.amount), Number.parseFloat(b.amount), -1);
    if (sortBy === 'amount-low') return compareOptional(Number.parseFloat(a.amount), Number.parseFloat(b.amount), 1);
    if (sortBy === 'due-latest') return compareOptional(a.dueDate, b.dueDate, -1);
    if (sortBy === 'due-earliest') return compareOptional(a.dueDate, b.dueDate, 1);
    return compareOptional(a._createdAt, b._createdAt, -1);
  });

  function handleSortChange(event) {
    const next = event.target.value;
    setSortBy(next);
    localStorage.setItem('recordsSortV2', next);
  }

  function handleColumnSort(columnId) {
    const prefix = `column:${columnId}:`;
    const next = sortBy === `${prefix}asc` ? `${prefix}desc` : `${prefix}asc`;
    setSortBy(next);
    localStorage.setItem('recordsSortV2', next);
  }

  const hasAmountColumn = columns.some((col) => col.id === 'amount');
  const totalAmount = hasAmountColumn
    ? rows.reduce((sum, row) => {
        const amount = parseFloat(row.amount);
        return sum + (Number.isNaN(amount) ? 0 : amount);
      }, 0)
    : null;

  const formattedTotal = totalAmount !== null
    ? totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

  return (
    <div className="page records-page">
      <fieldset className="records-editor" disabled={saveState === 'saving'}>
      <header className="page-header">
        <h1>{t.recordsTitle}</h1>
        <div className="summary">
          <span className="summary-card">
            {lang === 'zh' ? '行' : 'Rows'} <span className="value">{rows.length}</span>
          </span>
          {formattedTotal !== null && (
            <span className="summary-card">
              {t.amountTotal} <span className="value">{lang === 'zh' ? '¥' : '$'}{formattedTotal}</span>
            </span>
          )}
        </div>
      </header>

      {saveState === 'dirty' && <div className="banner" role="status">{lang === 'zh' ? '有未保存的更改。点击保存以保留。' : 'Unsaved changes. Click Save to keep them.'}</div>}
      {error && <div className="banner error">{error}</div>}
      {pushError && <div className="banner error">{pushError}</div>}

      <div className="records-notification-row">
        <span>{t.phoneReminders}</span>
        <button
          type="button"
          className={`btn btn-notify ${notificationsEnabled ? 'is-on' : ''}`}
          onClick={enableNotifications}
          disabled={notificationsEnabled}
        >
          {notificationsEnabled ? t.notificationsOn : t.enableNotifications}
        </button>
      </div>

      <div className="toolbar">
        <div className="search-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="sort-wrapper">
          <span>{t.sortBy}</span>
          <select className="sort-select" value={sortBy} onChange={handleSortChange}>
            <option value="priority-time">{lang === 'zh' ? '红色优先 · 到期时间从早到晚' : 'Red first · Earliest due time'}</option>
            <option value="newest">{t.sortNewest}</option>
            <option value="oldest">{t.sortOldest}</option>
            {columns.map((column) => {
              const name = column.name[lang] || column.name.en || column.name.zh;
              return [
                <option key={`${column.id}-asc`} value={`column:${column.id}:asc`}>
                  {t.sortColumnAsc(name, column.type)}
                </option>,
                <option key={`${column.id}-desc`} value={`column:${column.id}:desc`}>
                  {t.sortColumnDesc(name, column.type)}
                </option>,
              ];
            })}
          </select>
        </label>
        <div className="toolbar-buttons">
          <button className="btn btn-primary" onClick={handleAddRow}>{t.addRow}</button>
          <button
            className={`btn btn-save ${saveState === 'saved' ? 'is-saved' : ''}`}
            onClick={handleSaveAll}
            disabled={saveState !== 'dirty'}
          >
            {saveState === 'saving' ? t.saving : saveState === 'saved' ? t.saved : t.save}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowManage(true)}>{t.manageColumns}</button>
          {rows.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearAll}>{t.clearAll}</button>
          )}
        </div>
      </div>

      {rows.length === 0 && !error ? (
        <div className="empty-state">
          <p>{t.emptyState}</p>
          <p>{t.emptyStateSub}</p>
        </div>
      ) : filteredRows.length === 0 && rows.length > 0 ? (
        <div className="empty-state">
          <p>{t.noMatch}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={sortedRows}
          lang={lang}
          t={t}
          onCellChange={handleCellChange}
          onDelete={handleDelete}
          onAddCustomField={handleAddCustomField}
          onCustomFieldChange={handleCustomFieldChange}
          onDeleteCustomField={handleDeleteCustomField}
          dueWarningSettings={dueWarningSettings}
          sortBy={sortBy}
          onSortColumn={handleColumnSort}
        />
      )}

      {showManage && (
        <ManageColumnsModal
          columns={columns}
          setColumns={handleColumnsChange}
          lang={lang}
          t={t}
          onClose={() => setShowManage(false)}
        />
      )}
      </fieldset>
    </div>
  );
}
