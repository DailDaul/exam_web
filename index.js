//глобальные переменные
let allCourses = [];
let allTutors = [];
let currentPage = 1;
const itemsPerPage = 5; //по требованию: максимум 5 записей на страницу

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
    
    //загружаем репетиторов
    await loadTutors();
    
    //инициализируем обработчики
    initEventHandlers();
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

//отображение репетиторов
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

//фильтрация репетиторов
function filterTutors() {
    const qualification = document.getElementById('tutorQualification')?.value;
    const experience = parseInt(document.getElementById('tutorExperience')?.value) || 0;
    
    let filtered = allTutors;
    
    //фильтр по языкам (используем languages_offered)
    if (qualification && qualification !== 'all') {
        filtered = filtered.filter(tutor => 
            tutor.languages_offered?.some(lang => 
                lang.toLowerCase().includes(qualification.toLowerCase())
            )
        );
    }
    
    //фильтр по опыту
    if (experience > 0) {
        filtered = filtered.filter(tutor => tutor.work_experience >= experience);
    }
    
    displayTutors(filtered);
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
            Auth.showModal();
            return;
        }
        
        //сохраняем выбранный курс
        sessionStorage.setItem('selectedCourse', JSON.stringify(course));
        sessionStorage.setItem('applicationType', 'course');
        
        //создаем модальное окно, если его нет
        createOrderModal();
        
        //заполняем информацию о курсе
        document.getElementById('orderCourseName').textContent = course.name;
        document.getElementById('orderTeacher').textContent = course.teacher;
        document.getElementById('orderLevel').textContent = course.level;
        document.getElementById('orderDuration').textContent = `${course.total_length} недель`;
        document.getElementById('basePricePerHour').textContent = Utils.formatPrice(course.course_fee_per_hour);
        
        //заполняем даты начала
        const startDateSelect = document.getElementById('orderStartDate');
        if (startDateSelect) {
            startDateSelect.innerHTML = '<option value="">Выберите дату</option>';
            course.start_dates.forEach(dateStr => {
                const date = new Date(dateStr);
                const dateValue = date.toISOString().split('T')[0];
                const dateText = date.toLocaleDateString('ru-RU');
                startDateSelect.innerHTML += `<option value="${dateValue}">${dateText}</option>`;
            });
        }
        
        //сбрасываем форму
        resetOrderForm();
        
        //показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('orderModal'));
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
        
        console.log('Выбран репетитор:', tutor);
        
        //проверяем авторизацию
        if (!Auth.isAuthenticated()) {
            Utils.showNotification('Для подачи заявки требуется авторизация', 'warning');
            Auth.showModal();
            return;
        }
        
        //сохраняем выбранного репетитора
        sessionStorage.setItem('selectedTutor', JSON.stringify(tutor));
        sessionStorage.setItem('applicationType', 'tutor');
        
        //создаем модальное окно, если его нет
        createOrderModal();
        
        //заполняем информацию о репетиторе
        document.getElementById('orderTutorName').textContent = tutor.name;
        document.getElementById('orderTutorExperience').textContent = `${tutor.work_experience} лет`;
        document.getElementById('orderTutorLanguages').textContent = (tutor.languages_offered || []).join(', ');
        document.getElementById('tutorPricePerHour').textContent = Utils.formatPrice(tutor.price_per_hour);
        
        //скрываем блок курса, показываем блок репетитора
        const courseInfo = document.getElementById('courseInfo');
        const tutorInfo = document.getElementById('tutorInfo');
        if (courseInfo) courseInfo.style.display = 'none';
        if (tutorInfo) tutorInfo.style.display = 'block';
        
        //сбрасываем форму
        resetOrderForm();
        
        //показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('orderModal'));
        modal.show();
        
    } catch (error) {
        console.error('Ошибка при выборе репетитора:', error);
        Utils.showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

//создание модального окна заказа (если его нет в HTML)
function createOrderModal() {
    if (document.getElementById('orderModal')) return;
    
    const modalHTML = `
    <div class="modal fade" id="orderModal" tabindex="-1" aria-labelledby="orderModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="orderModalLabel">Оформление заявки</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <!-- Информация о курсе -->
                    <div id="courseInfo" class="card bg-light mb-3">
                        <div class="card-body">
                            <h6>Информация о курсе</h6>
                            <p><strong>Название:</strong> <span id="orderCourseName"></span></p>
                            <p><strong>Преподаватель:</strong> <span id="orderTeacher"></span></p>
                            <p><strong>Уровень:</strong> <span id="orderLevel"></span></p>
                            <p><strong>Длительность:</strong> <span id="orderDuration"></span></p>
                            <p><strong>Стоимость:</strong> <span id="basePricePerHour"></span> ₽/час</p>
                        </div>
                    </div>
                    
                    <!-- Информация о репетиторе (скрыта по умолчанию) -->
                    <div id="tutorInfo" class="card bg-light mb-3" style="display: none;">
                        <div class="card-body">
                            <h6>Информация о репетиторе</h6>
                            <p><strong>Имя:</strong> <span id="orderTutorName"></span></p>
                            <p><strong>Опыт:</strong> <span id="orderTutorExperience"></span></p>
                            <p><strong>Языки:</strong> <span id="orderTutorLanguages"></span></p>
                            <p><strong>Стоимость:</strong> <span id="tutorPricePerHour"></span> ₽/час</p>
                        </div>
                    </div>
                    
                    <!-- Форма заявки -->
                    <form id="orderForm">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Дата начала *</label>
                                <select class="form-select" id="orderStartDate" required>
                                    <option value="">Выберите дату</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Время занятия *</label>
                                <select class="form-select" id="orderTime" required disabled>
                                    <option value="">Сначала выберите дату</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Количество человек (1-20) *</label>
                            <input type="number" class="form-control" id="persons" min="1" max="20" value="1" required>
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
                        
                        <!-- Итоговая стоимость -->
                        <div class="card bg-primary text-white mt-4">
                            <div class="card-body">
                                <h5 class="card-title mb-0">
                                    Итоговая стоимость: 
                                    <span id="totalCost" class="display-6">0</span> ₽
                                </h5>
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
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    initOrderModal();
}

//инициализация модального окна заказа
function initOrderModal() {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm) return;
    
    orderForm.addEventListener('submit', submitOrder);
    
    //обработчики изменений для пересчета стоимости
    ['#orderStartDate', '#orderTime', '#persons'].forEach(id => {
        const element = document.querySelector(id);
        if (element) {
            element.addEventListener('change', calculateTotalPrice);
        }
    });
    
    //обработчики для чекбоксов
    document.querySelectorAll('.form-check-input').forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotalPrice);
    });
    
    //обработчик выбора даты
    const startDateSelect = document.getElementById('orderStartDate');
    if (startDateSelect) {
        startDateSelect.addEventListener('change', function() {
            const timeSelect = document.getElementById('orderTime');
            if (timeSelect && this.value) {
                updateTimeOptions(this.value);
                timeSelect.disabled = false;
            } else if (timeSelect) {
                timeSelect.disabled = true;
                timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
            }
            calculateTotalPrice();
        });
    }
}

//обновление опций времени
function updateTimeOptions(selectedDate) {
    const applicationType = sessionStorage.getItem('applicationType');
    const timeSelect = document.getElementById('orderTime');
    
    if (!timeSelect) return;
    
    timeSelect.innerHTML = '<option value="">Выберите время</option>';
    
    if (applicationType === 'course') {
        const course = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
        const courseStartDates = course.start_dates || [];
        
        //фильтруем времена для выбранной даты
        const timesForDate = courseStartDates
            .filter(dateStr => dateStr.startsWith(selectedDate))
            .map(dateStr => {
                const date = new Date(dateStr);
                return date.toTimeString().substring(0, 5); // HH:MM
            });
        
        //убираем дубликаты
        const uniqueTimes = [...new Set(timesForDate)];
        
        uniqueTimes.forEach(time => {
            timeSelect.innerHTML += `<option value="${time}">${time}</option>`;
        });
    } else if (applicationType === 'tutor') {
        //для репетиторов - стандартные времена
        const times = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
        times.forEach(time => {
            timeSelect.innerHTML += `<option value="${time}">${time}</option>`;
        });
    }
}

//сброс формы заказа
function resetOrderForm() {
    const form = document.getElementById('orderForm');
    if (form) form.reset();
    
    //показываем/скрываем блоки в зависимости от типа заявки
    const applicationType = sessionStorage.getItem('applicationType');
    const courseInfo = document.getElementById('courseInfo');
    const tutorInfo = document.getElementById('tutorInfo');
    
    if (courseInfo) courseInfo.style.display = applicationType === 'course' ? 'block' : 'none';
    if (tutorInfo) tutorInfo.style.display = applicationType === 'tutor' ? 'block' : 'none';
    
    //сбрасываем селекты времени
    const timeSelect = document.getElementById('orderTime');
    if (timeSelect) {
        timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
        timeSelect.disabled = true;
    }
    
    calculateTotalPrice();
}

//расчет общей стоимости
function calculateTotalPrice() {
    const applicationType = sessionStorage.getItem('applicationType');
    let basePricePerHour = 0;
    let totalHours = 1;
    
    if (applicationType === 'course') {
        const course = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
        basePricePerHour = course.course_fee_per_hour || 0;
        totalHours = (course.week_length || 2) * (course.total_length || 8);
    } else if (applicationType === 'tutor') {
        const tutor = JSON.parse(sessionStorage.getItem('selectedTutor') || '{}');
        basePricePerHour = tutor.price_per_hour || 0;
        //дяя репетитора продолжительность = 1 час (по умолчанию)
        totalHours = 1;
    }
    
    const persons = parseInt(document.getElementById('persons')?.value) || 1;
    const selectedDate = document.getElementById('orderStartDate')?.value;
    const selectedTime = document.getElementById('orderTime')?.value;
    
    let totalPrice = basePricePerHour * totalHours * persons;
    
    //проверяем выходные/праздники
    if (selectedDate) {
        const date = new Date(selectedDate);
        const dayOfWeek = date.getDay(); // 0-воскресенье, 6-суббота
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const weekendMultiplier = isWeekend ? 1.5 : 1;
        totalPrice *= weekendMultiplier;
    }
    
    //утренняя/вечерняя доплата
    if (selectedTime) {
        const hour = parseInt(selectedTime.split(':')[0]);
        if (hour >= 9 && hour < 12) totalPrice += 400 * persons; // Утренняя доплата
        if (hour >= 18 && hour < 20) totalPrice += 1000 * persons; // Вечерняя доплата
    }
    
    //применяем скидки
    const earlyReg = document.getElementById('earlyRegistration')?.checked;
    const groupEnrollment = document.getElementById('groupEnrollment')?.checked;
    
    if (earlyReg) totalPrice *= 0.9; // 10% скидка
    if (groupEnrollment && persons >= 5) totalPrice *= 0.85; // 15% скидка
    
    //добавляем дополнительные опции
    const supplementary = document.getElementById('supplementary')?.checked;
    const intensive = document.getElementById('intensiveCourse')?.checked;
    const personalized = document.getElementById('personalized')?.checked;
    const excursions = document.getElementById('excursions')?.checked;
    const assessment = document.getElementById('assessment')?.checked;
    const interactive = document.getElementById('interactive')?.checked;
    
    if (supplementary) totalPrice += 2000 * persons;
    if (intensive) totalPrice *= 1.2;
    
    if (applicationType === 'course') {
        const course = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
        if (personalized) totalPrice += 1500 * (course.total_length || 8);
    }
    
    if (excursions) totalPrice *= 1.25;
    if (assessment) totalPrice += 300;
    if (interactive) totalPrice *= 1.5;
    
    //отображаем итоговую стоимость
    const totalCostElement = document.getElementById('totalCost');
    if (totalCostElement) {
        totalCostElement.textContent = Utils.formatPrice(Math.round(totalPrice));
    }
}

//отправка заявки
async function submitOrder(event) {
    event.preventDefault();
    
    if (!Auth.isAuthenticated()) {
        Utils.showNotification('Для подачи заявки требуется авторизация', 'warning');
        Auth.showModal();
        return;
    }
    
    try {
        const applicationType = sessionStorage.getItem('applicationType');
        const selectedDate = document.getElementById('orderStartDate').value;
        const selectedTime = document.getElementById('orderTime').value;
        const persons = parseInt(document.getElementById('persons').value) || 1;
        
        if (!selectedDate || !selectedTime) {
            Utils.showNotification('Выберите дату и время занятия', 'warning');
            return;
        }
        
        const formData = {
            date_start: selectedDate,
            time_start: selectedTime,
            duration: 1, //для заявки передаем 1 час (реальная длительность для курса считается на сервере)
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
            const course = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
            formData.course_id = course.id;
            formData.tutor_id = 0;
        } else if (applicationType === 'tutor') {
            const tutor = JSON.parse(sessionStorage.getItem('selectedTutor') || '{}');
            formData.tutor_id = tutor.id;
            formData.course_id = 0;
        }
        
        console.log('Отправка заявки:', formData);
        
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
        const modal = new bootstrap.Modal(document.getElementById('courseDetailModal'));
        modal.show();
        
    } catch (error) {
        console.error('Ошибка загрузки деталей курса:', error);
        Utils.showNotification('Не удалось загрузить информацию о курсе', 'error');
    }
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
    const tutorQualification = document.getElementById('tutorQualification');
    const tutorExperience = document.getElementById('tutorExperience');
    
    if (tutorQualification) {
        tutorQualification.addEventListener('change', filterTutors);
    }
    
    if (tutorExperience) {
        tutorExperience.addEventListener('input', filterTutors);
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

//глобальные функции
window.searchCourses = searchCourses;
window.filterTutors = filterTutors;
window.applyForCourse = applyForCourse;
window.applyForTutor = applyForTutor;
window.changePage = changePage;
window.showCourseDetails = showCourseDetails;
