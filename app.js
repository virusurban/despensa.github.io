// 1. Importar herramientas de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, setDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD2DKbtwtfuPYm1mHbbNHIIt12cSpj7ojo",
    authDomain: "lista-compras-hogar-122e1.firebaseapp.com",
    projectId: "lista-compras-hogar-122e1",
    storageBucket: "lista-compras-hogar-122e1.firebasestorage.app",
    messagingSenderId: "16088482962",
    appId: "1:16088482962:web:62f816feb4105af871524b"
};

// 3. Inicializar Firebase principal y secundario (para Admin)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const appAdmin = initializeApp(firebaseConfig, "AppAdmin");
const authAdmin = getAuth(appAdmin);

// 4. Conectar los elementos del HTML
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const adminSection = document.getElementById('admin-section');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const authError = document.getElementById('auth-error');
const userGreeting = document.getElementById('user-greeting');

const inputProducto = document.getElementById('input-producto');
const btnAgregar = document.getElementById('btn-agregar');
const listaCompras = document.getElementById('lista-compras');

const btnAdminPanel = document.getElementById('btn-admin-panel');
const btnCerrarAdmin = document.getElementById('btn-cerrar-admin');
const newUserEmail = document.getElementById('new-user-email');
const newUserPassword = document.getElementById('new-user-password');
const btnCrearUsuario = document.getElementById('btn-crear-usuario');
const adminMsg = document.getElementById('admin-msg');
const listaUsuarios = document.getElementById('lista-usuarios');

let nombreUsuarioActual = "";

// --- AUTENTICACIÓN ---

if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
        try {
            const userInput = emailInput.value.trim();
            const password = passwordInput.value;
            let emailFinal = userInput;

            if (!userInput.includes('@')) {
                const q = query(collection(db, 'usuarios_roles'));
                const querySnapshot = await getDocs(q);
                let encontrado = false;

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (data.nombre && data.nombre.toLowerCase() === userInput.toLowerCase()) {
                        emailFinal = docSnap.id;
                        encontrado = true;
                    }
                });

                if (!encontrado) {
                    authError.textContent = "El nombre de usuario no existe.";
                    return;
                }
            }

            await signInWithEmailAndPassword(auth, emailFinal, password);
            authError.textContent = "";
        } catch (error) {
            authError.textContent = "Error al iniciar sesión: Verifique datos.";
        }
    });
}

if (btnRegister) {
    btnRegister.addEventListener('click', async () => {
        try {
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            await createUserWithEmailAndPassword(auth, email, password);
            authError.textContent = "";
        } catch (error) {
            authError.textContent = "Error al registrar: " + error.message;
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth);
    });
}

// Observador de estado de sesión
onAuthStateChanged(auth, async (user) => {
    if (user) {
        authSection.classList.add('d-none');
        appSection.classList.remove('d-none');
        if (adminSection) adminSection.classList.add('d-none');
        
        try {
            const docRef = doc(db, 'usuarios_roles', user.email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const nombrePorDefecto = user.email.split('@')[0];
                nombreUsuarioActual = data.nombre || nombrePorDefecto;
                
                userGreeting.textContent = `${nombreUsuarioActual}`;
                
                if (data.rol === 'admin') {
                    if (btnAdminPanel) btnAdminPanel.classList.remove('d-none');
                } else {
                    if (btnAdminPanel) btnAdminPanel.classList.add('d-none');
                }
            } else {
                nombreUsuarioActual = user.email.split('@')[0];
                userGreeting.textContent = `${nombreUsuarioActual}`;
                if (btnAdminPanel) btnAdminPanel.classList.add('d-none');
            }
        } catch (error) {
            nombreUsuarioActual = user.email.split('@')[0];
            userGreeting.textContent = `${nombreUsuarioActual}`;
        }
        
        cargarLista(); 
        
    } else {
        authSection.classList.remove('d-none');
        appSection.classList.add('d-none');
        if (adminSection) adminSection.classList.add('d-none');
        
        emailInput.value = '';
        passwordInput.value = '';
        if (btnAdminPanel) btnAdminPanel.classList.add('d-none');
        nombreUsuarioActual = "";
    }
});

// --- LISTA DE COMPRAS ---

if (btnAgregar) {
    btnAgregar.addEventListener('click', async () => {
        const textoProducto = inputProducto.value.trim();
        if (textoProducto === '') return;

        try {
            await addDoc(collection(db, 'productos'), {
                nombre_producto: textoProducto,
                agregado_por: nombreUsuarioActual,
                comprado: false,
                fecha_creacion: serverTimestamp(),
                fecha_tachado: null
            });
            inputProducto.value = '';
        } catch (error) {
            console.error("Error al guardar producto:", error);
        }
    });
}

