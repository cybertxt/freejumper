// 获取默认模板（根据语言）
function getDefaultTemplates() {
  const isZh = chrome.i18n.getUILanguage().toLowerCase().startsWith('zh');
  return [
    { 
      id: '1', 
      name: chrome.i18n.getMessage('defaultGoogle'), 
      url: 'https://www.google.com/search?q={text}' 
    },
    { 
      id: '2', 
      name: chrome.i18n.getMessage('defaultBaidu'), 
      url: 'https://www.baidu.com/s?wd={text}' 
    }
  ];
}

let isUpdatingMenus = false;
let pendingUpdate = null;

// 创建右键菜单
function createContextMenus(templates) {
  // 如果正在更新，保存最新的模板配置，稍后处理
  if (isUpdatingMenus) {
    pendingUpdate = templates;
    return;
  }
  
  isUpdatingMenus = true;
  
  // 清除所有现有的菜单项
  chrome.contextMenus.removeAll(() => {
    // 清除错误信息（removeAll 可能没有菜单项可删除，这是正常的）
    if (chrome.runtime.lastError) {
      // 忽略"没有匹配项"的错误，这是正常的
      const errorMsg = chrome.runtime.lastError.message || '';
      if (!errorMsg.includes('No matching item') && !errorMsg.includes('Cannot access')) {
        console.debug('Context menu removeAll warning:', chrome.runtime.lastError.message);
      }
    }
    
    // 确保使用最新的模板配置
    const templatesToUse = pendingUpdate || templates;
    pendingUpdate = null;
    
    // 过滤出有效的模板（有URL且包含{text}），保持顺序
    const validTemplates = (templatesToUse || []).filter(t => 
      t && t.url && t.url.trim() && t.url.includes('{text}')
    );
    
    if (validTemplates && validTemplates.length > 0) {
      // 创建父菜单
      chrome.contextMenus.create({
        id: 'freejumper-parent',
        title: chrome.i18n.getMessage('contextMenuParent'),
        contexts: ['selection']
      }, () => {
        // 检查创建父菜单时的错误
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || '';
          // 如果是重复ID错误，说明 removeAll 还没完成，稍后重试
          if (errorMsg.includes('duplicate id')) {
            console.debug('Parent menu already exists, will retry');
            isUpdatingMenus = false;
            setTimeout(() => createContextMenus(templatesToUse), 50);
            return;
          } else {
            console.warn('Error creating parent menu:', chrome.runtime.lastError.message);
          }
        }
        
        // 为每个模板创建子菜单项（按数组顺序）
        let createdCount = 0;
        validTemplates.forEach((template, index) => {
          const defaultName = chrome.i18n.getMessage('templateName', [String(index + 1)]);
          chrome.contextMenus.create({
            id: `freejumper-${template.id}`,
            parentId: 'freejumper-parent',
            title: template.name || defaultName,
            contexts: ['selection']
          }, () => {
            // 检查创建子菜单时的错误
            if (chrome.runtime.lastError) {
              const errorMsg = chrome.runtime.lastError.message || '';
              if (errorMsg.includes('duplicate id')) {
                console.debug(`Menu item ${template.id} already exists`);
              } else {
                console.warn(`Error creating menu item for template ${template.id}:`, chrome.runtime.lastError.message);
              }
            }
            
            createdCount++;
            // 所有菜单项创建完成后，重置标志
            if (createdCount === validTemplates.length) {
              isUpdatingMenus = false;
              // 如果有待处理的更新，立即处理
              if (pendingUpdate) {
                const nextUpdate = pendingUpdate;
                pendingUpdate = null;
                setTimeout(() => createContextMenus(nextUpdate), 100);
              }
            }
          });
        });
        
        // 如果没有模板，立即重置标志
        if (templatesToUse.length === 0) {
          isUpdatingMenus = false;
        }
      });
    } else {
      isUpdatingMenus = false;
    }
  });
}

// 初始化菜单
function initializeMenus() {
  chrome.storage.sync.get(['urlTemplates'], (result) => {
    const templates = result.urlTemplates || getDefaultTemplates();
    createContextMenus(templates);
  });
}

// 扩展安装或启动时初始化
chrome.runtime.onInstalled.addListener(() => {
  initializeMenus();
});

// 扩展启动时也初始化（处理浏览器重启的情况）
chrome.runtime.onStartup.addListener(() => {
  initializeMenus();
});

// 立即初始化（处理扩展已安装但浏览器未重启的情况）
// 使用 setTimeout 确保在扩展完全加载后再初始化，避免重复创建
setTimeout(() => {
  initializeMenus();
}, 100);

// 监听存储变化，更新菜单
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.urlTemplates) {
    createContextMenus(changes.urlTemplates.newValue);
  }
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId && info.menuItemId.startsWith('freejumper-') && info.menuItemId !== 'freejumper-parent') {
    const templateId = info.menuItemId.replace('freejumper-', '');
    const selectedText = info.selectionText.trim();

    if (!selectedText) {
      return;
    }

    // 获取配置的模板
    chrome.storage.sync.get(['urlTemplates'], (result) => {
      const templates = result.urlTemplates || getDefaultTemplates();
      const template = templates.find(t => t.id === templateId);

      if (template && template.url) {
        // 替换模板中的 {text} 为选中的文本
        const url = template.url.replace(/{text}/g, encodeURIComponent(selectedText));

        // 在新标签页中打开URL
        chrome.tabs.create({
          url: url,
          active: true
        });
      }
    });
  }
});

// 监听来自content script的消息（保留兼容性）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openUrl') {
    // 在新标签页中打开URL
    chrome.tabs.create({
      url: request.url,
      active: true
    });
    sendResponse({ success: true });
  }
  return true;
});

