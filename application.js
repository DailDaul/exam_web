//модуль для процесса оформления заявки
const Application = {
    //текущий выбранный репетитор
    selectedTutor: null,
    
    //текущий выбранный курс
    selectedCourse: null,
    
    //инициализация
    init() {
        this.initTutorSearch();
        this.initCourseApplication();
        this.bindEvents();
    },
    
    //поиск репетитора
    initTutorSearch() {
        //создаем контейнер для поиска репетиторов, если его нет
        if (!document.getElementById('tutorSearchContainer')) {
            this.createTutorSearchSection();
        }
        
        //инициализируем реальный поиск
        this.setupTutorSearch();
    },
    
    createTutorSearchSection() {
        const sectionHTML = `
            <section id="tutorSearch" class="py-5 bg-light">
                <div class="container">
                    <h2 class="text-center mb-4">Поиск репетитора</h2>
                    
                    <!-- Форма поиска -->
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">Предлагаемые языки</label>
                                    <select class="form-select" id="tutorLanguageSelect" multiple>
                                        <option value="">Все языки</option>
                                        <!-- Заполнится динамически -->
                                    </select>
                                    <div class="form-text">Удерживайте Ctrl для выбора нескольких языков</div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Уровень языка</label>
                                    <select class="form-select" id="tutorLevelSelect">
                                        <option value="">Все уровни</option>
                                        <option value="Beginner">Начальный</option>
                                        <option value="Intermediate">Средний</option>
                                        <option value="Advanced">Продвинутый</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Результаты поиска -->
                    <div class="card shadow-sm">
                        <div class="card-header bg-white">
                            <h5 class="mb-0">Найдено репетиторов: <span id="tutorCount">0</span></h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="tutorSearchTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Фото</th>
                                            <th>Имя репетитора</th>
                                            <th>Уровень языка</th>
                                            <th>Языки</th>
                                            <th>Опыт (лет)</th>
                                            <th>Ставка (руб./час)</th>
                                            <th>Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tutorSearchResults">
                                        <!-- Результаты загружаются динамически -->
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Сообщение при отсутствии результатов -->
                            <div id="noTutorsMessage" class="text-center py-5 d-none">
                                <i class="bi bi-search fs-1 text-muted"></i>
                                <h4 class="mt-3">Репетиторы не найдены</h4>
                                <p class="text-muted">Попробуйте изменить критерии поиска</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
        
        //добавляем секцию после блока с репетиторами
        const tutorsSection = document.querySelector('#tutors');
        if (tutorsSection) {
            tutorsSection.insertAdjacentHTML('afterend', sectionHTML);
        } else {
            document.body.insertAdjacentHTML('beforeend', sectionHTML);
        }
    },
    
    setupTutorSearch() {
        //заполняем список языков
        this.populateLanguages();
        
        //настройка обработчиков событий для реального поиска
        const languageSelect = document.getElementById('tutorLanguageSelect');
        const levelSelect = document.getElementById('tutorLevelSelect');
        
        if (languageSelect) {
            languageSelect.addEventListener('change', () => this.searchTutors());
        }
        if (levelSelect) {
            levelSelect.addEventListener('change', () => this.searchTutors());
        }
        
        //первоначальный поиск
        this.searchTutors();
    },
    
    populateLanguages() {
        const select = document.getElementById('tutorLanguageSelect');
        if (!select || !API || !API.tutors || !API.tutors.allTutors) return;
        
        //собираем уникальные языки
        const allLanguages = new Set();
        API.tutors.allTutors.forEach(tutor => {
            if (tutor.languages_offered) {
                tutor.languages_offered.forEach(lang => allLanguages.add(lang));
            }
            if (tutor.languages_spoken) {
                tutor.languages_spoken.forEach(lang => allLanguages.add(lang));
            }
        });
        
        //добавляем языки в select
        allLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang;
            select.appendChild(option);
        });
    },
    
    searchTutors() {
        const languageSelect = document.getElementById('tutorLanguageSelect');
        const levelSelect = document.getElementById('tutorLevelSelect');
        const resultsContainer = document.getElementById('tutorSearchResults');
        const noTutorsMessage = document.getElementById('noTutorsMessage');
        const tutorCount = document.getElementById('tutorCount');
        
        if (!languageSelect || !levelSelect || !resultsContainer) return;
        
        //получаем выбранные языки
        const selectedLanguages = Array.from(languageSelect.selectedOptions)
            .map(opt => opt.value)
            .filter(val => val);
        
        const selectedLevel = levelSelect.value;
        
        //фильтруем репетиторов
        const filteredTutors = API.tutors.allTutors.filter(tutor => {
            //проверка уровня
            if (selectedLevel && tutor.language_level !== selectedLevel) {
                return false;
            }
            
            //проверка языков (если языки выбраны)
            if (selectedLanguages.length > 0) {
                const tutorLanguages = [
                    ...(tutor.languages_offered || []),
                    ...(tutor.languages_spoken || [])
                ];
                
                const hasSelectedLanguage = selectedLanguages.some(lang => 
                    tutorLanguages.includes(lang)
                );
                
                if (!hasSelectedLanguage) return false;
            }
            
            return true;
        });
        
        //обновляем счетчик
        if (tutorCount) {
            tutorCount.textContent = filteredTutors.length;
        }
        
        //отображаем результаты
        if (filteredTutors.length === 0) {
            resultsContainer.innerHTML = '';
            if (noTutorsMessage) noTutorsMessage.classList.remove('d-none');
            return;
        }
        
        if (noTutorsMessage) noTutorsMessage.classList.add('d-none');
        
        let html = '';
        filteredTutors.forEach(tutor => {
            const isSelected = this.selectedTutor?.id === tutor.id;
            const rowClass = isSelected ? 'table-primary' : '';
            
            html += `
                <tr class="${rowClass}" id="tutor-row-${tutor.id}">
                    <td>
                        <div class="avatar-placeholder rounded-circle bg-secondary d-flex align-items-center justify-content-center" 
                             style="width: 50px; height: 50px;">
                            <i class="bi bi-person-fill text-white fs-4"></i>
                        </div>
                    </td>
                    <td>
                        <strong>${tutor.name}</strong>
                    </td>
                    <td>
                        <span class="badge ${this.getLevelBadgeClass(tutor.language_level)}">
                            ${tutor.language_level}
                        </span>
                    </td>
                    <td>
                        <small>
                            ${(tutor.languages_offered || []).join(', ')}
                            ${tutor.languages_spoken ? `<br><span class="text-muted">Говорит: ${tutor.languages_spoken.join(', ')}</span>` : ''}
                        </small>
                    </td>
                    <td>${tutor.work_experience} лет</td>
                    <td>
                        <strong class="text-success">
                            ${API.utils.formatPrice(tutor.price_per_hour)}
                        </strong>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm ${isSelected ? 'btn-outline-danger' : 'btn-outline-success'}"
                                    onclick="Application.selectTutor(${tutor.id})">
                                ${isSelected ? 
                                    '<i class="bi bi-x-circle"></i> Отменить' : 
                                    '<i class="bi bi-check-circle"></i> Выбрать'}
                            </button>
                            <button class="btn btn-sm btn-outline-primary"
                                    onclick="Application.showTutorDetail(${tutor.id})">
                                <i class="bi bi-info-circle"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        resultsContainer.innerHTML = html;
    },
    
    //выбор репетитора
    selectTutor(tutorId) {
        const tutor = API.tutors.allTutors.find(t => t.id === tutorId);
        
        if (!tutor) return;
        
        //если выбран уже выбранный репетитор - снимаем выделение
        if (this.selectedTutor?.id === tutorId) {
            this.selectedTutor = null;
            this.clearTutorSelection();
        } else {
            //выбираем нового репетитора
            this.selectedTutor = tutor;
            this.highlightSelectedTutor(tutorId);
            
            //показываем уведомление
            API.utils.showNotification(`Выбран репетитор: ${tutor.name}`, 'success');
            
            //показываем кнопку для перехода к оформлению заявки
            this.showTutorSelectionActions();
        }
        
        //обновляем таблицу
        this.searchTutors();
    },
    
    clearTutorSelection() {
        //убираем выделение со всех строк
        document.querySelectorAll('#tutorSearchTable tbody tr').forEach(row => {
            row.classList.remove('table-primary');
        });
        
        //скрываем кнопки действий
        this.hideTutorSelectionActions();
        
        API.utils.showNotification('Выбор репетитора отменен', 'info');
    },
    
    highlightSelectedTutor(tutorId) {
        //убираем выделение со всех строк
        document.querySelectorAll('#tutorSearchTable tbody tr').forEach(row => {
            row.classList.remove('table-primary');
        });
        
        //выделяем выбранную строку
        const selectedRow = document.getElementById(`tutor-row-${tutorId}`);
        if (selectedRow) {
            selectedRow.classList.add('table-primary');
        }
    },
    
    showTutorSelectionActions() {
        let actionsContainer = document.getElementById('tutorActionsContainer');
        
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.id = 'tutorActionsContainer';
            actionsContainer.className = 'text-center mt-4 p-3 bg-light rounded';
            
            const tutorSearchSection = document.getElementById('tutorSearch');
            if (tutorSearchSection) {
                tutorSearchSection.appendChild(actionsContainer);
            }
        }
        
        actionsContainer.innerHTML = `
            <div class="d-flex justify-content-center align-items-center gap-3">
                <div>
                    <h5 class="mb-0">Выбран репетитор: <strong>${this.selectedTutor.name}</strong></h5>
                    <p class="text-muted mb-0">Уровень: ${this.selectedTutor.language_level} • 
                       Ставка: ${API.utils.formatPrice(this.selectedTutor.price_per_hour)}/час</p>
                </div>
                <div>
                    <button class="btn btn-success" onclick="Application.openTutorApplication()">
                        <i class="bi bi-calendar-plus"></i> Забронировать занятие
                    </button>
                    <button class="btn btn-outline-secondary" onclick="Application.selectTutor(${this.selectedTutor.id})">
                        <i class="bi bi-x-circle"></i> Отменить выбор
                    </button>
                </div>
            </div>
        `;
    },
    
    hideTutorSelectionActions() {
        const actionsContainer = document.getElementById('tutorActionsContainer');
        if (actionsContainer) {
            actionsContainer.remove();
        }
    },
    
    showTutorDetail(tutorId) {
        const tutor = API.tutors.allTutors.find(t => t.id === tutorId);
        if (!tutor) return;
        
        const modal = new bootstrap.Modal(document.getElementById('tutorDetailModal') || 
            this.createTutorDetailModal());
        
        document.getElementById('tutorDetailName').textContent = tutor.name;
        document.getElementById('tutorDetailExperience').textContent = `${tutor.work_experience} лет`;
        document.getElementById('tutorDetailLevel').textContent = tutor.language_level;
        document.getElementById('tutorDetailPrice').textContent = 
            API.utils.formatPrice(tutor.price_per_hour) + '/час';
        
        const languagesOffered = document.getElementById('tutorDetailLanguagesOffered');
        languagesOffered.innerHTML = '';
        (tutor.languages_offered || []).forEach(lang => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = lang;
            languagesOffered.appendChild(li);
        });
        
        const languagesSpoken = document.getElementById('tutorDetailLanguagesSpoken');
        languagesSpoken.innerHTML = '';
        (tutor.languages_spoken || []).forEach(lang => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = lang;
            languagesSpoken.appendChild(li);
        });
        
        modal.show();
    },
    
    createTutorDetailModal() {
        const modalHTML = `
            <div class="modal fade" id="tutorDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Детали репетитора</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-4 text-center">
                                    <div class="avatar-placeholder rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto" 
                                         style="width: 120px; height: 120px;">
                                        <i class="bi bi-person-fill text-white fs-1"></i>
                                    </div>
                                    <h4 class="mt-3" id="tutorDetailName"></h4>
                                    <p class="text-muted">
                                        Опыт: <span id="tutorDetailExperience"></span><br>
                                        Уровень: <span id="tutorDetailLevel"></span>
                                    </p>
                                    <h5 class="text-success" id="tutorDetailPrice"></h5>
                                </div>
                                <div class="col-md-8">
                                    <h6>Языки, которым обучает:</h6>
                                    <ul class="list-group list-group-flush mb-3" id="tutorDetailLanguagesOffered"></ul>
                                    
                                    <h6>Языки, на которых говорит:</h6>
                                    <ul class="list-group list-group-flush" id="tutorDetailLanguagesSpoken"></ul>
                                    
                                    <div class="mt-4">
                                        <button class="btn btn-success w-100" 
                                                onclick="Application.selectTutorFromDetail()">
                                            <i class="bi bi-check-circle"></i> Выбрать этого репетитора
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        return document.getElementById('tutorDetailModal');
    },
    
    selectTutorFromDetail() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('tutorDetailModal'));
        if (modal) modal.hide();
        
        if (this.selectedTutor) {
            this.selectTutor(this.selectedTutor.id);
        }
    },
    
    //подача заявки на курсы и расчет стоимости
    initCourseApplication() {
        //обновляем карточки курсов, чтобы добавить кнопку "Подать заявку"
        this.updateCourseCards();
        
        //создаем модальное окно для заявки на курс
        this.createCourseApplicationModal();
    },
    
    updateCourseCards() {
        //эта функция будет вызываться после загрузки курсов
        //она обновляет карточки курсов, добавляя кнопку "Подать заявку"
    },
    
    createCourseApplicationModal() {
        const modalHTML = `
            <div class="modal fade" id="courseApplicationModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Заявка на языковой курс</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="courseApplicationForm">
                            <div class="modal-body">
                                <!-- Основная информация -->
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Название курса</label>
                                            <input type="text" class="form-control" id="courseName" readonly>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Преподаватель</label>
                                            <input type="text" class="form-control" id="courseTeacher" readonly>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Продолжительность курса</label>
                                            <input type="text" class="form-control" id="courseDuration" readonly>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Дата окончания курса</label>
                                            <input type="text" class="form-control" id="courseEndDate" readonly>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Выбор даты и времени -->
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Дата начала курса *</label>
                                            <select class="form-select" id="courseStartDate" required 
                                                    onchange="Application.updateAvailableTimes()">
                                                <option value="">Выберите дату</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Время занятий *</label>
                                            <select class="form-select" id="courseTime" required disabled>
                                                <option value="">Сначала выберите дату</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Количество студентов -->
                                <div class="mb-4">
                                    <label class="form-label">Количество студентов в группе (1-20) *</label>
                                    <input type="number" class="form-control" id="courseStudents" 
                                           min="1" max="20" value="1" required
                                           onchange="Application.calculateTotalCost()">
                                </div>
                                
                                <!-- Дополнительные параметры -->
                                <div class="mb-4">
                                    <h6>Дополнительные параметры обучения</h6>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="courseEarlyRegistration"
                                                       onchange="Application.calculateTotalCost()">
                                                <label class="form-check-label" for="courseEarlyRegistration">
                                                    Скидка за раннюю регистрацию (10%)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="courseGroupEnrollment"
                                                       onchange="Application.calculateTotalCost()">
                                                <label class="form-check-label" for="courseGroupEnrollment">
                                                    Групповая скидка (15%)
                                                </label>
                                                <div class="form-text">Применяется автоматически при 5+ студентах</div>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="courseIntensive"
                                                       onchange="Application.calculateTotalCost()">
                                                <label class="form-check-label" for="courseIntensive">
                                                    Интенсивный курс (+20%)
                                                </label>
                                                <div class="form-text">Применяется при 5+ часах в неделю</div>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="courseSupplementary"
                                                       onchange="Application.calculateTotalCost()">
                                                <label class="form-check-label" for="courseSupplementary">
                                                    Доп. учебные материалы (+2000 ₽/чел)
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="coursePersonalized"
                                                       onchange="Application.calculateTotalCost()">
                                                <label class="form-check-label" for="coursePersonalized">
                                                    Индивидуальные занятия (+1500 ₽/неделю)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="courseExcursions"
                                                       onchange="Application.calculateTotalCost()">
                                                <label class="form-check-label" for="courseExcursions">
                                                    Культурные экскурсии (+25%)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="courseAssessment"
                                                       onchange="Application.calculateTotalCost()">
                                                <label class="form-check-label" for="courseAssessment">
                                                    Оценка уровня (+300 ₽)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="courseInteractive"
                                                       onchange="Application.calculateTotalCost()">
                                                <label class="form-check-label" for="courseInteractive">
                                                    Интерактивная платформа (+50%)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Расчет стоимости -->
                                <div class="card bg-light">
                                    <div class="card-body">
                                        <h5 class="card-title">Расчет стоимости</h5>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <table class="table table-sm">
                                                    <tbody>
                                                        <tr>
                                                            <td>Базовая стоимость:</td>
                                                            <td id="baseCost" class="text-end">0 ₽</td>
                                                        </tr>
                                                        <tr>
                                                            <td>Надбавка за время:</td>
                                                            <td id="timeSurcharge" class="text-end">0 ₽</td>
                                                        </tr>
                                                        <tr>
                                                            <td>Доп. опции:</td>
                                                            <td id="optionsCost" class="text-end">0 ₽</td>
                                                        </tr>
                                                        <tr>
                                                            <td>Скидки:</td>
                                                            <td id="discountsAmount" class="text-end text-success">0 ₽</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="text-center">
                                                    <h4>Итого:</h4>
                                                    <h2 class="text-success" id="totalCost">0 ₽</h2>
                                                    <button type="button" class="btn btn-outline-primary btn-sm" 
                                                            onclick="Application.calculateTotalCost()">
                                                        <i class="bi bi-calculator"></i> Пересчитать
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Отмена
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    Отправить заявку
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupCourseApplicationForm();
    },
    
    setupCourseApplicationForm() {
        const form = document.getElementById('courseApplicationForm');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.selectedCourse) {
                API.utils.showNotification('Ошибка: курс не выбран', 'danger');
                return;
            }
            
            //собираем данные формы
            const formData = {
                course_id: this.selectedCourse.id,
                date_start: document.getElementById('courseStartDate').value,
                time_start: document.getElementById('courseTime').value.split(' - ')[0], // Берем только время начала
                persons: parseInt(document.getElementById('courseStudents').value),
                price: parseInt(document.getElementById('totalCost').textContent.replace(/\D/g, '')),
                early_registration: document.getElementById('courseEarlyRegistration').checked,
                group_enrollment: document.getElementById('courseGroupEnrollment').checked,
                intensive_course: document.getElementById('courseIntensive').checked,
                supplementary: document.getElementById('courseSupplementary').checked,
                personalized: document.getElementById('coursePersonalized').checked,
                excursions: document.getElementById('courseExcursions').checked,
                assessment: document.getElementById('courseAssessment').checked,
                interactive: document.getElementById('courseInteractive').checked
            };
            
            try {
                await API.orders.create(formData);
                
                //закрываем модальное окно
                const modal = bootstrap.Modal.getInstance(document.getElementById('courseApplicationModal'));
                if (modal) modal.hide();
                
                //сбрасываем форму
                form.reset();
                
            } catch (error) {
                //ошибка уже обработана в API.orders.create()
            }
        });
    },
    
    //открытие формы заявки на курс
    openCourseApplication(courseId) {
        const course = API.courses.allCourses.find(c => c.id === courseId);
        if (!course) {
            API.utils.showNotification('Курс не найден', 'danger');
            return;
        }
        
        this.selectedCourse = course;
        
        //заполняем основную информацию
        document.getElementById('courseName').value = course.name;
        document.getElementById('courseTeacher').value = course.teacher;
        document.getElementById('courseDuration').value = 
            `${course.total_length} недель (${course.week_length} часов/неделю)`;
        
        //заполняем даты начала
        const dateSelect = document.getElementById('courseStartDate');
        dateSelect.innerHTML = '<option value="">Выберите дату</option>';
        
        if (course.start_dates && course.start_dates.length > 0) {
            course.start_dates.forEach(dateStr => {
                const date = new Date(dateStr);
                const option = document.createElement('option');
                option.value = date.toISOString().split('T')[0];
                option.textContent = date.toLocaleDateString('ru-RU');
                option.dataset.datetime = dateStr;
                dateSelect.appendChild(option);
            });
        }
        
        //сбрасываем время
        document.getElementById('courseTime').innerHTML = '<option value="">Сначала выберите дату</option>';
        document.getElementById('courseTime').disabled = true;
        
        //сбрасываем дополнительные опции
        document.getElementById('courseEarlyRegistration').checked = false;
        document.getElementById('courseGroupEnrollment').checked = false;
        document.getElementById('courseIntensive').checked = course.week_length >= 5;
        document.getElementById('courseSupplementary').checked = false;
        document.getElementById('coursePersonalized').checked = false;
        document.getElementById('courseExcursions').checked = false;
        document.getElementById('courseAssessment').checked = false;
        document.getElementById('courseInteractive').checked = false;
        
        //сбрасываем расчет стоимости
        document.getElementById('baseCost').textContent = '0 ₽';
        document.getElementById('timeSurcharge').textContent = '0 ₽';
        document.getElementById('optionsCost').textContent = '0 ₽';
        document.getElementById('discountsAmount').textContent = '0 ₽';
        document.getElementById('totalCost').textContent = '0 ₽';
        
        //показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('courseApplicationModal'));
        modal.show();
    },
    
    //обновление доступного времени при выборе даты
    updateAvailableTimes() {
        const dateSelect = document.getElementById('courseStartDate');
        const timeSelect = document.getElementById('courseTime');
        const selectedOption = dateSelect.options[dateSelect.selectedIndex];
        
        if (!selectedOption || !selectedOption.value || !this.selectedCourse) {
            timeSelect.disabled = true;
            timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
            return;
        }
        
        const selectedDate = new Date(selectedOption.dataset.datetime);
        const course = this.selectedCourse;
        
        //фильтруем время для выбранной даты
        timeSelect.innerHTML = '<option value="">Выберите время</option>';
        timeSelect.disabled = false;
        
        //находим все времена для выбранной даты
        const timesForDate = course.start_dates.filter(dateStr => {
            const date = new Date(dateStr);
            return date.toDateString() === selectedDate.toDateString();
        });
        
        //добавляем варианты времени
        timesForDate.forEach(dateStr => {
            const date = new Date(dateStr);
            const startTime = date.toTimeString().substring(0, 5);
            
            //вычисляем время окончания (добавляем 2 часа по умолчанию)
            const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000);
            const endTime = endDate.toTimeString().substring(0, 5);
            
            const option = document.createElement('option');
            option.value = `${startTime} - ${endTime}`;
            option.textContent = `${startTime} - ${endTime}`;
            option.dataset.startTime = startTime;
            timeSelect.appendChild(option);
        });
        
        //рассчитываем дату окончания курса
        this.calculateEndDate();
        
        //пересчитываем стоимость
        this.calculateTotalCost();
    },
    
    calculateEndDate() {
        if (!this.selectedCourse) return;
        
        const dateSelect = document.getElementById('courseStartDate');
        if (!dateSelect.value) return;
        
        const startDate = new Date(dateSelect.value);
        const weeks = this.selectedCourse.total_length;
        
        //добавляем недели (7 дней в неделе)
        const endDate = new Date(startDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
        
        document.getElementById('courseEndDate').value = endDate.toLocaleDateString('ru-RU');
    },
    
    //расчет стоимости курса
    calculateTotalCost() {
        if (!this.selectedCourse) return;
        
        const course = this.selectedCourse;
        const students = parseInt(document.getElementById('courseStudents').value) || 1;
        
        //проверяем, выбраны ли дата и время
        const dateSelect = document.getElementById('courseStartDate');
        const timeSelect = document.getElementById('courseTime');
        
        if (!dateSelect.value || !timeSelect.value) {
            this.updateCostDisplay(0, 0, 0, 0);
            return;
        }
        
        //базовая стоимость (стоимость за час × общее количество часов)
        const totalHours = course.total_length * course.week_length;
        let baseCost = course.course_fee_per_hour * totalHours;
        
        //надбавки за время (утро/вечер/выходные)
        let timeSurcharge = 0;
        const startTime = timeSelect.options[timeSelect.selectedIndex]?.dataset.startTime;
        const selectedDate = new Date(dateSelect.value);
        
        if (startTime) {
            const hour = parseInt(startTime.split(':')[0]);
            
            //утренняя надбавка (9:00-12:00)
            if (hour >= 9 && hour < 12) {
                timeSurcharge += 400 * totalHours;
            }
            
            //вечерняя надбавка (18:00-20:00)
            if (hour >= 18 && hour < 20) {
                timeSurcharge += 1000 * totalHours;
            }
        }
        
        //надбавка за выходные
        const dayOfWeek = selectedDate.getDay(); // 0 - воскресенье, 6 - суббота
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const weekendMultiplier = isWeekend ? 1.5 : 1;
        
        //применяем коэффициент выходных
        baseCost *= weekendMultiplier;
        
        //стоимость дополнительных опций
        let optionsCost = 0;
        
        //интенсивный курс (+20%)
        const isIntensive = document.getElementById('courseIntensive').checked || course.week_length >= 5;
        if (isIntensive) {
            optionsCost += baseCost * 0.2;
        }
        
        //доп. материалы (+2000 на студента)
        if (document.getElementById('courseSupplementary').checked) {
            optionsCost += 2000 * students;
        }
        
        //индивидуальные занятия (+1500 за неделю)
        if (document.getElementById('coursePersonalized').checked) {
            optionsCost += 1500 * course.total_length;
        }
        
        //культурные экскурсии (+25%)
        if (document.getElementById('courseExcursions').checked) {
            optionsCost += baseCost * 0.25;
        }
        
        //оценка уровня (+300)
        if (document.getElementById('courseAssessment').checked) {
            optionsCost += 300;
        }
        
        //интерактивная платформа (+50%)
        if (document.getElementById('courseInteractive').checked) {
            optionsCost += baseCost * 0.5;
        }
        
        //скидки
        let discounts = 0;
        
        //ранняя регистрация (-10%)
        if (document.getElementById('courseEarlyRegistration').checked) {
            discounts += baseCost * 0.1;
        }
        
        //групповая скидка (-15% при 5+ студентах)
        const isGroup = students >= 5;
        if (isGroup && document.getElementById('courseGroupEnrollment').checked) {
            discounts += baseCost * 0.15;
        }
        
        //итоговая стоимость
        let totalCost = (baseCost + timeSurcharge + optionsCost - discounts) * students;
        totalCost = Math.max(0, Math.round(totalCost));
        
        //обновляем отображение
        this.updateCostDisplay(baseCost * students, timeSurcharge * students, 
                               optionsCost * students, discounts * students, totalCost);
    },
    
    updateCostDisplay(baseCost, timeSurcharge, optionsCost, discounts, totalCost = 0) {
        document.getElementById('baseCost').textContent = API.utils.formatPrice(baseCost);
        document.getElementById('timeSurcharge').textContent = API.utils.formatPrice(timeSurcharge);
        document.getElementById('optionsCost').textContent = API.utils.formatPrice(optionsCost);
        document.getElementById('discountsAmount').textContent = `-${API.utils.formatPrice(discounts)}`;
        document.getElementById('totalCost').textContent = API.utils.formatPrice(totalCost);
    },
    
    //открытие формы заявки на репетитора
    openTutorApplication() {
        if (!this.selectedTutor) {
            API.utils.showNotification('Сначала выберите репетитора', 'warning');
            return;
        }
        
        //используем существующее модальное окно заявки из API модуля
        API.orders.showCreateForm('tutor', this.selectedTutor.id);
    },
    
    //вспомогательные методы
    getLevelBadgeClass(level) {
        const classes = {
            'Beginner': 'bg-success',
            'Intermediate': 'bg-warning',
            'Advanced': 'bg-danger'
        };
        return classes[level] || 'bg-secondary';
    },
    
    bindEvents() {
        //обновляем карточки курсов после их загрузки
        if (API && API.courses) {
            //добавляем кнопку "Подать заявку" к каждой карточке курса
            const originalRender = API.courses.render;
            API.courses.render = function(containerId, page = 1, filteredCourses = null) {
                //вызываем оригинальный метод
                originalRender.call(this, containerId, page, filteredCourses);
                
                //добавляем обработчики к кнопкам
                document.querySelectorAll('.btn-course-apply').forEach(btn => {
                    const courseId = btn.dataset.courseId;
                    btn.addEventListener('click', () => Application.openCourseApplication(parseInt(courseId)));
                });
            };
        }
    }
};

//инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    //ждем загрузки API и данных
    if (typeof API !== 'undefined') {
        API.loadAll().then(() => {
            Application.init();
        });
    } else {
        //если API еще не загружен, ждем
        const checkAPI = setInterval(() => {
            if (typeof API !== 'undefined') {
                clearInterval(checkAPI);
                API.loadAll().then(() => {
                    Application.init();
                }).catch(() => {
                    console.error('Не удалось загрузить данные через API');
                });
            }
        }, 100);
    }
});

//экспортируем в глобальную область видимости
window.Application = Application;
