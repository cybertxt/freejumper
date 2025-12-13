// 获取默认模板（根据语言）
function getDefaultTemplates() {
  return [
    { id: '1', name: chrome.i18n.getMessage('defaultGoogle'), url: 'https://www.google.com/search?q={text}' },
    { id: '2', name: chrome.i18n.getMessage('defaultBaidu'), url: 'https://www.baidu.com/s?wd={text}' }
  ];
}

let templates = [];
let nextId = 1;

// 初始化UI文本
function initializeI18n() {
  document.getElementById('pageTitle').textContent = chrome.i18n.getMessage('optionsTitle');
  document.getElementById('headerTitle').textContent = chrome.i18n.getMessage('optionsTitle');
  document.getElementById('headerSubtitle').textContent = chrome.i18n.getMessage('optionsSubtitle');
  document.getElementById('templatesTitle').textContent = chrome.i18n.getMessage('urlTemplates');
  document.getElementById('addTemplateBtn').textContent = chrome.i18n.getMessage('addTemplate');
  document.getElementById('templateHint').textContent = chrome.i18n.getMessage('templateHint');
  document.getElementById('quickAddTitle').textContent = chrome.i18n.getMessage('quickAdd');
  document.getElementById('previewTitle').textContent = chrome.i18n.getMessage('preview');
  document.getElementById('previewHint').textContent = chrome.i18n.getMessage('previewHint');
  document.getElementById('previewText').placeholder = chrome.i18n.getMessage('previewText');
  // 设置默认预览文本（根据语言）
  const isZh = chrome.i18n.getUILanguage().toLowerCase().startsWith('zh');
  document.getElementById('previewText').value = isZh ? '示例文字' : 'Example text';
  document.getElementById('saveBtn').textContent = chrome.i18n.getMessage('saveConfig');
  document.getElementById('resetBtn').textContent = chrome.i18n.getMessage('resetConfig');
  
  // 创建示例按钮
  const exampleButtons = [
    { name: 'exampleGoogle', template: 'https://www.google.com/search?q={text}' },
    { name: 'exampleBaidu', template: 'https://www.baidu.com/s?wd={text}' },
    { name: 'exampleGitHub', template: 'https://github.com/search?q={text}' },
    { name: 'exampleBing', template: 'https://www.bing.com/search?q={text}' },
    { name: 'exampleTranslate', template: 'https://translate.google.com/?sl=auto&tl=zh-CN&text={text}' },
    { name: 'exampleWikipedia', template: 'https://www.wikipedia.org/wiki/{text}' }
  ];
  
  const buttonsContainer = document.getElementById('exampleButtons');
  buttonsContainer.innerHTML = exampleButtons.map(item => {
    const name = chrome.i18n.getMessage(item.name);
    return `<button class="example-btn" data-name="${escapeHtml(name)}" data-template="${escapeHtml(item.template)}">${escapeHtml(name)}</button>`;
  }).join('');
}

// 页面加载时恢复配置
document.addEventListener('DOMContentLoaded', () => {
  initializeI18n();
  loadConfig();
  setupEventListeners();
});

// 加载配置
function loadConfig() {
  chrome.storage.sync.get(['urlTemplates'], (result) => {
    if (result.urlTemplates && result.urlTemplates.length > 0) {
      templates = result.urlTemplates;
      // 找到最大的ID
      nextId = Math.max(...templates.map(t => parseInt(t.id) || 0)) + 1;
    } else {
      templates = JSON.parse(JSON.stringify(getDefaultTemplates()));
      nextId = 3;
    }
    renderTemplates();
    updatePreview();
  });
}

// 设置事件监听器
function setupEventListeners() {
  // 添加模板按钮
  document.getElementById('addTemplateBtn').addEventListener('click', addTemplate);
  
  // 保存按钮
  document.getElementById('saveBtn').addEventListener('click', saveConfig);
  
  // 重置按钮
  document.getElementById('resetBtn').addEventListener('click', resetConfig);
  
  // 预览文字输入框变化时更新预览
  document.getElementById('previewText').addEventListener('input', updatePreview);
  
  // 示例按钮（动态绑定）
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('example-btn')) {
      const name = e.target.getAttribute('data-name');
      const template = e.target.getAttribute('data-template');
      addTemplateFromExample(name, template);
    }
  });
}

// 渲染模板列表
function renderTemplates() {
  const listEl = document.getElementById('templatesList');
  
  if (templates.length === 0) {
    listEl.innerHTML = `<div class="empty-state">${chrome.i18n.getMessage('noTemplates')}</div>`;
    return;
  }
  
  listEl.innerHTML = templates.map((template, index) => {
    const defaultName = chrome.i18n.getMessage('templateName', [String(index + 1)]);
    return `
    <div class="template-item" data-id="${template.id}">
      <div class="template-header">
        <span class="template-number">${index + 1}</span>
        <button class="btn-icon btn-delete" data-id="${template.id}" title="${chrome.i18n.getMessage('deleteTemplate')}">🗑️</button>
      </div>
      <div class="template-content">
        <div class="form-group">
          <label>${chrome.i18n.getMessage('templateAlias')}</label>
          <input 
            type="text" 
            class="template-name" 
            data-id="${template.id}"
            value="${escapeHtml(template.name || '')}"
            placeholder="${chrome.i18n.getMessage('aliasPlaceholder')}"
          />
        </div>
        <div class="form-group">
          <label>${chrome.i18n.getMessage('templateUrl')} <span class="required">${chrome.i18n.getMessage('required')}</span></label>
          <textarea 
            class="template-url" 
            data-id="${template.id}"
            rows="2"
            placeholder="${chrome.i18n.getMessage('templatePlaceholder')}"
          >${escapeHtml(template.url || '')}</textarea>
        </div>
      </div>
    </div>
  `;
  }).join('');
  
  // 绑定事件
  document.querySelectorAll('.template-name, .template-url').forEach(input => {
    input.addEventListener('input', () => {
      updateTemplate(input);
      updatePreview();
    });
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteTemplate(btn.getAttribute('data-id'));
    });
  });
}

