document.addEventListener('DOMContentLoaded', () => {
    // Lectura de los parámetros Query de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const nombre = urlParams.get('nombre') || 'Maestro Demo';
    const numEmpleado = urlParams.get('numEmpleado') || 'N/A';

    // Inyección de los datos en el HTML
    document.getElementById('displayNombre').textContent = nombre;
    document.getElementById('displayNumEmpleado').textContent = numEmpleado;
    document.getElementById('topUsername').textContent = nombre;
    document.getElementById('cardNumEmpleado').textContent = numEmpleado;
    
    // Generar la inicial del avatar dinámicamente
    if(nombre) {
        document.getElementById('avatarIcon').textContent = nombre.charAt(0).toUpperCase();
    }
});