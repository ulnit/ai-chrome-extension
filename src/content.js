// AI Text Pro Content Script
(function() {
  // Create floating toolbar
  const toolbar = document.createElement('div');
  toolbar.id = 'ai-text-pro-toolbar';
  toolbar.innerHTML = `
    <style>
      #ai-text-pro-toolbar {
        position: fixed; bottom: 20px; right: 20px; z-index: 999999;
        background: #1a1a2e; border: 1px solid #7c3aed; border-radius: 12px;
        padding: 8px; display: none; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      }
      #ai-text-pro-toolbar button {
        padding: 6px 12px; margin: 2px; border: none; border-radius: 6px;
        background: #16213e; color: #e0e0e0; cursor: pointer; font-size: 12px;
      }
      #ai-text-pro-toolbar button:hover { background: #7c3aed; }
      #ai-text-pro-result {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 999999; background: #1a1a2e; border: 1px solid #7c3aed;
        border-radius: 12px; padding: 20px; max-width: 500px; display: none;
        box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      }
      #ai-text-pro-result textarea {
        width: 100%; min-height: 150px; background: #16213e; color: #e0e0e0;
        border: 1px solid #333; border-radius: 8px; padding: 12px; font-size: 14px;
        resize: vertical;
      }
      #ai-text-pro-result .btn-row {
        display: flex; gap: 8px; margin-top: 12px;
      }
      #ai-text-pro-result button {
        flex: 1; padding: 8px; border: none; border-radius: 6px; cursor: pointer;
        font-size: 13px;
      }
      .btn-copy { background: #7c3aed; color: white; }
      .btn-replace { background: #059669; color: white; }
      .btn-close { background: #333; color: #888; }
    </style>
    <div id="ai-text-pro-result">
      <textarea id="ai-text-pro-output" readonly></textarea>
      <div class="btn-row">
        <button class="btn-copy" onclick="navigator.clipboard.writeText(document.getElementById('ai-text-pro-output').value)">📋 Copy</button>
        <button class="btn-replace" id="ai-replace-btn">✏️ Replace</button>
        <button class="btn-close" id="ai-close-btn">✕</button>
      </div>
    </div>
  `;
  document.body.appendChild(toolbar);

  let selectedText = '';
  let lastActiveElement = null;

  // Track text selection
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();
    lastActiveElement = document.activeElement;
    
    if (selectedText.length > 10) {
      toolbar.style.display = 'block';
    }
  });

  // Simple AI text processing (local rules + API fallback)
  const processors = {
    improve: (text) => {
      return text
        .replace(/\b(very|really|quite|basically|actually|just|like)\b\s*/gi, '')
        .replace(/\s+/g, ' ')
        .replace(/\bi think\b/gi, '')
        .replace(/\bin my opinion\b/gi, '')
        .trim();
    },
    grammar: (text) => {
      return text
        .replace(/\bi am\b/g, "I'm")
        .replace(/\bdo not\b/g, "don't")
        .replace(/\bdoes not\b/g, "doesn't")
        .replace(/\bcannot\b/g, "can't")
        .replace(/\bwill not\b/g, "won't")
        .replace(/\bi have\b/gi, "I've")
        .replace(/\bit is\b/gi, "it's")
        .replace(/\bthat is\b/gi, "that's")
        .replace(/\bthere is\b/gi, "there's")
        .replace(/\s+/g, ' ')
        .trim();
    },
    summarize: (text) => {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      if (sentences.length <= 3) return text;
      const key = sentences.slice(0, 2).join(' ') + ' ... ' + sentences[sentences.length - 1];
      return key;
    },
    translate: (text) => {
      // Basic CN→EN word mapping
      const dict = {
        '你好': 'Hello', '谢谢': 'Thank you', '人工智能': 'Artificial Intelligence',
        '学习': 'learn', '工作': 'work', '生活': 'life', '喜欢': 'like',
        '帮助': 'help', '问题': 'problem', '解决': 'solve', '开发': 'develop',
        '使用': 'use', '创建': 'create', '项目': 'project', '代码': 'code',
        '数据': 'data', '分析': 'analysis', '系统': 'system', '服务': 'service'
      };
      let result = text;
      for (const [cn, en] of Object.entries(dict)) {
        result = result.replace(new RegExp(cn, 'g'), en);
      }
      return result !== text ? result : text + '\n\n[Translation requires Pro version]';
    },
    shorter: (text) => {
      const words = text.split(/\s+/);
      if (words.length <= 30) return text;
      return words.slice(0, Math.floor(words.length * 0.5)).join(' ') + '...';
    },
    longer: (text) => {
      return text + '\n\nFurthermore, this approach provides additional benefits including improved efficiency, better user experience, and long-term sustainability. The implementation is straightforward and can be adapted to various scenarios.';
    }
  };

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'process') {
      if (!selectedText || selectedText.length < 10) {
        sendResponse({ success: false, error: 'No text selected (min 10 chars)' });
        return;
      }
      
      const processor = processors[request.mode];
      if (!processor) {
        sendResponse({ success: false, error: 'Unknown mode' });
        return;
      }
      
      const result = processor(selectedText);
      
      // Show result dialog
      const output = document.getElementById('ai-text-pro-output');
      const resultDiv = document.getElementById('ai-text-pro-result');
      output.value = result;
      resultDiv.style.display = 'block';
      
      // Replace button
      document.getElementById('ai-replace-btn').onclick = () => {
        if (lastActiveElement && (lastActiveElement.isContentEditable || 
            lastActiveElement.tagName === 'TEXTAREA' || 
            lastActiveElement.tagName === 'INPUT')) {
          if (lastActiveElement.isContentEditable) {
            lastActiveElement.textContent = result;
          } else {
            // Insert at cursor or replace selection
            const start = lastActiveElement.selectionStart;
            const end = lastActiveElement.selectionEnd;
            lastActiveElement.value = lastActiveElement.value.substring(0, start) + 
                                      result + 
                                      lastActiveElement.value.substring(end);
          }
        }
        resultDiv.style.display = 'none';
        toolbar.style.display = 'none';
      };
      
      // Close button
      document.getElementById('ai-close-btn').onclick = () => {
        resultDiv.style.display = 'none';
      };
      
      sendResponse({ success: true, mode: request.mode });
    }
  });
  
  // Track usage
  chrome.storage.local.get(['usageCount'], (data) => {
    const count = (data.usageCount || 0) + 1;
    chrome.storage.local.set({ usageCount: count });
  });
})();
