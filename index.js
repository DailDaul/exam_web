// Глобальные переменные
let allCourses = [];
let allTutors = [];
let currentPage = 1;
const itemsPerPage = 6;
let isDemoMode = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    if (!Auth.isAuthenticated() && window.location.pathname.includes('cabinet.html')) {
        Utils.showNotification('Для доступа к личному кабинету требуется авторизация', 'warning');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    // Загружаем курсы
    await loadCourses();
    
    // Загружаем репетиторов
    await loadTutors();
    
    // Инициализируем фильтры
    initFilters();
    
    // Инициализируем модальное окно заказа
    initOrderModal();
});

// Загрузка курсов с обработкой ошибок
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
                    Не удалось загрузить курсы. Проверьте подключение к интернету.
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="location.reload()">
                        Попробовать снова
                    </button>
                </div>
            </div>
        `;
    }
}

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
        
        // Рассчитываем финальную цену
        calculateTotalPrice();
        const totalPrice = parseInt(document.getElementById('totalCost').textContent.replace(/\s/g, ''));
        formData.price = totalPrice;
        
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
