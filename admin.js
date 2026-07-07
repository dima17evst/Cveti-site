// ============================================
// АДМИН-ПАНЕЛЬ — ЦВЕТИ
// ============================================

const ADMIN_PASSWORD = '123456';
let editingId = null;

function login() {
    const password = document.getElementById('password-input').value;
    const errorEl = document.getElementById('login-error');

    if (password === ADMIN_PASSWORD) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-section').style.display = 'block';
        errorEl.textContent = '';
        loadAdminProducts();
    } else {
        errorEl.textContent = '❌ Неверный пароль!';
        document.getElementById('password-input').value = '';
        document.getElementById('password-input').focus();
    }
}

function logout() {
    if (confirm('Выйти из админ-панели?')) {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('admin-section').style.display = 'none';
        document.getElementById('password-input').value = '';
        document.getElementById('login-error').textContent = '';
        resetForm();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('password-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') login();
    });
});

// ============================================
// ЗАГРУЗКА ТОВАРОВ
// ============================================

async function loadAdminProducts() {
    const list = document.getElementById('product-list-admin');
    list.innerHTML = '<p>🌿 Загрузка...</p>';

    try {
        const snapshot = await db.collection('products').get();

        if (snapshot.empty) {
            list.innerHTML = '<p style="padding:20px;color:var(--text-light);">🌸 Товаров пока нет</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const p = doc.data();

            let imageDisplay = '';
            if (p.image && (p.image.startsWith('images/') || p.image.startsWith('http'))) {
                imageDisplay = `<img src="${p.image}" alt="${p.name}">`;
            } else {
                imageDisplay = `<span class="emoji">${p.image || '🌺'}</span>`;
            }

            html += `
                <div class="admin-product-item">
                    <div class="info">
                        ${imageDisplay}
                        <div>
                            <strong>${p.name}</strong> — ${p.price} ₽
                            <span style="color:var(--text-light);font-size:12px;display:block;">${p.category || 'без категории'}</span>
                        </div>
                    </div>
                    <div>
                        <button class="btn-edit" onclick="editProduct('${doc.id}')">✏️</button>
                        <button class="btn-delete" onclick="deleteProduct('${doc.id}')">🗑️</button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (error) {
        console.error('Ошибка:', error);
        list.innerHTML = '<p>❌ Ошибка загрузки</p>';
    }
}

// ============================================
// ДОБАВЛЕНИЕ ТОВАРА
// ============================================

async function addProduct() {
    const name = document.getElementById('product-name').value.trim();
    const price = document.getElementById('product-price').value;
    const description = document.getElementById('product-description').value.trim();
    const category = document.getElementById('product-category').value;
    const image = document.getElementById('product-image').value.trim() || '🌺';
    const isNew = document.getElementById('product-new').checked;
    const isHit = document.getElementById('product-hit').checked;

    if (!name || !price) {
        alert('⚠️ Заполните название и цену!');
        return;
    }

    try {
        await db.collection('products').add({
            name, price: parseInt(price), description, category, image, isNew, isHit
        });
        alert('✅ Товар добавлен!');
        resetForm();
        loadAdminProducts();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка при добавлении');
    }
}

// ============================================
// УДАЛЕНИЕ ТОВАРА
// ============================================

async function deleteProduct(id) {
    if (!confirm('🗑️ Удалить?')) return;
    try {
        await db.collection('products').doc(id).delete();
        alert('✅ Товар удалён');
        loadAdminProducts();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка при удалении');
    }
}

// ============================================
// РЕДАКТИРОВАНИЕ ТОВАРА
// ============================================

async function editProduct(id) {
    try {
        const doc = await db.collection('products').doc(id).get();
        const p = doc.data();

        document.getElementById('product-name').value = p.name || '';
        document.getElementById('product-price').value = p.price || '';
        document.getElementById('product-description').value = p.description || '';
        document.getElementById('product-category').value = p.category || 'букеты';
        document.getElementById('product-image').value = p.image || '';
        document.getElementById('product-new').checked = p.isNew || false;
        document.getElementById('product-hit').checked = p.isHit || false;

        document.getElementById('form-title').textContent = '✏️ Редактировать товар';
        document.getElementById('submit-btn').textContent = '💾 Сохранить';
        document.getElementById('submit-btn').onclick = function() { updateProduct(id); };
        document.getElementById('cancel-btn').style.display = 'inline-block';

        editingId = id;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка при загрузке');
    }
}

// ============================================
// ОБНОВЛЕНИЕ ТОВАРА
// ============================================

async function updateProduct(id) {
    const name = document.getElementById('product-name').value.trim();
    const price = document.getElementById('product-price').value;
    const description = document.getElementById('product-description').value.trim();
    const category = document.getElementById('product-category').value;
    const image = document.getElementById('product-image').value.trim() || '🌺';
    const isNew = document.getElementById('product-new').checked;
    const isHit = document.getElementById('product-hit').checked;

    if (!name || !price) {
        alert('⚠️ Заполните название и цену!');
        return;
    }

    try {
        await db.collection('products').doc(id).update({
            name, price: parseInt(price), description, category, image, isNew, isHit
        });
        alert('✅ Товар обновлён!');
        resetForm();
        loadAdminProducts();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка при обновлении');
    }
}

// ============================================
// ЗАГРУЗКА ФОТО НА СЕРВЕР
// ============================================

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('❌ Выберите изображение!');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('image-preview');
        const img = document.getElementById('preview-img');
        img.src = e.target.result;
        preview.classList.add('has-image');
    };
    reader.readAsDataURL(file);

    const statusEl = document.getElementById('upload-status');
    statusEl.textContent = '⏳ Загрузка...';
    statusEl.className = 'upload-status active';

    try {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById('product-image').value = result.imagePath;
            statusEl.textContent = '✅ Фото загружено!';
            statusEl.className = 'upload-status active success';
        } else {
            throw new Error('Ошибка загрузки');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        statusEl.textContent = '❌ Ошибка загрузки. Проверьте сервер!';
        statusEl.className = 'upload-status active error';
        alert('❌ Ошибка загрузки фото. Убедитесь, что сервер запущен: node server.js');
    }
}

// ============================================
// ОТКРЫТИЕ / ЗАКРЫТИЕ ФОРМЫ
// ============================================

function openAddForm() {
    resetForm();
    document.getElementById('form-title').textContent = '➕ Добавить товар';
    document.getElementById('submit-btn').textContent = '➕ Добавить';
    document.getElementById('submit-btn').onclick = addProduct;
    document.getElementById('cancel-btn').style.display = 'none';
    editingId = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('product-image').value = '';
    document.getElementById('product-new').checked = false;
    document.getElementById('product-hit').checked = false;

    document.getElementById('image-preview').classList.remove('has-image');
    document.getElementById('preview-img').src = '';
    document.getElementById('image-upload').value = '';
    document.getElementById('upload-status').className = 'upload-status';
    document.getElementById('upload-status').textContent = '';

    document.getElementById('form-title').textContent = '➕ Добавить товар';
    document.getElementById('submit-btn').textContent = '➕ Добавить';
    document.getElementById('submit-btn').onclick = addProduct;
    document.getElementById('cancel-btn').style.display = 'none';
    editingId = null;
}