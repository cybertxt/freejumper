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
      // 深拷贝，确保数据正确
      templates = JSON.parse(JSON.stringify(result.urlTemplates));
      // 找到最大的ID
      nextId = Math.max(...templates.map(t => parseInt(t.id) || 0)) + 1;
      console.debug('加载配置成功，模板数量:', templates.length, '顺序:', templates.map(t => t.id));
    } else {
      templates = JSON.parse(JSON.stringify(getDefaultTemplates()));
      nextId = 3;
      console.debug('使用默认配置');
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
    const isFirst = index === 0;
    const isLast = index === templates.length - 1;
    return `
    <div class="template-item" data-id="${template.id}" data-index="${index}" draggable="true">
      <div class="template-header">
        <div class="template-controls-left">
          <span class="drag-handle" title="${chrome.i18n.getMessage('dragHandle')}">☰</span>
          <span class="template-number">${index + 1}</span>
        </div>
        <div class="template-controls-right">
          <button class="btn-icon btn-move-up" data-index="${index}" title="${chrome.i18n.getMessage('moveUp')}" ${isFirst ? 'disabled' : ''}>▲</button>
          <button class="btn-icon btn-move-down" data-index="${index}" title="${chrome.i18n.getMessage('moveDown')}" ${isLast ? 'disabled' : ''}>▼</button>
          <button class="btn-icon btn-delete" data-id="${template.id}" title="${chrome.i18n.getMessage('deleteTemplate')}">🗑️</button>
        </div>
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
  
  // 绑定上下移动按钮
  document.querySelectorAll('.btn-move-up').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.getAttribute('data-index'));
      moveTemplate(index, -1);
    });
  });
  
  document.querySelectorAll('.btn-move-down').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.getAttribute('data-index'));
      moveTemplate(index, 1);
    });
  });
  
  // 绑定拖拽事件
  setupDragAndDrop();
}

// 设置拖拽排序
function setupDragAndDrop() {
  const items = document.querySelectorAll('.template-item');
  
  items.forEach(item => {
    // 默认启用拖拽
    item.draggable = true;
    
    // 只在拖拽手柄上开始拖拽
    const dragHandle = item.querySelector('.drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        item.draggable = true;
      });
    }
    
    // 防止输入框等元素触发拖拽
    item.querySelectorAll('input, textarea, button').forEach(element => {
      element.addEventListener('mousedown', (e) => {
        // 如果点击的不是拖拽手柄，禁用拖拽
        if (!e.target.closest('.drag-handle')) {
          item.draggable = false;
          // 鼠标释放后重新启用
          setTimeout(() => {
            item.draggable = true;
          }, 0);
        }
      });
    });
    
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

let draggedElement = null;

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  
  if (this === draggedElement) {
    return false;
  }
  
  const afterElement = getDragAfterElement(this.parentNode, e.clientY);
  const dragging = document.querySelector('.dragging');
  
  if (afterElement == null) {
    this.parentNode.appendChild(dragging);
  } else {
    this.parentNode.insertBefore(dragging, afterElement);
  }
  
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (e.preventDefault) {
    e.preventDefault();
  }
  
  if (draggedElement) {
    // 根据当前 DOM 顺序重新构建 templates 数组
    const allItems = Array.from(document.querySelectorAll('.template-item'));
    const newTemplates = [];
    
    allItems.forEach(item => {
      const templateId = item.getAttribute('data-id');
      const template = templates.find(t => t.id === templateId);
      if (template) {
        newTemplates.push(template);
      }
    });
    
    // 更新 templates 数组为新的顺序
    templates = newTemplates;
    
    console.debug('拖拽后新顺序:', templates.map(t => ({ id: t.id, name: t.name })));
    
    // 重新渲染（确保序号正确）
    renderTemplates();
    updatePreview();
    
    // 自动保存（延迟一点，确保渲染完成）
    setTimeout(() => {
      autoSaveConfig();
    }, 100);
  }
  
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  draggedElement = null;
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.template-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 移动模板（上下移动）
function moveTemplate(index, direction) {
  const newIndex = index + direction;
  
  if (newIndex < 0 || newIndex >= templates.length) {
    return;
  }
  
  // 交换位置
  [templates[index], templates[newIndex]] = [templates[newIndex], templates[index]];
  
  console.debug('按钮移动后新顺序:', templates.map(t => ({ id: t.id, name: t.name })));
  
  // 重新渲染
  renderTemplates();
  updatePreview();
  
  // 自动保存（延迟一点，确保渲染完成）
  setTimeout(() => {
    autoSaveConfig();
  }, 100);
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

// 自动保存配置（保存顺序，保留所有模板包括空的）
function autoSaveConfig() {
  // 保存所有模板（包括空的），保持顺序
  // 这样用户编辑时不会丢失未完成的模板
  const templatesToSave = JSON.parse(JSON.stringify(templates)); // 深拷贝，确保数据正确
  
  console.debug('准备保存配置，模板顺序:', templatesToSave.map((t, i) => `${i + 1}. ${t.name || t.id}`));
  
  chrome.storage.sync.set({ urlTemplates: templatesToSave }, () => {
    // 检查保存是否成功
    if (chrome.runtime.lastError) {
      console.error('自动保存配置失败:', chrome.runtime.lastError.message);
    } else {
      // 验证保存是否成功
      chrome.storage.sync.get(['urlTemplates'], (result) => {
        if (result.urlTemplates) {
          const savedOrder = result.urlTemplates.map((t, i) => `${i + 1}. ${t.name || t.id}`);
          console.debug('保存成功，已保存的顺序:', savedOrder);
          
          // 验证顺序是否一致
          const isOrderSame = templatesToSave.every((t, i) => 
            result.urlTemplates[i] && result.urlTemplates[i].id === t.id
          );
          if (!isOrderSame) {
            console.warn('警告：保存的顺序与预期不一致！');
          }
        }
      });
    }
  });
}

// 保存配置（带验证和提示）
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
  
  // 检查是否有有效的模板
  const validTemplates = templates.filter(t => t.url && t.url.trim() && t.url.includes('{text}'));
  
  if (validTemplates.length === 0) {
    showStatus(chrome.i18n.getMessage('errorNoTemplates'), 'error');
    return;
  }
  
  // 保存所有模板（包括空的），保持顺序
  // 这样不会丢失用户调整的顺序，即使有些模板还在编辑中
  const templatesToSave = JSON.parse(JSON.stringify(templates)); // 深拷贝，保持顺序
  
  console.debug('手动保存配置，模板顺序:', templatesToSave.map((t, i) => `${i + 1}. ${t.name || t.id}`));
  
  chrome.storage.sync.set({ urlTemplates: templatesToSave }, () => {
    if (chrome.runtime.lastError) {
      showStatus('保存失败: ' + chrome.runtime.lastError.message, 'error');
    } else {
      // 不更新 templates 数组，保持当前状态（包括空模板）
      showStatus(chrome.i18n.getMessage('configSaved'), 'success');
      setTimeout(() => {
        hideStatus();
      }, 3000);
    }
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
