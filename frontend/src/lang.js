// lang.js — all UI strings in English and Chinese (Simplified)
const strings = {
  en: {
    appTitle:            'Timers',
    notificationsOn:     '🔔 Notifications on',
    enableNotifications: 'Enable Notifications',
    langToggle:          '中文',

    warnNotifications:   'Enable notifications so you get alerted when a timer finishes, even with this tab closed.',

    formTitle:           'New Timer',
    namePlaceholder:     'Timer name',
    hr:                  'hr',
    min:                 'min',
    sec:                 'sec',
    startTimer:          'Start Timer',
    timerAdded:          'Timer added!',
    errorNoName:         'Please enter a timer name.',
    errorNoDuration:     'Please set a duration greater than 0.',

    active:              'Active',
    completed:           'Completed',
    noActive:            'No active timers.',
    done:                'Done',
    deleteLabel:         (name) => `Delete ${name}`,
    deleteBtn:           'Delete',

    errorBackend:        'Cannot reach the backend. Is the server running?',
    errorCreate:         'Failed to create timer.',

    // iOS install
    installTitle:        'Install on iPhone to enable notifications',
    installStep1:        'Open this page in',
    installStep1b:       'Safari',
    installStep2:        'Tap the',
    installStep2b:       'Share',
    installStep2c:       'button ⬆',
    installStep3:        'Choose',
    installStep3b:       'Add to Home Screen',
    installStep4:        'Open the app from your Home Screen',
    installStep5:        'Tap',
    installStep5b:       'Enable Notifications',
    installStep5c:       'above',
    installNote:         'iOS only supports push notifications for installed PWAs. This step is required on iPhone.',
  },

  zh: {
    appTitle:            '计时器',
    notificationsOn:     '🔔 通知已开启',
    enableNotifications: '开启通知',
    langToggle:          'English',

    warnNotifications:   '请开启通知，这样即使关闭了标签页，计时结束时也能收到提醒。',

    formTitle:           '新建计时器',
    namePlaceholder:     '计时器名称',
    hr:                  '时',
    min:                 '分',
    sec:                 '秒',
    startTimer:          '开始计时',
    timerAdded:          '已添加！',
    errorNoName:         '请输入计时器名称。',
    errorNoDuration:     '请设置大于 0 的时长。',

    active:              '进行中',
    completed:           '已完成',
    noActive:            '暂无计时器。',
    done:                '完成',
    deleteLabel:         (name) => `删除 ${name}`,
    deleteBtn:           '删除',

    errorBackend:        '无法连接后端，服务器是否正在运行？',
    errorCreate:         '创建计时器失败。',

    // iOS install
    installTitle:        '请在 iPhone 上安装以启用通知',
    installStep1:        '在',
    installStep1b:       'Safari',
    installStep2:        '点击',
    installStep2b:       '分享',
    installStep2c:       '按钮 ⬆',
    installStep3:        '选择',
    installStep3b:       '添加到主屏幕',
    installStep4:        '从主屏幕打开应用',
    installStep5:        '点击上方的',
    installStep5b:       '开启通知',
    installStep5c:       '',
    installNote:         'iOS 仅支持已安装到主屏幕的 PWA 接收推送通知，iPhone 用户必须完成此步骤。',
  },
};

export default strings;
