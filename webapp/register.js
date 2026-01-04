const tg = window.Telegram.WebApp;
tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const telegramId = urlParams.get('telegram_id');

const form = document.getElementById('registrationForm');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  errorMessage.textContent = '';
  successMessage.textContent = '';

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const pin = document.getElementById('pin').value;
  const confirmPin = document.getElementById('confirmPin').value;

  if (fullName.length < 2) {
    errorMessage.textContent = 'Please enter your full name';
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorMessage.textContent = 'Please enter a valid email address';
    return;
  }

  if (!/^[0-9]{4,6}$/.test(pin)) {
    errorMessage.textContent = 'PIN must be 4-6 digits';
    return;
  }

  if (pin !== confirmPin) {
    errorMessage.textContent = 'PINs do not match';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Account...';

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telegram_id: telegramId,
        full_name: fullName,
        email: email,
        pin: pin,
        init_data: tg.initData
      })
    });

    const data = await response.json();

    if (response.ok) {
      successMessage.textContent = 'Account created successfully!';

      tg.sendData(JSON.stringify({
        action: 'registration_complete',
        full_name: fullName
      }));

      setTimeout(() => {
        tg.close();
      }, 1500);
    } else {
      errorMessage.textContent = data.error || 'Registration failed. Please try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  } catch (error) {
    errorMessage.textContent = 'Network error. Please check your connection.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});