// 添加模板
function addTemplate() {
  const newTemplate = {
    id: String(nextId++),
    name: '',
    url: ''
  };
  templates.push(newTemplate);
  renderTemplates();
  
  // 滚动到新添加的模板
  setTimeout(() => {
    const newItem = document.querySelector(`[data-id="${newTemplate.id}"]`);
    if (newItem) {
      newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const input = newItem.querySelector('.template-name');
      if (input) input.focus();
    }
  }, 100);
}

// 从示例添加模板
function addTemplateFromExample(name, url) {
  const newTemplate = {
    id: String(nextId++),
    name: name,
    url: url
  };
  templates.push(newTemplate);
  renderTemplates();
  updatePreview();
  
  // 滚动到新添加的模板
  setTimeout(() => {
    const newItem = document.querySelector(`[data-id="${newTemplate.id}"]`);
    if (newItem) {
      newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 100);
}

// 更新模板
function updateTemplate(input) {
  const id = input.getAttribute('data-id');
  const template = templates.find(t => t.id === id);
  if (template) {
    if (input.classList.contains('template-name')) {
      template.name = input.value.trim();
    } else if (input.classList.contains('template-url')) {
      template.url = input.value.trim();
    }
  }
}

// 删除模板
function deleteTemplate(id) {
  if (templates.length <= 1) {
    showStatus(chrome.i18n.getMessage('errorMinTemplates'), 'error');
    return;
  }
  
  if (confirm(chrome.i18n.getMessage('confirmDelete'))) {
    templates = templates.filter(t => t.id !== id);
    renderTemplates();
    updatePreview();
  }
}

// 保存配置
function saveConfig() {
  // 验证所有模板
  const errors = [];
  templates.forEach((template, index) => {
    if (!template.url || !template.url.trim()) {
      errors.push(chrome.i18n.getMessage('errorEmptyUrl', [String(index + 1)]));
    } else if (!template.url.includes('{text}')) {
      errors.push(chrome.i18n.getMessage('errorNoPlaceholder', [String(index + 1)]));
    }
  });
  
  if (errors.length > 0) {
    showStatus(errors.join('<br>'), 'error');
    return;
  }
  
  // 过滤掉空模板
  const validTemplates = templates.filter(t => t.url && t.url.trim());
  
  if (validTemplates.length === 0) {
    showStatus(chrome.i18n.getMessage('errorNoTemplates'), 'error');
    return;
  }
  
  chrome.storage.sync.set({ urlTemplates: validTemplates }, () => {
    templates = validTemplates;
    showStatus(chrome.i18n.getMessage('configSaved'), 'success');
    setTimeout(() => {
      hideStatus();
    }, 3000);
  });
}

// 重置配置
function resetConfig() {
  if (confirm(chrome.i18n.getMessage('confirmReset'))) {
    templates = JSON.parse(JSON.stringify(getDefaultTemplates()));
    nextId = 3;
    renderTemplates();
    chrome.storage.sync.set({ urlTemplates: templates }, () => {
      showStatus(chrome.i18n.getMessage('configReset'), 'success');
      updatePreview();
      setTimeout(() => {
        hideStatus();
      }, 2000);
    });
  }
}

// 更新预览
function updatePreview() {
  const inputEl = document.getElementById('previewText');
  const isZh = chrome.i18n.getUILanguage().toLowerCase().startsWith('zh');
  const defaultText = isZh ? '示例文字' : 'Example text';
  const previewText = inputEl.value.trim() || defaultText;
  const resultsEl = document.getElementById('previewResults');
  
  if (templates.length === 0) {
    resultsEl.innerHTML = `<div class="preview-empty">${chrome.i18n.getMessage('previewEmpty')}</div>`;
    return;
  }
  
  resultsEl.innerHTML = templates.map((template, index) => {
    if (!template.url || !template.url.trim()) {
      return '';
    }
    const previewUrl = template.url.replace(/{text}/g, encodeURIComponent(previewText));
    const defaultName = chrome.i18n.getMessage('templateName', [String(index + 1)]);
    const name = template.name || defaultName;
    return `
      <div class="preview-item">
        <span class="preview-label">${escapeHtml(name)}：</span>
        <code>${escapeHtml(previewUrl)}</code>
      </div>
    `;
  }).filter(html => html).join('');
}

// 显示状态消息
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.innerHTML = message;
  statusEl.className = `status ${type}`;
}

// 隐藏状态消息
function hideStatus() {
  const statusEl = document.getElementById('status');
  statusEl.className = 'status';
  statusEl.textContent = '';
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
