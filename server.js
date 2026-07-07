const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

console.log('🚀 Запуск сервера...');

// ============================================
// 📧 НАСТРОЙКА ПОЧТЫ
// ============================================

const EMAIL_USER = 'dima.yevstifeev17@mail.ru';
const EMAIL_PASS = '9vL9Zcu5hKIEix8di8A2';
const EMAIL_TO = 'alex.evat17@mail.ru';

console.log('📧 Настройка почты...');
console.log(`📧 Отправитель: ${EMAIL_USER}`);
console.log(`📧 Получатель: ${EMAIL_TO}`);

const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

// Проверка подключения к почте
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Ошибка подключения к почте:', error);
    } else {
        console.log('✅ Почта настроена успешно!');
    }
});

// ============================================
// 📧 ОТПРАВКА ЗАКАЗА НА ПОЧТУ
// ============================================

app.post('/send-order-email', async (req, res) => {
    console.log('📩 ===== ПОЛУЧЕН ЗАПРОС НА ОТПРАВКУ ПИСЬМА =====');
    console.log('📩 Данные запроса:', req.body);

    const { customer, phone, product, price, deliveryDate, address, recipient, cardText, comment, recipientNumber} = req.body;

    // Проверка обязательных полей
    if (!customer || !phone || !product || !recipientNumber) {
        console.log('❌ Ошибка: Не все поля заполнены');
        console.log(`   customer: ${customer}`);
        console.log(`   phone: ${phone}`);
        console.log(`   product: ${product}`);
        return res.status(400).json({ 
            error: 'Не все поля заполнены',
            missing: { customer: !customer, phone: !phone, product: !product, recipientNumber: !recipientNumber}
        });
    }

    console.log('✅ Все поля заполнены');

    const html = `
        <h1 style="color: #2D4A3E;">🌸 НОВЫЙ ЗАКАЗ</h1>
        <hr>
        <p><strong>👤 Имя заказчика:</strong> ${customer}</p>
        <p><strong>📱 Телефон заказчика:</strong> ${phone}</p>
        <p><strong>📦 Букет:</strong> ${product}</p>
        <p><strong>💰 Стоимость:</strong> ${price} ₽</p>
        <p><strong>📅 Дата доставки:</strong> ${deliveryDate || '—'}</p>
        <p><strong>📍 Адрес доставки:</strong> ${address || '—'}</p>
        ${recipient ? `<p><strong>👤 Имя получателя:</strong> ${recipient}</p>` : ''}
        ${recipientNumber ? `<p><strong>📱 Телефон получателя</strong> ${recipientNumber}</p>` : ''}
        ${cardText ? `<p><strong>💌 Открытка:</strong> ${cardText}</p>` : ''}
        ${comment ? `<p><strong>💬 Комментарий:</strong> ${comment}</p>` : ''}
        <hr>
        <p style="color: #888; font-size: 12px;">Заказ создан: ${new Date().toLocaleString()}</p>
    `;

    try {
        console.log('📧 Попытка отправки письма...');
        console.log(`📧 От: "ЦВЕТИ" <${EMAIL_USER}>`);
        console.log(`📧 Кому: ${EMAIL_TO}`);
        console.log(`📧 Тема: 🌸 Новый заказ: ${product}`);

        const info = await transporter.sendMail({
            from: `"ЦВЕТИ" <${EMAIL_USER}>`,
            to: EMAIL_TO,
            subject: `🌸 Новый заказ: ${product}`,
            html: html
        });

        console.log('✅ Письмо отправлено успешно!');
        console.log('📧 Информация:', info.messageId);
        res.json({ success: true, messageId: info.messageId });

    } catch (error) {
        console.error('❌ ОШИБКА отправки письма:');
        console.error('   Код ошибки:', error.code);
        console.error('   Сообщение:', error.message);
        console.error('   Полная ошибка:', error);
        res.status(500).json({ 
            error: 'Ошибка отправки письма',
            details: error.message,
            code: error.code
        });
    }
});

