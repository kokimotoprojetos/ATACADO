let currentStep = 1;
let cartItems = [];
let cartTotal = 0;
let pixInterval = null;
let paymentId = null;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize input masks
  initMasks();
  
  // Start countdown timer (15 minutes)
  startCountdown(15 * 60);
  
  // Load products to display
  loadOrderSummary();

  // Address lookup trigger
  const cepInput = document.getElementById('cep');
  if (cepInput) {
    cepInput.addEventListener('keyup', (e) => {
      const cep = e.target.value.replace(/\D/g, '');
      if (cep.length === 8) {
        buscarCEP(cep);
      }
    });
  }
});

// Input Masking Logic (Vanilla JS)
function initMasks() {
  const cpfInput = document.getElementById('cpf');
  const phoneInput = document.getElementById('phone');
  const cepInput = document.getElementById('cep');

  if (cpfInput) {
    cpfInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 11) val = val.substring(0, 11);
      
      let formatted = '';
      if (val.length > 9) {
        formatted = `${val.substring(0,3)}.${val.substring(3,6)}.${val.substring(6,9)}-${val.substring(9)}`;
      } else if (val.length > 6) {
        formatted = `${val.substring(0,3)}.${val.substring(3,6)}.${val.substring(6)}`;
      } else if (val.length > 3) {
        formatted = `${val.substring(0,3)}.${val.substring(3)}`;
      } else {
        formatted = val;
      }
      e.target.value = formatted;
      validateField(cpfInput, validateCPF(val), 'CPF inválido');
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 11) val = val.substring(0, 11);
      
      let formatted = '';
      if (val.length > 10) {
        formatted = `(${val.substring(0,2)}) ${val.substring(2,7)}-${val.substring(7)}`;
      } else if (val.length > 6) {
        formatted = `(${val.substring(0,2)}) ${val.substring(2,6)}-${val.substring(6)}`;
      } else if (val.length > 2) {
        formatted = `(${val.substring(0,2)}) ${val.substring(2)}`;
      } else if (val.length > 0) {
        formatted = `(${val}`;
      }
      e.target.value = formatted;
      validateField(phoneInput, val.length >= 10, 'Telefone inválido');
    });
  }

  if (cepInput) {
    cepInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 8) val = val.substring(0, 8);
      
      let formatted = '';
      if (val.length > 5) {
        formatted = `${val.substring(0,5)}-${val.substring(5)}`;
      } else {
        formatted = val;
      }
      e.target.value = formatted;
      validateField(cepInput, val.length === 8, 'CEP deve conter 8 dígitos');
    });
  }

  // General field validations on blur
  const requiredInputs = ['name', 'email', 'street', 'number', 'neighborhood', 'city', 'state'];
  requiredInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('blur', () => {
        if (id === 'email') {
          validateField(input, validateEmail(input.value), 'E-mail inválido');
        } else {
          validateField(input, input.value.trim() !== '', 'Campo obrigatório');
        }
      });
    }
  });
}

// Validation Helpers
function validateField(input, isValid, errorText) {
  const group = input.closest('.form-group');
  let errEl = group.querySelector('.error-message');
  
  if (!isValid) {
    input.classList.add('error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'error-message';
      group.appendChild(errEl);
    }
    errEl.innerText = errorText;
  } else {
    input.classList.remove('error');
    if (errEl) {
      errEl.remove();
    }
  }
  return isValid;
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function validateCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // Reject repeated numbers (like 11111111111)
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

// 15 Minutes Countdown Timer
function startCountdown(duration) {
  const display = document.getElementById('timer');
  if (!display) return;
  
  let timer = duration, minutes, seconds;
  
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    minutes = parseInt(timer / 60, 10);
    seconds = parseInt(timer % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    display.textContent = minutes + ":" + seconds;

    if (--timer < 0) {
      clearInterval(timerInterval);
      display.textContent = "Expirado";
      alert("Sua reserva de estoque expirou. Por favor, recarregue a página para re-reservar.");
      window.location.reload();
    }
  }, 1000);
}

// ViaCEP auto address autofill
async function buscarCEP(cep) {
  const url = `https://viacep.com.br/ws/${cep}/json/`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.erro) {
      alert('CEP não encontrado. Preencha o endereço manualmente.');
      return;
    }
    
    document.getElementById('street').value = data.logradouro || '';
    document.getElementById('neighborhood').value = data.bairro || '';
    document.getElementById('city').value = data.localidade || '';
    document.getElementById('state').value = data.uf || '';
    
    // Clear validation errors on autofilled inputs
    ['street', 'neighborhood', 'city', 'state'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('error');
      const err = el.closest('.form-group').querySelector('.error-message');
      if (err) err.remove();
    });
    
    // Set focus to Number field
    const numInput = document.getElementById('number');
    if (numInput) numInput.focus();
  } catch (error) {
    console.error('Error fetching CEP:', error);
  }
}