function cargarLista() {
    const q = query(collection(db, 'productos'), orderBy('fecha_creacion', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        listaCompras.innerHTML = ''; 
        
        snapshot.forEach((documento) => {
            const item = documento.data();
            const id = documento.id;
            
            if (item.comprado && item.fecha_tachado) {
                const fechaTachado = item.fecha_tachado.toDate();
                const fechaActual = new Date();
                const diferenciaHoras = (fechaActual - fechaTachado) / (1000 * 60 * 60);

                if (diferenciaHoras >= 72) {
                    deleteDoc(doc(db, 'productos', id));
                    return;
                }
            }
            
            const li = document.createElement('li');
            li.className = `list-group-item d-flex justify-content-between align-items-center ${item.comprado ? 'bg-light text-muted' : ''}`;
            li.dataset.id = id; 
            
            const estiloTexto = item.comprado ? "text-decoration-line-through text-black-50 opacity-50" : "";
            
            li.innerHTML = `
                <span class="producto-texto ${estiloTexto} w-100 fs-5">
                    ${item.nombre_producto} <br>
                    <small class="text-muted" style="font-size: 0.7em;">por ${item.agregado_por || 'Desconocido'}</small>
                </span>
            `;
            listaCompras.appendChild(li);
        });
    });
}

// Evento al dar clic en CUALQUIER PARTE del renglón (ideal para celular)
if (listaCompras) {
    listaCompras.addEventListener('click', async (e) => {
        const li = e.target.closest('.list-group-item');
        if (!li) return;

        const id = li.dataset.id;
        const textoSpan = li.querySelector('.producto-texto');
        
        const estaCompradoActual = textoSpan.classList.contains('text-decoration-line-through');
        const nuevoEstado = !estaCompradoActual;

        try {
            const productoRef = doc(db, 'productos', id);
            await updateDoc(productoRef, {
                comprado: nuevoEstado,
                fecha_tachado: nuevoEstado ? serverTimestamp() : null
            });

            if (nuevoEstado) {
                li.style.opacity = '0.4';
                
                setTimeout(async () => {
                    try {
                        const docCheck = await getDoc(productoRef);
                        if (docCheck.exists() && docCheck.data().comprado) {
                            await deleteDoc(productoRef);
                        }
                    } catch (err) {
                        console.error("Error al auto-eliminar:", err);
                    }
                }, 5000); 
            } else {
                li.style.opacity = '1';
            }

        } catch (error) {
            console.error("Error al actualizar:", error);
        }
    });
}

// --- PANEL DE ADMINISTRADOR ---

if (btnAdminPanel) {
    btnAdminPanel.addEventListener('click', () => {
        appSection.classList.add('d-none');
        adminSection.classList.remove('d-none');
        cargarUsuarios();
    });
}

if (btnCerrarAdmin) {
    btnCerrarAdmin.addEventListener('click', () => {
        adminSection.classList.add('d-none');
        appSection.classList.remove('d-none');
    });
}

if (btnCrearUsuario) {
    btnCrearUsuario.addEventListener('click', async () => {
        const nombreUsuario = document.getElementById('new-user-name').value.trim();
        const email = newUserEmail.value.trim();
        const password = newUserPassword.value;
        
        if (!nombreUsuario || !email || !password) return;

        try {
            await createUserWithEmailAndPassword(authAdmin, email, password);
            await setDoc(doc(db, 'usuarios_roles', email), { 
                rol: 'usuario',
                nombre: nombreUsuario 
            });

            adminMsg.textContent = "¡Usuario creado!";
            adminMsg.className = "text-success mt-2 small fw-bold";
            document.getElementById('new-user-name').value = '';
            newUserEmail.value = '';
            newUserPassword.value = '';
            setTimeout(() => adminMsg.textContent = '', 4000);
        } catch (error) {
            adminMsg.textContent = "Error al crear.";
            adminMsg.className = "text-danger mt-2 small fw-bold";
        }
    });
}

function cargarUsuarios() {
    onSnapshot(collection(db, 'usuarios_roles'), (snapshot) => {
        listaUsuarios.innerHTML = '';
        snapshot.forEach((documento) => {
            const data = documento.data();
            const email = documento.id;
            const nombreAmigable = data.nombre || email.split('@')[0];
            
            const li = document.createElement('li');
            li.className = "list-group-item d-flex justify-content-between align-items-center py-2";
            li.innerHTML = `
                <span style="font-size: 0.9em;">
                    <strong>${nombreAmigable}</strong><br>
                    <small class="text-muted">${email}</small>
                    <span class="badge bg-secondary ms-1">${data.rol}</span>
                </span>
                ${data.rol !== 'admin' ? `<button class="btn btn-sm btn-danger btn-quitar-acceso" data-email="${email}">Quitar</button>` : ''}
            `;
            listaUsuarios.appendChild(li);
        });
    });
}

if (listaUsuarios) {
    listaUsuarios.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-quitar-acceso')) {
            const email = e.target.dataset.email;
            if (confirm(`¿Quitar acceso a ${email}?`)) {
                await deleteDoc(doc(db, 'usuarios_roles', email));
            }
        }
    });
}