// Three.js анимация
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const geometry = new THREE.IcosahedronGeometry(window.innerWidth < 768 ? 15 : 25, 0);
const material = new THREE.MeshBasicMaterial({
    color: 0x0057B7,
    wireframe: true,
    transparent: true,
    opacity: 0.6
});
const icosahedron = new THREE.Mesh(geometry, material);
scene.add(icosahedron);

camera.position.z = window.innerWidth < 768 ? 40 : 60;

// Анимация
function animate() {
    requestAnimationFrame(animate);
    icosahedron.rotation.x += 0.008;
    icosahedron.rotation.y += 0.01;
    renderer.render(scene, camera);
}
animate();

// Реакция на движение мыши
document.addEventListener('mousemove', (e) => {
    const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    icosahedron.rotation.x = mouseY * 0.5;
    icosahedron.rotation.y = mouseX * 0.5;
});

// Данные для модального окна
const subjectsData = {
    "math_analysis": [
        { name: "Тейлор и Маклорен", url: "math_analysis/taylor_maclaurin" },
        { name: "Лагранж, Коши и Ролль", url: "math_analysis/lagrange-cauchy-rolle" },
        { name: "Модуль колебаний", url: "math_analysis/module" }
    ],
    "analytical_geometry": [
        { name: "Поверхности второго порядка", url: "analytical_geometry/surfaces" }
    ]
};

// Обработчики для карточек предметов
document.querySelectorAll('.subject-card').forEach(subject => {
    subject.addEventListener('click', () => {
        if (subject.classList.contains('inactive')) return;

        const subjectKey = subject.dataset.subject;
        const topicsContent = document.getElementById('topicsContent');
        topicsContent.innerHTML = '';

        subjectsData[subjectKey].forEach((topic, index) => {
            const topicElement = document.createElement('div');
            topicElement.className = 'topic';
            topicElement.textContent = topic.name;
            topicElement.style.animationDelay = `${index * 0.1}s`;
            topicElement.addEventListener('click', () => {
                window.location.href = topic.url;
            });
            topicsContent.appendChild(topicElement);
        });

        document.getElementById('topicsModal').style.display = 'flex';
    });
});

// Закрытие модального окна
document.addEventListener('click', (e) => {
    const modal = document.getElementById('topicsModal');
    if (!document.getElementById('topicsContent').contains(e.target) &&
        !Array.from(document.querySelectorAll('.subject-card')).includes(e.target)) {
        modal.style.display = 'none';
    }
});

// Ресайз
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
