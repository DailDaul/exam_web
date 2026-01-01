//главная страница (упрощенная версия с использованием API модуля)
document.addEventListener('DOMContentLoaded', async () => {
    try {
        //проверяем, что API загружен
        if (typeof API === 'undefined') {
            console.error('API не загружен');
            showError('Модуль API не загружен. Проверьте консоль браузера.');
            return;
        }
        
        //инициализируем API
        const loaded = await API.loadAll();
        
        if (loaded) {
            //инициализируем страницу
            initPage();
            
            //настройка обработчиков событий
            setupEventListeners();
        } else {
            showError('Не удалось загрузить данные. Проверьте API ключ.');
        }
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError(`Ошибка загрузки: ${error.message}`);
    }
});

function showError(message) {
    const notificationArea = document.getElementById('notification-area') || 
                           API.utils.createNotificationArea();
    
    API.utils.showNotification(message, 'danger');
    
    // Показываем кнопку для настроек API
    setTimeout(() => {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'btn btn-warning btn-sm ms-3';
        settingsBtn.innerHTML = '<i class="bi bi-gear"></i> Настройки API';
        settingsBtn.onclick = () => {
            if (typeof Auth !== 'undefined') Auth.showModal();
        };
        
        const alert = notificationArea.querySelector('.alert:last-child');
        if (alert) {
            alert.querySelector('.btn-close').remove();
            alert.appendChild(settingsBtn);
        }
    }, 1000);
}

function initPage() {
    //отображаем курсы
    API.courses.render('coursesContainer', 1);
    
    //отображаем репетиторов
    API.tutors.render('tutorsContainer');
    
    //инициализируем Application (поиск репетиторов и оформление заявок)
    if (typeof Application !== 'undefined') {
        Application.init();
    }
    
    //инициализируем тултипы
    API.utils.initializeTooltips();
}

function setupEventListeners() {
    //поиск курсов
    const courseSearchForm = document.getElementById('courseSearchForm');
    if (courseSearchForm) {
        courseSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchTerm = document.getElementById('courseNameInput').value;
            const level = document.getElementById('courseLevelSelect').value;
            const filteredCourses = API.courses.filter(searchTerm, level);
            API.courses.render('coursesContainer', 1, filteredCourses);
        });
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

function filterTutors() {
    const qualification = document.getElementById('tutorQualification')?.value || '';
    const experience = parseInt(document.getElementById('tutorExperience')?.value) || 0;
    const filteredTutors = API.tutors.filter(qualification, experience);
    API.tutors.render('tutorsContainer', filteredTutors);
}

//глобальные функции для вызова из HTML
function openCourseDetail(courseId) {
    API.courses.showDetails(courseId);
}

function selectTutor(tutorId) {
    if (typeof Application !== 'undefined') {
        Application.selectTutor(tutorId);
    } else {
        API.orders.showCreateForm('tutor', tutorId);
    }
}

function searchCourses() {
    const searchTerm = document.getElementById('courseNameInput')?.value || '';
    const level = document.getElementById('courseLevelSelect')?.value || '';
    const filteredCourses = API.courses.filter(searchTerm, level);
    API.courses.render('coursesContainer', 1, filteredCourses);
}

//функция для подачи заявки на курс (используется в карточках)
function applyForCourse(courseId) {
    if (typeof Application !== 'undefined') {
        Application.openCourseApplication(courseId);
    } else {
        API.orders.showCreateForm('course', courseId);
    }
}
