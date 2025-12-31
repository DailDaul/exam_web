//script.js - Главная страница (упрощенная версия с использованием API модуля)
document.addEventListener('DOMContentLoaded', async () => {
    //инициализируем API
    await API.loadAll();
    
    //инициализируем страницу
    initPage();
    
    //настройка обработчиков событий
    setupEventListeners();
});

function initPage() {
    //отображаем курсы
    API.courses.render('coursesContainer', 1);
    
    //отображаем репетиторов
    API.tutors.render('tutorsContainer');
    
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
    API.orders.showCreateForm('tutor', tutorId);
}

function searchCourses() {
    const searchTerm = document.getElementById('courseNameInput')?.value || '';
    const level = document.getElementById('courseLevelSelect')?.value || '';
    const filteredCourses = API.courses.filter(searchTerm, level);
    API.courses.render('coursesContainer', 1, filteredCourses);
}