// Order Summary Data Loading
function loadOrderSummary() {
  // Try loading from localStorage first
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  
  // If localStorage is empty, check query params (for quick buy flows)
  if (cart.length === 0) {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    const price = parseFloat(params.get('price'));
    const image = params.get('image');
    const size = params.get('size') || 'G';
    const quantity = parseInt(params.get('quantity') || '1');
    
    if (title && price) {
      cart = [{
        name: title,
        price: price,
        image: image || 'images/logo.png',
        quantity: quantity,
        size: size
      }];
    }
  }
  
  cartItems = cart;
  
  if (cartItems.length === 0) {
    alert('Seu carrinho está vazio. Adicione produtos na loja.');
    window.location.href = '/';
    return;
  }
  
  // Compute subtotal and shipping
  let subtotal = 0;
  let summaryHtml = '';
  
  cartItems.forEach(item => {
    const itemSub = item.price * item.quantity;
    subtotal += itemSub;
    
    // Ensure item has image path
    const imgPath = item.image || 'images/logo.png';
    const formattedPrice = 'R$ ' + item.price.toFixed(2).replace('.', ',');
    const formattedSub = 'R$ ' + itemSub.toFixed(2).replace('.', ',');
    
    summaryHtml += `
      <div class="summary-item">
        <img class="summary-item-img" src="/${imgPath}" alt="${item.name}">
        <div class="summary-item-details">
          <div class="summary-item-name">${item.name}</div>
          <div class="summary-item-meta">Tamanho: ${item.size || 'G'} | Qtd: ${item.quantity}</div>
        </div>
        <div class="summary-item-price">
          <span>${formattedSub}</span>
          <small style="color: #868e96; font-size: 11px;">(${item.quantity}x ${formattedPrice})</small>
        </div>
      </div>
    `;
  });
  
  cartTotal = subtotal; // Free shipping
  
  const subtotalFormatted = 'R$ ' + subtotal.toFixed(2).replace('.', ',');
  const totalFormatted = 'R$ ' + cartTotal.toFixed(2).replace('.', ',');
  
  // Render Summary Elements
  document.getElementById('summary-items-list').innerHTML = summaryHtml;
  document.getElementById('summary-subtotal').innerText = subtotalFormatted;
  document.getElementById('summary-total-val').innerText = totalFormatted;
}

// Form Wizard Steps Navigation
function nextStep() {
  if (currentStep === 1) {
    // Validate Step 1 fields
    const nameInput = document.getElementById('name');
    const cpfInput = document.getElementById('cpf');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    
    const isNameValid = validateField(nameInput, nameInput.value.trim() !== '', 'Nome é obrigatório');
    const isCpfValid = validateField(cpfInput, validateCPF(cpfInput.value), 'CPF inválido');
    const isEmailValid = validateField(emailInput, validateEmail(emailInput.value), 'E-mail inválido');
    const isPhoneValid = validateField(phoneInput, phoneInput.value.replace(/\D/g, '').length >= 10, 'WhatsApp inválido');
    
    if (!isNameValid || !isCpfValid || !isEmailValid || !isPhoneValid) {
      alert('Por favor, preencha os dados do cliente corretamente.');
      return;
    }
    
    // Move to step 2
    switchStep(2);
  } else if (currentStep === 2) {
    // Validate Step 2 fields
    const cepInput = document.getElementById('cep');
    const streetInput = document.getElementById('street');
    const numberInput = document.getElementById('number');
    const neighborhoodInput = document.getElementById('neighborhood');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    
    const isCepValid = validateField(cepInput, cepInput.value.replace(/\D/g, '').length === 8, 'CEP inválido');
    const isStreetValid = validateField(streetInput, streetInput.value.trim() !== '', 'Rua é obrigatória');
    const isNumberValid = validateField(numberInput, numberInput.value.trim() !== '', 'Número é obrigatório');
    const isNeighborhoodValid = validateField(neighborhoodInput, neighborhoodInput.value.trim() !== '', 'Bairro é obrigatório');
    const isCityValid = validateField(cityInput, cityInput.value.trim() !== '', 'Cidade é obrigatória');
    const isStateValid = validateField(stateInput, stateInput.value.trim() !== '', 'Estado é obrigatório');
    
    if (!isCepValid || !isStreetValid || !isNumberValid || !isNeighborhoodValid || !isCityValid || !isStateValid) {
      alert('Por favor, preencha o endereço de entrega corretamente.');
      return;
    }
    
    // Finalize purchase -> Go to PIX screen
    iniciarPIX();
  }
}

