// js/renderers/Renderer3D.js
/**
 * Оптимизированный 3D рендерер с легкой и красивой визуализацией
 */
class Renderer3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Контейнер для 3D не найден:', containerId);
            return;
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.meshes = [];
        this.lines = [];
        this.group = null;
        this.currentCommands = [];
        this.isInitialized = false;
        
        // Оптимизированные кэши
        this.materialCache = new Map();
        this.geometryCache = new Map();
        
        this.stats = {
            totalMeshes: 0,
            totalLines: 0,
            lastRenderTime: 0,
            frameCount: 0
        };
        
        this.animationId = null;
        
        // Параметры визуализации
        this.visualizationParams = {
            useLines: true, // Использовать линии вместо цилиндров для тонких ветвей
            lineWidth: 2,
            maxDepth: 8,
            colors: [
                0x4CAF50, 0x2196F3, 0xFF9800, 0xE91E63, 
                0x9C27B0, 0x3F51B5, 0x00BCD4, 0xFF5722
            ]
        };
        
        this.init();
    }

    init() {
        try {
            console.log('🚀 Инициализация оптимизированного 3D рендерера...');
            
            if (typeof THREE === 'undefined') {
                throw new Error('THREE.js не загружен');
            }

            // Создание сцены
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x1a1a1a);

            // Создание камеры
            const containerRect = this.container.getBoundingClientRect();
            const width = containerRect.width || 800;
            const height = containerRect.height || 600;
            
            this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
            this.camera.position.set(0, 0, 50);
            this.camera.lookAt(0, 0, 0);

            // Создание рендерера с балансом качества и производительности
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true,
                powerPreference: "high-performance"
            });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); // Ограничиваем pixel ratio для производительности
            
            // Настройка тоновой компрессии для лучших цветов
            if (this.renderer.toneMapping !== undefined) {
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.toneMappingExposure = 1.0;
            }
            
            // Очистка контейнера и добавление canvas
            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);

            // Группа для всех объектов
            this.group = new THREE.Group();
            this.scene.add(this.group);

            // Оптимизированное освещение
            this.setupOptimizedLighting();

            // Инициализация OrbitControls
            this.setupOrbitControls();

            // Обработчик изменения размера
            this.handleResize = () => this.onWindowResize();
            window.addEventListener('resize', this.handleResize);
            
            // Запуск анимационного цикла
            this.startAnimationLoop();

            // Скрываем сообщение о загрузке
            const loadingMessage = this.container.querySelector('.loading-message');
            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }

            this.isInitialized = true;
            console.log('✅ 3D рендерер инициализирован с оптимизациями');

        } catch (error) {
            console.error('Ошибка инициализации 3D рендерера:', error);
            this.showError(error.message);
        }
    }

    /**
     * Оптимизированная настройка освещения
     */
    setupOptimizedLighting() {
        // Мягкое окружающее освещение
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Основной направленный свет
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(30, 50, 30);
        directionalLight.castShadow = false; // Отключаем тени для производительности
        this.scene.add(directionalLight);

        // Заполняющий свет сзади
        const backLight = new THREE.DirectionalLight(0x4444ff, 0.3);
        backLight.position.set(-30, -20, -30);
        this.scene.add(backLight);
    }

    /**
     * Настройка OrbitControls для полноценного управления
     */
    setupOrbitControls() {
        if (typeof OrbitControls === 'undefined') {
            console.warn('OrbitControls не доступны, используем fallback');
            this.setupFallbackControls();
            return;
        }

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI;
        
        console.log('✅ OrbitControls активированы');
    }

    /**
     * Fallback контролы на случай отсутствия OrbitControls
     */
    setupFallbackControls() {
        let isMouseDown = false;
        let lastX = 0;
        let lastY = 0;
        let mouseButton = 0;

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseButton = e.button;
            lastX = e.clientX;
            lastY = e.clientY;
            this.renderer.domElement.style.cursor = 'grabbing';
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;

            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;

            if (mouseButton === 0) { // ЛКМ - вращение
                this.camera.position.x -= deltaX * 0.01;
                this.camera.position.y += deltaY * 0.01;
            } else if (mouseButton === 2) { // ПКМ - панорамирование
                this.camera.position.x += deltaX * 0.02;
                this.camera.position.y -= deltaY * 0.02;
            }

            this.camera.lookAt(0, 0, 0);
            lastX = e.clientX;
            lastY = e.clientY;
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            isMouseDown = false;
            this.renderer.domElement.style.cursor = 'grab';
        });

        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camera.position.z += e.deltaY * 0.01;
            this.camera.position.z = Math.max(5, Math.min(200, this.camera.position.z));
            this.camera.lookAt(0, 0, 0);
        });

        this.renderer.domElement.style.cursor = 'grab';
        console.log('✅ Fallback контролы активированы');
    }

    onWindowResize() {
        if (!this.camera || !this.renderer || !this.container) return;
        
        const containerRect = this.container.getBoundingClientRect();
        const width = containerRect.width;
        const height = containerRect.height;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Запуск анимационного цикла
     */
    startAnimationLoop() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            // Обновляем контролы если они есть
            if (this.controls) {
                this.controls.update();
            }
            
            // Легкая анимация для оживления сцены
            if (this.group) {
                this.group.rotation.y += 0.001; // Медленное вращение
            }
            
            // Рендерим сцену
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            
            this.stats.frameCount++;
        };
        
        this.animationId = requestAnimationFrame(animate);
    }

    /**
     * Остановка анимационного цикла
     */
    stopAnimationLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Основной метод рендеринга
     */
    render(commands, progress = 1.0) {
        if (!this.scene || !this.group || !this.isInitialized) return;

        this.currentCommands = commands || [];
        this.clearScene();

        if (!this.currentCommands || this.currentCommands.length === 0) {
            return;
        }

        const startTime = performance.now();
        const visibleCount = Math.max(1, Math.floor(this.currentCommands.length * progress));
        const visibleCommands = this.currentCommands.slice(0, visibleCount);

        console.log(`🔄 3D рендеринг: ${visibleCount} команд`);

        // Создание 3D объектов
        let objectsCreated = 0;
        
        // Создаем геометрию для линий
        const lineGeometry = new THREE.BufferGeometry();
        const linePositions = [];
        const lineColors = [];
        
        visibleCommands.forEach(command => {
            try {
                if (command.type === 'draw3D' || (command.type === 'draw' && command.is3D)) {
                    if (this.visualizationParams.useLines) {
                        this.addLineToGeometry(command, linePositions, lineColors);
                    } else {
                        this.create3DBranch(command);
                    }
                    objectsCreated++;
                } else if (command.type === 'draw' && !command.is3D) {
                    this.create2DBranchIn3D(command);
                    objectsCreated++;
                }
            } catch (error) {
                console.warn('Ошибка создания 3D объекта:', error);
            }
        });

        // Создаем линии если есть данные
        if (linePositions.length > 0) {
            this.createLineMesh(lineGeometry, linePositions, lineColors);
        }

        const endTime = performance.now();
        this.stats.lastRenderTime = endTime - startTime;
        this.stats.totalMeshes = this.meshes.length;
        this.stats.totalLines = this.lines.length;

        // Автоматическое позиционирование камеры
        if (progress === 1.0) {
            setTimeout(() => this.fitCameraToScene(), 100);
        }

        console.log(`✅ 3D отрисовано: ${objectsCreated} объектов, ${this.meshes.length} мешей, ${this.lines.length} линий за ${this.stats.lastRenderTime.toFixed(1)}мс`);
    }

    /**
     * Добавление линии в геометрию
     */
    addLineToGeometry(command, positions, colors) {
        const { from, to } = command;
        
        if (!from.position || !to.position) return;

        const start = from.position;
        const end = to.position;
        
        // Добавляем позиции начала и конца линии
        positions.push(start.x * 0.1, -start.y * 0.1, start.z * 0.1);
        positions.push(end.x * 0.1, -end.y * 0.1, end.z * 0.1);
        
        // Получаем цвет по глубине
        const depth = from.depth || 0;
        const color = new THREE.Color(this.getColorByDepth(depth));
        
        // Добавляем цвет для обеих вершин линии
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
    }

    /**
     * Создание меша линий
     */
    createLineMesh(geometry, positions, colors) {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.LineBasicMaterial({ 
            vertexColors: true,
            linewidth: this.visualizationParams.lineWidth
        });
        
        const line = new THREE.LineSegments(geometry, material);
        this.group.add(line);
        this.lines.push(line);
    }

    /**
     * Создание 3D ветки с цилиндрами (альтернативный метод)
     */
    create3DBranch(command) {
        const { from, to } = command;
        
        if (!from.position || !to.position) return;

        const start = from.position;
        const end = to.position;
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        
        if (length === 0) return;

        // Определяем параметры цилиндра
        const depthFactor = from.depth || 0;
        const radius = Math.max(0.01, 0.05 * Math.pow(0.7, depthFactor));
        
        // Создаем или получаем геометрию из кэша
        const geometry = this.getCachedCylinderGeometry(radius, radius * 0.8, length, 4); // Уменьшаем сегменты для производительности
        const material = this.getCachedMaterial(this.getColorByDepth(depthFactor), depthFactor);
        
        const cylinder = new THREE.Mesh(geometry, material);
        
        // Позиционирование и ориентация
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        cylinder.position.copy(midpoint);
        
        // Ориентация вдоль направления
        cylinder.lookAt(end);
        cylinder.rotateX(Math.PI / 2);
        
        this.group.add(cylinder);
        this.meshes.push(cylinder);
    }

    /**
     * Создание 2D ветки в 3D пространстве
     */
    create2DBranchIn3D(command) {
        const { from, to } = command;
        
        const start = new THREE.Vector3(from.x * 0.1, -from.y * 0.1, 0);
        const end = new THREE.Vector3(to.x * 0.1, -to.y * 0.1, 0);
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        
        if (length === 0) return;

        // Используем линии для 2D веток
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({ 
            color: this.getColorByDepth(from.depth || 0),
            linewidth: 2
        });
        
        const line = new THREE.Line(geometry, material);
        this.group.add(line);
        this.lines.push(line);
    }

    /**
     * Кэшированное получение геометрии цилиндра
     */
    getCachedCylinderGeometry(radiusTop, radiusBottom, height, radialSegments) {
        const key = `cylinder_${radiusTop}_${radiusBottom}_${height}_${radialSegments}`;
        
        if (!this.geometryCache.has(key)) {
            const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
            this.geometryCache.set(key, geometry);
        }
        
        return this.geometryCache.get(key);
    }

    /**
     * Кэшированное получение материала
     */
    getCachedMaterial(color, depth) {
        const key = `${color}`;
        
        if (!this.materialCache.has(key)) {
            const material = new THREE.MeshLambertMaterial({ 
                color: new THREE.Color(color),
                transparent: depth > 2,
                opacity: Math.max(0.6, 1.0 - depth * 0.1)
            });
            this.materialCache.set(key, material);
        }
        
        return this.materialCache.get(key);
    }

    /**
     * Получение цвета по глубине
     */
    getColorByDepth(depth) {
        return this.visualizationParams.colors[depth % this.visualizationParams.colors.length] || 0x4CAF50;
    }

    /**
     * Автоматическое позиционирование камеры
     */
    fitCameraToScene() {
        if (this.meshes.length === 0 && this.lines.length === 0) {
            this.resetCamera();
            return;
        }

        const box = new THREE.Box3();
        
        // Добавляем все меши
        this.meshes.forEach(mesh => {
            mesh.updateMatrixWorld(true);
            box.expandByObject(mesh);
        });
        
        // Добавляем все линии
        this.lines.forEach(line => {
            line.updateMatrixWorld(true);
            box.expandByObject(line);
        });

        if (box.isEmpty()) {
            this.resetCamera();
            return;
        }

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
        cameraDistance = Math.max(cameraDistance, 10);
        
        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.update();
        }
        
        this.camera.position.copy(center);
        this.camera.position.z += cameraDistance;
        this.camera.lookAt(center);
        
        console.log('✅ Камера автоматически настроена на сцену');
    }

    /**
     * Очистка сцены
     */
    clearScene() {
        // Удаляем все меши
        this.meshes.forEach(mesh => {
            this.group.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        
        // Удаляем все линии
        this.lines.forEach(line => {
            this.group.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        });
        
        this.meshes = [];
        this.lines = [];
    }

    /**
     * Сброс камеры
     */
    resetCamera() {
        this.camera.position.set(0, 0, 50);
        this.camera.lookAt(0, 0, 0);
        
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
        
        console.log('✅ Камера сброшена');
    }

    showError(message) {
        this.container.innerHTML = `
            <div style="color: white; padding: 20px; text-align: center;">
                <h3>Ошибка 3D рендерера</h3>
                <p>${message}</p>
                <p>Проверьте поддержку WebGL в вашем браузере</p>
            </div>
        `;
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            ...this.stats,
            materialCacheSize: this.materialCache.size,
            geometryCacheSize: this.geometryCache.size,
            useLines: this.visualizationParams.useLines
        };
    }

    /**
     * Переключение режима визуализации (линии/цилиндры)
     */
    setVisualizationMode(useLines) {
        this.visualizationParams.useLines = useLines;
    }

    destroy() {
        this.stopAnimationLoop();
        this.clearScene();
        
        // Очистка кэшей
        this.materialCache.forEach(material => material.dispose());
        this.materialCache.clear();
        
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        window.removeEventListener('resize', this.handleResize);
        
        console.log('✅ 3D рендерер уничтожен');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer3D;
} else {
    window.Renderer3D = Renderer3D;
}