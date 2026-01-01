//модуль для работы с API языковой школы
const API = {
    //конфиги
    config: {
        baseURL: 'https://exam-api-courses.std-900.ist.mospolytech.ru/',
        apiKey: localStorage.getItem('api_key') || '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4',
        itemsPerPage: 5,
        maxOrdersPerUser: 10 //добавляем ограничение
    },

    //утилиты
    utils: {
        showNotification(message, type = 'info') {
            const notificationArea = document.getElementById('notification-area') || 
                                    this.createNotificationArea();
            
            const alert = document.createElement('div');
            alert.className = `alert alert-${type} alert-dismissible fade show`;
            alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            notificationArea.appendChild(alert);
            
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        },

        createNotificationArea() {
            const area = document.createElement('div');
            area.id = 'notification-area';
            area.className = 'position-fixed top-0 end-0 p-3';
            area.style.cssText = 'z-index: 1056; max-width: 400px;';
            document.body.prepend(area);
            return area;
        },

        formatDate(dateString) {
            if (!dateString) return 'Не указано';
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU');
        },

        formatPrice(price) {
            if (!price) return '0 ₽';
            return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
        },

        truncateText(text, maxLength = 100) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        createTooltip(element, text) {
            element.setAttribute('data-bs-toggle', 'tooltip');
            element.setAttribute('data-bs-placement', 'top');
            element.setAttribute('title', text);
        },

        initializeTooltips() {
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            return [...tooltipTriggerList].map(tooltipTriggerEl => 
                new bootstrap.Tooltip(tooltipTriggerEl)
            );
        }
    },

    //HTTP-клиент
    client: {
        async request(endpoint, options = {}) {
    let url = `${API.config.baseURL}${endpoint}`;
    //добавляем API ключ как query параметр
    const separator = endpoint.includes('?') ? '&' : '?';
    url = `${url}${separator}api_key=${API.config.apiKey}`;
    
    // Если используем proxy
    if (USE_PROXY && API.config.baseURL.startsWith('http://')) {
        url = PROXY_URL + url;
    }
    
    const defaultOptions = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        mode: 'cors'
    };

    const config = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            API.utils.showNotification(
                'Ошибка подключения к серверу API. Возможно, проблема с CORS или доступностью сервера.',
                'danger'
            );
        } else {
            API.utils.showNotification(`Ошибка API: ${error.message}`, 'danger');
        }
        throw error;
        }
    },

    //плагинация
    pagination: {
        createPagination(containerId, currentPage, totalItems, itemsPerPage, onChangeCallback) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const totalPages = Math.ceil(totalItems / itemsPerPage);
            
            if (totalPages <= 1) {
                container.innerHTML = '';
                return;
            }

            let html = '<ul class="pagination justify-content-center">';
            
            //кнопка "назад"
            html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="event.preventDefault(); ${onChangeCallback}(${currentPage - 1})">&laquo;</a>
                    </li>`;
            
            //номера страниц
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                                <a class="page-link" href="#" onclick="event.preventDefault(); ${onChangeCallback}(${i})">${i}</a>
                            </li>`;
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                }
            }
            
            //кнопка "вперед"
            html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="event.preventDefault(); ${onChangeCallback}(${currentPage + 1})">&raquo;</a>
                    </li>`;
            
            html += '</ul>';
            container.innerHTML = html;
        },

        getPageItems(items, page, itemsPerPage) {
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            return items.slice(start, end);
        }
    },

    //курсы
    courses: {
        allCourses: [],
        currentPage: 1,

        async load() {
            try {
                this.allCourses = await API.client.get('/api/courses');
                return this.allCourses;
            } catch (error) {
                API.utils.showNotification(`Ошибка загрузки курсов: ${error.message}`, 'danger');
                return [];
            }
        },

        async getById(id) {
            try {
                return await API.client.get(`/api/courses/${id}`);
            } catch (error) {
                API.utils.showNotification(`Ошибка загрузки курса: ${error.message}`, 'danger');
                return null;
            }
        },

        filter(searchTerm = '', level = '') {
            return this.allCourses.filter(course => {
                const nameMatch = !searchTerm || 
                    course.name.toLowerCase().includes(searchTerm.toLowerCase());
                const levelMatch = !level || course.level === level;
                return nameMatch && levelMatch;
            });
        },

        render(containerId, page = 1, filteredCourses = null) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const coursesToShow = filteredCourses || this.allCourses;
            const pageCourses = API.pagination.getPageItems(
                coursesToShow, 
                page, 
                API.config.itemsPerPage
            );

            this.currentPage = page;

            if (pageCourses.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="bi bi-search fs-1 text-muted"></i>
                        <h4 class="mt-3">Курсы не найдены</h4>
                        <p class="text-muted">Попробуйте изменить критерии поиска</p>
                    </div>
                `;
                API.pagination.createPagination(
                    'coursesPagination',
                    page,
                    coursesToShow.length,
                    API.config.itemsPerPage,
                    'API.courses.changePage'
                );
                return;
            }

            let html = '';
            pageCourses.forEach(course => {
                const truncatedDesc = API.utils.truncateText(course.description, 80);
                
                html += `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-body d-flex flex-column">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0">${course.name}</h5>
                                    <span class="badge ${this.getLevelBadgeClass(course.level)}">
                                        ${course.level}
                                    </span>
                                </div>
                                
                                <p class="card-text text-muted small mb-2">
                                    <i class="bi bi-person"></i> ${course.teacher}
                                </p>
                                
                                <p class="card-text flex-grow-1 mb-3" 
                                    ${course.description.length > 80 ? 
                                        `data-bs-toggle="tooltip" title="${course.description.replace(/"/g, '&quot;')}"` : ''}>
                                    ${truncatedDesc}
                                </p>
                                
                                <div class="mt-auto">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <span class="badge bg-light text-dark">
                                            <i class="bi bi-clock"></i> ${course.total_length} недель
                                        </span>
                                        <span class="badge bg-success">
                                            ${API.utils.formatPrice(course.course_fee_per_hour)}/час
                                        </span>
                                    </div>
                                    
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-outline-primary" 
                                                onclick="API.orders.showCreateForm('course', ${course.id})">
                                            <i class="bi bi-cart-plus"></i> Записаться
                                        </button>
                                        <button class="btn btn-outline-secondary" 
                                                onclick="API.courses.showDetails(${course.id})">
                                            <i class="bi bi-info-circle"></i> Подробнее
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
            API.utils.initializeTooltips();
            
            API.pagination.createPagination(
                'coursesPagination',
                page,
                coursesToShow.length,
                API.config.itemsPerPage,
                'API.courses.changePage'
            );
        },

        changePage(page) {
            this.render('coursesContainer', page);
        },

        getLevelBadgeClass(level) {
            const classes = {
                'Beginner': 'bg-success',
                'Intermediate': 'bg-warning',
                'Advanced': 'bg-danger'
            };
            return classes[level] || 'bg-secondary';
        },

        showDetails(courseId) {
            const course = this.allCourses.find(c => c.id === courseId);
            if (!course) return;

            const modal = new bootstrap.Modal(document.getElementById('courseDetailModal') || 
                this.createDetailModal());
            
            document.getElementById('courseDetailTitle').textContent = course.name;
            document.getElementById('courseDetailTeacher').textContent = course.teacher;
            document.getElementById('courseDetailLevel').textContent = course.level;
            document.getElementById('courseDetailLength').textContent = `${course.total_length} недель (${course.week_length} часов/неделю)`;
            document.getElementById('courseDetailPrice').textContent = 
                API.utils.formatPrice(course.course_fee_per_hour) + '/час';
            document.getElementById('courseDetailDescription').textContent = course.description;
            
            const datesList = document.getElementById('courseDetailDates');
            datesList.innerHTML = '';
            course.start_dates?.forEach(date => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = new Date(date).toLocaleString('ru-RU');
                datesList.appendChild(li);
            });

            modal.show();
        },

        createDetailModal() {
            const modalHTML = `
                <div class="modal fade" id="courseDetailModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="courseDetailTitle"></h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <p><strong>Преподаватель:</strong> <span id="courseDetailTeacher"></span></p>
                                        <p><strong>Уровень:</strong> <span id="courseDetailLevel"></span></p>
                                        <p><strong>Продолжительность:</strong> <span id="courseDetailLength"></span></p>
                                        <p><strong>Стоимость:</strong> <span id="courseDetailPrice"></span></p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Доступные даты начала:</h6>
                                        <ul class="list-group list-group-flush" id="courseDetailDates"></ul>
                                    </div>
                                </div>
                                <hr>
                                <h6>Описание курса:</h6>
                                <p id="courseDetailDescription"></p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" 
                                        onclick="API.orders.showCreateForm('course', null)">
                                    Записаться на курс
                                </button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            return document.getElementById('courseDetailModal');
        }
    },

    //репетиторы
    tutors: {
        allTutors: [],

        async load() {
            try {
                this.allTutors = await API.client.get('/api/tutors');
                return this.allTutors;
            } catch (error) {
                API.utils.showNotification(`Ошибка загрузки репетиторов: ${error.message}`, 'danger');
                return [];
            }
        },

        async getById(id) {
            try {
                return await API.client.get(`/api/tutors/${id}`);
            } catch (error) {
                API.utils.showNotification(`Ошибка загрузки репетитора: ${error.message}`, 'danger');
                return null;
            }
        },

        filter(qualification = '', minExperience = 0) {
            return this.allTutors.filter(tutor => {
                const qualificationMatch = !qualification || 
                    tutor.languages_offered?.includes(qualification) ||
                    tutor.qualification?.includes(qualification);
                const experienceMatch = !minExperience || tutor.work_experience >= minExperience;
                return qualificationMatch && experienceMatch;
            });
        },

        render(containerId, filteredTutors = null) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const tutorsToShow = filteredTutors || this.allTutors;

            if (tutorsToShow.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center py-4">
                        <p class="text-muted">Репетиторы не найдены</p>
                    </div>
                `;
                return;
            }

            let html = '';
            tutorsToShow.forEach(tutor => {
                html += `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-body d-flex flex-column">
                                <div class="text-center mb-3">
                                    <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" 
                                         style="width: 80px; height: 80px;">
                                        <i class="bi bi-person fs-1 text-secondary"></i>
                                    </div>
                                </div>
                                
                                <h5 class="card-title text-center">${tutor.name}</h5>
                                
                                <div class="mb-3">
                                    <p class="mb-1">
                                        <i class="bi bi-star-fill text-warning"></i>
                                        <strong>Опыт:</strong> ${tutor.work_experience} лет
                                    </p>
                                    <p class="mb-1">
                                        <i class="bi bi-chat-text-fill text-primary"></i>
                                        <strong>Языки:</strong> ${tutor.languages_offered?.join(', ') || 'Не указано'}
                                    </p>
                                    <p class="mb-1">
                                        <i class="bi bi-award-fill text-success"></i>
                                        <strong>Уровень:</strong> ${tutor.language_level}
                                    </p>
                                    <p class="mb-0">
                                        <i class="bi bi-cash-coin text-danger"></i>
                                        <strong>Ставка:</strong> ${API.utils.formatPrice(tutor.price_per_hour)}/час
                                    </p>
                                </div>
                                
                                <div class="mt-auto">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-outline-success" 
                                                onclick="API.orders.showCreateForm('tutor', ${tutor.id})">
                                            <i class="bi bi-calendar-plus"></i> Забронировать
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }
    },

    //заказы (заявки)
    orders: {
        allOrders: [],
        currentPage: 1,
        maxOrders: 10, //максимум заявок

        async load() {
            try {
                this.allOrders = await API.client.get('/api/orders');
                return this.allOrders;
            } catch (error) {
                API.utils.showNotification(`Ошибка загрузки заявок: ${error.message}`, 'danger');
                return [];
            }
        },

        async create(orderData) {
            try {
                //проверяем лимит заявок
                if (this.allOrders.length >= this.maxOrders) {
                    throw new Error(`Достигнут лимит в ${this.maxOrders} заявок. Удалите старые заявки перед созданием новых.`);
                }
            
                const result = await API.client.post('/api/orders', orderData);
                API.utils.showNotification('Заявка успешно создана!', 'success');
                await this.load(); //обновляем список заявок
                return result;
            } catch (error) {
                API.utils.showNotification(`Ошибка создания заявки: ${error.message}`, 'danger');
                throw error;
            }
        },

        async update(id, orderData) {
            try {
                const result = await API.client.put(`/api/orders/${id}`, orderData);
                API.utils.showNotification('Заявка успешно обновлена!', 'success');
                await this.load(); //обновляем список заявок
                return result;
            } catch (error) {
                API.utils.showNotification(`Ошибка обновления заявки: ${error.message}`, 'danger');
                throw error;
            }
        },

        async delete(id) {
            try {
                const result = await API.client.delete(`/api/orders/${id}`);
                API.utils.showNotification('Заявка успешно удалена!', 'success');
                await this.load(); //обновляем список заявок
                return result;
            } catch (error) {
                API.utils.showNotification(`Ошибка удаления заявки: ${error.message}`, 'danger');
                throw error;
            }
        },

        async getById(id) {
            try {
                return await API.client.get(`/api/orders/${id}`);
            } catch (error) {
                API.utils.showNotification(`Ошибка загрузки заявки: ${error.message}`, 'danger');
                return null;
            }
        },

        render(containerId, page = 1) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const pageOrders = API.pagination.getPageItems(
                this.allOrders, 
                page, 
                API.config.itemsPerPage
            );

            this.currentPage = page;

            if (pageOrders.length === 0) {
                container.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted"></i>
                            <h4 class="mt-3">Заявок нет</h4>
                            <p class="text-muted">У вас пока нет оформленных заявок</p>
                        </td>
                    </tr>
                `;
                return;
            }

            let html = '';
            pageOrders.forEach((order, index) => {
                const orderNumber = (page - 1) * API.config.itemsPerPage + index + 1;
                const type = order.course_id ? 'Курс' : 'Репетитор';
                const name = order.course_id ? `Курс #${order.course_id}` : `Репетитор #${order.tutor_id}`;
                
                //определяем статус
                let statusClass = 'bg-secondary';
                let statusText = 'Завершён';
                const orderDate = new Date(order.date_start);
                const today = new Date();
                
                if (orderDate > today) {
                    statusClass = 'bg-success';
                    statusText = 'Активен';
                } else if (orderDate.toDateString() === today.toDateString()) {
                    statusClass = 'bg-warning';
                    statusText = 'Сегодня';
                }

                html += `
                    <tr>
                        <td>${orderNumber}</td>
                        <td>${type}</td>
                        <td>${name}</td>
                        <td>${API.utils.formatDate(order.date_start)}</td>
                        <td>${order.time_start || 'Не указано'}</td>
                        <td>${order.persons || 1}</td>
                        <td><strong>${API.utils.formatPrice(order.price || 0)}</strong></td>
                        <td><span class="badge ${statusClass}">${statusText}</span></td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-info" 
                                        onclick="API.orders.showDetailModal(${order.id})"
                                        title="Подробнее">
                                    <i class="bi bi-info-circle"></i>
                                </button>
                                <button class="btn btn-outline-warning" 
                                        onclick="API.orders.showEditModal(${order.id})"
                                        title="Изменить">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger" 
                                        onclick="API.orders.confirmDelete(${order.id})"
                                        title="Удалить">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            container.innerHTML = html;
        },

        changePage(page) {
            this.render('ordersTableBody', page);
            API.pagination.createPagination(
                'ordersPagination',
                page,
                this.allOrders.length,
                API.config.itemsPerPage,
                'API.orders.changePage'
            );
        },

        showCreateForm(type = 'course', itemId = null) {
            const modal = new bootstrap.Modal(document.getElementById('orderModal') || 
                this.createOrderModal());
            
            //сбрасываем форму
            document.getElementById('orderForm').reset();
            document.getElementById('orderModalTitle').textContent = 'Оформление заявки';
            document.getElementById('submitOrderBtn').textContent = 'Создать заявку';
            document.getElementById('orderForm').dataset.mode = 'create';
            
            //заполняем данные в зависимости от типа
            if (type === 'course' && itemId) {
                const course = API.courses.allCourses.find(c => c.id === itemId);
                if (course) {
                    document.getElementById('orderType').value = 'course';
                    document.getElementById('orderCourse').value = itemId;
                    document.getElementById('orderTutor').value = '';
                    this.populateCourseDates(itemId);
                }
            } else if (type === 'tutor' && itemId) {
                const tutor = API.tutors.allTutors.find(t => t.id === itemId);
                if (tutor) {
                    document.getElementById('orderType').value = 'tutor';
                    document.getElementById('orderTutor').value = itemId;
                    document.getElementById('orderCourse').value = '';
                }
            }
            
            //скрываем/показываем соответствующие поля
            this.toggleOrderFields();
            
            modal.show();
        },

        async showEditModal(orderId) {
            try {
                const order = await this.getById(orderId);
                if (!order) return;

                const modal = new bootstrap.Modal(document.getElementById('orderModal') || 
                    this.createOrderModal());
                
                //заполняем форму
                document.getElementById('orderModalTitle').textContent = 'Редактирование заявки';
                document.getElementById('submitOrderBtn').textContent = 'Сохранить изменения';
                document.getElementById('orderForm').dataset.mode = 'edit';
                document.getElementById('orderForm').dataset.orderId = orderId;
                
                //определяем тип заявки
                if (order.course_id) {
                    document.getElementById('orderType').value = 'course';
                    document.getElementById('orderCourse').value = order.course_id;
                    document.getElementById('orderTutor').value = '';
                    await this.populateCourseDates(order.course_id);
                } else if (order.tutor_id) {
                    document.getElementById('orderType').value = 'tutor';
                    document.getElementById('orderTutor').value = order.tutor_id;
                    document.getElementById('orderCourse').value = '';
                }
                
                //основные поля
                document.getElementById('orderDate').value = order.date_start;
                document.getElementById('orderTime').value = order.time_start;
                document.getElementById('orderPersons').value = order.persons;
                
                //дополнительные опции
                document.getElementById('earlyRegistration').checked = order.early_registration || false;
                document.getElementById('groupEnrollment').checked = order.group_enrollment || false;
                document.getElementById('intensiveCourse').checked = order.intensive_course || false;
                document.getElementById('supplementary').checked = order.supplementary || false;
                document.getElementById('personalized').checked = order.personalized || false;
                document.getElementById('excursions').checked = order.excursions || false;
                document.getElementById('assessment').checked = order.assessment || false;
                document.getElementById('interactive').checked = order.interactive || false;
                
                //скрываем/показываем соответствующие поля
                this.toggleOrderFields();
                
                modal.show();
            } catch (error) {
                API.utils.showNotification(`Ошибка загрузки заявки: ${error.message}`, 'danger');
            }
        },

        async populateCourseDates(courseId) {
            try {
                const course = await API.courses.getById(courseId);
                const dateSelect = document.getElementById('orderDate');
                
                if (course && course.start_dates) {
                    dateSelect.innerHTML = '<option value="">Выберите дату</option>';
                    course.start_dates.forEach(dateStr => {
                        const date = new Date(dateStr);
                        const option = document.createElement('option');
                        option.value = date.toISOString().split('T')[0];
                        option.textContent = date.toLocaleDateString('ru-RU');
                        dateSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error populating course dates:', error);
            }
        },

        toggleOrderFields() {
            const type = document.getElementById('orderType').value;
            const courseFields = document.getElementById('courseFields');
            const tutorFields = document.getElementById('tutorFields');
            
            if (courseFields) courseFields.style.display = type === 'course' ? 'block' : 'none';
            if (tutorFields) tutorFields.style.display = type === 'tutor' ? 'block' : 'none';
        },

        async showDetailModal(orderId) {
            try {
                const order = await this.getById(orderId);
                if (!order) return;

                const modal = new bootstrap.Modal(document.getElementById('orderDetailModal') || 
                    this.createDetailModal());
                
                document.getElementById('detailOrderId').textContent = order.id;
                
                //получаем дополнительную информацию
                let itemName = 'Неизвестно';
                let itemType = 'Неизвестно';
                
                if (order.course_id) {
                    const course = await API.courses.getById(order.course_id);
                    itemName = course ? course.name : `Курс #${order.course_id}`;
                    itemType = 'Курс';
                } else if (order.tutor_id) {
                    const tutor = await API.tutors.getById(order.tutor_id);
                    itemName = tutor ? tutor.name : `Репетитор #${order.tutor_id}`;
                    itemType = 'Репетитор';
                }
                
                //заполняем основную информацию
                document.getElementById('detailItemType').textContent = itemType;
                document.getElementById('detailItemName').textContent = itemName;
                document.getElementById('detailDate').textContent = API.utils.formatDate(order.date_start);
                document.getElementById('detailTime').textContent = order.time_start || 'Не указано';
                document.getElementById('detailPersons').textContent = order.persons;
                document.getElementById('detailDuration').textContent = `${order.duration} часов`;
                document.getElementById('detailTotalPrice').textContent = API.utils.formatPrice(order.price);
                
                // Заполняем опции
                const optionsContainer = document.getElementById('detailOptions');
                optionsContainer.innerHTML = '';
                
                const options = [
                    { id: 'early_registration', label: 'Ранняя регистрация', value: order.early_registration },
                    { id: 'group_enrollment', label: 'Групповая запись', value: order.group_enrollment },
                    { id: 'intensive_course', label: 'Интенсивный курс', value: order.intensive_course },
                    { id: 'supplementary', label: 'Доп. материалы', value: order.supplementary },
                    { id: 'personalized', label: 'Индивидуальные занятия', value: order.personalized },
                    { id: 'excursions', label: 'Культурные экскурсии', value: order.excursions },
                    { id: 'assessment', label: 'Оценка уровня', value: order.assessment },
                    { id: 'interactive', label: 'Интерактивная платформа', value: order.interactive }
                ];
                
                options.forEach(option => {
                    if (option.value) {
                        const badge = document.createElement('span');
                        badge.className = 'badge bg-info me-2 mb-2';
                        badge.textContent = option.label;
                        optionsContainer.appendChild(badge);
                    }
                });
                
                modal.show();
            } catch (error) {
                API.utils.showNotification(`Ошибка загрузки деталей: ${error.message}`, 'danger');
            }
        },

        confirmDelete(orderId) {
            const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal') || 
                this.createDeleteModal());
            
            document.getElementById('deleteOrderId').textContent = orderId;
            document.getElementById('confirmDeleteBtn').onclick = () => this.performDelete(orderId);
            
            modal.show();
        },

        async performDelete(orderId) {
            try {
                await this.delete(orderId);
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
                if (modal) modal.hide();
            } catch (error) {
                //ошибка уже обработана в методе delete()
            }
        },

        createOrderModal() {
            const modalHTML = `
                <div class="modal fade" id="orderModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="orderModalTitle">Оформление заявки</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="orderForm" data-mode="create">
                                <div class="modal-body">
                                    <div class="mb-3">
                                        <label class="form-label">Тип заявки *</label>
                                        <select class="form-select" id="orderType" required 
                                                onchange="API.orders.toggleOrderFields()">
                                            <option value="course">Курс</option>
                                            <option value="tutor">Репетитор</option>
                                        </select>
                                    </div>
                                    
                                    <div id="courseFields" style="display: block;">
                                        <div class="mb-3">
                                            <label class="form-label">Выберите курс *</label>
                                            <select class="form-select" id="orderCourse" 
                                                    onchange="API.orders.populateCourseDates(this.value)">
                                                <option value="">Выберите курс</option>
                                                ${API.courses.allCourses.map(c => 
                                                    `<option value="${c.id}">${c.name} (${c.level})</option>`
                                                ).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div id="tutorFields" style="display: none;">
                                        <div class="mb-3">
                                            <label class="form-label">Выберите репетитора *</label>
                                            <select class="form-select" id="orderTutor">
                                                <option value="">Выберите репетитора</option>
                                                ${API.tutors.allTutors.map(t => 
                                                    `<option value="${t.id}">${t.name} (${t.language_level})</option>`
                                                ).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Дата начала *</label>
                                            <input type="date" class="form-control" id="orderDate" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Время *</label>
                                            <input type="time" class="form-control" id="orderTime" required>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Количество человек (1-20) *</label>
                                        <input type="number" class="form-control" id="orderPersons" 
                                               min="1" max="20" value="1" required>
                                    </div>
                                    
                                    <h6 class="mt-4">Дополнительные опции</h6>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="earlyRegistration">
                                                <label class="form-check-label" for="earlyRegistration">
                                                    Скидка за раннюю регистрацию (10%)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="groupEnrollment">
                                                <label class="form-check-label" for="groupEnrollment">
                                                    Групповая скидка (15% от 5+ человек)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="intensiveCourse">
                                                <label class="form-check-label" for="intensiveCourse">
                                                    Интенсивный курс (+20%)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="supplementary">
                                                <label class="form-check-label" for="supplementary">
                                                    Доп. материалы (+2000 ₽ на человека)
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="personalized">
                                                <label class="form-check-label" for="personalized">
                                                    Индивидуальные занятия (+1500 ₽/неделю)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="excursions">
                                                <label class="form-check-label" for="excursions">
                                                    Культурные экскурсии (+25%)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="assessment">
                                                <label class="form-check-label" for="assessment">
                                                    Оценка уровня (+300 ₽)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="interactive">
                                                <label class="form-check-label" for="interactive">
                                                    Интерактивная платформа (+50%)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="alert alert-info mt-3">
                                        <i class="bi bi-info-circle"></i> 
                                        Итоговая стоимость будет рассчитана автоматически на сервере
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                        Отмена
                                    </button>
                                    <button type="submit" class="btn btn-primary" id="submitOrderBtn">
                                        Создать заявку
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <!-- Модальное окно деталей -->
                <div class="modal fade" id="orderDetailModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Детали заявки #<span id="detailOrderId"></span></h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Основная информация</h6>
                                        <p><strong>Тип:</strong> <span id="detailItemType"></span></p>
                                        <p><strong>Название:</strong> <span id="detailItemName"></span></p>
                                        <p><strong>Дата:</strong> <span id="detailDate"></span></p>
                                        <p><strong>Время:</strong> <span id="detailTime"></span></p>
                                        <p><strong>Кол-во человек:</strong> <span id="detailPersons"></span></p>
                                        <p><strong>Продолжительность:</strong> <span id="detailDuration"></span></p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Стоимость</h6>
                                        <p class="fs-4"><strong>Итого:</strong> <span id="detailTotalPrice" class="text-success"></span></p>
                                        <h6 class="mt-3">Дополнительные опции:</h6>
                                        <div id="detailOptions"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Модальное окно подтверждения удаления -->
                <div class="modal fade" id="deleteConfirmModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Подтверждение удаления</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Вы уверены, что хотите удалить заявку #<span id="deleteOrderId"></span>?</p>
                                <p class="text-danger">
                                    <i class="bi bi-exclamation-triangle"></i> Это действие нельзя отменить.
                                </p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Нет, отмена
                                </button>
                                <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                                    Да, удалить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.setupOrderForm();
            return document.getElementById('orderModal');
        },

        createDetailModal() {
            //уже создано в createOrderModal()
            return document.getElementById('orderDetailModal');
        },

        createDeleteModal() {
            //уже создано в createOrderModal()
            return document.getElementById('deleteConfirmModal');
        },

        setupOrderForm() {
            const form = document.getElementById('orderForm');
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const mode = form.dataset.mode;
                const orderId = form.dataset.orderId;
                const type = document.getElementById('orderType').value;
                
                //подготовка данных
                const orderData = {
                    date_start: document.getElementById('orderDate').value,
                    time_start: document.getElementById('orderTime').value,
                    persons: parseInt(document.getElementById('orderPersons').value),
                    early_registration: document.getElementById('earlyRegistration').checked,
                    group_enrollment: document.getElementById('groupEnrollment').checked,
                    intensive_course: document.getElementById('intensiveCourse').checked,
                    supplementary: document.getElementById('supplementary').checked,
                    personalized: document.getElementById('personalized').checked,
                    excursions: document.getElementById('excursions').checked,
                    assessment: document.getElementById('assessment').checked,
                    interactive: document.getElementById('interactive').checked
                };
                
                //добавляем ID курса или репетитора
                if (type === 'course') {
                    orderData.course_id = parseInt(document.getElementById('orderCourse').value);
                    orderData.tutor_id = null;
                } else {
                    orderData.tutor_id = parseInt(document.getElementById('orderTutor').value);
                    orderData.course_id = null;
                }
                
                try {
                    if (mode === 'create') {
                        await this.create(orderData);
                    } else if (mode === 'edit') {
                        await this.update(orderId, orderData);
                    }
                    
                    //закрываем модальное окно
                    const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
                    if (modal) modal.hide();
                    
                    //обновляем отображение (если мы на странице личного кабинета)
                    if (document.getElementById('ordersTableBody')) {
                        this.render('ordersTableBody', this.currentPage);
                        API.pagination.createPagination(
                            'ordersPagination',
                            this.currentPage,
                            this.allOrders.length,
                            API.config.itemsPerPage,
                            'API.orders.changePage'
                        );
                    }
                    
                } catch (error) {
                    //ошибка уже обработана в методах create/update
                }
            });
        }
    },

    //инициализация
    init() {
        //инициализируем апишки
        if (!this.config.apiKey || this.config.apiKey === 'YOUR_API_KEY') {
            const savedKey = localStorage.getItem('api_key');
            if (savedKey) {
                this.config.apiKey = savedKey;
            } else {
                this.utils.showNotification('API ключ не установлен. Установите ключ в API.config.apiKey', 'warning');
            }
        }
        
        //сохраняем ключ в localStorage
        localStorage.setItem('api_key', this.config.apiKey);
        
        return this;
    },

    //загрузка всех данных
    async loadAll() {
        try {
            await Promise.all([
                this.courses.load(),
                this.tutors.load(),
                this.orders.load()
            ]);
            return true;
        } catch (error) {
            this.utils.showNotification('Ошибка загрузки данных', 'danger');
            return false;
        }
    }
};

//инициализируем API при загрузке
document.addEventListener('DOMContentLoaded', () => {
    API.init();
});

//экспортируем API в глобальную область видимости
window.API = API;
