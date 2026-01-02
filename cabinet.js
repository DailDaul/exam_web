//глобальные переменные
let allOrders = [];
let currentOrderPage = 1;
const ordersPerPage = 10;

//инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    //проверяем авторизацию
    if (!Auth.isAuthenticated()) {
        Utils.showNotification('Для доступа к личному кабинету требуется авторизация', 'warning');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    //загружаем заявки
    await loadOrders();
    
    //инициализируем обработчики событий
    initEventHandlers();
    
    //настраиваем модальные окна
    setupModals();
});

//загрузка заявок пользователя
async function loadOrders() {
    try {
        const tableBody = document.getElementById('ordersTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">
                        <div class="spinner-border spinner-border-sm" role="status">
                            <span class="visually-hidden">Загрузка...</span>
                        </div>
                        Загрузка заявок...
                    </td>
                </tr>
            `;
        }
        
        allOrders = await API.getOrders();
        updateStatistics();
        displayOrders(allOrders);
        setupOrdersPagination();
        
        //проверяем лимит заявок
        checkOrderLimit();
        
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        Utils.showNotification('Не удалось загрузить заявки', 'error');
        
        const tableBody = document.getElementById('ordersTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle"></i> Ошибка загрузки данных
                    </td>
                </tr>
            `;
        }
    }
}

//обновление статистики
function updateStatistics() {
    const activeOrders = allOrders.filter(order => 
        order.status === 'pending' || order.status === 'approved'
    ).length;
    
    const completedOrders = allOrders.filter(order => 
        order.status === 'completed'
    ).length;
    
    const totalAmount = allOrders.reduce((sum, order) => sum + (order.price || 0), 0);
    const averageAmount = allOrders.length > 0 ? Math.round(totalAmount / allOrders.length) : 0;
    
    document.getElementById('activeOrdersCount').textContent = activeOrders;
    document.getElementById('completedOrdersCount').textContent = completedOrders;
    document.getElementById('totalAmount').textContent = Utils.formatPrice(totalAmount);
    document.getElementById('averageAmount').textContent = Utils.formatPrice(averageAmount);
}

