const rolSelect = document.getElementById('rol');
const dynamicFields = document.getElementById('dynamic-fields');
const fieldMatricula = document.getElementById('field-matricula');
const fieldNombre = document.getElementById('field-nombre');

const inputMatricula = document.getElementById('matricula');
const inputNombre = document.getElementById('nombre');

// Escuchar cambios en la lista desplegable
rolSelect.addEventListener('change', (e) => {
    const selectedRol = e.target.value;

    // Mostrar el contenedor de campos
    dynamicFields.classList.remove('hidden');

    if (selectedRol === 'estudiante') {
        // Mostrar Matrícula, Ocultar Nombre
        fieldMatricula.classList.remove('hidden');
        inputMatricula.setAttribute('required', 'true');

        fieldNombre.classList.add('hidden');
        inputNombre.removeAttribute('required');
        inputNombre.value = ''; // Limpiar campo
    } else if (selectedRol === 'docente') {
        // Mostrar Nombre, Ocultar Matrícula
        fieldNombre.classList.remove('hidden');
        inputNombre.setAttribute('required', 'true');

        fieldMatricula.classList.add('hidden');
        inputMatricula.removeAttribute('required');
        inputMatricula.value = ''; // Limpiar campo
    }
});

// Ver/Ocultar Contraseña
const toggleIcon = document.getElementById('toggleIcon');
const passwordInput = document.getElementById('password');

toggleIcon.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    toggleIcon.classList.toggle('fa-eye');
    toggleIcon.classList.toggle('fa-eye-slash');
});