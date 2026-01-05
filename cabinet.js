'use strict';

//глобальные переменные
let allOrders = [];
let currentOrderPage = 1;
const ordersPerPage = 5; //по требованию: максимум 5 записей на страницу

// Переменная для хранения данных текущей редактируемой заявки
let currentEditOrderData = null;
let currentEditCourseOrTutorData = null;

//инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Личный кабинет загружен');
    
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
        console.log('Загружено заявок:', allOrders.length);
        
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
                        <button class="btn btn-sm btn-outline-primary ms-2" onclick="location.reload()">
                            Попробовать снова
                        </button>
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
            nameText = `Курс #${order.course_id}`;
        } else if (order.tutor_id && order.tutor_id > 0) {
            typeText = 'Репетитор';
            nameText = `Репетитор #${order.tutor_id}`;
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
            <a class="page-link" href="#" onclick="changeOrderPage(${currentOrderPage - 1}); return false;">
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
                <a class="page-link" href="#" onclick="changeOrderPage(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    paginationHTML += `
        <li class="page-item ${currentOrderPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeOrderPage(${currentOrderPage + 1}); return false;">
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
            `Курс #${order.course_id}` : 
            `Репетитор #${order.tutor_id}`;
        document.getElementById('detailDate').textContent = Utils.formatDate(order.date_start);
        document.getElementById('detailTime').textContent = Utils.formatTime(order.time_start);
        document.getElementById('detailPersons').textContent = order.persons;
        document.getElementById('detailBasePrice').textContent = Utils.formatPrice(order.price || 0);
        document.getElementById('detailTotalPrice').textContent = Utils.formatPrice(order.price || 0);
        
        //заполняем скидки/надбавки
        const discountsList = document.getElementById('detailDiscounts');
        if (discountsList) {
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
        // Сбрасываем предыдущие данные
        currentEditOrderData = null;
        currentEditCourseOrTutorData = null;
        
        const order = await API.getOrder(orderId);
        currentEditOrderData = order;
        
        //заполняем форму редактирования
        document.getElementById('editOrderId').textContent = order.id;
        document.getElementById('editId').value = order.id;
        document.getElementById('editDate').value = order.date_start;
        document.getElementById('editTime').value = order.time_start;
        document.getElementById('editPersons').value = order.persons;
        
        //устанавливаем чекбоксы
        document.getElementById('editEarlyRegistration').checked = order.early_registration || false;
        document.getElementById('editGroupEnrollment').checked = order.group_enrollment || false;
        document.getElementById('editIntensiveCourse').checked = order.intensive_course || false;
        document.getElementById('editSupplementary').checked = order.supplementary || false;
        document.getElementById('editPersonalized').checked = order.personalized || false;
        document.getElementById('editExcursions').checked = order.excursions || false;
        document.getElementById('editAssessment').checked = order.assessment || false;
        document.getElementById('editInteractive').checked = order.interactive || false;
        
        // Загружаем данные о курсе или репетиторе
        let durationInHours = 1;
        
        if (order.course_id > 0) {
            // Это курс - получаем данные о курсе
            currentEditCourseOrTutorData = await API.getCourse(order.course_id);
            // Для курса длительность = недели * часы в неделю
            durationInHours = (currentEditCourseOrTutorData.week_length || 0) * (currentEditCourseOrTutorData.total_length || 0);
        } else if (order.tutor_id > 0) {
            // Это репетитор - получаем данные о репетиторе
            currentEditCourseOrTutorData = await API.getTutor(order.tutor_id);
            // Для репетитора используем длительность из исходной заявки или 1 час
            durationInHours = order.duration || 1;
        }
        
        // Показываем текущую стоимость
        updateEditPricePreview();
        
        //показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
        
    } catch (error) {
        console.error('Ошибка загрузки заявки для редактирования:', error);
        Utils.showNotification('Не удалось загрузить данные для редактирования', 'error');
    }
}

