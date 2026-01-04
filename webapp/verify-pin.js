const tg = window.Telegram.WebApp;
tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const action = urlParams.get('action');
const userId = urlParams.get('user_id');

const detailsDiv = document.getElementById('transactionDetails');
const form = document.getElementById('pinForm');
const errorMessage = document.getElementById('errorMessage');
const submitBtn = document.getElementById('submitBtn');

function displayTransactionDetails() {
  let html = '';

  if (action === 'airtime') {
    const network = urlParams.get('network');
    const phone = urlParams.get('phone');
    const amount = urlParams.get('amount');

    html = `
      <p><strong>Type:</strong> Airtime Purchase</p>
      <p><strong>Network:</strong> ${network}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Amount:</strong> ₦${parseFloat(amount).toFixed(2)}</p>
    `;
  } else if (action === 'data') {
    const network = urlParams.get('network');
    const phone = urlParams.get('phone');
    const plan = urlParams.get('plan');
    const price = urlParams.get('price');

    html = `
      <p><strong>Type:</strong> Data Purchase</p>
      <p><strong>Network:</strong> ${network}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Plan:</strong> ${plan}</p>
      <p><strong>Amount:</strong> ₦${parseFloat(price).toFixed(2)}</p>
    `;
  } else if (action === 'share') {
    const network = urlParams.get('network');
    const phone = urlParams.get('phone');
    const amount = urlParams.get('amount');

    html = `
      <p><strong>Type:</strong> Airtime Sharing</p>
      <p><strong>Recipient:</strong> ${phone}</p>
      <p><strong>Network:</strong> ${network}</p>
      <p><strong>Amount:</strong> ₦${parseFloat(amount).toFixed(2)}</p>
    `;
  }

  detailsDiv.innerHTML = html;
}

displayTransactionDetails();

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  errorMessage.textContent = '';

  const pin = document.getElementById('pin').value;

  if (!/^[0-9]{4,6}$/.test(pin)) {
    errorMessage.textContent = 'PIN must be 4-6 digits';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';

  try {
    const requestBody = {
      user_id: userId,
      pin: pin,
      action: action,
      init_data: tg.initData
    };

    if (action === 'airtime') {
      requestBody.network = urlParams.get('network');
      requestBody.phone = urlParams.get('phone');
      requestBody.amount = urlParams.get('amount');
    } else if (action === 'data') {
      requestBody.network = urlParams.get('network');
      requestBody.phone = urlParams.get('phone');
      requestBody.plan = urlParams.get('plan');
      requestBody.price = urlParams.get('price');
    } else if (action === 'share') {
      requestBody.network = urlParams.get('network');
      requestBody.phone = urlParams.get('phone');
      requestBody.amount = urlParams.get('amount');
    }

    const response = await fetch('/api/verify-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (response.ok) {
      tg.sendData(JSON.stringify({
        action: 'pin_verified',
        message: data.message
      }));

      setTimeout(() => {
        tg.close();
      }, 500);
    } else {
      errorMessage.textContent = data.error || 'Verification failed. Please try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Transaction';
    }
  } catch (error) {
    errorMessage.textContent = 'Network error. Please check your connection.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Transaction';
  }
});
