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
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Назад</a>
        </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Вперед</a>
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

//вспомогательная функция для получения ближайших понедельников
function getNextMondays(count) {
    const mondays = [];
    const today = new Date();
    
    //находим следующий понедельник
    let nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    
    for (let i = 0; i < count; i++) {
        const monday = new Date(nextMonday);
        monday.setDate(nextMonday.getDate() + (i * 7));
        mondays.push(monday);
    }
    
    return mondays;
}

//заполнение доступных дат начала курса ИЗ API
function populateCourseStartDates(startDates) {
    const dateSelect = document.getElementById('courseStartDate');
    if (!dateSelect) return;
    
    dateSelect.innerHTML = '<option value="">Выберите дату начала курса</option>';
    
    if (!startDates || startDates.length === 0) {
        //если в API нет дат, используем ближайшие понедельники на 4 недели вперед
        const nextMondays = getNextMondays(4);
        nextMondays.forEach(date => {
            const option = document.createElement('option');
            option.value = date.toISOString().split('T')[0];
            option.textContent = date.toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            dateSelect.appendChild(option);
        });
        console.warn('Нет дат начала курса в API, используются стандартные понедельники');
        return;
    }
    
    //используем даты ИЗ API
    const sortedDates = startDates.sort((a, b) => new Date(a) - new Date(b));
    
    sortedDates.forEach(dateStr => {
        try {
            const date = new Date(dateStr);
            const option = document.createElement('option');
            option.value = date.toISOString().split('T')[0];
            option.textContent = date.toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            dateSelect.appendChild(option);
        } catch (e) {
            console.warn('Некорректная дата из API:', dateStr);
        }
    });
    
    console.log('Загружены даты начала курса из API:', sortedDates.length);
}

//функция для расчета даты окончания курса
function calculateCourseEndDate(startDate, totalWeeks) {
    const endDate = new Date(startDate);
    //предполагаем, что занятия идут по расписанию 2 раза в неделю
    const daysToAdd = totalWeeks * 7;
    endDate.setDate(endDate.getDate() + daysToAdd);
    return endDate;
}

