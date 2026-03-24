/**
 * Utilidades para el manejo de imágenes de productos
 */

export function normalizeProductImageUrl(url: string | null | undefined): string {
  if (!url) return "/img/products/default.jpg";
  
  // Si ya es una URL completa (http, https, data), retornarla tal cual
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }

  let path = url;

  // Manejar el prefijo 'public/' si existe en la base de datos
  if (path.startsWith("public/")) {
    path = path.slice(6); // Elimina 'public' pero deja la barra si la hay, o preparamos para el siguiente paso
  }

  // Asegurar que comience con /
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // Si después de la barra inicial no empieza con 'img/', asumimos que es solo el nombre del archivo
  // y lo ubicamos en la carpeta de productos predeterminada
  if (!path.startsWith("/img/")) {
    // Ejemplo: de '/mat001.jpg' a '/img/products/mat001.jpg'
    path = "/img/products" + path;
  }

  return path;
}

/**
 * Extrae solo el nombre base de la imagen para mostrar en formularios de edición
 * Ejemplo: '/img/products/mat001.jpg' -> 'mat001'
 */
export function getImageBaseName(url: string | null | undefined): string {
  if (!url) return "";
  
  let name = url;
  
  // Si contiene la ruta completa, tomar solo el final
  if (name.includes("/img/products/")) {
    name = name.split("/img/products/").pop() || "";
  } else if (name.includes("/")) {
    name = name.split("/").pop() || "";
  }
  
  // Quitar la extensión .jpg si existe
  return name.replace(/\.jpg$/, "");
}