// Функция предпросмотра стоимости при редактировании
function updateEditPricePreview() {
    if (!currentEditOrderData || !currentEditCourseOrTutorData) {
        console.warn('Нет данных для расчета стоимости');
        return;
    }
    
    try {
        // Собираем опции из формы
        const options = {
            early_registration: document.getElementById('editEarlyRegistration').checked,
            group_enrollment: document.getElementById('editGroupEnrollment').checked,
            intensive_course: document.getElementById('editIntensiveCourse').checked,
            supplementary: document.getElementById('editSupplementary').checked,
            personalized: document.getElementById('editPersonalized').checked,
            excursions: document.getElementById('editExcursions').checked,
            assessment: document.getElementById('editAssessment').checked,
            interactive: document.getElementById('editInteractive').checked
        };
        
        // Получаем значения из формы или используем оригинальные
        const newDate = document.getElementById('editDate').value || currentEditOrderData.date_start;
        const newTime = document.getElementById('editTime').value || currentEditOrderData.time_start;
        const newPersons = parseInt(document.getElementById('editPersons').value) || currentEditOrderData.persons;
        
        // Определяем длительность в часах
        let durationInHours = 1;
        if (currentEditOrderData.course_id > 0) {
            // Это курс
            durationInHours = (currentEditCourseOrTutorData.week_length || 0) * (currentEditCourseOrTutorData.total_length || 0);
        } else if (currentEditOrderData.tutor_id > 0) {
            // Это репетитор
            durationInHours = currentEditOrderData.duration || 1;
        }
        
        // Рассчитываем новую стоимость
        const newPrice = Utils.calculateCoursePrice(
            currentEditCourseOrTutorData,
            newDate,
            newTime,
            newPersons,
            durationInHours,
            options
        );
        
        // Показываем предпросмотр
        const previewElement = document.getElementById('editPricePreview');
        const newPriceValue = document.getElementById('newPriceValue');
        const oldPriceValue = document.getElementById('oldPriceValue');
        
        if (previewElement && newPriceValue && oldPriceValue) {
            newPriceValue.textContent = Utils.formatPrice(Math.round(newPrice));
            oldPriceValue.textContent = Utils.formatPrice(currentEditOrderData.price || 0);
            previewElement.style.display = 'block';
            
            // Подсветка изменения
            if (newPrice !== currentEditOrderData.price) {
                previewElement.className = newPrice > currentEditOrderData.price ? 
                    'alert alert-warning mt-3' : 'alert alert-success mt-3';
            } else {
                previewElement.className = 'alert alert-info mt-3';
            }
        }
        
    } catch (error) {
        console.error('Ошибка расчета предпросмотра стоимости:', error);
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
        
        if (!currentEditOrderData || !currentEditCourseOrTutorData) {
            Utils.showNotification('Ошибка: данные заявки не загружены', 'danger');
            return;
        }
        
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
        
        // РАСЧЕТ НОВОЙ СТОИМОСТИ
        // Определяем длительность в часах
        let durationInHours = 1;
        if (currentEditOrderData.course_id > 0) {
            // Это курс
            durationInHours = (currentEditCourseOrTutorData.week_length || 0) * (currentEditCourseOrTutorData.total_length || 0);
        } else if (currentEditOrderData.tutor_id > 0) {
            // Это репетитор
            durationInHours = currentEditOrderData.duration || 1;
        }
        
        // Рассчитываем новую стоимость с помощью Utils.calculateCoursePrice
        const options = {
            early_registration: updatedData.early_registration,
            group_enrollment: updatedData.group_enrollment,
            intensive_course: updatedData.intensive_course,
            supplementary: updatedData.supplementary,
            personalized: updatedData.personalized,
            excursions: updatedData.excursions,
            assessment: updatedData.assessment,
            interactive: updatedData.interactive
        };
        
        const newPrice = Utils.calculateCoursePrice(
            currentEditCourseOrTutorData,
            updatedData.date_start,
            updatedData.time_start,
            updatedData.persons,
            durationInHours,
            options
        );
        
        updatedData.price = Math.round(newPrice);
        updatedData.duration = durationInHours; // Сохраняем длительность
        
        console.log('Обновление заявки с данными:', updatedData);
        
        await API.updateOrder(orderId, updatedData);
        
        Utils.showNotification('Заявка успешно обновлена. Новая стоимость: ' + 
                              Utils.formatPrice(updatedData.price) + ' ₽', 'success');
        
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

// Инициализация обработчиков событий для модального окна редактирования
function initEditModalHandlers() {
    // Удаляем старые обработчики
    const formElements = [
        'editDate', 'editTime', 'editPersons',
        'editEarlyRegistration', 'editGroupEnrollment', 'editIntensiveCourse',
        'editSupplementary', 'editPersonalized', 'editExcursions',
        'editAssessment', 'editInteractive'
    ];
    
    formElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            // Создаем копию элемента и заменяем его для сброса всех обработчиков
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            // Добавляем новый обработчик
            newElement.addEventListener('change', updateEditPricePreview);
            newElement.addEventListener('input', function() {
                if (this.type === 'number' || this.type === 'date' || this.type === 'time') {
                    updateEditPricePreview();
                }
            });
        }
    });
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
    
    // Инициализация обработчиков для модального окна редактирования
    initEditModalHandlers();
}

//глобальные функции
window.showOrderDetails = showOrderDetails;
window.editOrder = editOrder;
window.confirmDelete = confirmDelete;
window.changeOrderPage = changeOrderPage;
window.updateEditPricePreview = updateEditPricePreview;
