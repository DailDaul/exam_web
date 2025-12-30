//конфиги
const API_BASE_URL = 'http://exam-api-courses.std-900.ist.mospolytech.ru';
const API_KEY = '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4';

//элементы дома
const ordersTableBody = document.getElementById('ordersTableBody');
const ordersPagination = document.getElementById('ordersPagination');
const emptyTableMessage = document.getElementById('emptyTableMessage');
const notificationArea = document.getElementById('notificationArea');

//элементы статистики
const activeOrdersCount = document.getElementById('activeOrdersCount');
const completedOrdersCount = document.getElementById('completedOrdersCount');
const totalAmount = document.getElementById('totalAmount');
const averageAmount = document.getElementById('averageAmount');

//глобальные переменные
let allOrders = [];
let allCourses = [];
let allTutors = [];
let currentOrderPage = 1;
const itemsPerPage = 5;
let orderToDelete = null;

//утилиты
function showNotification(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    notificationArea.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

//апишка
async function fetchOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка загрузки заявок');
        allOrders = await response.json();
        updateStatistics();
        renderOrders();
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

async function fetchCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/courses?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка загрузки курсов');
        allCourses = await response.json();
    } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
    }
}

async function fetchTutors() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tutors?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка загрузки репетиторов');
        allTutors = await response.json();
    } catch (error) {
        console.error('Ошибка загрузки репетиторов:', error);
    }
}

//обновление статистики
function updateStatistics() {
    if (allOrders.length === 0) {
        activeOrdersCount.textContent = '0';
        completedOrdersCount.textContent = '0';
        totalAmount.textContent = '0 ₽';
        averageAmount.textContent = '0 ₽';
        return;
    }
    
    const activeOrders = allOrders.filter(order => {
        const orderDate = new Date(order.date_start);
        return orderDate >= new Date();
    });
    
    const completedOrders = allOrders.filter(order => {
        const orderDate = new Date(order.date_start);
        return orderDate < new Date();
    });
    
    const totalPrice = allOrders.reduce((sum, order) => sum + (order.price || 0), 0);
    const averagePrice = totalPrice / allOrders.length;
    
    activeOrdersCount.textContent = activeOrders.length;
    completedOrdersCount.textContent = completedOrders.length;
    totalAmount.textContent = formatPrice(totalPrice);
    averageAmount.textContent = formatPrice(Math.round(averagePrice));
}

