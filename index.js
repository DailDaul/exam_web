//глобальные переменные
let allCourses = [];
let allTutors = [];
let currentPage = 1;
const itemsPerPage = 6;

//инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    //проверяем авторизацию
    if (!Auth.isAuthenticated() && window.location.pathname.includes('cabinet.html')) {
        Utils.showNotification('Для доступа к личному кабинету требуется авторизация', 'warning');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
    
    //загружаем курсы
    await loadCourses();
    
    //загружаем репетиторов
    await loadTutors();
    
    //инициализируем фильтры
    initFilters();
    
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
        displayCourses(allCourses);
        setupCoursesPagination();
        
    } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
        document.getElementById('coursesContainer').innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Не удалось загрузить курсы. Попробуйте обновить страницу.
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
        <div class="col-md-4">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${course.name}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">Уровень: ${course.level}</h6>
                    <p class="card-text">${course.description || 'Описание отсутствует'}</p>
                    <p><strong>Преподаватель:</strong> ${course.teacher}</p>
                    <p><strong>Длительность:</strong> ${course.total_length} недель</p>
                    <p><strong>Стоимость:</strong> ${Utils.formatPrice(course.course_fee_per_hour)} ₽/час</p>
                    
                    <div class="d-grid gap-2">
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

//поиск курсов
function searchCourses() {
    const nameInput = document.getElementById('courseNameInput').value.toLowerCase();
    const levelSelect = document.getElementById('courseLevelSelect').value;
    
    let filtered = allCourses;
    
    if (nameInput) {
        filtered = filtered.filter(course => 
            course.name.toLowerCase().includes(nameInput) ||
            (course.description && course.description.toLowerCase().includes(nameInput))
        );
    }
    
    if (levelSelect) {
        filtered = filtered.filter(course => course.level === levelSelect);
    }
    
    currentPage = 1;
    displayCourses(filtered);
    setupCoursesPagination(filtered);
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
        displayTutors(allTutors);
        
    } catch (error) {
        console.error('Ошибка загрузки репетиторов:', error);
        document.getElementById('tutorsContainer').innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Не удалось загрузить репетиторов. Попробуйте обновить страницу.
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
        <div class="col-md-6 col-lg-4">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="avatar-placeholder rounded-circle me-3" style="width: 60px; height: 60px;">
                            <i class="bi bi-person fs-4 text-white"></i>
                        </div>
                        <div>
                            <h5 class="card-title mb-0">${tutor.name}</h5>
                            <p class="text-muted mb-0">Опыт: ${tutor.work_experience} лет</p>
                        </div>
                    </div>
                    
                    <p><strong>Языки:</strong> ${(tutor.languages_offered || []).join(', ')}</p>
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
    const qualification = document.getElementById('tutorQualification').value;
    const experience = parseInt(document.getElementById('tutorExperience').value) || 0;
    
    let filtered = allTutors;
    
    if (qualification) {
        //предполагаем, что поле qualification есть в данных
        filtered = filtered.filter(tutor => tutor.qualification === qualification);
    }
    
    if (experience > 0) {
        filtered = filtered.filter(tutor => tutor.work_experience >= experience);
    }
    
    displayTutors(filtered);
}

//подать заявку на курс
function applyForCourse(courseId) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) {
        Utils.showNotification('Курс не найден', 'error');
        return;
    }
    
    //сохраняем выбранный курс в sessionStorage
    sessionStorage.setItem('selectedCourse', JSON.stringify(course));
    sessionStorage.setItem('applicationType', 'course');
    
    //показываем модальное окно
    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
    modal.show();
    
    //заполняем информацию о курсе
    document.getElementById('orderCourseName').textContent = course.name;
    document.getElementById('orderTeacher').textContent = course.teacher;
    document.getElementById('orderLevel').textContent = course.level;
    document.getElementById('orderDuration').textContent = `${course.total_length} недель`;
    document.getElementById('basePricePerHour').textContent = Utils.formatPrice(course.course_fee_per_hour);
    
    //сбрасываем форму
    resetOrderForm();
}

//подать заявку к репетитору
function applyForTutor(tutorId) {
    const tutor = allTutors.find(t => t.id === tutorId);
    if (!tutor) {
        Utils.showNotification('Репетитор не найден', 'error');
        return;
    }
    
    //сохраняем выбранного репетитора в sessionStorage
    sessionStorage.setItem('selectedTutor', JSON.stringify(tutor));
    sessionStorage.setItem('applicationType', 'tutor');
    
    //показываем модальное окно
    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
    modal.show();
    
    //заполняем информацию о репетиторе
    document.getElementById('orderTutorName').textContent = tutor.name;
    document.getElementById('orderTutorExperience').textContent = `${tutor.work_experience} лет`;
    document.getElementById('orderTutorLanguages').textContent = (tutor.languages_offered || []).join(', ');
    document.getElementById('tutorPricePerHour').textContent = Utils.formatPrice(tutor.price_per_hour);
    
    //сбрасываем форму
    resetOrderForm();
}

