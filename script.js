// ============================================
// ЦВЕТИ — Логика главной страницы
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const burger = document.getElementById('burger-btn');
    const nav = document.getElementById('main-nav');

    if (burger && nav) {
        burger.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('active');
        });

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                burger.classList.remove('active');
                nav.classList.remove('active');
            });
        });
    }

    const dateInput = document.getElementById('delivery-date');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }

    loadProducts('all');
});

let currentFilter = 'all';
let currentProduct = null;

// ============================================
// ЗАГРУЗКА ТОВАРОВ ИЗ FIREBASE
// ============================================

async function loadProducts(filter = 'all') {
    const list = document.getElementById('product-list');
    if (!list) {
        console.error('❌ Элемент product-list не найден!');
        return;
    }

    list.innerHTML = '<p class="loading-text">🌿 Загрузка букетов...</p>';

    try {
        console.log('🔥 Запрос к Firebase...');
        const snapshot = await db.collection('products').get();
        console.log('📦 Получено товаров:', snapshot.size);

        if (snapshot.empty) {
            list.innerHTML = `
                <div class="empty-message">
                    <p>🌸 Товаров пока нет</p>
                    <p style="font-size:14px;margin-top:8px;">Добавьте товары через админ-панель</p>
                </div>
            `;
            return;
        }

        let products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        if (filter !== 'all') {
            products = products.filter(p => p.category === filter);
        }

        if (products.length === 0) {
            list.innerHTML = '<p class="empty-message">В этой категории пока нет букетов</p>';
            return;
        }

        let html = '';
        products.forEach(p => {
            let imageHtml = '';
            if (p.image && (p.image.startsWith('http') || p.image.startsWith('images/'))) {
                imageHtml = `<img src="${p.image}" alt="${p.name}" loading="lazy">`;
            } else {
                imageHtml = `<div class="product-emoji">${p.image || '🌺'}</div>`;
            }

            html += `
                <div class="product-card">
                    <div class="product-image">
                        ${imageHtml}
                        ${p.isNew ? '<span class="badge-new">Новинка</span>' : ''}
                        ${p.isHit ? '<span class="badge-hit">Хит</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${p.name}</h3>
                        <p class="product-description">${p.description || ''}</p>
                        <div class="product-footer">
                            <span class="product-price">${p.price} ₽</span>
                            <button class="btn-order" onclick="openOrderModal('${p.id}')">
                                Заказать
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        list.innerHTML = `
            <div class="empty-message">
                <p>❌ Ошибка загрузки товаров</p>
                <p style="font-size:14px;margin-top:8px;color:var(--text-light);">${error.message}</p>
            </div>
        `;
    }
}

// ============================================
// ФИЛЬТРЫ
// ============================================

function setFilter(category) {
    currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === category) {
            btn.classList.add('active');
        }
    });
    loadProducts(category);
}

// ============================================
// МОДАЛЬНОЕ ОКНО ЗАКАЗА
// ============================================

function openOrderModal(productId) {
    db.collection('products').doc(productId).get()
        .then(doc => {
            if (doc.exists) {
                currentProduct = { id: doc.id, ...doc.data() };
                document.getElementById('modal-product').textContent =
                    `${currentProduct.name} — ${currentProduct.price} ₽`;
                document.getElementById('order-modal').classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Ошибка при загрузке товара');
        });
}

function closeModal() {
    document.getElementById('order-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.addEventListener('click', function(e) {
    const modal = document.getElementById('order-modal');
    if (e.target === modal) {
        closeModal();
    }
});

// ============================================
// ОТПРАВКА ЗАКАЗА (С ПОЧТОЙ)
// ============================================

function submitOrder(event) {
    event.preventDefault();

    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const deliveryDate = document.getElementById('delivery-date').value;
    const address = document.getElementById('delivery-address').value.trim();
    const recipient = document.getElementById('recipient-name').value.trim();
    const cardText = document.getElementById('card-text').value.trim();
    const comment = document.getElementById('order-comment').value.trim();
    const recipientNumber = document.getElementById('recipient-number').value.trim();
    if (!name || !phone || !deliveryDate || !address) {
        alert('⚠️ Пожалуйста, заполните все обязательные поля!');
        return;
    }

    const orderData = {
        customer: name,
        phone: phone,
        product: currentProduct.name,
        price: currentProduct.price,
        deliveryDate: deliveryDate,
        address: address,
        recipientNumber: recipientNumber,
        recipient: recipient || '',
        cardText: cardText || '',
        comment: comment || ''
    };
    localStorage.setItem('orderData', JSON.stringify(orderData));

    console.log('📦 Данные заказа:', orderData);

    // ============================================
    // 📧 ОТПРАВКА НА ПОЧТУ
    // ============================================
    console.log('📧 Отправка запроса на почту...');
    fetch('/send-order-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Письмо отправлено на почту');
        } else {
            console.error('❌ Ошибка отправки письма:', data.error);
        }
    })
    .catch(error => {
        console.error('❌ Ошибка:', error);
    });

    // ============================================
    // СОХРАНЯЕМ В FIREBASE
    // ============================================
    db.collection('orders').add({
        ...orderData,
        status: 'новый',
        createdAt: new Date().toISOString()
    })
    .then(() => {
        console.log('✅ Заказ сохранён в Firebase');
    })
    .catch(error => {
        console.error('❌ Ошибка сохранения заказа:', error);
    });

    closeModal();
    document.getElementById('order-form').reset();

    alert('✅ Заказ принят! Вы будете перенаправлены на страницу оплаты.');

    const paymentUrl = `payment.html?product=${encodeURIComponent(currentProduct.name)}&price=${currentProduct.price}&date=${deliveryDate}&address=${encodeURIComponent(address)}`;
    window.location.href = paymentUrl;
}