//рендеринг заказов
function renderOrders(page = 1) {
    ordersTableBody.innerHTML = '';
    
    if (allOrders.length === 0) {
        ordersTableBody.parentElement.parentElement.classList.add('d-none');
        emptyTableMessage.classList.remove('d-none');
        ordersPagination.innerHTML = '';
        return;
    }
    
    emptyTableMessage.classList.add('d-none');
    ordersTableBody.parentElement.parentElement.classList.remove('d-none');
    
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageOrders = allOrders.slice(start, end);
    
    pageOrders.forEach((order, index) => {
        const orderNumber = start + index + 1;
        const row = document.createElement('tr');
        
        // Получаем информацию о курсе/репетиторе
        let type = 'Неизвестно';
        let name = 'Неизвестно';
        let status = 'Активен';
        
        if (order.course_id) {
            const course = allCourses.find(c => c.id === order.course_id);
            type = 'Курс';
            name = course ? course.name : `Курс #${order.course_id}`;
        } else if (order.tutor_id) {
            const tutor = allTutors.find(t => t.id === order.tutor_id);
            type = 'Репетитор';
            name = tutor ? tutor.name : `Репетитор #${order.tutor_id}`;
        }
        
        //определяем статус
        const orderDate = new Date(order.date_start);
        const today = new Date();
        if (orderDate < today) {
            status = '<span class="badge bg-secondary">Завершён</span>';
        } else if (orderDate.toDateString() === today.toDateString()) {
            status = '<span class="badge bg-warning">Сегодня</span>';
        } else {
            status = '<span class="badge bg-success">Активен</span>';
        }
        
        row.innerHTML = `
            <td>${orderNumber}</td>
            <td>${type}</td>
            <td>${name}</td>
            <td>${formatDate(order.date_start)}</td>
            <td>${order.time_start || 'Не указано'}</td>
            <td>${order.persons || 1}</td>
            <td><strong>${formatPrice(order.price || 0)}</strong></td>
            <td>${status}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info" onclick="showOrderDetail(${order.id})" title="Подробнее">
                        <i class="bi bi-info-circle"></i>
                    </button>
                    <button class="btn btn-outline-warning" onclick="editOrder(${order.id})" title="Изменить">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="confirmDeleteOrder(${order.id})" title="Удалить">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
    
    renderOrderPagination(page);
}

//плагинация заказов
function renderOrderPagination(currentPage) {
    const totalPages = Math.ceil(allOrders.length / itemsPerPage);
    ordersPagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const ul = document.createElement('ul');
    ul.className = 'pagination';
    
    //кнопка "назад"
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changeOrderPage(${currentPage - 1})">&laquo;</a>`;
    ul.appendChild(prevLi);
    
    //нумерация страниц
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changeOrderPage(${i})">${i}</a>`;
        ul.appendChild(li);
    }
    
    //кнопка "вперед"
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changeOrderPage(${currentPage + 1})">&raquo;</a>`;
    ul.appendChild(nextLi);
    
    ordersPagination.appendChild(ul);
}

function changeOrderPage(page) {
    currentOrderPage = page;
    renderOrders(page);
}

//просмотр деталей заказа
async function showOrderDetail(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка загрузки деталей заявки');
        const order = await response.json();
        
        //заполняем модальное окно
        document.getElementById('detailOrderId').textContent = order.id;
        
        let type = '', name = '';
        if (order.course_id) {
            type = 'Курс';
            const courseResponse = await fetch(`${API_BASE_URL}/api/courses/${order.course_id}?api_key=${API_KEY}`);
            if (courseResponse.ok) {
                const course = await courseResponse.json();
                name = course.name;
            }
        } else if (order.tutor_id) {
            type = 'Репетитор';
            const tutorResponse = await fetch(`${API_BASE_URL}/api/tutors/${order.tutor_id}?api_key=${API_KEY}`);
            if (tutorResponse.ok) {
                const tutor = await tutorResponse.json();
                name = tutor.name;
            }
        }
        
        document.getElementById('detailType').textContent = type;
        document.getElementById('detailName').textContent = name || 'Неизвестно';
        document.getElementById('detailDate').textContent = formatDate(order.date_start);
        document.getElementById('detailTime').textContent = order.time_start || 'Не указано';
        document.getElementById('detailPersons').textContent = order.persons;
        document.getElementById('detailBasePrice').textContent = formatPrice(order.price);
        document.getElementById('detailTotalPrice').textContent = formatPrice(order.price);
        
        //скидки/надбавки
        const discountsList = document.getElementById('detailDiscounts');
        discountsList.innerHTML = '';
        
        const discounts = [
            { condition: order.early_registration, text: 'Скидка за раннюю регистрацию: -10%' },
            { condition: order.group_enrollment, text: 'Групповая скидка: -15%' },
            { condition: order.intensive_course, text: 'Интенсивный курс: +20%' },
            { condition: order.supplementary, text: 'Доп. материалы: +2000 ₽/чел' },
            { condition: order.personalized, text: 'Индивидуальные занятия: +1500 ₽/неделю' },
            { condition: order.excursions, text: 'Культурные экскурсии: +25%' },
            { condition: order.assessment, text: 'Оценка уровня: +300 ₽' },
            { condition: order.interactive, text: 'Интерактивная платформа: +50%' }
        ];
        
        discounts.forEach(discount => {
            if (discount.condition) {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-check-circle text-success me-2"></i>${discount.text}`;
                discountsList.appendChild(li);
            }
        });
        
        //дополнительные опции
        const optionsContainer = document.getElementById('detailOptions');
        optionsContainer.innerHTML = '';
        
        const options = [
            { name: 'early_registration', label: 'Ранняя регистрация', value: order.early_registration },
            { name: 'group_enrollment', label: 'Групповая запись', value: order.group_enrollment },
            { name: 'intensive_course', label: 'Интенсивный курс', value: order.intensive_course },
            { name: 'supplementary', label: 'Доп. материалы', value: order.supplementary },
            { name: 'personalized', label: 'Индивидуальные занятия', value: order.personalized },
            { name: 'excursions', label: 'Культурные экскурсии', value: order.excursions },
            { name: 'assessment', label: 'Оценка уровня', value: order.assessment },
            { name: 'interactive', label: 'Интерактивная платформа', value: order.interactive }
        ];
        
        options.forEach(option => {
            if (option.value) {
                const col = document.createElement('div');
                col.className = 'col-md-6 mb-2';
                col.innerHTML = `
                    <div class="alert alert-success py-1">
                        <i class="bi bi-check-lg"></i> ${option.label}
                    </div>
                `;
                optionsContainer.appendChild(col);
            }
        });
        
        //показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        modal.show();
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

//редактирование заказа
async function editOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка загрузки заявки для редактирования');
        const order = await response.json();
        
        //заполняем форму
        document.getElementById('editOrderId').textContent = order.id;
        document.getElementById('editId').value = order.id;
        document.getElementById('editDate').value = order.date_start;
        document.getElementById('editTime').value = order.time_start || '09:00';
        document.getElementById('editPersons').value = order.persons;
        
        //чекбоксы
        document.getElementById('editEarlyRegistration').checked = order.early_registration || false;
        document.getElementById('editGroupEnrollment').checked = order.group_enrollment || false;
        document.getElementById('editIntensiveCourse').checked = order.intensive_course || false;
        document.getElementById('editSupplementary').checked = order.supplementary || false;
        document.getElementById('editPersonalized').checked = order.personalized || false;
        document.getElementById('editExcursions').checked = order.excursions || false;
        document.getElementById('editAssessment').checked = order.assessment || false;
        document.getElementById('editInteractive').checked = order.interactive || false;
        
        //показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

//сохранение изменений заказа
document.getElementById('editOrderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const orderId = document.getElementById('editId').value;
    const updateData = {
        date_start: document.getElementById('editDate').value,
        time_start: document.getElementById('editTime').value,
        persons: parseInt(document.getElementById('editPersons').value),
        early_registration: document.getElementById('editEarlyRegistration').checked,
        group_enrollment: document.getElementById('editGroupEnrollment').checked,
        intensive_course: document.getElementById('editIntensiveCourse').checked,
        supplementary: document.getElementById('editSupplementary').checked,
        personalized: document.getElementById('editPersonalized').checked,
        excursions: document.getElementById('editExcursions').checked,
        assessment: document.getElementById('editAssessment').checked,
        interactive: document.getElementById('editInteractive').checked
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}?api_key=${API_KEY}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка обновления заявки');
        }
        
        showNotification('Заявка успешно обновлена!', 'success');
        
        //закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        modal.hide();
        
        //обновляем данные
        await fetchOrders();
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'danger');
    }
});

//подтверждение удаления
function confirmDeleteOrder(orderId) {
    orderToDelete = orderId;
    document.getElementById('deleteOrderId').textContent = orderId;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

//удаление заказа
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!orderToDelete) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderToDelete}?api_key=${API_KEY}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка удаления заявки');
        }
        
        showNotification('Заявка успешно удалена!', 'success');
        
        //закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        modal.hide();
        
        //обновляем данные
        await fetchOrders();
        
        orderToDelete = null;
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'danger');
    }
});

//инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        fetchOrders(),
        fetchCourses(),
        fetchTutors()
    ]);
    
    //кнопка выхода заглушка
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        showNotification('Функция выхода будет реализована позже', 'info');
    });
});