//инициализация модального окна заказа
function initOrderModal() {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm) return;
    
    orderForm.addEventListener('submit', submitOrder);
    
    //обработчики изменений для пересчета стоимости
    ['#orderDate', '#orderTime', '#persons', '#duration'].forEach(id => {
        document.querySelector(id)?.addEventListener('change', calculateTotalPrice);
    });
    
    //обработчики для чекбоксов
    document.querySelectorAll('.discount-option, .extra-option').forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotalPrice);
    });
}

//сброс формы заказа
function resetOrderForm() {
    const form = document.getElementById('orderForm');
    if (form) form.reset();
    
    //устанавливаем минимальную дату (завтра)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('orderDate');
    if (dateInput) {
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }
    
    //скрываем ненужные блоки в зависимости от типа заявки
    const applicationType = sessionStorage.getItem('applicationType');
    const courseInfo = document.getElementById('courseInfo');
    const tutorInfo = document.getElementById('tutorInfo');
    
    if (courseInfo) courseInfo.style.display = applicationType === 'course' ? 'block' : 'none';
    if (tutorInfo) tutorInfo.style.display = applicationType === 'tutor' ? 'block' : 'none';
    
    calculateTotalPrice();
}

//расчет общей стоимости
function calculateTotalPrice() {
    const applicationType = sessionStorage.getItem('applicationType');
    let basePricePerHour = 0;
    
    if (applicationType === 'course') {
        const course = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
        basePricePerHour = course.course_fee_per_hour || 0;
    } else if (applicationType === 'tutor') {
        const tutor = JSON.parse(sessionStorage.getItem('selectedTutor') || '{}');
        basePricePerHour = tutor.price_per_hour || 0;
    }
    
    const persons = parseInt(document.getElementById('persons').value) || 1;
    const duration = parseInt(document.getElementById('duration').value) || 1;
    
    let totalPrice = basePricePerHour * persons * duration;
    
    //применяем скидки
    const earlyReg = document.getElementById('earlyRegistration').checked;
    const groupEnrollment = document.getElementById('groupEnrollment').checked;
    
    if (earlyReg) totalPrice *= 0.9; // 10% скидка
    if (groupEnrollment && persons >= 5) totalPrice *= 0.85; // 15% скидка
    
    //давляем дополнительные опции
    const supplementary = document.getElementById('supplementary').checked;
    const intensive = document.getElementById('intensiveCourse').checked;
    const personalized = document.getElementById('personalized').checked;
    const excursions = document.getElementById('excursions').checked;
    const assessment = document.getElementById('assessment').checked;
    const interactive = document.getElementById('interactive').checked;
    
    if (supplementary) totalPrice += 2000 * persons;
    if (intensive) totalPrice *= 1.2;
    if (personalized) totalPrice += 1500 * duration;
    if (excursions) totalPrice *= 1.25;
    if (assessment) totalPrice += 300;
    if (interactive) totalPrice *= 1.5;
    
    //отображаем итоговую стоимость
    const totalCostElement = document.getElementById('totalCost');
    if (totalCostElement) {
        totalCostElement.textContent = Utils.formatPrice(totalPrice);
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
        const formData = {
            date_start: document.getElementById('orderDate').value,
            time_start: document.getElementById('orderTime').value,
            duration: parseInt(document.getElementById('duration').value) || 1,
            persons: parseInt(document.getElementById('persons').value) || 1,
            early_registration: document.getElementById('earlyRegistration').checked,
            group_enrollment: document.getElementById('groupEnrollment').checked,
            intensive_course: document.getElementById('intensiveCourse').checked,
            supplementary: document.getElementById('supplementary').checked,
            personalized: document.getElementById('personalized').checked,
            excursions: document.getElementById('excursions').checked,
            assessment: document.getElementById('assessment').checked,
            interactive: document.getElementById('interactive').checked
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
        
        //рассчитываем финальную цену
        calculateTotalPrice();
        const totalPrice = parseInt(document.getElementById('totalCost').textContent.replace(/\s/g, ''));
        formData.price = totalPrice;
        
        //отправляем заявку
        const result = await API.createOrder(formData);
        
        Utils.showNotification('Заявка успешно создана!', 'success');
        
        //закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
        modal.hide();
        
        //если мы на странице личного кабинета, обновляем список заявок
        if (typeof loadOrders === 'function') {
            loadOrders();
        }
        
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
                                    <p><strong>Занятий в неделю:</strong> ${course.week_length}</p>
                                    <p><strong>Стоимость:</strong> ${Utils.formatPrice(course.course_fee_per_hour)} ₽/час</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Даты начала:</h6>
                                    <ul>
                                        ${(course.start_dates || []).map(date => 
                                            `<li>${Utils.formatDate(date)} ${Utils.formatTime(date)}</li>`
                                        ).join('')}
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

//инициализация фильтров
function initFilters() {
    const courseNameInput = document.getElementById('courseNameInput');
    const courseLevelSelect = document.getElementById('courseLevelSelect');
    
    if (courseNameInput) {
        courseNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchCourses();
        });
    }
    
    if (courseLevelSelect) {
        courseLevelSelect.addEventListener('change', searchCourses);
    }
}

//глобальные функции
window.searchCourses = searchCourses;
window.filterTutors = filterTutors;
window.applyForCourse = applyForCourse;
window.applyForTutor = applyForTutor;
window.changePage = changePage;
window.showCourseDetails = showCourseDetails;
