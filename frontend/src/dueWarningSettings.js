export const DEFAULT_DUE_WARNING_SETTINGS = {
  soonDays: 7,
  urgentDays: 3,
  criticalHours: 24,
};

export function loadDueWarningSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('dueWarningSettings'));
    return { ...DEFAULT_DUE_WARNING_SETTINGS, ...saved };
  } catch {
    return DEFAULT_DUE_WARNING_SETTINGS;
  }
}

export function getDueStatus(value, settings = DEFAULT_DUE_WARNING_SETTINGS) {
  if (!value) return '';
  const due = new Date(value.includes('T') ? value : `${value}T23:59:59`).getTime();
  if (Number.isNaN(due)) return '';
  const hoursLeft = (due - Date.now()) / (60 * 60 * 1000);
  if (hoursLeft <= 0) return 'overdue';
  if (hoursLeft <= Number(settings.criticalHours) || 0) return 'critical';
  if (hoursLeft <= (Number(settings.urgentDays) || 0) * 24) return 'urgent';
  if (hoursLeft <= (Number(settings.soonDays) || 0) * 24) return 'soon';
  return '';
}
