'use strict';

//глобальные переменные
let allCourses = [];
let allTutors = [];
let currentPage = 1;
const itemsPerPage = 5;

//переменные для работы с репетиторами
let selectedTutorId = null;
let allLanguages = new Set(); // Для хранения уникальных языков

//инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Страница загружена');
    
    //автоматически сохраняем API Key при первой загрузке
    if (!Auth.isAuthenticated()) {
        Auth.saveApiKey(API_KEY);
        Utils.showNotification('API Key автоматически сохранен', 'success');
    }
    
    //загружаем курсы
    await loadCourses();
    
    //загружаем репетиторы
    await loadTutors();
    
    //инициализируем обработчики
    initEventHandlers();
    
    //инициализируем модальное окно заказа
    initOrderModal();
});

//загрузка курсов
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

//отображение курсов
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
    
    //пагинация
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

//пагинация курсов
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

//загрузка репетиторов
async function loadTutors() {
    try {
        const tutorsContainer = document.getElementById('tutorsContainer');
        const searchTableBody = document.getElementById('tutorSearchTableBody');
        
        if (searchTableBody) {
            searchTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="spinner-border spinner-border-sm" role="status">
                            <span class="visually-hidden">Загрузка репетиторов...</span>
                        </div>
                        Загрузка репетиторов...
                    </td>
                </tr>
            `;
        }
        
        allTutors = await API.getTutors();
        console.log('Загружено репетиторов:', allTutors.length);
        
        //собираем уникальные языки
        allLanguages.clear();
        allTutors.forEach(tutor => {
            if (tutor.languages_offered && Array.isArray(tutor.languages_offered)) {
                tutor.languages_offered.forEach(lang => allLanguages.add(lang));
            }
        });
        
        //заполняем выпадающий список языков
        populateLanguagesFilter();
        
        //отображаем репетиторов в таблице
        displayTutorsInTable(allTutors);
        
    } catch (error) {
        console.error('Ошибка загрузки репетиторов:', error);
        const searchTableBody = document.getElementById('tutorSearchTableBody');
        if (searchTableBody) {
            searchTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle"></i> Ошибка загрузки репетиторов
                        <button class="btn btn-sm btn-outline-primary ms-2" onclick="location.reload()">
                            Попробовать снова
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

//заполнение фильтра языков
function populateLanguagesFilter() {
    const languagesSelect = document.getElementById('tutorLanguages');
    if (!languagesSelect) return;
    
    //очищаем текущие опции (кроме первой)
    languagesSelect.innerHTML = '<option value="">Все языки</option>';
    
    //добавляем уникальные языки
    const sortedLanguages = Array.from(allLanguages).sort();
    sortedLanguages.forEach(language => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        languagesSelect.appendChild(option);
    });
}

//отображение репетиторов в таблице
function displayTutorsInTable(tutors) {
    const tableBody = document.getElementById('tutorSearchTableBody');
    const noTutorsMessage = document.getElementById('noTutorsMessage');
    
    if (!tableBody) return;
    
    if (!tutors || tutors.length === 0) {
        tableBody.innerHTML = '';
        if (noTutorsMessage) noTutorsMessage.classList.remove('d-none');
        return;
    }
    
    if (noTutorsMessage) noTutorsMessage.classList.add('d-none');
    
    tableBody.innerHTML = tutors.map(tutor => {
        //определяем языки преподавания
        const teachingLanguages = tutor.languages_offered ? 
            tutor.languages_offered.join(', ') : 'Не указано';
        
        //определяем языки, на которых говорит репетитор
        const spokenLanguages = tutor.languages_spoken ?
            tutor.languages_spoken.join(', ') : 'Не указано';
        
        //проверяем, выбран ли этот репетитор
        const isSelected = selectedTutorId === tutor.id;
        const rowClass = isSelected ? 'table-primary' : '';
        
        return `
            <tr data-tutor-id="${tutor.id}" class="${rowClass}">
                <td>
                    <div class="avatar-placeholder rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 50px; height: 50px; background: linear-gradient(135deg, #6c757d, #495057);">
                        <i class="bi bi-person fs-5 text-white"></i>
                    </div>
                </td>
                <td>${tutor.name || 'Не указано'}</td>
                <td>${tutor.language_level || 'Не указано'}</td>
                <td>${teachingLanguages}</td>
                <td>${spokenLanguages}</td>
                <td>${tutor.work_experience || '0'} лет</td>
                <td><strong>${Utils.formatPrice(tutor.price_per_hour || 0)} ₽/час</strong></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="selectTutor(${tutor.id})" 
                                title="Выбрать репетитора">
                            <i class="bi bi-check-circle"></i> Выбрать
                        </button>
                        <button class="btn btn-outline-success" onclick="applyForTutor(${tutor.id})" 
                                title="Подать заявку">
                            <i class="bi bi-calendar-plus"></i> Заявка
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

//выбор репетитора из таблицы
function selectTutor(tutorId) {
    selectedTutorId = tutorId;
    
    //сбрасываем выделение всех строк
    const allRows = document.querySelectorAll('#tutorSearchTable tbody tr');
    allRows.forEach(row => {
        row.classList.remove('table-primary');
    });
    
    //выделяем выбранную строку
    const selectedRow = document.querySelector(`tr[data-tutor-id="${tutorId}"]`);
    if (selectedRow) {
        selectedRow.classList.add('table-primary');
        
        //показываем панель действий
        showTutorActionsPanel(tutorId);
    }
}

//показ панели действий для выбранного репетитора
function showTutorActionsPanel(tutorId) {
    const actionsContainer = document.getElementById('tutorActionsContainer');
    if (!actionsContainer) return;
    
    const tutor = allTutors.find(t => t.id === tutorId);
    if (!tutor) return;
    
    const teachingLanguages = tutor.languages_offered ? 
        tutor.languages_offered.join(', ') : 'Не указано';
    
    actionsContainer.style.display = 'block';
    actionsContainer.innerHTML = `
        <div class="card">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h5 class="card-title mb-1">
                            <i class="bi bi-check-circle-fill text-success"></i>
                            Выбран репетитор: ${tutor.name}
                        </h5>
                        <p class="card-text mb-1">
                            <strong>Языки преподавания:</strong> ${teachingLanguages}
                        </p>
                        <p class="card-text mb-1">
                            <strong>Опыт:</strong> ${tutor.work_experience || 0} лет |
                            <strong>Уровень:</strong> ${tutor.language_level || 'Не указано'}
                        </p>
                        <p class="card-text mb-0">
                            <strong>Стоимость:</strong> ${Utils.formatPrice(tutor.price_per_hour || 0)} ₽/час
                        </p>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-success btn-lg" onclick="applyForTutor(${tutorId})">
                            <i class="bi bi-calendar-plus"></i> Подать заявку
                        </button>
                        <button class="btn btn-outline-secondary mt-2" onclick="deselectTutor()">
                            <i class="bi bi-x-circle"></i> Отмена выбора
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    //прокручиваем к панели действий
    actionsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

//отмена выбора репетитора
function deselectTutor() {
    selectedTutorId = null;
    
    //сбрасываем выделение всех строк
    const allRows = document.querySelectorAll('#tutorSearchTable tbody tr');
    allRows.forEach(row => {
        row.classList.remove('table-primary');
    });
    
    //скрываем панель действий
    const actionsContainer = document.getElementById('tutorActionsContainer');
    if (actionsContainer) {
        actionsContainer.style.display = 'none';
        actionsContainer.innerHTML = '';
    }
}

//фильтрация репетиторов
function filterTutors() {
    const selectedLanguage = document.getElementById('tutorLanguages')?.value || '';
    const selectedLevel = document.getElementById('tutorLanguageLevel')?.value || '';
    const minExperience = parseInt(document.getElementById('tutorExperience')?.value) || 0;
    
    let filteredTutors = allTutors;
    
    //фильтр по языку преподавания
    if (selectedLanguage) {
        filteredTutors = filteredTutors.filter(tutor => 
            tutor.languages_offered && 
            Array.isArray(tutor.languages_offered) &&
            tutor.languages_offered.includes(selectedLanguage)
        );
    }
    
    //фильтр по уровню языка
    if (selectedLevel) {
        filteredTutors = filteredTutors.filter(tutor => 
            tutor.language_level === selectedLevel
        );
    }
    
    //фильтр по минимальному опыту
    if (minExperience > 0) {
        filteredTutors = filteredTutors.filter(tutor => 
            (tutor.work_experience || 0) >= minExperience
        );
    }
    
    //сбрасываем выбранного репетитора при изменении фильтров
    if (selectedTutorId && !filteredTutors.find(t => t.id === selectedTutorId)) {
        deselectTutor();
    }
    
    displayTutorsInTable(filteredTutors);
}

//подать заявку на курс
async function applyForCourse(courseId) {
    try {
        const course = allCourses.find(c => c.id === courseId);
        if (!course) {
            Utils.showNotification('Курс не найден', 'danger');
            return;
        }
        
        console.log('Выбран курс:', course);
        
        //проверяем авторизацию
        if (!Auth.isAuthenticated()) {
            Utils.showNotification('Для подачи заявки требуется авторизация', 'warning');
            return;
        }
        
        //сохраняем выбранный курс
        sessionStorage.setItem('selectedCourse', JSON.stringify(course));
        sessionStorage.setItem('applicationType', 'course');
        
        //заполняем информацию о курсе
        document.getElementById('orderCourseName').textContent = course.name;
        document.getElementById('orderTeacher').textContent = course.teacher;
        document.getElementById('orderLevel').textContent = course.level;
        document.getElementById('orderDuration').textContent = `${course.total_length} недель`;
        document.getElementById('basePricePerHour').textContent = Utils.formatPrice(course.course_fee_per_hour);
        
        //скрываем блок репетитора, показываем блок курса
        const courseInfo = document.getElementById('courseInfo');
        const tutorInfo = document.getElementById('tutorInfo');
        if (courseInfo) courseInfo.style.display = 'block';
        if (tutorInfo) tutorInfo.style.display = 'none';
        
        //сбрасываем форму
        resetOrderForm();
        
        //показываем модальное окно
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

//подать заявку к репетитору
async function applyForTutor(tutorId) {
    try {
        const tutor = allTutors.find(t => t.id === tutorId);
        if (!tutor) {
            Utils.showNotification('Репетитор не найден', 'danger');
            return;
        }
        
        console.log('Выбран репетитор для заявки:', tutor);
        
        //проверяем авторизацию
        if (!Auth.isAuthenticated()) {
            Utils.showNotification('Для подачи заявки требуется авторизация', 'warning');
            return;
        }
        
        //сохраняем выбранного репетитора
        sessionStorage.setItem('selectedTutor', JSON.stringify(tutor));
        sessionStorage.setItem('applicationType', 'tutor');
        
        //заполняем информацию о репетиторе
        document.getElementById('orderTutorName').textContent = tutor.name;
        document.getElementById('orderTutorExperience').textContent = `${tutor.work_experience || 0} лет`;
        
        const teachingLanguages = tutor.languages_offered ? 
            tutor.languages_offered.join(', ') : 'Не указано';
        document.getElementById('orderTutorLanguages').textContent = teachingLanguages;
        
        document.getElementById('tutorPricePerHour').textContent = Utils.formatPrice(tutor.price_per_hour || 0);
        
        //скрываем блок курса, показываем блок репетитора
        const courseInfo = document.getElementById('courseInfo');
        const tutorInfo = document.getElementById('tutorInfo');
        if (courseInfo) courseInfo.style.display = 'none';
        if (tutorInfo) tutorInfo.style.display = 'block';
        
        //сбрасываем форму
        resetOrderForm();
        
        //показываем модальное окно
        const modalElement = document.getElementById('orderModal');
        if (!modalElement) {
            console.error('Модальное окно #orderModal не найдено');
            Utils.showNotification('Ошибка: форма заявки не найдена', 'danger');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        //автоматически выбираем этого репетитора в таблице
        selectTutor(tutorId);
        
    } catch (error) {
        console.error('Ошибка при выборе репетитора:', error);
        Utils.showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

//проверка и применение автоматических опций
function checkAndApplyAutoOptions() {
    const autoOptions = {
        earlyRegistration: false,
        groupEnrollment: false,
        intensiveCourse: false
    };
    const autoOptionsList = [];
    
    // 1. Проверка ранней регистрации (не менее чем за месяц вперед)
    const selectedDate = document.getElementById('orderDate')?.value;
    if (selectedDate) {
        const today = new Date();
        const orderDate = new Date(selectedDate);
        const monthDiff = (orderDate - today) / (1000 * 60 * 60 * 24 * 30); //разница в месяцах
        
        if (monthDiff >= 1) {
            autoOptions.earlyRegistration = true;
            autoOptionsList.push({
                name: 'Скидка за раннюю регистрацию',
                description: 'Регистрация за месяц и более вперед',
                effect: '-10%',
                icon: 'bi-calendar-check'
            });
        }
    }
    
    // 2. Проверка групповой записи (5 и более человек)
    const persons = parseInt(document.getElementById('persons')?.value) || 1;
    if (persons >= 5) {
        autoOptions.groupEnrollment = true;
        autoOptionsList.push({
            name: 'Групповая скидка',
            description: `Группа из ${persons} человек`,
            effect: '-15%',
            icon: 'bi-people-fill'
        });
    }
    
    // 3. Проверка интенсивного курса (5 часов в неделю и более)
    const applicationType = sessionStorage.getItem('applicationType');
    if (applicationType === 'course') {
        const selectedCourse = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
        if (selectedCourse.week_length >= 5) {
            autoOptions.intensiveCourse = true;
            autoOptionsList.push({
                name: 'Интенсивный курс',
                description: `${selectedCourse.week_length} часов в неделю`,
                effect: '+20%',
                icon: 'bi-lightning-charge'
            });
        }
    }
    
    // Показываем плашку с автоматически примененными опциями
    const autoOptionsContainer = document.getElementById('autoAppliedOptions');
    const autoOptionsListContainer = document.getElementById('autoOptionsList');
    
    if (autoOptionsList.length > 0 && autoOptionsContainer && autoOptionsListContainer) {
        autoOptionsContainer.style.display = 'block';
        autoOptionsListContainer.innerHTML = autoOptionsList.map(option => `
            <div class="d-flex align-items-center mb-1">
                <i class="bi ${option.icon} me-2 text-primary"></i>
                <div>
                    <strong>${option.name}</strong> 
                    <span class="badge ${option.effect.startsWith('+') ? 'bg-warning' : 'bg-success'} ms-2">
                        ${option.effect}
                    </span>
                    <div class="text-muted small">${option.description}</div>
                </div>
            </div>
        `).join('');
    } else if (autoOptionsContainer) {
        autoOptionsContainer.style.display = 'none';
    }
    
    // Заполняем скрытые поля для отправки на сервер
    document.getElementById('earlyRegistration').value = autoOptions.earlyRegistration;
    document.getElementById('groupEnrollment').value = autoOptions.groupEnrollment;
    document.getElementById('intensiveCourse').value = autoOptions.intensiveCourse;
    
    return autoOptions;
}

//расчет общей стоимости
function calculateTotalPrice() {
    const applicationType = sessionStorage.getItem('applicationType');
    
    if (!applicationType) {
        document.getElementById('totalCost').textContent = '0';
        return;
    }
    
    //проверяем и применяем автоматические опции
    const autoOptions = checkAndApplyAutoOptions();
    
    let selectedData = null;
    
    if (applicationType === 'course') {
        selectedData = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
    } else if (applicationType === 'tutor') {
        selectedData = JSON.parse(sessionStorage.getItem('selectedTutor') || '{}');
    } else {
        document.getElementById('totalCost').textContent = '0';
        return;
    }
    
    const studentsNumber = parseInt(document.getElementById('persons')?.value) || 1;
    const selectedDate = document.getElementById('orderDate')?.value;
    const selectedTime = document.getElementById('orderTime')?.value;
    
    //определяем длительность в часах
    let durationInHours;
    if (applicationType === 'course') {
        durationInHours = (selectedData.week_length || 0) * (selectedData.total_length || 0);
    } else {
        durationInHours = parseInt(document.getElementById('duration')?.value) || 1;
    }
    
    //собираем ВСЕ опции: автоматические + пользовательские
    const options = {
        //автоматические опции
        early_registration: autoOptions.earlyRegistration,
        group_enrollment: autoOptions.groupEnrollment,
        intensive_course: autoOptions.intensiveCourse,
        
        //пользовательские опции
        supplementary: document.getElementById('supplementaryCheck')?.checked || false,
        personalized: document.getElementById('personalizedCheck')?.checked || false,
        excursions: document.getElementById('excursionsCheck')?.checked || false,
        assessment: document.getElementById('assessmentCheck')?.checked || false,
        interactive: document.getElementById('interactiveCheck')?.checked || false
    };
    
    //рассчитываем стоимость
    let totalPrice = 0;
    
    try {
        totalPrice = Utils.calculateCoursePrice(
            selectedData, 
            selectedDate, 
            selectedTime, 
            studentsNumber,
            durationInHours,
            options
        );
    } catch (error) {
        console.error('Ошибка расчета стоимости:', error);
        totalPrice = 0;
    }
    
    //отображаем итоговую стоимость
    const totalCostElement = document.getElementById('totalCost');
    if (totalCostElement) {
        totalCostElement.textContent = Utils.formatPrice(Math.round(totalPrice));
    }
}

//инициализация модального окна заказа
function initOrderModal() {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm) return;
    
    orderForm.addEventListener('submit', submitOrder);
    
    //обработчики изменений для пересчета стоимости
    ['#orderDate', '#orderTime', '#persons', '#duration'].forEach(id => {
        const element = document.querySelector(id);
        if (element) {
            element.addEventListener('change', calculateTotalPrice);
        }
    });
    
    //обработчики для пользовательских чекбоксов
    document.querySelectorAll('.extra-option').forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotalPrice);
    });
    
    //устанавливаем минимальную дату на сегодня
    const today = new Date().toISOString().split('T')[0];
    const orderDateInput = document.getElementById('orderDate');
    if (orderDateInput) {
        orderDateInput.min = today;
        orderDateInput.value = today;
    }
}

//сброс формы заказа
function resetOrderForm() {
    const form = document.getElementById('orderForm');
    if (form) {
        form.reset();
        
        //устанавливаем минимальную дату на сегодня
        const today = new Date().toISOString().split('T')[0];
        const orderDateInput = document.getElementById('orderDate');
        if (orderDateInput) {
            orderDateInput.value = today;
            orderDateInput.min = today;
        }
        
        //устанавливаем стандартное время
        const orderTimeInput = document.getElementById('orderTime');
        if (orderTimeInput) {
            orderTimeInput.value = '10:00';
        }
    }
    
    //скрываем плашку автоматических опций
    const autoOptionsContainer = document.getElementById('autoAppliedOptions');
    if (autoOptionsContainer) {
        autoOptionsContainer.style.display = 'none';
    }
    
    calculateTotalPrice();
}

//отправка заявки
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
        const studentsNumber = parseInt(document.getElementById('persons').value) || 1;
        
        if (!selectedDate || !selectedTime) {
            Utils.showNotification('Выберите дату и время занятия', 'warning');
            return;
        }
        
        //определяем длительность
        let durationInHours;
        if (applicationType === 'course') {
            durationInHours = (selectedData.week_length || 0) * (selectedData.total_length || 0);
        } else {
            durationInHours = parseInt(document.getElementById('duration').value) || 1;
        }
        
        //проверяем автоматические опции
        const autoOptions = checkAndApplyAutoOptions();
        
        //собираем ВСЕ опции
        const options = {
            //автоматические опции
            early_registration: autoOptions.earlyRegistration,
            group_enrollment: autoOptions.groupEnrollment,
            intensive_course: autoOptions.intensiveCourse,
            
            //пользовательские опции
            supplementary: document.getElementById('supplementaryCheck')?.checked || false,
            personalized: document.getElementById('personalizedCheck')?.checked || false,
            excursions: document.getElementById('excursionsCheck')?.checked || false,
            assessment: document.getElementById('assessmentCheck')?.checked || false,
            interactive: document.getElementById('interactiveCheck')?.checked || false
        };
        
        //рассчитываем стоимость
        const calculatedPrice = Utils.calculateCoursePrice(
            selectedData,
            selectedDate,
            selectedTime,
            studentsNumber,
            durationInHours,
            options
        );
        
        //формируем данные для отправки
        const formData = {
            date_start: selectedDate,
            time_start: selectedTime,
            persons: studentsNumber,
            duration: durationInHours,
            //автоматические опции
            early_registration: autoOptions.earlyRegistration,
            group_enrollment: autoOptions.groupEnrollment,
            intensive_course: autoOptions.intensiveCourse,
            //пользовательские опции
            supplementary: document.getElementById('supplementaryCheck')?.checked || false,
            personalized: document.getElementById('personalizedCheck')?.checked || false,
            excursions: document.getElementById('excursionsCheck')?.checked || false,
            assessment: document.getElementById('assessmentCheck')?.checked || false,
            interactive: document.getElementById('interactiveCheck')?.checked || false,
            price: Math.round(calculatedPrice)
        };
        
        if (applicationType === 'course') {
            formData.course_id = selectedData.id;
            formData.tutor_id = 0;
        } else {
            formData.tutor_id = selectedData.id;
            formData.course_id = 0;
        }
        
        console.log('Отправка заявки с данными:', formData);
        
        //отправляем заявку
        const result = await API.createOrder(formData);
        
        Utils.showNotification('Заявка успешно создана!', 'success');
        
        //закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
        modal.hide();
        
        //перенаправляем в личный кабинет
        setTimeout(() => {
            window.location.href = 'cabinet.html';
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка создания заявки:', error);
        Utils.showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

//показать детали курса
async function showCourseDetails(courseId) {
    try {
        const course = await API.getCourse(courseId);
        
        //создаем модальное окно для деталей
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
        
        //удаляем старую модалку если есть
        const oldModal = document.getElementById('courseDetailModal');
        if (oldModal) oldModal.remove();
        
        //добавляем новую модалку
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        //показываем модалку
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

//поиск курсов
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

//инициализация обработчиков событий
function initEventHandlers() {
    //поиск курсов
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
    
    //фильтрация репетиторов
    const tutorLanguages = document.getElementById('tutorLanguages');
    const tutorLanguageLevel = document.getElementById('tutorLanguageLevel');
    const tutorExperience = document.getElementById('tutorExperience');
    
    if (tutorLanguages) {
        tutorLanguages.addEventListener('change', filterTutors);
    }
    
    if (tutorLanguageLevel) {
        tutorLanguageLevel.addEventListener('change', filterTutors);
    }
    
    if (tutorExperience) {
        tutorExperience.addEventListener('input', filterTutors);
    }
}

//глобальные функции
window.searchCourses = searchCourses;
window.filterTutors = filterTutors;
window.applyForCourse = applyForCourse;
window.applyForTutor = applyForTutor;
window.changePage = changePage;
window.showCourseDetails = showCourseDetails;
window.selectTutor = selectTutor;
window.deselectTutor = deselectTutor;