// ============================================
// 💳 ЮКАССА
// ============================================

const YOOKASSA_SHOP_ID = '1404578';
const YOOKASSA_SECRET_KEY = 'test_ij60vDP9f1VNVDDUle8b30X2ohVB5jIOTw96JsHC56I';

app.post('/create-payment', async (req, res) => {
    console.log('💳 ===== ПОЛУЧЕН ЗАПРОС НА СОЗДАНИЕ ПЛАТЕЖА =====');
    const { amount, description, customerName, customerPhone, product, deliveryDate, address } = req.body;

    if (!amount || !description) {
        console.log('❌ Ошибка: Не указана сумма или описание');
        return res.status(400).json({ error: 'Не указана сумма или описание' });
    }

    const idempotenceKey = crypto.randomUUID();

    try {
        const response = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotence-Key': idempotenceKey,
                'Authorization': 'Basic ' + Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')
            },
            body: JSON.stringify({
                amount: {
                    value: amount.toString(),
                    currency: 'RUB'
                },
                capture: true,
                confirmation: {
                    type: 'embedded'
                },
                description: description,
                metadata: {
                    customerName: customerName || '',
                    customerPhone: customerPhone || '',
                    product: product || '',
                    deliveryDate: deliveryDate || '',
                    address: address || ''
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('❌ Ошибка Юкассы:', data.error);
            return res.status(400).json({ error: data.error.description });
        }

        console.log('✅ Платёж создан, ID:', data.id);
        res.json({
            confirmationToken: data.confirmation.confirmation_token,
            paymentId: data.id
        });

    } catch (error) {
        console.error('❌ Ошибка создания платежа:', error);
        res.status(500).json({ error: 'Ошибка создания платежа' });
    }
});

app.get('/payment-info/:paymentId', async (req, res) => {
    const { paymentId } = req.params;
    console.log(`🔍 Проверка статуса платежа: ${paymentId}`);

    try {
        const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')
            }
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error.description });
        }

        console.log(`📊 Статус платежа: ${data.status}`);
        res.json({
            status: data.status,
            paid: data.paid,
            amount: data.amount.value,
            description: data.description
        });

    } catch (error) {
        console.error('❌ Ошибка получения статуса платежа:', error);
        res.status(500).json({ error: 'Ошибка получения статуса платежа' });
    }
});

// ============================================
// 📸 ЗАГРУЗКА ФОТО
// ============================================

const uploadDir = path.join(__dirname, 'images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Создана папка images/');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'images/'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '_' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Только изображения!'));
        }
    }
});

app.post('/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }
    console.log('📸 Фото загружено:', req.file.filename);
    res.json({
        success: true,
        imagePath: 'images/' + req.file.filename
    });
});

app.use('/images', express.static('images'));

// ============================================
// 📋 ТЕСТОВЫЙ ЭНДПОИНТ
// ============================================

app.get('/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Сервер работает!',
        time: new Date().toISOString()
    });
});

// ============================================
// 🚀 ЗАПУСК
// ============================================

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log(`✅ СЕРВЕР ЗАПУЩЕН: http://localhost:${PORT}`);
    console.log(`📁 Фото сохраняются в папку images/`);
    console.log(`📧 Почта настроена (заказы приходят на ${EMAIL_TO})`);
    console.log(`💳 Юкасса настроена`);
    console.log('========================================');
    console.log('');
    console.log('📋 ДОСТУПНЫЕ ЭНДПОИНТЫ:');
    console.log(`   GET  /test - проверка работы сервера`);
    console.log(`   POST /send-order-email - отправка письма`);
    console.log(`   POST /create-payment - создание платежа`);
    console.log(`   GET  /payment-info/:id - статус платежа`);
    console.log(`   POST /upload - загрузка фото`);
    console.log('');
});