function switchStep(step) {
  // Hide active step container
  document.getElementById(`step-${currentStep}-container`).classList.remove('active');
  
  // Show new step container
  document.getElementById(`step-${step}-container`).classList.add('active');
  
  // Update step indicators
  const indicators = document.querySelectorAll('.step-indicator');
  indicators.forEach((ind, index) => {
    const stepNum = index + 1;
    ind.classList.remove('active', 'completed');
    if (stepNum < step) {
      ind.classList.add('completed');
    } else if (stepNum === step) {
      ind.classList.add('active');
    }
  });
  
  currentStep = step;
  window.scrollTo(0, 0);
}

// Generate PIX via API
async function iniciarPIX() {
  switchStep(3); // Shows PIX panel
  
  document.getElementById('pix-loading-view').style.display = 'block';
  document.getElementById('pix-pay-view').style.display = 'none';
  
  const nome = document.getElementById('name').value;
  const cpf = document.getElementById('cpf').value;
  const email = document.getElementById('email').value;
  const telefone = document.getElementById('phone').value;
  
  const cep = document.getElementById('cep').value;
  const street = document.getElementById('street').value;
  const number = document.getElementById('number').value;
  const complement = document.getElementById('complement').value;
  const neighborhood = document.getElementById('neighborhood').value;
  const city = document.getElementById('city').value;
  const state = document.getElementById('state').value;
  
  const endereco = `${street}, ${number} ${complement ? '('+complement+') ' : ''}- ${neighborhood}, ${city}/${state} - CEP: ${cep}`;
  
  try {
    const response = await fetch('/api/create-pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome, cpf, email, telefone, endereco,
        total: cartTotal,
        items: cartItems
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.error || 'Erro ao gerar pagamento PIX');
      err.details = data.details;
      throw err;
    }
    
    paymentId = data.paymentId;
    
    // Set QR code base64 source (supporting standard base64 embedding)
    let qrSrc = data.qrCode;
    if (qrSrc && !qrSrc.startsWith('http') && !qrSrc.startsWith('data:')) {
      qrSrc = 'data:image/png;base64,' + qrSrc;
    } else if (!qrSrc) {
      // Fallback: generate QR Code from text code using QR Server API
      qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.pixCode)}`;
    }
    
    document.getElementById('pix-qrcode-img').src = qrSrc;
    document.getElementById('pix-code-text').innerText = data.pixCode;
    
    document.getElementById('pix-loading-view').style.display = 'none';
    document.getElementById('pix-pay-view').style.display = 'block';
    
    // Start Polling for status checks
    iniciarPollingPix(paymentId);
    
  } catch (error) {
    console.error('Error generating PIX:', error);
    let msg = error.message || 'Erro ao processar pagamento via PIX. Verifique seus dados e tente novamente.';
    if (error.details) {
      msg += '\n\nDetalhes do erro: ' + JSON.stringify(error.details);
    }
    alert(msg);
    switchStep(2); // return to address to try again
  }
}

// PIX copy-paste code helper
function copiarPixCodigo() {
  const codeText = document.getElementById('pix-code-text').innerText;
  
  // Temporary textarea to select and copy
  const el = document.createElement('textarea');
  el.value = codeText;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  
  alert('Código PIX copiado com sucesso! Cole no app do seu banco.');
}

// Payment Polling
function iniciarPollingPix(id) {
  if (pixInterval) clearInterval(pixInterval);
  
  pixInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/check-payment?paymentId=${id}`);
      const data = await response.json();
      
      if (data.status === 'approved') {
        clearInterval(pixInterval);
        
        // Show Success Step
        mostrarSucesso();
      }
    } catch (error) {
      console.error('Error polling payment status:', error);
    }
  }, 5000);
}

// Display Success State
function mostrarSucesso() {
  // Clear cart storage
  localStorage.setItem('cart', '[]');
  
  // Store purchase timestamp to calculate tracking availability
  localStorage.setItem('last_purchase_date', Date.now().toString());
  
  // Hide active step container
  document.getElementById(`step-3-container`).classList.remove('active');
  
  // Fill success details
  const randomOrderNum = 'BR' + Math.floor(100000 + Math.random() * 900000);
  document.getElementById('success-order-num').innerText = randomOrderNum;
  document.getElementById('success-client-email').innerText = document.getElementById('email').value;
  document.getElementById('success-client-address').innerText = `${document.getElementById('street').value}, ${document.getElementById('number').value} - ${document.getElementById('neighborhood').value}, ${document.getElementById('city').value}`;
  
  document.getElementById('step-success-container').classList.add('active');
  
  // Cancel urgency timer
  if (timerInterval) clearInterval(timerInterval);
  const urgencyBar = document.querySelector('.urgency-bar');
  if (urgencyBar) urgencyBar.style.display = 'none';
}
