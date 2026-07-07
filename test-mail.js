const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
    auth: {
        user: 'dima.yevstifeev17@mail.ru',
        pass: '9vL9Zcu5hKIEix8di8A2'
    }
});

transporter.sendMail({
    from: 'dima.yevstifeev17@mail.ru',
    to: 'alex.evst17@mail.ru',
    subject: 'Тест',
    text: 'Если письмо пришло — всё работает!'
})
.then(() => console.log('✅ Отправлено!'))
.catch(err => console.error('❌ Ошибка:', err));