function populateCourseTimes(startDate) {
    const timeSelect = document.getElementById('courseTimeSelect');
    if (!timeSelect) return;
    
    timeSelect.innerHTML = '<option value="">Выберите время занятия</option>';
    
    //стандартные варианты времени занятий
    const defaultTimes = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];
    
    //фильтруем времена, чтобы занятия не заканчивались слишком поздно
    const availableTimes = defaultTimes.filter(time => {
        const [hours] = time.split(':').map(Number);
        const endHour = hours + 2; //предполагаем 2 часа за занятие
        return endHour <= 21; //занятия заканчиваются не позже 21:00
    });
    
    availableTimes.forEach(time => {
        try {
            const [hours, minutes] = time.split(':');
            const option = document.createElement('option');
            option.value = time;
            
            //вычисляем время окончания занятия
            const endTime = new Date(`2000-01-01T${time}:00`);
            endTime.setHours(endTime.getHours() + 2);
            
            const endTimeStr = endTime.toTimeString().substring(0, 5);
            option.textContent = `${time} - ${endTimeStr} (начало - окончание)`;
            
            timeSelect.appendChild(option);
        } catch (e) {
            console.warn('Ошибка обработки времени:', time);
        }
    });
    
    console.log('Доступные времена занятий для курса:', availableTimes);
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
        
        //загружаем полные данные курса с датами начала ИЗ API
        const fullCourseData = await API.getCourse(courseId);
        
        //сохраняем выбранный курс
        sessionStorage.setItem('selectedCourse', JSON.stringify(fullCourseData));
        sessionStorage.setItem('applicationType', 'course');
        
        // 1. ЗАПОЛНЯЕМ ПОЛЯ ФОРМЫ НЕМЕДЛЕННО
        document.getElementById('orderCourseName').value = fullCourseData.name || 'Не указано';
        document.getElementById('orderTeacher').value = fullCourseData.teacher || 'Не указано';
        document.getElementById('orderDurationWeeks').value = fullCourseData.total_length || 1;
        
        // 2. Заполняем доступные даты начала ИЗ API
        populateCourseStartDates(fullCourseData.start_dates || []);
        
        // 3. Рассчитываем начальную дату окончания (используем первую доступную дату)
        if (fullCourseData.start_dates && fullCourseData.start_dates.length > 0) {
            const firstDate = new Date(fullCourseData.start_dates[0]);
            const endDate = calculateCourseEndDate(firstDate, fullCourseData.total_length || 1);
            document.getElementById('courseEndDate').value = endDate.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            document.getElementById('courseEndDate').value = '-';
        }
        
        // 4. Сбрасываем форму (но сохраняем заполненные поля)
        resetOrderFormForCourse();
        
        // 5. Устанавливаем обработчики
        setupCourseFormHandlers(fullCourseData);
        
        // 6. Показываем модальное окно
        const modalElement = document.getElementById('orderModal');
        if (!modalElement) {
            console.error('Модальное окно #orderModal не найдено');
            Utils.showNotification('Ошибка: форма заявки не найдена', 'danger');
            return;
        }
        
        //обновляем заголовок модального окна
        const modalTitle = document.getElementById('orderModalLabel');
        if (modalTitle) {
            modalTitle.textContent = `Оформление заявки: ${fullCourseData.name}`;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        //пересчитываем начальную стоимость
        setTimeout(calculateTotalPrice, 100);
        
    } catch (error) {
        console.error('Ошибка при выборе курса:', error);
        Utils.showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

//настройка обработчиков формы для курса
function setupCourseFormHandlers(courseData) {
    //обработчик выбора даты начала
    const courseStartDateField = document.getElementById('courseStartDate');
    if (courseStartDateField) {
        //удаляем старые обработчики
        const newField = courseStartDateField.cloneNode(true);
        courseStartDateField.parentNode.replaceChild(newField, courseStartDateField);
        
        //добавляем новые обработчики
        newField.addEventListener('change', function() {
            const timeSelect = document.getElementById('courseTimeSelect');
            if (this.value) {
                //включаем выбор времени
                if (timeSelect) {
                    timeSelect.disabled = false;
                    populateCourseTimes(this.value);
                }
                
                //рассчитываем дату окончания курса
                const startDate = new Date(this.value);
                const durationWeeks = courseData.total_length || 1;
                const endDate = calculateCourseEndDate(startDate, durationWeeks);
                
                const endDateElement = document.getElementById('courseEndDate');
                if (endDateElement) {
                    endDateElement.value = endDate.toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
            } else {
                //отключаем выбор времени
                if (timeSelect) {
                    timeSelect.disabled = true;
                    timeSelect.innerHTML = '<option value="">Сначала выберите дату начала</option>';
                }
                document.getElementById('courseEndDate').value = '-';
            }
            calculateTotalPrice();
        });
    }
    
    //обработчик выбора времени
    const courseTimeSelectField = document.getElementById('courseTimeSelect');
    if (courseTimeSelectField) {
        const newField = courseTimeSelectField.cloneNode(true);
        courseTimeSelectField.parentNode.replaceChild(newField, courseTimeSelectField);
        newField.addEventListener('change', calculateTotalPrice);
    }
    
    //обработчик количества человек
    const coursePersonsField = document.getElementById('coursePersons');
    if (coursePersonsField) {
        const newField = coursePersonsField.cloneNode(true);
        coursePersonsField.parentNode.replaceChild(newField, coursePersonsField);
        newField.addEventListener('change', calculateTotalPrice);
        newField.addEventListener('input', function() {
            if (this.type === 'number') {
                calculateTotalPrice();
            }
        });
    }
}

//сброс формы для курса (НЕ СБРАСЫВАЕТ заполненные поля курса)
function resetOrderFormForCourse() {
    const form = document.getElementById('orderForm');
    if (form) {
        //сбрасываем только редактируемые поля
        const courseStartDate = document.getElementById('courseStartDate');
        const courseTimeSelect = document.getElementById('courseTimeSelect');
        const coursePersons = document.getElementById('coursePersons');
        
        if (courseStartDate) {
            courseStartDate.selectedIndex = 0;
        }
        
        if (courseTimeSelect) {
            courseTimeSelect.disabled = true;
            courseTimeSelect.innerHTML = '<option value="">Сначала выберите дату начала</option>';
        }
        
        if (coursePersons) {
            coursePersons.value = 1;
        }
        
        //сбрасываем чекбоксы дополнительных опций
        document.querySelectorAll('.extra-option').forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    
    //скрываем плашку автоматических опций
    const autoOptionsContainer = document.getElementById('autoAppliedOptions');
    if (autoOptionsContainer) {
        autoOptionsContainer.style.display = 'none';
    }
    
    //сбрасываем скрытые поля автоматических опций
    document.getElementById('earlyRegistration').value = false;
    document.getElementById('groupEnrollment').value = false;
    document.getElementById('intensiveCourse').value = false;
    
    //устанавливаем стоимость в 0
    const totalCostElement = document.getElementById('totalCost');
    if (totalCostElement) {
        totalCostElement.textContent = '0';
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
        
        //создаем отдельное модальное окно для репетитора
        createTutorApplicationModal(tutor);
        
    } catch (error) {
        console.error('Ошибка при выборе репетитора:', error);
        Utils.showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

//создание полнофункционального модального окна для репетитора
function createTutorApplicationModal(tutor) {
    const modalId = 'tutorOrderModal';
    
    //удаляем старое модальное окно если есть
    const oldModal = document.getElementById(modalId);
    if (oldModal) oldModal.remove();
    
    const teachingLanguages = tutor.languages_offered ? 
        tutor.languages_offered.join(', ') : 'Не указано';
    
    const modalHTML = `
    <div class="modal fade" id="${modalId}" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Оформление заявки на репетитора: ${tutor.name}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <!-- Полная форма для репетитора -->
                    <form id="tutorOrderForm">
                        <!-- Информация о репетиторе -->
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Репетитор</label>
                                <input type="text" class="form-control" value="${tutor.name}" readonly>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Ставка</label>
                                <input type="text" class="form-control" value="${Utils.formatPrice(tutor.price_per_hour || 0)} ₽/час" readonly>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Дата занятия *</label>
                                <input type="date" class="form-control" id="tutorOrderDate" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Время занятия *</label>
                                <input type="time" class="form-control" id="tutorOrderTime" required>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Количество человек (1-20) *</label>
                                <input type="number" class="form-control" id="tutorPersons" min="1" max="20" value="1" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Длительность занятия (часы) *</label>
                                <input type="number" class="form-control" id="tutorDuration" min="1" max="8" value="1" required>
                            </div>
                        </div>
                        
                        <!-- Автоматически применяемые опции -->
                        <div id="tutorAutoOptions" class="alert alert-info mb-3" style="display: none;">
                            <h6 class="mb-2 fw-bold"><i class="bi bi-stars"></i> Автоматически примененные опции:</h6>
                            <div id="tutorAutoOptionsList"></div>
                        </div>
                        
                        <!-- Скрытые поля для автоматических опций -->
                        <input type="hidden" id="tutorEarlyRegistration" value="false">
                        <input type="hidden" id="tutorGroupEnrollment" value="false">
                        
                        <!-- Дополнительные опции -->
                        <h6 class="mt-4 fw-bold border-bottom pb-2">Дополнительные параметры</h6>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-check mb-2">
                                    <input class="form-check-input tutor-extra-option" type="checkbox" id="tutorSupplementaryCheck">
                                    <label class="form-check-label" for="tutorSupplementaryCheck">
                                        Доп. материалы (+2000 ₽ на человека)
                                    </label>
                                </div>
                                <div class="form-check mb-2">
                                    <input class="form-check-input tutor-extra-option" type="checkbox" id="tutorAssessmentCheck">
                                    <label class="form-check-label" for="tutorAssessmentCheck">
                                        Оценка уровня (+300 ₽)
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check mb-2">
                                    <input class="form-check-input tutor-extra-option" type="checkbox" id="tutorInteractiveCheck">
                                    <label class="form-check-label" for="tutorInteractiveCheck">
                                        Интерактивная платформа (+50%)
                                    </label>
                                </div>
                                <div class="form-check mb-2">
                                    <input class="form-check-input tutor-extra-option" type="checkbox" id="tutorExcursionsCheck">
                                    <label class="form-check-label" for="tutorExcursionsCheck">
                                        Культурные экскурсии (+25%)
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Итоговая стоимость -->
                        <div class="card bg-primary text-white mt-4">
                            <div class="card-body">
                                <h5 class="card-title mb-2 fw-bold">Итоговая стоимость</h5>
                                <div class="display-5 fw-bold" id="tutorTotalCost">0</div>
                            </div>
                        </div>
                        
                        <div class="alert alert-info mt-3">
                            <i class="bi bi-info-circle"></i> 
                            Стоимость рассчитывается автоматически при изменении параметров.
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="submit" class="btn btn-primary">Отправить заявку</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    //инициализация формы репетитора
    initTutorForm(tutor);
}

//инициализация формы репетитора
function initTutorForm(tutor) {
    const modalId = 'tutorOrderModal';
    const modalElement = document.getElementById(modalId);
    
    if (!modalElement) return;
    
    //устанавливаем минимальную дату на сегодня
    const today = new Date().toISOString().split('T')[0];
    const dateField = document.getElementById('tutorOrderDate');
    const timeField = document.getElementById('tutorOrderTime');
    
    if (dateField) {
        dateField.min = today;
        dateField.value = today;
    }
    
    if (timeField) {
        //устанавливаем разумное время по умолчанию (17:00)
        timeField.value = '17:00';
    }
    
    //добавляем обработчики событий для расчета стоимости
    const formElements = [
        'tutorOrderDate', 'tutorOrderTime', 'tutorPersons', 'tutorDuration',
        'tutorSupplementaryCheck', 'tutorAssessmentCheck', 'tutorInteractiveCheck', 'tutorExcursionsCheck'
    ];
    
    formElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('change', () => calculateTutorPrice(tutor));
            if (element.type === 'number' || element.type === 'date' || element.type === 'time') {
                element.addEventListener('input', () => calculateTutorPrice(tutor));
            }
        }
    });
    
    //обработчик отправки формы
    const form = document.getElementById('tutorOrderForm');
    if (form) {
        form.addEventListener('submit', (e) => submitTutorOrder(e, tutor));
    }
    
    //показываем модальное окно
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    //рассчитываем начальную стоимость
    setTimeout(() => calculateTutorPrice(tutor), 100);
}

//расчет стоимости для репетитора
function calculateTutorPrice(tutor) {
    //получаем значения из формы
    const selectedDate = document.getElementById('tutorOrderDate')?.value;
    const selectedTime = document.getElementById('tutorOrderTime')?.value;
    const studentsNumber = parseInt(document.getElementById('tutorPersons')?.value) || 1;
    const durationInHours = parseInt(document.getElementById('tutorDuration')?.value) || 1;
    
    //проверяем обязательные поля
    if (!selectedDate || !selectedTime) {
        document.getElementById('tutorTotalCost').textContent = '0';
        return;
    }
    
    //проверяем автоматические опции для репетитора
    checkTutorAutoOptions(studentsNumber, selectedDate);
    
    //собираем опции
    const options = {
        //автоматические опции
        early_registration: document.getElementById('tutorEarlyRegistration')?.value === 'true',
        group_enrollment: document.getElementById('tutorGroupEnrollment')?.value === 'true',
        //интенсивный курс не применяется для репетиторов
        intensive_course: false,
        //пользовательские опции
        supplementary: document.getElementById('tutorSupplementaryCheck')?.checked || false,
        personalized: false, //индивидуальные занятия не применимы
        excursions: document.getElementById('tutorExcursionsCheck')?.checked || false,
        assessment: document.getElementById('tutorAssessmentCheck')?.checked || false,
        interactive: document.getElementById('tutorInteractiveCheck')?.checked || false
    };
    
    //рассчитываем стоимость
    let totalPrice = 0;
    
    try {
        totalPrice = Utils.calculateCoursePrice(
            tutor,
            selectedDate,
            selectedTime,
            studentsNumber,
            durationInHours,
            options
        );
    } catch (error) {
        console.error('Ошибка расчета стоимости репетитора:', error);
        totalPrice = 0;
    }
    
    //отображаем итоговую стоимость
    const totalCostElement = document.getElementById('tutorTotalCost');
    if (totalCostElement) {
        totalCostElement.textContent = Utils.formatPrice(Math.round(totalPrice));
    }
}

//проверка автоматических опций для репетитора
function checkTutorAutoOptions(studentsNumber, selectedDate) {
    const autoOptions = [];
    const autoOptionsContainer = document.getElementById('tutorAutoOptions');
    const autoOptionsList = document.getElementById('tutorAutoOptionsList');
    
    // 1. Проверка ранней регистрации
    if (selectedDate) {
        const today = new Date();
        const orderDate = new Date(selectedDate);
        const monthDiff = (orderDate - today) / (1000 * 60 * 60 * 24 * 30);
        
        if (monthDiff >= 1) {
            document.getElementById('tutorEarlyRegistration').value = 'true';
            autoOptions.push({
                name: 'Скидка за раннюю регистрацию',
                description: 'Регистрация за месяц и более вперед',
                effect: '-10%',
                icon: 'bi-calendar-check'
            });
        } else {
            document.getElementById('tutorEarlyRegistration').value = 'false';
        }
    }
    
    // 2. Проверка групповой записи
    if (studentsNumber >= 5) {
        document.getElementById('tutorGroupEnrollment').value = 'true';
        autoOptions.push({
            name: 'Групповая скидка',
            description: `Группа из ${studentsNumber} человек`,
            effect: '-15%',
            icon: 'bi-people-fill'
        });
    } else {
        document.getElementById('tutorGroupEnrollment').value = 'false';
    }
    
    //показываем плашку с автоматическими опциями
    if (autoOptions.length > 0 && autoOptionsContainer && autoOptionsList) {
        autoOptionsContainer.style.display = 'block';
        autoOptionsList.innerHTML = autoOptions.map(option => `
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
}

//отправка заявки на репетитора
async function submitTutorOrder(event, tutor) {
    event.preventDefault();
    
    try {
        //получаем значения из формы
        const selectedDate = document.getElementById('tutorOrderDate')?.value;
        const selectedTime = document.getElementById('tutorOrderTime')?.value;
        const studentsNumber = parseInt(document.getElementById('tutorPersons')?.value) || 1;
        const durationInHours = parseInt(document.getElementById('tutorDuration')?.value) || 1;
        
        if (!selectedDate || !selectedTime) {
            Utils.showNotification('Выберите дату и время занятия', 'warning');
            return;
        }
        
        //проверяем автоматические опции
        checkTutorAutoOptions(studentsNumber, selectedDate);
        
        //собираем опции
        const options = {
            early_registration: document.getElementById('tutorEarlyRegistration')?.value === 'true',
            group_enrollment: document.getElementById('tutorGroupEnrollment')?.value === 'true',
            intensive_course: false,
            supplementary: document.getElementById('tutorSupplementaryCheck')?.checked || false,
            personalized: false,
            excursions: document.getElementById('tutorExcursionsCheck')?.checked || false,
            assessment: document.getElementById('tutorAssessmentCheck')?.checked || false,
            interactive: document.getElementById('tutorInteractiveCheck')?.checked || false
        };
        
        //рассчитываем стоимость
        const calculatedPrice = Utils.calculateCoursePrice(
            tutor,
            selectedDate,
            selectedTime,
            studentsNumber,
            durationInHours,
            options
        );
        
        //формируем данные для отправки
        const formData = {
            tutor_id: tutor.id,
            course_id: 0,
            date_start: selectedDate,
            time_start: selectedTime,
            persons: studentsNumber,
            duration: durationInHours,
            early_registration: options.early_registration,
            group_enrollment: options.group_enrollment,
            intensive_course: options.intensive_course,
            supplementary: options.supplementary,
            personalized: options.personalized,
            excursions: options.excursions,
            assessment: options.assessment,
            interactive: options.interactive,
            price: Math.round(calculatedPrice)
        };
        
        console.log('Отправка заявки на репетитора:', formData);
        
        //отправляем заявку
        const result = await API.createOrder(formData);
        
        Utils.showNotification('Заявка на репетитора успешно создана!', 'success');
        
        //закрываем модальное окно
        const modalElement = document.getElementById('tutorOrderModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
        
        //перенаправляем в личный кабинет
        setTimeout(() => {
            window.location.href = 'cabinet.html';
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка создания заявки на репетитора:', error);
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
    const applicationType = sessionStorage.getItem('applicationType');
    let selectedDate;
    
    if (applicationType === 'course') {
        selectedDate = document.getElementById('courseStartDate')?.value;
    } else {
        return autoOptions; //для репетиторов другая функция
    }
    
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
    let persons;
    if (applicationType === 'course') {
        persons = parseInt(document.getElementById('coursePersons')?.value) || 1;
    } else {
        persons = 1; //для репетиторов другая функция
    }
    
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
    
    //показываем плашку с автоматически примененными опциями
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
    
    //хаполняем скрытые поля для отправки на сервер
    document.getElementById('earlyRegistration').value = autoOptions.earlyRegistration;
    document.getElementById('groupEnrollment').value = autoOptions.groupEnrollment;
    document.getElementById('intensiveCourse').value = autoOptions.intensiveCourse;
    
    return autoOptions;
}

//расчет общей стоимости КУРСА
function calculateTotalPrice() {
    const applicationType = sessionStorage.getItem('applicationType');
    
    if (applicationType !== 'course') {
        document.getElementById('totalCost').textContent = '0';
        return;
    }
    
    const selectedData = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
    
    //проверяем наличие данных курса
    if (!selectedData || Object.keys(selectedData).length === 0) {
        document.getElementById('totalCost').textContent = '0';
        return;
    }
    
    //получаем значения из формы КУРСА
    const selectedDate = document.getElementById('courseStartDate')?.value;
    const selectedTime = document.getElementById('courseTimeSelect')?.value;
    const studentsNumber = parseInt(document.getElementById('coursePersons')?.value) || 1;
    
    //проверяем обязательные поля
    if (!selectedDate || !selectedTime) {
        document.getElementById('totalCost').textContent = '0';
        return;
    }
    
    //для курса: общая длительность в часах = недели * часы в неделю
    const weeks = selectedData.total_length || 1;
    const hoursPerWeek = selectedData.week_length || 1;
    const durationInHours = weeks * hoursPerWeek;
    
    //проверяем и применяем автоматические опции
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
        console.error('Ошибка расчета стоимости курса:', error);
        totalPrice = 0;
    }
    
    //отображаем итоговую стоимость
    const totalCostElement = document.getElementById('totalCost');
    if (totalCostElement) {
        totalCostElement.textContent = Utils.formatPrice(Math.round(totalPrice));
    }
}

//инициализация модального окна заказа (для курсов)
function initOrderModal() {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm) return;
    
    orderForm.addEventListener('submit', submitOrder);
    
    //обработчики для пользовательских чекбоксов
    document.querySelectorAll('.extra-option').forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotalPrice);
    });
}

//сброс формы заказа (общая функция, не используется для курсов в новой реализации)
function resetOrderForm() {
    // Эта функция теперь используется только как запасной вариант
    console.warn('resetOrderForm() вызвана, но используется специализированная функция для курсов');
}

//отправка заявки (для курсов)
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
        } else {
            Utils.showNotification('Не выбран курс', 'warning');
            return;
        }
        
        let selectedDate, selectedTime, studentsNumber, durationInHours;
        
        // Для курса используем специальные поля
        selectedDate = document.getElementById('courseStartDate')?.value;
        selectedTime = document.getElementById('courseTimeSelect')?.value;
        studentsNumber = parseInt(document.getElementById('coursePersons')?.value) || 1;
        
        if (!selectedDate || !selectedTime) {
            Utils.showNotification('Выберите дату и время начала курса', 'warning');
            return;
        }
        
        // Для курса: общая длительность в часах = недели * часы в неделю
        const weeks = selectedData.total_length || 1;
        const hoursPerWeek = selectedData.week_length || 1;
        durationInHours = weeks * hoursPerWeek;
        
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
        }
        
        console.log('Отправка заявки на курс с данными:', formData);
        
        //отправляем заявку
        const result = await API.createOrder(formData);
        
        Utils.showNotification('Заявка на курс успешно создана!', 'success');
        
        //закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
        if (modal) modal.hide();
        
        //перенаправляем в личный кабинет
        setTimeout(() => {
            window.location.href = 'cabinet.html';
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка создания заявки на курс:', error);
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
                                    <h6>Даты начала из API:</h6>
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
    
    //предотвращаем стандартное поведение ссылок пагинации
    document.addEventListener('click', function(e) {
        if (e.target.closest('.pagination a')) {
            e.preventDefault();
        }
    });
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
window.calculateTutorPrice = calculateTutorPrice;
window.submitTutorOrder = submitTutorOrder;
