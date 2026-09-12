const API_URL = "https://fakestoreapi.com/products";
const STORAGE_KEY = "clase6-carrito";

const productosContainer = document.querySelector("#productos-container");
const mensajeEstado = document.querySelector("#mensaje-estado");
const buscarInput = document.querySelector("#buscar-producto");
const categoriaSelect = document.querySelector("#categoria-producto");
const ordenSelect = document.querySelector("#orden-producto");
const contadorCarrito = document.querySelector("#contador-carrito");
const carritoLista = document.querySelector("#carrito-lista");
const resumenCantidad = document.querySelector("#resumen-cantidad");
const resumenTotal = document.querySelector("#resumen-total");
const vaciarCarritoBtn = document.querySelector("#vaciar-carrito");
const finalizarCompraBtn = document.querySelector("#finalizar-compra");
const mensajeCompra = document.querySelector("#mensaje-compra");
const formContacto = document.querySelector("#form-contacto");
const estadoContacto = document.querySelector("#estado-contacto");

let productos = [];
let carrito = obtenerCarritoGuardado();

const formatoPrecio = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
});

document.addEventListener("DOMContentLoaded", () => {
    cargarProductos();
    renderizarCarrito();
});

buscarInput.addEventListener("input", renderizarProductos);
categoriaSelect.addEventListener("change", renderizarProductos);
ordenSelect.addEventListener("change", renderizarProductos);
vaciarCarritoBtn.addEventListener("click", vaciarCarrito);
finalizarCompraBtn.addEventListener("click", finalizarCompra);
formContacto.addEventListener("submit", enviarFormulario);

async function cargarProductos() {
    try {
        const respuesta = await fetch(API_URL);

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar los productos");
        }

        productos = await respuesta.json();
        cargarCategorias();
        renderizarProductos();
        mensajeEstado.textContent = `${productos.length} productos cargados desde la API.`;
    } catch (error) {
        productos = obtenerProductosDeRespaldo();
        cargarCategorias();
        renderizarProductos();
        mensajeEstado.textContent = "Se muestran productos de respaldo porque la API no respondio.";
    }
}

function cargarCategorias() {
    const categorias = [...new Set(productos.map((producto) => producto.category))].sort();

    categorias.forEach((categoria) => {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = capitalizar(categoria);
        categoriaSelect.appendChild(option);
    });
}

