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
    
    // Проверяем режим
    isDemoMode = Auth.getApiKey() === 'demo';
    
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
        
        if (isDemoMode) {
            // Используем демо-данные
            await new Promise(resolve => setTimeout(resolve, 800)); // Имитация загрузки
            allCourses = Utils.generateDemoData('courses');
            displayCourses(allCourses);
            setupCoursesPagination();
            Utils.showNotification('Загружены демо-курсы', 'info');
        } else {
            // Используем реальный API
            allCourses = await API.getCourses();
            displayCourses(allCourses);
            setupCoursesPagination();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
        
        // Пробуем загрузить демо-данные при ошибке
        try {
            Utils.showNotification('Используются локальные данные', 'warning');
            allCourses = Utils.generateDemoData('courses');
            displayCourses(allCourses);
            setupCoursesPagination();
            isDemoMode = true;
        } catch (demoError) {
            document.getElementById('coursesContainer').innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        Не удалось загрузить курсы. 
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="location.reload()">
                            Попробовать снова
                        </button>
                        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="Auth.enableDemoMode(); location.reload()">
                            Использовать демо-данные
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Остальной код index.js остается без изменений, но добавьте проверку isDemoMode в submitOrder:
async function submitOrder(event) {
    event.preventDefault();
    
    if (!Auth.isAuthenticated() && !isDemoMode) {
        Utils.showNotification('Для подачи заявки требуется авторизация', 'warning');
        Auth.showModal();
        return;
    }
    
    if (isDemoMode) {
        Utils.showNotification('В демо-режиме заявки не отправляются на сервер', 'info');
        
        // Показываем модальное окно с демо-заявкой
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
            modal.hide();
            Utils.showNotification('Демо-заявка создана!', 'success');
            
            // Перенаправляем в личный кабинет
            setTimeout(() => {
                window.location.href = 'cabinet.html';
            }, 1500);
        }, 1000);
        return;
    }
    
    // Оригинальный код для реального API...
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
        
        // Если мы на странице личного кабинета, обновляем список заявок
        if (typeof loadOrders === 'function') {
            loadOrders();
        }
        
        // Перенаправляем в личный кабинет
        setTimeout(() => {
            window.location.href = 'cabinet.html';
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка создания заявки:', error);
        Utils.showNotification(`Ошибка: ${error.message}`, 'danger');
    }
}

function updateDemoModeUI() {
    const isDemo = Auth.getApiKey() === 'demo';
    const icon = document.getElementById('demoModeIcon');
    const text = document.getElementById('demoModeText');
    
    if (icon && text) {
        if (isDemo) {
            icon.className = 'bi bi-toggle-on text-success';
            text.textContent = 'Демо-режим ВКЛ';
        } else {
            icon.className = 'bi bi-toggle-off';
            text.textContent = 'Демо-режим';
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    updateDemoModeUI();
    
    // Обработчик переключения режима
    const toggleBtn = document.getElementById('toggleDemoMode');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (Auth.getApiKey() === 'demo') {
                // Выключить демо-режим
                Auth.clearApiKey();
                Utils.showNotification('Демо-режим выключен', 'info');
            } else {
                // Включить демо-режим
                Auth.enableDemoMode();
            }
            
            updateDemoModeUI();
            setTimeout(() => location.reload(), 1000);
        });
    }
});
