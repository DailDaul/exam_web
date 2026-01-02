'use strict';

// Глобальные переменные
let allCourses = [];
let allTutors = [];
let currentPage = 1;
const itemsPerPage = 5;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Страница загружена');
    
    // Автоматически сохраняем API Key при первой загрузке
    if (!Auth.isAuthenticated()) {
        Auth.saveApiKey(API_KEY);
        Utils.showNotification('API Key автоматически сохранен', 'success');
    }
    
    // Загружаем курсы
    await loadCourses();
    
    // Загружаем репетиторы
    await loadTutors();
    
    // Инициализируем обработчики
    initEventHandlers();
    
    // Инициализируем модальное окно заказа
    initOrderModal();
});

// Загрузка курсов
async function loadCourses() {
    try {
        const coursesContainer = document.getElementById('coursesContainer');
        if (!coursesContainer) return;
        
        coursesContainer.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка курсов...</span>
                </div>
                <p class="mt-2">Загрузка курсов...</p>
            </div>
        `;
        
        allCourses = await API.getCourses();
        console.log('Загружено курсов:', allCourses.length);
        displayCourses(allCourses);
        setupCoursesPagination();
        
    } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
        document.getElementById('coursesContainer').innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Не удалось загрузить курсы. Проверьте подключение к интернету.
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="location.reload()">
                        Попробовать снова
                    </button>
                </div>
            </div>
        `;
    }
}

