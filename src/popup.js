// AI Text Pro Popup
let currentMode = 'improve';
let usageCount = 0;

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    processSelection();
  });
});

async function processSelection() {
  const status = document.getElementById('status');
  status.textContent = 'Processing...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, { 
      action: 'process', 
      mode: currentMode 
    });
    
    if (result && result.success) {
      status.textContent = `✓ Done! (${result.mode})`;
      usageCount++;
      if (usageCount >= 50) {
        status.textContent = '⚠️ Free limit reached. Upgrade to Pro!';
      }
    } else {
      status.textContent = '⚠️ ' + (result?.error || 'Please select text first');
    }
  } catch (e) {
    status.textContent = '⚠️ Error: ' + e.message;
  }
}

// Load saved usage
chrome.storage.local.get(['usageCount'], (data) => {
  usageCount = data.usageCount || 0;
});