function renderizarProductos() {
    const termino = buscarInput.value.trim().toLowerCase();
    const categoria = categoriaSelect.value;
    const orden = ordenSelect.value;

    const productosFiltrados = productos
        .filter((producto) => {
            const coincideBusqueda = `${producto.title} ${producto.description}`.toLowerCase().includes(termino);
            const coincideCategoria = categoria === "todas" || producto.category === categoria;
            return coincideBusqueda && coincideCategoria;
        })
        .sort((a, b) => ordenarProductos(a, b, orden));

    productosContainer.innerHTML = "";

    if (productosFiltrados.length === 0) {
        productosContainer.innerHTML = `<p class="alert alert-warning mb-0">No se encontraron productos con esos filtros.</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    productosFiltrados.forEach((producto) => {
        const card = document.createElement("article");
        card.className = "producto-card";
        card.innerHTML = `
            <img class="producto-imagen" src="${producto.image}" alt="${limpiarTexto(producto.title)}">
            <div class="producto-body">
                <span class="badge text-bg-light align-self-start">${capitalizar(producto.category)}</span>
                <h3>${producto.title}</h3>
                <p class="producto-descripcion">${recortarTexto(producto.description, 110)}</p>
                <div class="producto-footer">
                    <span class="precio">${formatoPrecio.format(producto.price)}</span>
                    <button class="btn btn-primary" type="button" data-id="${producto.id}" aria-label="Agregar ${limpiarTexto(producto.title)} al carrito">
                        Agregar
                    </button>
                </div>
            </div>
        `;
        fragment.appendChild(card);
    });

    productosContainer.appendChild(fragment);

    productosContainer.querySelectorAll("button[data-id]").forEach((boton) => {
        boton.addEventListener("click", () => agregarAlCarrito(Number(boton.dataset.id)));
    });
}

function ordenarProductos(a, b, orden) {
    if (orden === "menor-precio") return a.price - b.price;
    if (orden === "mayor-precio") return b.price - a.price;
    if (orden === "mejor-valorados") return (b.rating?.rate || 0) - (a.rating?.rate || 0);
    return a.id - b.id;
}

function agregarAlCarrito(productoId) {
    const producto = productos.find((item) => item.id === productoId);
    const productoEnCarrito = carrito.find((item) => item.id === productoId);

    if (productoEnCarrito) {
        productoEnCarrito.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            title: producto.title,
            price: producto.price,
            image: producto.image,
            cantidad: 1,
        });
    }

    mensajeCompra.textContent = `${producto.title} se agrego al carrito.`;
    guardarCarrito();
    renderizarCarrito();
}

function renderizarCarrito() {
    carritoLista.innerHTML = "";

    if (carrito.length === 0) {
        carritoLista.innerHTML = `<p class="alert alert-info mb-0">Tu carrito esta vacio.</p>`;
    } else {
        const fragment = document.createDocumentFragment();

        carrito.forEach((item) => {
            const articulo = document.createElement("article");
            articulo.className = "carrito-item";
            articulo.innerHTML = `
                <img src="${item.image}" alt="${limpiarTexto(item.title)}">
                <div>
                    <h3>${item.title}</h3>
                    <p class="mb-0">${formatoPrecio.format(item.price)} por unidad</p>
                </div>
                <div class="carrito-controles">
                    <label class="visually-hidden" for="cantidad-${item.id}">Cantidad de ${limpiarTexto(item.title)}</label>
                    <input id="cantidad-${item.id}" class="form-control cantidad-input" type="number" min="1" value="${item.cantidad}" data-cantidad-id="${item.id}">
                    <button class="btn btn-outline-danger" type="button" data-eliminar-id="${item.id}">Eliminar</button>
                </div>
            `;
            fragment.appendChild(articulo);
        });

        carritoLista.appendChild(fragment);
    }

    carritoLista.querySelectorAll("[data-cantidad-id]").forEach((input) => {
        input.addEventListener("change", () => actualizarCantidad(Number(input.dataset.cantidadId), Number(input.value)));
    });

    carritoLista.querySelectorAll("[data-eliminar-id]").forEach((boton) => {
        boton.addEventListener("click", () => eliminarDelCarrito(Number(boton.dataset.eliminarId)));
    });

    actualizarResumen();
}

function actualizarCantidad(productoId, cantidad) {
    const item = carrito.find((producto) => producto.id === productoId);
    item.cantidad = Math.max(1, cantidad || 1);
    guardarCarrito();
    renderizarCarrito();
}

function eliminarDelCarrito(productoId) {
    carrito = carrito.filter((item) => item.id !== productoId);
    mensajeCompra.textContent = "Producto eliminado del carrito.";
    guardarCarrito();
    renderizarCarrito();
}

function vaciarCarrito() {
    if (carrito.length === 0) return;
    carrito = [];
    mensajeCompra.textContent = "El carrito se vacio correctamente.";
    guardarCarrito();
    renderizarCarrito();
}

function finalizarCompra() {
    if (carrito.length === 0) {
        mensajeCompra.textContent = "Agrega al menos un producto para simular la compra.";
        return;
    }

    carrito = [];
    guardarCarrito();
    renderizarCarrito();
    mensajeCompra.textContent = "Compra simulada con exito. Gracias por elegir Tienda Sol.";
}

function actualizarResumen() {
    const cantidadTotal = carrito.reduce((total, item) => total + item.cantidad, 0);
    const precioTotal = carrito.reduce((total, item) => total + item.price * item.cantidad, 0);

    contadorCarrito.textContent = cantidadTotal;
    resumenCantidad.textContent = cantidadTotal;
    resumenTotal.textContent = formatoPrecio.format(precioTotal);
}

function obtenerCarritoGuardado() {
    const carritoGuardado = localStorage.getItem(STORAGE_KEY);
    return carritoGuardado ? JSON.parse(carritoGuardado) : [];
}

function guardarCarrito() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrito));
}

async function enviarFormulario(evento) {
    evento.preventDefault();
    estadoContacto.textContent = "";

    if (!formContacto.checkValidity()) {
        formContacto.reportValidity();
        return;
    }

    if (formContacto.action.includes("tu-id-formspree")) {
        estadoContacto.textContent = "Para enviar el formulario, reemplaza el ID de Formspree en el atributo action.";
        return;
    }

    try {
        const respuesta = await fetch(formContacto.action, {
            method: "POST",
            body: new FormData(formContacto),
            headers: { Accept: "application/json" },
        });

        if (!respuesta.ok) {
            throw new Error("Error al enviar el formulario");
        }

        formContacto.reset();
        estadoContacto.textContent = "Mensaje enviado correctamente.";
    } catch (error) {
        estadoContacto.textContent = "No se pudo enviar el mensaje. Intentalo nuevamente.";
    }
}

function recortarTexto(texto, limite) {
    return texto.length > limite ? `${texto.slice(0, limite)}...` : texto;
}

function limpiarTexto(texto) {
    return texto.replaceAll('"', "&quot;");
}

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerProductosDeRespaldo() {
    return [
        {
            id: 101,
            title: "Mochila urbana impermeable",
            price: 54.99,
            description: "Mochila liviana con compartimento para notebook y bolsillos organizadores.",
            category: "accesorios",
            image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80",
            rating: { rate: 4.7 },
        },
        {
            id: 102,
            title: "Auriculares inalambricos",
            price: 39.99,
            description: "Auriculares compactos con estuche de carga y buena autonomia.",
            category: "tecnologia",
            image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=700&q=80",
            rating: { rate: 4.5 },
        },
        {
            id: 103,
            title: "Campera casual",
            price: 79.99,
            description: "Campera comoda para uso diario con cierre frontal y bolsillos laterales.",
            category: "indumentaria",
            image: "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?auto=format&fit=crop&w=700&q=80",
            rating: { rate: 4.3 },
        },
    ];
}
