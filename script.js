//конфиги
const API_BASE_URL = 'http://exam-api-courses.std-900.ist.mospolytech.ru';
const API_KEY = '9f17101c-61e9-4f97-8d3f-7c13ded0e7d4';

//элементы для дома
const coursesContainer = document.getElementById('coursesContainer');
const tutorsContainer = document.getElementById('tutorsContainer');
const courseSearchForm = document.getElementById('courseSearchForm');
const coursesPagination = document.getElementById('coursesPagination');
const notificationArea = document.getElementById('notificationArea');

//глобальные переменные
let allCourses = [];
let allTutors = [];
let currentCoursePage = 1;
const itemsPerPage = 5;

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

//апишные функции
async function fetchCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/courses?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка загрузки курсов');
        allCourses = await response.json();
        renderCourses();
        populateCourseSelect();
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

async function fetchTutors() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tutors?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка загрузки репетиторов');
        allTutors = await response.json();
        renderTutors();
        populateTutorSelect();
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

//рендеринг курсов
function renderCourses(page = 1, filteredCourses = allCourses) {
    coursesContainer.innerHTML = '';
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageCourses = filteredCourses.slice(start, end);
    
    if (pageCourses.length === 0) {
        coursesContainer.innerHTML = '<div class="col-12 text-center"><p>Курсы не найдены</p></div>';
        return;
    }
    
    pageCourses.forEach(course => {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${course.name}</h5>
                    <p class="card-text text-muted">${course.level} • ${course.teacher}</p>
                    <p class="card-text">${course.description.substring(0, 100)}...</p>
                    <div class="mt-auto">
                        <span class="badge bg-primary">${course.total_length} недель</span>
                        <span class="badge bg-success ms-2">${course.course_fee_per_hour} руб/час</span>
                    </div>
                    <button class="btn btn-outline-primary mt-3 w-100" onclick="openCourseDetail(${course.id})">
                        Подробнее
                    </button>
                </div>
            </div>
        `;
        coursesContainer.appendChild(col);
    });
    
    renderPagination(page, filteredCourses.length);
}

//плагинация
function renderPagination(currentPage, totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    coursesPagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const ul = document.createElement('ul');
    ul.className = 'pagination';
    
    //кнопка "назад"
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changeCoursePage(${currentPage - 1})">Назад</a>`;
    ul.appendChild(prevLi);
    
    //нумерация
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changeCoursePage(${i})">${i}</a>`;
        ul.appendChild(li);
    }
    
    //кнопка "вперед"
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changeCoursePage(${currentPage + 1})">Вперед</a>`;
    ul.appendChild(nextLi);
    
    coursesPagination.appendChild(ul);
}

function changeCoursePage(page) {
    currentCoursePage = page;
    renderCourses(page, filterCourses());
}

//фильтрация курсов
function filterCourses() {
    const nameFilter = document.getElementById('courseNameInput').value.toLowerCase();
    const levelFilter = document.getElementById('courseLevelSelect').value;
    
    return allCourses.filter(course => {
        const nameMatch = course.name.toLowerCase().includes(nameFilter);
        const levelMatch = !levelFilter || course.level === levelFilter;
        return nameMatch && levelMatch;
    });
}

//рендеринг репетиторов
function renderTutors() {
    tutorsContainer.innerHTML = '';
    const qualificationFilter = document.getElementById('tutorQualification').value;
    const experienceFilter = parseInt(document.getElementById('tutorExperience').value);
    
    const filteredTutors = allTutors.filter(tutor => {
        let match = true;
        if (qualificationFilter && !tutor.languages_offered?.includes(qualificationFilter)) {
            match = false;
        }
        if (experienceFilter && tutor.work_experience < experienceFilter) {
            match = false;
        }
        return match;
    });
    
    if (filteredTutors.length === 0) {
        tutorsContainer.innerHTML = '<div class="col-12 text-center"><p>Репетиторы не найдены</p></div>';
        return;
    }
    
    filteredTutors.forEach(tutor => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${tutor.name}</h5>
                    <p class="card-text">
                        <strong>Языки:</strong> ${tutor.languages_offered?.join(', ') || 'Не указано'}<br>
                        <strong>Уровень:</strong> ${tutor.language_level}<br>
                        <strong>Опыт:</strong> ${tutor.work_experience} лет<br>
                        <strong>Ставка:</strong> ${tutor.price_per_hour} руб/час
                    </p>
                    <button class="btn btn-outline-success mt-2" onclick="selectTutor(${tutor.id})">
                        Выбрать репетитора
                    </button>
                </div>
            </div>
        `;
        tutorsContainer.appendChild(col);
    });
}

//заполнение выпадающих списков в форме
function populateCourseSelect() {
    const select = document.getElementById('orderCourse');
    select.innerHTML = '<option value="">Выберите курс</option>';
    allCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = `${course.name} (${course.level})`;
        select.appendChild(option);
    });
}

function populateTutorSelect() {
    const select = document.getElementById('orderTutor');
    select.innerHTML = '<option value="">Выберите репетитора</option>';
    allTutors.forEach(tutor => {
        const option = document.createElement('option');
        option.value = tutor.id;
        option.textContent = `${tutor.name} (${tutor.language_level})`;
        select.appendChild(option);
    });
}

//обработчики событий
document.getElementById('courseSearchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    currentCoursePage = 1;
    renderCourses(1, filterCourses());
});

document.getElementById('tutorQualification').addEventListener('change', renderTutors);
document.getElementById('tutorExperience').addEventListener('input', renderTutors);

document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const orderData = {
        course_id: document.getElementById('orderCourse').value || null,
        tutor_id: document.getElementById('orderTutor').value || null,
        date_start: document.getElementById('orderDate').value,
        time_start: document.getElementById('orderTime').value,
        persons: parseInt(document.getElementById('orderPersons').value),
        price: 0 //рассчитывается на сервере
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders?api_key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) throw new Error('Ошибка создания заявки');
        
        showNotification('Заявка успешно отправлена!', 'success');
        document.getElementById('orderModal').querySelector('.btn-close').click();
        document.getElementById('orderForm').reset();
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'danger');
    }
});

//заглушки для будущей реализации
function openCourseDetail(courseId) {
    showNotification(`Детали курса #${courseId} откроются позже`, 'info');
}

function selectTutor(tutorId) {
    showNotification(`Выбран репетитор #${tutorId}`, 'success');
}

//инициализация
document.addEventListener('DOMContentLoaded', () => {
    fetchCourses();
    fetchTutors();
});
