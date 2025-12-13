// 国际化工具函数
// 获取浏览器语言
function getBrowserLanguage() {
  return chrome.i18n.getUILanguage() || navigator.language || 'en';
}

// 判断是否为中文环境
function isChinese() {
  const lang = getBrowserLanguage().toLowerCase();
  return lang.startsWith('zh');
}

// 获取国际化字符串
function i18n(messageName, substitutions) {
  return chrome.i18n.getMessage(messageName, substitutions);
}

// 获取默认模板（根据语言）
function getDefaultTemplates() {
  if (isChinese()) {
    return [
      { id: '1', name: i18n('defaultGoogle'), url: 'https://www.google.com/search?q={text}' },
      { id: '2', name: i18n('defaultBaidu'), url: 'https://www.baidu.com/s?wd={text}' }
    ];
  } else {
    return [
      { id: '1', name: i18n('defaultGoogle'), url: 'https://www.google.com/search?q={text}' },
      { id: '2', name: i18n('defaultBaidu'), url: 'https://www.baidu.com/s?wd={text}' }
    ];
  }
}

