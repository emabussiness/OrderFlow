# OrderFlow ERP

Este es un proyecto ERP (Enterprise Resource Planning) construido con Next.js y Firebase, enfocado inicialmente en la gestión de compras.

## Stack Tecnológico

*   **Framework**: Next.js (App Router)
*   **Lenguaje**: TypeScript
*   **UI**: React, ShadCN/UI, Tailwind CSS
*   **Base de Datos**: Firebase (Firestore)
*   **Funcionalidad IA**: Genkit (Google AI)
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

Para que la aplicación se conecte a Firebase y a los servicios de IA de Google, necesitas configurar tus credenciales.

1.  Crea un nuevo archivo en la raíz del proyecto llamado `.env.local`.
2.  Copia el contenido de tu objeto de configuración de Firebase (lo puedes encontrar en la configuración de tu proyecto en la consola de Firebase) y tus credenciales de Google AI en este archivo, con el siguiente formato:

    ```env
    # Credenciales de Google AI para Genkit
    # Puedes obtener tu clave desde Google AI Studio: https://aistudio.google.com/app/apikey
    GEMINI_API_KEY="AIzaSy...tu...api...key..."

    # Estas son las credenciales de configuración de tu app web de Firebase
    # Las puedes encontrar en la Consola de Firebase > Configuración del Proyecto > Tus Apps
    NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy...firebase...key..."
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="tu-proyecto"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="tu-proyecto.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
    NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef123456"
    ```

    **Importante**: Para que la aplicación funcione correctamente, he actualizado el archivo `src/lib/firebase/firebase.ts` para que lea estas variables de entorno en lugar de tener los valores codificados.

### 4. Ejecutar la Aplicación

El proyecto necesita dos servidores corriendo simultáneamente:

*   El servidor de desarrollo de **Next.js** para la interfaz de usuario.
*   El servidor de **Genkit** para las funciones de IA.

Abre **dos terminales** en Visual Studio Code:

*   **En la Terminal 1**, inicia el servidor de Next.js:
    ```bash
    npm run dev
    ```
    Esto levantará la aplicación, generalmente en `http://localhost:9002`.

*   **En la Terminal 2**, inicia el servidor de Genkit:
    ```bash
    npm run genkit:watch
    ```
    Esto iniciará el servidor de IA y lo mantendrá observando cambios en los archivos de flujos.

¡Y listo! Con estos pasos, tendrás la aplicación corriendo en tu máquina local y conectada a tus propios servicios de Firebase y Google AI.