//отображение заявок в таблице
function displayOrders(orders) {
    const tableBody = document.getElementById('ordersTableBody');
    const emptyMessage = document.getElementById('emptyTableMessage');
    
    if (!orders || orders.length === 0) {
        if (tableBody) tableBody.innerHTML = '';
        if (emptyMessage) emptyMessage.classList.remove('d-none');
        return;
    }
    
    if (emptyMessage) emptyMessage.classList.add('d-none');
    
    //пагинация
    const startIndex = (currentOrderPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const paginatedOrders = orders.slice(startIndex, endIndex);
    
    tableBody.innerHTML = paginatedOrders.map(order => {
        const statusClass = Utils.getStatusClass(order.status);
        const statusText = Utils.getStatusText(order.status);
        
        let typeText = 'Курс';
        let nameText = 'Неизвестно';
        
        //определяем тип и название
        if (order.course_id && order.course_id > 0) {
            typeText = 'Курс';
            nameText = order.course_name || `Курс #${order.course_id}`;
        } else if (order.tutor_id && order.tutor_id > 0) {
            typeText = 'Репетитор';
            nameText = order.tutor_name || `Репетитор #${order.tutor_id}`;
        }
        
        return `
            <tr>
                <td>${order.id}</td>
                <td><span class="badge bg-info">${typeText}</span></td>
                <td>${nameText}</td>
                <td>${Utils.formatDate(order.date_start)}</td>
                <td>${Utils.formatTime(order.time_start)}</td>
                <td>${order.persons || 1}</td>
                <td><strong>${Utils.formatPrice(order.price || 0)} ₽</strong></td>
                <td>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="showOrderDetails(${order.id})" 
                                title="Просмотреть детали">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="editOrder(${order.id})"
                                ${order.status === 'completed' || order.status === 'cancelled' ? 'disabled' : ''}
                                title="Редактировать">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="confirmDelete(${order.id})"
                                title="Удалить">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

//пагинация заявок
function setupOrdersPagination() {
    const pagination = document.getElementById('ordersPagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(allOrders.length / ordersPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <li class="page-item ${currentOrderPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeOrderPage(${currentOrderPage - 1})">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentOrderPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${currentOrderPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changeOrderPage(${i})">${i}</a>
            </li>
        `;
    }
    
    paginationHTML += `
        <li class="page-item ${currentOrderPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeOrderPage(${currentOrderPage + 1})">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.querySelector('ul').innerHTML = paginationHTML;
}

function changeOrderPage(page) {
    const totalPages = Math.ceil(allOrders.length / ordersPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentOrderPage = page;
    displayOrders(allOrders);
    setupOrdersPagination();
}

//проверка лимита заявок
function checkOrderLimit() {
    const limitAlert = document.getElementById('orderLimitAlert');
    const ordersUsed = document.getElementById('ordersUsed');
    const limitWarningText = document.getElementById('limitWarningText');
    
    if (!limitAlert) return;
    
    const usedOrders = allOrders.length;
    
    if (usedOrders >= 10) {
        limitAlert.className = 'alert alert-danger';
        limitWarningText.textContent = 'Вы достигли максимального количества заявок (10).';
        limitAlert.style.display = 'block';
    } else if (usedOrders >= 8) {
        limitAlert.className = 'alert alert-warning';
        limitWarningText.textContent = 'Осталось мало доступных заявок.';
        limitAlert.style.display = 'block';
    } else if (usedOrders >= 5) {
        limitAlert.className = 'alert alert-info';
        limitWarningText.textContent = '';
        limitAlert.style.display = 'block';
    } else {
        limitAlert.style.display = 'none';
    }
    
    if (ordersUsed) {
        ordersUsed.textContent = usedOrders;
    }
}

//показать детали заявки
async function showOrderDetails(orderId) {
    try {
        const order = await API.getOrder(orderId);
        
        //заполняем модальное окно
        document.getElementById('detailOrderId').textContent = order.id;
        document.getElementById('detailType').textContent = order.course_id > 0 ? 'Курс' : 'Репетитор';
        document.getElementById('detailName').textContent = order.course_id > 0 ? 
            (order.course_name || `Курс #${order.course_id}`) : 
            (order.tutor_name || `Репетитор #${order.tutor_id}`);
        document.getElementById('detailDate').textContent = Utils.formatDate(order.date_start);
        document.getElementById('detailTime').textContent = Utils.formatTime(order.time_start);
        document.getElementById('detailPersons').textContent = order.persons;
        document.getElementById('detailBasePrice').textContent = Utils.formatPrice(order.base_price || order.price || 0);
        document.getElementById('detailTotalPrice').textContent = Utils.formatPrice(order.price || 0);
        
        //заполняем скидки/надбавки
        const discountsList = document.getElementById('detailDiscounts');
        discountsList.innerHTML = '';
        
        const discounts = [
            { condition: order.early_registration, text: 'Скидка за раннюю регистрацию: -10%' },
            { condition: order.group_enrollment, text: 'Групповая скидка: -15%' },
            { condition: order.intensive_course, text: 'Интенсивный курс: +20%' },
            { condition: order.supplementary, text: 'Доп. материалы: +2000 ₽ на человека' },
            { condition: order.personalized, text: 'Индивидуальные занятия: +1500 ₽/неделю' },
            { condition: order.excursions, text: 'Культурные экскурсии: +25%' },
            { condition: order.assessment, text: 'Оценка уровня: +300 ₽' },
            { condition: order.interactive, text: 'Интерактивная платформа: +50%' }
        ];
        
        discounts.forEach(discount => {
            if (discount.condition) {
                const li = document.createElement('li');
                li.innerHTML = `<i class="bi bi-check-circle text-success"></i> ${discount.text}`;
                discountsList.appendChild(li);
            }
        });
        
        //заполняем дополнительные опции
        const optionsContainer = document.getElementById('detailOptions');
        optionsContainer.innerHTML = '';
        
        const options = [
            { condition: order.early_registration, icon: 'bi-alarm', text: 'Ранняя регистрация', color: 'success' },
            { condition: order.group_enrollment, icon: 'bi-people', text: 'Групповая запись', color: 'primary' },
            { condition: order.intensive_course, icon: 'bi-lightning', text: 'Интенсивный курс', color: 'warning' },
            { condition: order.supplementary, icon: 'bi-journal', text: 'Доп. материалы', color: 'info' },
            { condition: order.personalized, icon: 'bi-person', text: 'Индивидуальный', color: 'secondary' },
            { condition: order.excursions, icon: 'bi-geo', text: 'Экскурсии', color: 'success' },
            { condition: order.assessment, icon: 'bi-clipboard', text: 'Оценка уровня', color: 'info' },
            { condition: order.interactive, icon: 'bi-laptop', text: 'Интерактивная платформа', color: 'primary' }
        ];
        
        const activeOptions = options.filter(opt => opt.condition);
        
        if (activeOptions.length > 0) {
            activeOptions.forEach(option => {
                const col = document.createElement('div');
                col.className = 'col-6 col-md-4 mb-2';
                col.innerHTML = `
                    <div class="alert alert-${option.color} py-2 mb-0">
                        <i class="bi ${option.icon} me-2"></i>
                        ${option.text}
                    </div>
                `;
                optionsContainer.appendChild(col);
            });
        } else {
            optionsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-light text-center">
                        <i class="bi bi-info-circle"></i>
                        Дополнительные опции не выбраны
                    </div>
                </div>
            `;
        }
        
        //показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        modal.show();
        
    } catch (error) {
        console.error('Ошибка загрузки деталей заявки:', error);
        Utils.showNotification('Не удалось загрузить детали заявки', 'error');
    }
}

//редактирование заявки
async function editOrder(orderId) {
    try {
        const order = await API.getOrder(orderId);
        
        //заполняем форму редактирования
        document.getElementById('editOrderId').textContent = order.id;
        document.getElementById('editId').value = order.id;
        document.getElementById('editDate').value = order.date_start;
        document.getElementById('editTime').value = order.time_start;
        document.getElementById('editPersons').value = order.persons;
        
        //устанавливаем чекбоксы
        document.getElementById('editEarlyRegistration').checked = order.early_registration;
        document.getElementById('editGroupEnrollment').checked = order.group_enrollment;
        document.getElementById('editIntensiveCourse').checked = order.intensive_course;
        document.getElementById('editSupplementary').checked = order.supplementary;
        document.getElementById('editPersonalized').checked = order.personalized;
        document.getElementById('editExcursions').checked = order.excursions;
        document.getElementById('editAssessment').checked = order.assessment;
        document.getElementById('editInteractive').checked = order.interactive;
        
        //показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
        
    } catch (error) {
        console.error('Ошибка загрузки заявки для редактирования:', error);
        Utils.showNotification('Не удалось загрузить данные для редактирования', 'error');
    }
}

//подтверждение удаления
function confirmDelete(orderId) {
    document.getElementById('deleteOrderId').textContent = orderId;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
    
    //устанавливаем обработчик подтверждения
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = () => deleteOrder(orderId, modal);
}

//удаление заявки
async function deleteOrder(orderId, modal) {
    try {
        await API.deleteOrder(orderId);
        
        Utils.showNotification('Заявка успешно удалена', 'success');
        
        //закрываем модальное окно
        modal.hide();
        
        //обновляем список заявок
        await loadOrders();
        
    } catch (error) {
        console.error('Ошибка удаления заявки:', error);
        Utils.showNotification(`Ошибка удаления: ${error.message}`, 'danger');
    }
}

//сохранение изменений заявки
async function saveOrderChanges(event) {
    event.preventDefault();
    
    try {
        const orderId = document.getElementById('editId').value;
        
        const updatedData = {
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
        
        await API.updateOrder(orderId, updatedData);
        
        Utils.showNotification('Заявка успешно обновлена', 'success');
        
        //закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        modal.hide();
        
        //обновляем список заявок
        await loadOrders();
        
    } catch (error) {
        console.error('Ошибка обновления заявки:', error);
        Utils.showNotification(`Ошибка обновления: ${error.message}`, 'danger');
    }
}

//инициализация обработчиков событий
function initEventHandlers() {
    //выход из системы
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Auth.clearApiKey();
            Utils.showNotification('Вы вышли из системы', 'info');
            setTimeout(() => window.location.href = 'index.html', 1000);
        });
    }
    
    //форма редактирования
    const editForm = document.getElementById('editOrderForm');
    if (editForm) {
        editForm.addEventListener('submit', saveOrderChanges);
    }
    
    //ссылка на создание заявки
    const createOrderLink = document.querySelector('#emptyTableMessage a');
    if (createOrderLink) {
        createOrderLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }
}

//настройка модальных окон
function setupModals() {
    //автоматически скрываем все модальные окна при закрытии
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function () {
            const forms = this.querySelectorAll('form');
            forms.forEach(form => form.reset());
        });
    });
}

//глобальные функции
window.showOrderDetails = showOrderDetails;
window.editOrder = editOrder;
window.confirmDelete = confirmDelete;
window.changeOrderPage = changeOrderPage;
