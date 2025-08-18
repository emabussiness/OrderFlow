# OrderFlow ERP

Este es un proyecto ERP (Enterprise Resource Planning) construido con Next.js y Firebase, enfocado inicialmente en la gestión de compras.

## Stack Tecnológico

*   **Framework**: Next.js (App Router)
*   **Lenguaje**: TypeScript
*   **UI**: React, ShadCN/UI, Tailwind CSS
*   **Base de Datos**: Firebase (Firestore)
*   **Iconos**: Lucide React

---

## Cómo Ejecutar el Proyecto Localmente

Si has descargado este proyecto, sigue estos pasos para ponerlo en marcha en tu máquina local usando un editor como Visual Studio Code.

### 1. Prerrequisitos

Asegúrate de tener instalado lo siguiente en tu sistema:

*   **Node.js**: Versión 18.17 o superior. Puedes descargarlo desde [nodejs.org](https://nodejs.org/).
*   **Git**: El sistema de control de versiones. Puedes descargarlo desde [git-scm.com](https://git-scm.com/).
*   **npm** o **yarn**: Un gestor de paquetes de Node.js (npm viene incluido con Node.js).

### 2. Instalación

Abre una terminal en la carpeta raíz del proyecto (la que contiene el archivo `package.json`) y ejecuta el siguiente comando para instalar todas las dependencias necesarias:

```bash
npm install
```

### 3. Configuración de Variables de Entorno

Para que la aplicación se conecte a Firebase, necesitas configurar tus credenciales.

1.  Crea un nuevo archivo en la raíz del proyecto llamado `.env.local`.
2.  Copia el contenido de tu objeto de configuración de Firebase (lo puedes encontrar en la configuración de tu proyecto en la consola de Firebase) en este archivo, con el siguiente formato:

    ```env
    # Estas son las credenciales de configuración de tu app web de Firebase
    # Las puedes encontrar en la Consola de Firebase > Configuración del Proyecto > Tus Apps
    NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy...firebase...key..."
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="tu-proyecto"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="tu-proyecto.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
    NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef123456"
    ```

    **Importante**: Para que la aplicación funcione correctamente, el archivo `src/lib/firebase/firebase.ts` ya está configurado para leer estas variables de entorno.

### 4. Ejecutar la Aplicación

Abre una terminal en Visual Studio Code y ejecuta el servidor de desarrollo de Next.js:

```bash
npm run dev
```

Esto levantará la aplicación, generalmente en `http://localhost:9002`.

¡Y listo! Con estos pasos, tendrás la aplicación corriendo en tu máquina local y conectada a tu propio servicio de Firebase.

---

## Cómo Conectar el Proyecto a tu Repositorio de GitHub

### 1. ¿Cómo saber si ya está conectado?

En la terminal de VSC, ejecuta el siguiente comando:

```bash
git remote -v
```
*   Si ves URLs que apuntan a GitHub, el proyecto ya está conectado.
*   Si no devuelve nada, sigue los pasos a continuación.

### 2. Pasos para conectar a un nuevo repositorio

1.  **Crear un Repositorio en GitHub**: Ve a [GitHub](https://github.com/new) y crea un nuevo repositorio. No lo inicialices con un archivo `README` o `.gitignore`. Copia la URL del nuevo repositorio.

2.  **Inicializar Git Localmente (si no lo está)**:
    ```bash
    git init
    ```

3.  **Conectar tu Repositorio Local al Remoto**:
    ```bash
    git remote add origin TU_URL_DE_GITHUB
    ```
    (Reemplaza `TU_URL_DE_GITHUB` con la URL que copiaste).

4.  **Subir tu Código**:
    ```bash
    # Añadir todos los archivos
    git add .
    
    # Crear el primer commit
    git commit -m "Commit inicial del proyecto OrderFlow"
    
    # Especificar la rama principal (usualmente 'main')
    git branch -M main
    
    # Subir el código a GitHub
    git push -u origin main
    ```

Ahora tu proyecto estará seguro y versionado en tu propia cuenta de GitHub.
