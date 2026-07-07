// ============================================
// ЦВЕТИ — СТРАНИЦА ОПЛАТЫ (ЮКАССА)
// ============================================

// Получаем данные заказа из URL
const urlParams = new URLSearchParams(window.location.search);
const productName = urlParams.get('product') || 'Букет';
const productPrice = parseInt(urlParams.get('price')) || 0;
const deliveryDate = urlParams.get('date') || '—';
const address = urlParams.get('address') || '—';

// Заполняем информацию о заказе
document.getElementById('product-name').textContent = productName;
document.getElementById('delivery-date-display').textContent = deliveryDate;
document.getElementById('address-display').textContent = address;
document.getElementById('total-price').textContent = productPrice.toLocaleString() + ' ₽';

// ============================================
// ИНИЦИАЛИЗАЦИЯ ОПЛАТЫ
// ============================================

async function initPayment() {
    const statusEl = document.getElementById('payment-status');

    try {
        // Получаем данные заказчика из localStorage
        const orderData = JSON.parse(localStorage.getItem('orderData')) || {};

        // Отправляем запрос на сервер для создания платежа
        const response = await fetch('/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: productPrice,
                description: `Заказ: ${productName}`,
                customerName: orderData.customer || '',
                customerPhone: orderData.phone || '',
                product: productName,
                deliveryDate: deliveryDate,
                address: address
            })
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        // Инициализация виджета Юкассы
        const checkout = new YooMoneyCheckoutWidget({
            confirmation_token: result.confirmationToken,
            return_url: window.location.origin + '/index.html?success=1',
            error_callback: function(error) {
                console.error('Ошибка виджета:', error);
                showPaymentStatus(false, error.message);
            }
        });

        // Рендерим виджет
        checkout.render('payment-form');

        // Отслеживаем статус платежа
        checkPaymentStatus(result.paymentId);

    } catch (error) {
        console.error('Ошибка создания платежа:', error);
        showPaymentStatus(false, error.message);
    }
}

// ============================================
// ПРОВЕРКА СТАТУСА ПЛАТЕЖА
// ============================================

async function checkPaymentStatus(paymentId) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`/payment-info/${paymentId}`);
            const data = await response.json();

            if (data.status === 'succeeded' || data.paid === true) {
                clearInterval(interval);
                showPaymentStatus(true);
                sendOrderConfirmation();
                saveOrderToFirebase(paymentId);
            } else if (data.status === 'canceled') {
                clearInterval(interval);
                showPaymentStatus(false, 'Платёж отменён');
            }
        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
        }
    }, 3000);
}

// ============================================
// СОХРАНЕНИЕ ЗАКАЗА В FIREBASE
// ============================================

function saveOrderToFirebase(paymentId) {
    const orderData = JSON.parse(localStorage.getItem('orderData')) || {};

    const order = {
        product: productName,
        price: productPrice,
        customer: orderData.customer || '',
        phone: orderData.phone || '',
        deliveryDate: deliveryDate,
        address: address,
        recipient: orderData.recipient || '',
        cardText: orderData.cardText || '',
        comment: orderData.comment || '',
        paymentId: paymentId,
        status: 'оплачен',
        createdAt: new Date().toISOString()
    };

    db.collection('orders').add(order)
        .then(() => {
            console.log('✅ Заказ сохранён в Firebase');
        })
        .catch(error => {
            console.error('❌ Ошибка сохранения заказа:', error);
        });
}

// ============================================
// СТАТУС ОПЛАТЫ
// ============================================

function showPaymentStatus(success, errorMessage) {
    const status = document.getElementById('payment-status');
    const form = document.getElementById('payment-form');

    status.classList.add('active');

    if (success) {
        status.className = 'payment-status active success';
        status.querySelector('.icon').textContent = '✅';
        status.querySelector('.title').textContent = 'Оплата успешно прошла!';
        status.querySelector('.desc').textContent = 'Спасибо за заказ! Мы свяжемся с вами в ближайшее время.';
        form.style.display = 'none';
    } else {
        status.className = 'payment-status active error';
        status.querySelector('.icon').textContent = '❌';
        status.querySelector('.title').textContent = 'Ошибка оплаты';
        status.querySelector('.desc').textContent = errorMessage || 'Попробуйте ещё раз или выберите другой способ оплаты.';
    }
}

// ============================================
// ОТПРАВКА ПОДТВЕРЖДЕНИЯ В WHATSAPP
// ============================================

function sendOrderConfirmation() {
    const orderData = JSON.parse(localStorage.getItem('orderData')) || {};

    const message = `
✅ ОПЛАЧЕНО!

🌸 Букет: ${productName}
💰 Сумма: ${productPrice} ₽
📅 Доставка: ${deliveryDate}
📍 Адрес: ${address}
👤 Заказчик: ${orderData.customer || ''}
📱 Телефон: ${orderData.phone || ''}
${orderData.recipient ? `👤 Получатель: ${orderData.recipient}` : ''}
${orderData.cardText ? `💌 Открытка: ${orderData.cardText}` : ''}
${orderData.comment ? `💬 Комментарий: ${orderData.comment}` : ''}

Спасибо за заказ! 🌿
    `;

    window.open(`https://wa.me/79123456789?text=${encodeURIComponent(message)}`, '_blank');
}

// ============================================
// ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    if (productName === 'Букет' && productPrice === 0) {
        document.getElementById('product-name').textContent = '—';
        document.getElementById('total-price').textContent = '0 ₽';
    }

    // Запускаем оплату
    initPayment();
});