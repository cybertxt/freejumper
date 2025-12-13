// 获取默认模板（根据语言）
function getDefaultTemplates() {
  return [
    { id: '1', name: chrome.i18n.getMessage('defaultGoogle'), url: 'https://www.google.com/search?q={text}' },
    { id: '2', name: chrome.i18n.getMessage('defaultBaidu'), url: 'https://www.baidu.com/s?wd={text}' }
  ];
}

// 初始化UI文本
function initializeI18n() {
  document.getElementById('pageTitle').textContent = chrome.i18n.getMessage('extensionName');
  document.getElementById('headerTitle').textContent = `🚀 ${chrome.i18n.getMessage('extensionName')}`;
  document.getElementById('infoText').innerHTML = chrome.i18n.getMessage('popupInfo');
  document.getElementById('configLabel').textContent = chrome.i18n.getMessage('configuredTemplates');
  document.getElementById('optionsBtn').textContent = chrome.i18n.getMessage('openOptions');
}

// 页面加载时显示当前配置
document.addEventListener('DOMContentLoaded', () => {
  initializeI18n();
  loadCurrentConfig();
  
  // 打开配置页面按钮
  document.getElementById('optionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});

// 加载当前配置
function loadCurrentConfig() {
  chrome.storage.sync.get(['urlTemplates'], (result) => {
    const templates = result.urlTemplates || getDefaultTemplates();
    renderTemplates(templates);
  });
}

// 渲染模板列表
function renderTemplates(templates) {
  const listEl = document.getElementById('templatesList');
  
  if (!templates || templates.length === 0) {
    listEl.innerHTML = `<div class="empty-state">${chrome.i18n.getMessage('noConfig')}</div>`;
    return;
  }
  
  listEl.innerHTML = templates.map((template, index) => {
    const name = template.name || chrome.i18n.getMessage('templateName', [String(index + 1)]);
    const url = template.url || '';
    // 截断过长的URL
    const displayUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
    
    return `
      <div class="template-item">
        <div class="template-name">${escapeHtml(name)}</div>
        <div class="template-url" title="${escapeHtml(url)}">${escapeHtml(displayUrl)}</div>
      </div>
    `;
  }).join('');
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
