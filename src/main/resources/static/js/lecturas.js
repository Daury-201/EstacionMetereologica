const TAMANO = 10;
let historialIds = [0];
let paginaActual = 0;
let totalRegistros = 0;
let totalPaginas = 1;
document.addEventListener("DOMContentLoaded", function () {
    fetch('/api/lecturas/total')
        .then(r => r.json())
        .then(total => {
            totalRegistros = total;
            totalPaginas = Math.ceil(total / TAMANO);
            document.getElementById("info-pagina").innerText =
                `Página 1 de ${totalPaginas}`;
        });
});
function refrescar() {
    historialIds = [0];
    paginaActual = 0;
    cargarPagina(0);
}
function paginaSiguiente() {
    const filas = document.querySelectorAll("#cuerpo-tabla tr");
    if (filas.length === 0) return;
    const ultimoId = filas[filas.length - 1].cells[0].innerText;
    historialIds.push(ultimoId);
    paginaActual++;
    cargarPagina(ultimoId);
}
function paginaAnterior() {
    if (paginaActual <= 1) {
        paginaActual = 0;
        cargarPagina(0);
    } else {
        paginaActual--;
        cargarPagina(historialIds[paginaActual]);
    }
}
function cargarPagina(ultimoId) {
    Promise.all([
        fetch(`/api/lecturas?ultimoId=${ultimoId}`).then(r => r.json()),
        fetch(`/api/lecturas/total`).then(r => r.json())
    ]).then(([datos, total]) => {
        totalRegistros = total;
        totalPaginas = Math.ceil(total / TAMANO);
        renderizarTabla(datos);
        document.getElementById("info-pagina").innerText =
            `Página ${paginaActual + 1} de ${totalPaginas}`;
        document.getElementById("btn-anterior").disabled =
            paginaActual === 0;
        document.getElementById("btn-siguiente").disabled =
            datos.length < TAMANO;
    });
}
function renderizarTabla(datos) {
    const tbody = document.getElementById("cuerpo-tabla");
    tbody.innerHTML = "";
    datos.forEach(l => tbody.insertAdjacentHTML("beforeend", filaHtml(l)));
}
function filaHtml(l) {
    return `<tr>
        <td>${l.id}</td>
        <td>${l.estacionId}</td>
        <td>${l.fechaHoraFormateada ?? '-'}</td>
        <td>${l.temperatura ?? '-'}</td>
        <td>${l.humedadAire ?? '-'}</td>
        <td>${l.presion ?? '-'}</td>
        <td>${l.velocidadViento ?? '-'}</td>
        <td>${l.direccionViento ?? '-'}</td>
        <td>${l.lluvia ?? '-'}</td>
        <td>${l.humedadSuelo ?? '-'}</td>
    </tr>`;
}
const socket = new SockJS('/ws');
const stompClient = Stomp.over(socket);
stompClient.connect({}, function () {
    stompClient.subscribe('/topic/lecturas', function (mensaje) {
        if (paginaActual === 0) {
            const l = JSON.parse(mensaje.body);
            const tbody = document.getElementById("cuerpo-tabla");
            tbody.insertAdjacentHTML("afterbegin", filaHtml(l));
            const filas = tbody.querySelectorAll("tr");
            if (filas.length > TAMANO) {
                filas[filas.length - 1].remove();
            }
            totalRegistros++;
            totalPaginas = Math.ceil(totalRegistros / TAMANO);
            document.getElementById("info-pagina").innerText =
                `Página 1 de ${totalPaginas}`;
        }
    });
});