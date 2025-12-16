// src/serviceWorkerRegistration.js

// Si está habilitado el registro del Service Worker:
export function register() {
  if (navigator.serviceWorker) {
    navigator.serviceWorker
      .register('/service-worker.js')  // Este archivo se genera al hacer build
      .then((registration) => {
        console.log('Service Worker registrado con éxito: ', registration);
      })
      .catch((error) => {
        console.log('Error al registrar el Service Worker: ', error);
      });
  }
}

// También puedes tener un método para hacer unregister si quieres detenerlo:
export function unregister() {
  if (navigator.serviceWorker) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