// Отображение курсов
function displayCourses(courses) {
    const container = document.getElementById('coursesContainer');
    if (!container) return;
    
    if (!courses || courses.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Курсы не найдены</p>
            </div>
        `;
        return;
    }
    
    // Пагинация
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCourses = courses.slice(startIndex, endIndex);
    
    container.innerHTML = paginatedCourses.map(course => `
        <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${course.name}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">Уровень: ${course.level}</h6>
                    <p class="card-text">${course.description || 'Описание отсутствует'}</p>
                    <p><strong>Преподаватель:</strong> ${course.teacher}</p>
                    <p><strong>Длительность:</strong> ${course.total_length} недель (${course.week_length} часов/неделю)</p>
                    <p><strong>Стоимость:</strong> ${Utils.formatPrice(course.course_fee_per_hour)} ₽/час</p>
                    
                    <div class="d-grid gap-2 mt-3">
                        <button class="btn btn-primary" onclick="applyForCourse(${course.id})">
                            <i class="bi bi-pencil-square"></i> Подать заявку
                        </button>
                        <button class="btn btn-outline-secondary" onclick="showCourseDetails(${course.id})">
                            <i class="bi bi-info-circle"></i> Подробнее
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Пагинация курсов
function setupCoursesPagination() {
    const pagination = document.getElementById('coursesPagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(allCourses.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Назад</a>
        </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Вперед</a>
        </li>
    `;
    
    pagination.querySelector('ul').innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(allCourses.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayCourses(allCourses);
    setupCoursesPagination();
    window.scrollTo({ top: document.getElementById('courses').offsetTop, behavior: 'smooth' });
}

// Загрузка репетиторов
async function loadTutors() {
    try {
        const tutorsContainer = document.getElementById('tutorsContainer');
        if (!tutorsContainer) return;
        
        tutorsContainer.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка репетиторов...</span>
                </div>
                <p class="mt-2">Загрузка репетиторов...</p>
            </div>
        `;
        
        allTutors = await API.getTutors();
        console.log('Загружено репетиторов:', allTutors.length);
        displayTutors(allTutors);
        
    } catch (error) {
        console.error('Ошибка загрузки репетиторов:', error);
        document.getElementById('tutorsContainer').innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Не удалось загрузить репетиторов. Проверьте подключение к интернету.
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="location.reload()">
                        Попробовать снова
                    </button>
                </div>
            </div>
        `;
    }
}

// Отображение репетиторов
function displayTutors(tutors) {
    const container = document.getElementById('tutorsContainer');
    if (!container) return;
    
    if (!tutors || tutors.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Репетиторы не найдены</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tutors.map(tutor => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="avatar-placeholder rounded-circle me-3 d-flex align-items-center justify-content-center" 
                             style="width: 60px; height: 60px; background: linear-gradient(135deg, #6c757d, #495057);">
                            <i class="bi bi-person fs-4 text-white"></i>
                        </div>
                        <div>
                            <h5 class="card-title mb-0">${tutor.name}</h5>
                            <p class="text-muted mb-0">Опыт: ${tutor.work_experience} лет</p>
                        </div>
                    </div>
                    
                    <p><strong>Языки преподавания:</strong> ${(tutor.languages_offered || []).join(', ')}</p>
                    <p><strong>Говорит на:</strong> ${(tutor.languages_spoken || []).join(', ')}</p>
                    <p><strong>Уровень:</strong> ${tutor.language_level}</p>
                    <p><strong>Стоимость:</strong> ${Utils.formatPrice(tutor.price_per_hour)} ₽/час</p>
                    
                    <div class="mt-3">
                        <button class="btn btn-primary w-100" onclick="applyForTutor(${tutor.id})">
                            <i class="bi bi-calendar-plus"></i> Записаться на занятие
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Фильтрация репетиторов
function filterTutors() {
    const qualification = document.getElementById('tutorQualification')?.value;
    const experience = parseInt(document.getElementById('tutorExperience')?.value) || 0;
    
    let filtered = allTutors;
    
    // Фильтр по языкам
    if (qualification && qualification !== 'all') {
        filtered = filtered.filter(tutor => 
            tutor.languages_offered?.some(lang => 
                lang.toLowerCase().includes(qualification.toLowerCase())
            )
        );
    }
    
    // Фильтр по опыту
    if (experience > 0) {
        filtered = filtered.filter(tutor => tutor.work_experience >= experience);
    }
    
    displayTutors(filtered);
}

// Подать заявку на курс
async function applyForCourse(courseId) {
    try {
        const course = allCourses.find(c => c.id === courseId);
        if (!course) {
            Utils.showNotification('Курс не найден', 'danger');
            return;
        }
        
        console.log('Выбран курс:', course);
        
        // Проверяем авторизацию
        if (!Auth.isAuthenticated()) {
            Utils.showNotification('Для подачи заявки требуется авторизация', 'warning');
            return;
        }
        
        // Сохраняем выбранный курс
        sessionStorage.setItem('selectedCourse', JSON.stringify(course));
        sessionStorage.setItem('applicationType', 'course');
        
        // Заполняем информацию о курсе
        document.getElementById('orderCourseName').textContent = course.name;
        document.getElementById('orderTeacher').textContent = course.teacher;
        document.getElementById('orderLevel').textContent = course.level;
        document.getElementById('orderDuration').textContent = `${course.total_length} недель`;
        document.getElementById('basePricePerHour').textContent = Utils.formatPrice(course.course_fee_per_hour);
        
        // Скрываем блок репетитора, показываем блок курса
        const courseInfo = document.getElementById('courseInfo');
        const tutorInfo = document.getElementById('tutorInfo');
        if (courseInfo) courseInfo.style.display = 'block';
        if (tutorInfo) tutorInfo.style.display = 'none';
        
        // Сбрасываем форму
        resetOrderForm();
        
        // Показываем модальное окно
        const modalElement = document.getElementById('orderModal');
        if (!modalElement) {
            console.error('Модальное окно #orderModal не найдено');
            Utils.showNotification('Ошибка: форма заявки не найдена', 'danger');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error('Ошибка при выборе курса:', error);
        Utils.showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

// Подать заявку к репетитору
async function applyForTutor(tutorId) {
    try {
        const tutor = allTutors.find(t => t.id === tutorId);
        if (!tutor) {
            Utils.showNotification('Репетитор не найден', 'danger');
            return;
        }
        
        console.log('Выбран репетитор:', tutor);
        
        // Проверяем авторизацию
        if (!Auth.isAuthenticated()) {
            Utils.showNotification('Для подачи заявки требуется авторизация', 'warning');
            return;
        }
        
        // Сохраняем выбранного репетитора
        sessionStorage.setItem('selectedTutor', JSON.stringify(tutor));
        sessionStorage.setItem('applicationType', 'tutor');
        
        // Заполняем информацию о репетиторе
        document.getElementById('orderTutorName').textContent = tutor.name;
        document.getElementById('orderTutorExperience').textContent = `${tutor.work_experience} лет`;
        document.getElementById('orderTutorLanguages').textContent = (tutor.languages_offered || []).join(', ');
        document.getElementById('tutorPricePerHour').textContent = Utils.formatPrice(tutor.price_per_hour);
        
        // Скрываем блок курса, показываем блок репетитора
        const courseInfo = document.getElementById('courseInfo');
        const tutorInfo = document.getElementById('tutorInfo');
        if (courseInfo) courseInfo.style.display = 'none';
        if (tutorInfo) tutorInfo.style.display = 'block';
        
        // Сбрасываем форму
        resetOrderForm();
        
        // Показываем модальное окно
        const modalElement = document.getElementById('orderModal');
        if (!modalElement) {
            console.error('Модальное окно #orderModal не найдено');
            Utils.showNotification('Ошибка: форма заявки не найдена', 'danger');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error('Ошибка при выборе репетитора:', error);
        Utils.showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

// Инициализация модального окна заказа
function initOrderModal() {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm) return;
    
    orderForm.addEventListener('submit', submitOrder);
    
    // Обработчики изменений для пересчета стоимости
    ['#orderDate', '#orderTime', '#persons', '#duration'].forEach(id => {
        const element = document.querySelector(id);
        if (element) {
            element.addEventListener('change', calculateTotalPrice);
        }
    });
    
    // Обработчики для чекбоксов
    document.querySelectorAll('.form-check-input').forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotalPrice);
    });
    
    // Устанавливаем минимальную дату на сегодня
    const today = new Date().toISOString().split('T')[0];
    const orderDateInput = document.getElementById('orderDate');
    if (orderDateInput) {
        orderDateInput.min = today;
    }
}

// Сброс формы заказа
function resetOrderForm() {
    const form = document.getElementById('orderForm');
    if (form) {
        form.reset();
        
        // Устанавливаем минимальную дату на сегодня
        const today = new Date().toISOString().split('T')[0];
        const orderDateInput = document.getElementById('orderDate');
        if (orderDateInput) {
            orderDateInput.value = today;
            orderDateInput.min = today;
        }
        
        // Устанавливаем стандартное время
        const orderTimeInput = document.getElementById('orderTime');
        if (orderTimeInput) {
            orderTimeInput.value = '10:00';
        }
    }
    
    calculateTotalPrice();
}

// Расчет общей стоимости
function calculateTotalPrice() {
    const applicationType = sessionStorage.getItem('applicationType');
    
    if (!applicationType) {
        document.getElementById('totalCost').textContent = '0';
        return;
    }
    
    let selectedData = null;
    
    if (applicationType === 'course') {
        selectedData = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
    } else if (applicationType === 'tutor') {
        selectedData = JSON.parse(sessionStorage.getItem('selectedTutor') || '{}');
    } else {
        document.getElementById('totalCost').textContent = '0';
        return;
    }
    
    const persons = parseInt(document.getElementById('persons')?.value) || 1;
    const selectedDate = document.getElementById('orderDate')?.value;
    const selectedTime = document.getElementById('orderTime')?.value;
    const duration = applicationType === 'tutor' ? parseInt(document.getElementById('duration')?.value) || 1 : 1;
    
    // Собираем опции
    const options = {
        early_registration: document.getElementById('earlyRegistration')?.checked || false,
        group_enrollment: document.getElementById('groupEnrollment')?.checked || false,
        intensive_course: document.getElementById('intensiveCourse')?.checked || false,
        supplementary: document.getElementById('supplementary')?.checked || false,
        personalized: document.getElementById('personalized')?.checked || false,
        excursions: document.getElementById('excursions')?.checked || false,
        assessment: document.getElementById('assessment')?.checked || false,
        interactive: document.getElementById('interactive')?.checked || false
    };
    
    let totalPrice = 0;
    
    if (applicationType === 'course') {
        // Используем единую функцию расчета из Utils
        totalPrice = Utils.calculateCoursePrice(
            selectedData, 
            selectedDate, 
            selectedTime, 
            persons, 
            options
        );
    } else if (applicationType === 'tutor') {
        // Для репетиторов корректируем общую длительность
        const tutorWithDuration = { ...selectedData };
        tutorWithDuration.week_length = duration;
        tutorWithDuration.total_length = 1;
        
        totalPrice = Utils.calculateCoursePrice(
            tutorWithDuration,
            selectedDate,
            selectedTime,
            persons,
            options
        );
    }
    
    // Отображаем итоговую стоимость
    const totalCostElement = document.getElementById('totalCost');
    if (totalCostElement) {
        totalCostElement.textContent = Utils.formatPrice(Math.round(totalPrice));
    }
}

// Отправка заявки
async function submitOrder(event) {
    event.preventDefault();
    
    if (!Auth.isAuthenticated()) {
        Utils.showNotification('Для подачи заявки требуется авторизация', 'warning');
        return;
    }
    
    try {
        const applicationType = sessionStorage.getItem('applicationType');
        let selectedData = null;
        
        if (applicationType === 'course') {
            selectedData = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
        } else if (applicationType === 'tutor') {
            selectedData = JSON.parse(sessionStorage.getItem('selectedTutor') || '{}');
        } else {
            Utils.showNotification('Не выбран курс или репетитор', 'warning');
            return;
        }
        
        const selectedDate = document.getElementById('orderDate').value;
        const selectedTime = document.getElementById('orderTime').value;
        const persons = parseInt(document.getElementById('persons').value) || 1;
        
        if (!selectedDate || !selectedTime) {
            Utils.showNotification('Выберите дату и время занятия', 'warning');
            return;
        }
        
        // Используем единый формат данных
        const formData = {
            date_start: selectedDate,
            time_start: selectedTime,
            persons: persons,
            early_registration: document.getElementById('earlyRegistration').checked,
            group_enrollment: document.getElementById('groupEnrollment').checked,
            intensive_course: document.getElementById('intensiveCourse').checked,
            supplementary: document.getElementById('supplementary').checked,
            personalized: document.getElementById('personalized').checked,
            excursions: document.getElementById('excursions').checked,
            assessment: document.getElementById('assessment').checked,
            interactive: document.getElementById('interactive').checked,
            price: parseInt(document.getElementById('totalCost').textContent.replace(/\s/g, ''))
        };
        
        if (applicationType === 'course') {
            formData.course_id = selectedData.id;
            formData.tutor_id = 0;
        } else {
            formData.tutor_id = selectedData.id;
            formData.course_id = 0;
        }
        
        console.log('Отправка заявки:', formData);
        
        // Отправляем заявку
        const result = await API.createOrder(formData);
        
        Utils.showNotification('Заявка успешно создана!', 'success');
        
        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
        modal.hide();
        
        // Перенаправляем в личный кабинет
        setTimeout(() => {
            window.location.href = 'cabinet.html';
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка создания заявки:', error);
        Utils.showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

// Показать детали курса
async function showCourseDetails(courseId) {
    try {
        const course = await API.getCourse(courseId);
        
        // Создаем модальное окно для деталей
        const modalHTML = `
            <div class="modal fade" id="courseDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${course.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Преподаватель:</strong> ${course.teacher}</p>
                                    <p><strong>Уровень:</strong> ${course.level}</p>
                                    <p><strong>Длительность:</strong> ${course.total_length} недель</p>
                                    <p><strong>Занятий в неделю:</strong> ${course.week_length} часа</p>
                                    <p><strong>Стоимость:</strong> ${Utils.formatPrice(course.course_fee_per_hour)} ₽/час</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Даты начала:</h6>
                                    <ul class="list-group">
                                        ${(course.start_dates || []).map(date => {
                                            const dateObj = new Date(date);
                                            return `
                                                <li class="list-group-item">
                                                    ${dateObj.toLocaleDateString('ru-RU')} 
                                                    ${dateObj.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                                                </li>
                                            `;
                                        }).join('')}
                                    </ul>
                                </div>
                            </div>
                            <hr>
                            <div>
                                <h6>Описание</h6>
                                <p>${course.description || 'Описание отсутствует'}</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="applyForCourse(${course.id})" data-bs-dismiss="modal">
                                Подать заявку
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Удаляем старую модалку если есть
        const oldModal = document.getElementById('courseDetailModal');
        if (oldModal) oldModal.remove();
        
        // Добавляем новую модалку
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Показываем модалку
        const modalElement = document.getElementById('courseDetailModal');
        if (!modalElement) {
            console.error('Модальное окно courseDetailModal не создано');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error('Ошибка загрузки деталей курса:', error);
        Utils.showNotification('Не удалось загрузить информацию о курсе', 'error');
    }
}

// Инициализация обработчиков событий
function initEventHandlers() {
    // Поиск курсов
    const searchBtn = document.querySelector('button[onclick*="searchCourses"]');
    if (searchBtn) {
        searchBtn.onclick = searchCourses;
    }
    
    const courseNameInput = document.getElementById('courseNameInput');
    if (courseNameInput) {
        courseNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchCourses();
        });
    }
    
    const courseLevelSelect = document.getElementById('courseLevelSelect');
    if (courseLevelSelect) {
        courseLevelSelect.addEventListener('change', searchCourses);
    }
    
    // Фильтрация репетиторов
    const tutorQualification = document.getElementById('tutorQualification');
    const tutorExperience = document.getElementById('tutorExperience');
    
    if (tutorQualification) {
        tutorQualification.addEventListener('change', filterTutors);
    }
    
    if (tutorExperience) {
        tutorExperience.addEventListener('input', filterTutors);
    }
}

// Поиск курсов
function searchCourses() {
    const nameInput = document.getElementById('courseNameInput')?.value.toLowerCase() || '';
    const levelSelect = document.getElementById('courseLevelSelect')?.value || '';
    
    let filtered = allCourses;
    
    if (nameInput) {
        filtered = filtered.filter(course => 
            course.name.toLowerCase().includes(nameInput) ||
            (course.description && course.description.toLowerCase().includes(nameInput)) ||
            course.teacher.toLowerCase().includes(nameInput)
        );
    }
    
    if (levelSelect) {
        filtered = filtered.filter(course => course.level === levelSelect);
    }
    
    currentPage = 1;
    displayCourses(filtered);
    setupCoursesPagination();
}

// Глобальные функции
window.searchCourses = searchCourses;
window.filterTutors = filterTutors;
window.applyForCourse = applyForCourse;
window.applyForTutor = applyForTutor;
window.changePage = changePage;
window.showCourseDetails = showCourseDetails;
