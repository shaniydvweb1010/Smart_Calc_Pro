
  // DOM Elements
  const expressionDiv = document.getElementById('expression');
  const resultDiv = document.getElementById('result');
  const historyPanel = document.getElementById('historyPanel');
  const historyList = document.getElementById('historyList');
  const historyBtn = document.getElementById('historyBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const themeToggle = document.getElementById('themeToggle');
  const radToggle = document.getElementById('radToggle');
  const micBtn = document.getElementById('micBtn');

  let currentExpression = '';
  let isRadMode = false;
  let history = [];
  let recognition = null;
  let isListening = false;

  // ===== DARK MODE TOGGLE with localStorage =====
  function initDarkMode() {
    const savedMode = localStorage.getItem('smartCalcDarkMode');
    if (savedMode === 'enabled') {
      document.body.classList.add('dark-mode');
    }
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('smartCalcDarkMode', isDark ? 'enabled' : 'disabled');
    animateFeedback();
  });

  // ===== KEYBOARD HIGHLIGHT SYSTEM =====
  function highlightButton(selector) {
    const button = document.querySelector(selector);
    if (button) {
      button.classList.add('active-key');
      setTimeout(() => {
        button.classList.remove('active-key');
      }, 150);
      return true;
    }
    return false;
  }

  function getButtonSelectorForKey(key) {
    const keyMap = {
      '0': '[data-num="0"]',
      '1': '[data-num="1"]',
      '2': '[data-num="2"]',
      '3': '[data-num="3"]',
      '4': '[data-num="4"]',
      '5': '[data-num="5"]',
      '6': '[data-num="6"]',
      '7': '[data-num="7"]',
      '8': '[data-num="8"]',
      '9': '[data-num="9"]',
      '.': '[data-num="."]',
      '+': '[data-op="+"]',
      '-': '[data-op="-"]',
      '*': '[data-op="*"]',
      '/': '[data-op="/"]',
      '(': '[data-op="("]',
      ')': '[data-op=")"]',
      '%': '[data-op="%"]',
      'Enter': '[data-action="equal"]',
      '=': '[data-action="equal"]',
      'Backspace': '[data-op="⌫"]',
      'Escape': '[data-action="clear"]',
      'c': '[data-action="clear"]',
      'C': '[data-action="clear"]'
    };
    return keyMap[key];
  }

  // ===== Speech Recognition =====
  function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      micBtn.style.opacity = '0.5';
      micBtn.title = 'Voice not supported';
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('listening');
    };
    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove('listening');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      processVoice(transcript);
    };
    recognition.onerror = () => {
      isListening = false;
      micBtn.classList.remove('listening');
      showTempMsg('🎤 Voice error, try again');
    };
  }

  function processVoice(transcript) {
    showTempMsg(`🗣️ "${transcript}"`);
    let expr = transcript
      .replace(/plus/g, '+').replace(/add/g, '+')
      .replace(/minus/g, '-').replace(/subtract/g, '-')
      .replace(/times/g, '*').replace(/multiplied by/g, '*')
      .replace(/divided by/g, '/').replace(/over/g, '/')
      .replace(/x\s*squared/g, '²').replace(/square of/g, '²')
      .replace(/cubed/g, '³')
      .replace(/power\s+(\d+)/g, '^$1')
      .replace(/sin\s+(\d+)/g, 'sin($1)')
      .replace(/cos\s+(\d+)/g, 'cos($1)')
      .replace(/tan\s+(\d+)/g, 'tan($1)')
      .replace(/log\s+(\d+)/g, 'log($1)')
      .replace(/ln\s+(\d+)/g, 'ln($1)')
      .replace(/square root of/g, '√').replace(/sqrt/g, '√')
      .replace(/pi/g, 'π')
      .replace(/e\s+to\s+the/g, 'exp')
      .replace(/factorial/g, '!')
      .replace(/clear/g, 'C').replace(/delete/g, '⌫');
    
    if (expr.includes('C') && expr.length < 5) { appendToExpression('C'); return; }
    if (expr.includes('⌫')) { appendToExpression('⌫'); return; }
    expr = expr.replace(/\s+/g, '');
    if (expr) appendToExpression(expr);
  }

  function showTempMsg(msg) {
    const orig = expressionDiv.innerText;
    expressionDiv.innerText = msg;
    setTimeout(() => { expressionDiv.innerText = orig; }, 1500);
  }

  // ===== History Storage =====
  function loadHistory() {
    const saved = localStorage.getItem('smartCalcProHistory');
    if (saved) {
      try {
        history = JSON.parse(saved);
        if (history.length > 20) history = history.slice(0, 20);
        updateHistoryUI();
      } catch(e) {}
    }
  }
  function saveHistory() {
    localStorage.setItem('smartCalcProHistory', JSON.stringify(history.slice(0, 20)));
  }

  // ===== Safe Math Parser =====
  function evaluateExpression(expr) {
    let processed = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**');
    processed = processed.replace(/π/g, 'Math.PI').replace(/\be\b(?![a-z])/g, 'Math.E');
    
    const factorial = (n) => {
      if (n < 0) throw new Error('Factorial error');
      if (n === 0 || n === 1) return 1;
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    };
    
    processed = processed.replace(/(\d+(?:\.\d+)?)!/g, (_, num) => factorial(parseFloat(num)));
    processed = processed.replace(/√\(?([^)]+)\)?/g, (_, inner) => `Math.sqrt(${inner})`);
    processed = processed.replace(/abs\(([^)]+)\)/g, (_, inner) => `Math.abs(${inner})`);
    processed = processed.replace(/log\(([^)]+)\)/g, (_, inner) => `Math.log10(${inner})`);
    processed = processed.replace(/ln\(([^)]+)\)/g, (_, inner) => `Math.log(${inner})`);
    processed = processed.replace(/exp\(([^)]+)\)/g, (_, inner) => `Math.exp(${inner})`);
    
    processed = processed.replace(/sin\(([^)]+)\)/g, (_, inner) => `Math.sin(${isRadMode ? inner : inner + '*Math.PI/180'})`);
    processed = processed.replace(/cos\(([^)]+)\)/g, (_, inner) => `Math.cos(${isRadMode ? inner : inner + '*Math.PI/180'})`);
    processed = processed.replace(/tan\(([^)]+)\)/g, (_, inner) => `Math.tan(${isRadMode ? inner : inner + '*Math.PI/180'})`);
    
    processed = processed.replace(/x²/g, '**2').replace(/x³/g, '**3');
    
    try {
      const compute = new Function('return (' + processed + ')');
      let result = compute();
      if (isNaN(result) || !isFinite(result)) throw new Error();
      return result;
    } catch(e) {
      throw new Error('Invalid Expression');
    }
  }

  function computeResult() {
    if (!currentExpression.trim()) return;
    try {
      const finalValue = evaluateExpression(currentExpression);
      let displayResult = Number.isInteger(finalValue) ? finalValue : parseFloat(finalValue.toFixed(10));
      history.unshift({ expr: currentExpression, result: displayResult.toString(), time: new Date().toLocaleTimeString() });
      if (history.length > 20) history.pop();
      saveHistory();
      updateHistoryUI();
      currentExpression = displayResult.toString();
      updateDisplay();
      animateGlow();
    } catch (err) {
      resultDiv.innerText = 'Error';
      setTimeout(() => { if (resultDiv.innerText === 'Error') updateDisplay(); }, 1200);
    }
  }

  function updateDisplay() {
    expressionDiv.innerText = currentExpression || '';
    if (!currentExpression) { resultDiv.innerText = '0'; return; }
    try {
      const preview = evaluateExpression(currentExpression);
      let val = Number.isInteger(preview) ? preview : parseFloat(preview.toFixed(8));
      resultDiv.innerText = val.toString();
    } catch { resultDiv.innerText = '?'; }
  }

  function updateHistoryUI() {
    historyList.innerHTML = '';
    if (history.length === 0) {
      historyList.innerHTML = '<li style="opacity:0.6; text-align:center;">— Empty —</li>';
      return;
    }
    historyBtn.addEventListener('click', () => historyPanel.classList.toggle('hidden'));
    historyBtn.addEventListener('click', () => {
  updateHistoryUI(); // 🔥 force refresh
  historyPanel.classList.toggle('hidden');
});
saveHistory();
updateHistoryUI();
function updateHistoryUI() {
  historyList.innerHTML = '';

  if (!history || history.length === 0) {
    historyList.innerHTML = '<li style="opacity:0.6; text-align:center;">— Empty —</li>';
    return;
  }

  history.forEach(item => {
    const li = document.createElement('li');

    li.innerHTML = `<strong>${item.expr}</strong> = ${item.result}`;

    li.addEventListener('click', () => {
      currentExpression = item.expr;
      updateDisplay();
      historyPanel.classList.add('hidden');
    });

    historyList.appendChild(li);
  });
}console.log("History:", history);
    history.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.expr}</strong> = ${item.result}`;
      li.addEventListener('click', () => {
        currentExpression = item.expr;
        updateDisplay();
        historyPanel.classList.add('hidden');
      });
      historyList.appendChild(li);
    });
  }

  function appendToExpression(value) {
    if (value === 'C') { currentExpression = ''; updateDisplay(); animateFeedback(); return; }
    if (value === '⌫') { currentExpression = currentExpression.slice(0, -1); updateDisplay(); animateFeedback(); return; }
    if (value === '=') { computeResult(); animateFeedback(); return; }
    
    const sciFuncs = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'square', 'cube', 'power', 'fact', 'recip', 'exp', 'abs'];
    if (sciFuncs.includes(value)) {
      if (value === 'square') currentExpression += '²';
      else if (value === 'cube') currentExpression += '³';
      else if (value === 'power') currentExpression += '^';
      else if (value === 'fact') currentExpression += '!';
      else if (value === 'recip') currentExpression = `1/(${currentExpression || '0'})`;
      else if (value === 'exp') currentExpression += 'exp(';
      else if (value === 'abs') currentExpression += 'abs(';
      else currentExpression += `${value}(`;
      updateDisplay(); animateFeedback(); return;
    }
    
    if (value === 'pi') currentExpression += 'π';
    else if (value === 'e') currentExpression += 'e';
    else currentExpression += value;
    updateDisplay(); animateFeedback();
  }

  function animateGlow() {
    const wrapper = document.querySelector('.display-wrapper');
    wrapper.style.transform = 'scale(1.01)';
    setTimeout(() => { wrapper.style.transform = ''; }, 120);
  }
  function animateFeedback() {
    const calc = document.querySelector('.calculator');
    calc.style.transform = 'scale(0.99)';
    setTimeout(() => { calc.style.transform = ''; }, 90);
  }

  // ===== KEYBOARD EVENT HANDLER with Highlight =====
  function handleKeyboard(e) {
    const key = e.key;
    const selector = getButtonSelectorForKey(key);
    
    if (selector) {
      e.preventDefault();
      highlightButton(selector);
    }
    
    if ('0123456789'.includes(key)) {
      appendToExpression(key);
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
      let op = key === '*' ? '×' : key === '/' ? '÷' : key;
      appendToExpression(op);
    } else if (key === '.') {
      appendToExpression('.');
    } else if (key === '(' || key === ')') {
      appendToExpression(key);
    } else if (key === 'Enter' || key === '=') {
      computeResult();
    } else if (key === 'Backspace') {
      appendToExpression('⌫');
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
      appendToExpression('C');
    }
  }

  // ===== Event Listeners =====
  radToggle.addEventListener('click', () => {
    isRadMode = !isRadMode;
    radToggle.innerText = isRadMode ? 'RAD' : 'DEG';
    radToggle.classList.toggle('active', isRadMode);
    updateDisplay();
    animateFeedback();
  });

  historyBtn.addEventListener('click', () => historyPanel.classList.toggle('hidden'));
  clearHistoryBtn.addEventListener('click', () => { history = []; saveHistory(); updateHistoryUI(); });
  document.addEventListener('click', (e) => {
    if (!historyPanel.contains(e.target) && e.target !== historyBtn && !historyBtn.contains(e.target))
      historyPanel.classList.add('hidden');
  });
  micBtn.addEventListener('click', () => { if (recognition && !isListening) recognition.start(); else if (recognition && isListening) recognition.stop(); });

  // Bind button clicks
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.id === 'micBtn') return;
      if (btn.hasAttribute('data-num')) appendToExpression(btn.getAttribute('data-num'));
      else if (btn.hasAttribute('data-op')) appendToExpression(btn.getAttribute('data-op'));
      else if (btn.hasAttribute('data-func')) appendToExpression(btn.getAttribute('data-func'));
      else if (btn.hasAttribute('data-const')) appendToExpression(btn.getAttribute('data-const'));
      else if (btn.hasAttribute('data-action')) {
        if (btn.getAttribute('data-action') === 'clear') appendToExpression('C');
        else if (btn.getAttribute('data-action') === 'equal') computeResult();
      }
    });
  });

  // Initialize
  initDarkMode();
  loadHistory();
  initSpeech();
  updateDisplay();
  window.addEventListener('keydown', handleKeyboard);