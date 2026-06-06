# AUTH.md — Configuración de Login Social

Este documento describe los pasos para obtener y configurar las credenciales necesarias para activar
Google Sign-In y Apple ID en la app ParkControl.

---

## 1. Google Sign-In

### Qué se necesita
- `webClientId` (OAuth Web Client ID de Google Cloud Console)
- `google-services.json` (para Android)
- `GoogleService-Info.plist` (para iOS)

### Paso a paso

#### 1.1 Crear proyecto en Google Cloud Console
1. Ir a https://console.cloud.google.com
2. Crear un nuevo proyecto llamado `ParkControl`
3. Habilitar la API **Google Sign-In** (también llamada "Google People API" o "Google Identity")

#### 1.2 Crear credenciales OAuth
1. En el menú ir a **APIs y servicios → Credenciales**
2. Clic en **+ Crear credenciales → ID de cliente OAuth**

**Para Web (necesario para el webClientId):**
- Tipo: Aplicación web
- Nombre: ParkControl Web
- URI de redirección autorizados: `https://parkcontrol.stdin.cl/auth/google/callback`
- Guarda el **Client ID** → este es el `GOOGLE_WEB_CLIENT_ID`

**Para Android:**
- Tipo: Android
- Nombre: ParkControl Android
- Nombre del paquete: `com.parkcontrolapp`
- SHA-1 (debug):
  ```
  cd park-control-app/android
  keytool -list -v -keystore app/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep SHA1
  ```
- SHA-1 (release): usar el keystore de producción cuando exista

**Para iOS:**
- Tipo: iOS
- Bundle ID: `com.parkcontrolapp` (o el que tengas configurado en Xcode)

#### 1.3 Descargar archivos de configuración
- **Android**: descargar `google-services.json` y reemplazar `android/app/google-services.json`
- **iOS**: descargar `GoogleService-Info.plist` y colocarlo en `ios/ParkControlApp/`

#### 1.4 Agregar el plugin Google Services a Android
En `android/build.gradle` dentro de `buildscript > dependencies`:
```groovy
classpath 'com.google.gms:google-services:4.4.2'
```
En `android/app/build.gradle` al final del archivo:
```groovy
apply plugin: 'com.google.gms.google-services'
```

#### 1.5 Configurar el webClientId en la app
En `App.tsx`, reemplazar la línea:
```ts
const GOOGLE_WEB_CLIENT_ID = 'PLACEHOLDER_WEB_CLIENT_ID.apps.googleusercontent.com';
```
Por el Client ID obtenido en el paso 1.2 (credencial de tipo Web).

#### 1.6 Configurar la API Laravel
En `.env` de `park-control-api`:
```env
GOOGLE_CLIENT_ID=tu-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
```

---

## 2. Apple Sign-In (iOS nativo)

### Qué se necesita
- Apple Developer Account (pago, USD 99/año)
- App ID con capacidad "Sign In with Apple" habilitada
- (Para Android) Services ID + Private Key + Team ID

### Paso a paso iOS

#### 2.1 Habilitar capability en el App ID
1. Ir a https://developer.apple.com → Certificates, Identifiers & Profiles
2. En **Identifiers**, buscar el App ID de ParkControl (o crear uno nuevo)
3. Habilitar la capability: **Sign In with Apple**
4. Guardar

#### 2.2 Habilitar en Xcode
1. Abrir `park-control-app/ios/ParkControlApp.xcworkspace` en Xcode
2. Seleccionar el target `ParkControlApp`
3. Ir a la pestaña **Signing & Capabilities**
4. Clic en **+ Capability** y agregar **Sign In with Apple**
5. Esto agrega automáticamente el entitlement necesario

#### 2.3 Sin configuración adicional
Apple Sign-In en iOS es nativo y no requiere ningún client ID ni secreto en el código.
El token que devuelve Apple (`identityToken`) se valida en la API contra los JWKs de Apple.

---

## 3. Apple Sign-In (Android — OAuth web flow)

### Qué se necesita
- Todo lo del paso 2 (Apple Developer Account + App ID)
- Un **Services ID** (identificador para OAuth)
- Un dominio HTTPS registrado para el callback
- Una **Private Key** de Apple

### Paso a paso Android

#### 3.1 Crear un Services ID
1. En https://developer.apple.com → Identifiers → Clic en **+**
2. Seleccionar **Services IDs** y continuar
3. Descripción: `ParkControl Android Sign In`
4. Identifier: `cl.stdin.parkcontrol.signin`
5. Habilitar **Sign In with Apple** y configurar:
   - Primary App ID: seleccionar el App ID de ParkControl iOS
   - Domains: `parkcontrol.stdin.cl`
   - Return URLs: `https://parkcontrol.stdin.cl/auth/apple/callback`
6. Guardar

#### 3.2 Crear una Private Key
1. En **Keys** → Clic en **+**
2. Nombre: `ParkControl Sign In Key`
3. Habilitar **Sign In with Apple** → Configure → seleccionar el App ID primario
4. Registrar y descargar el archivo `.p8` (solo se puede descargar UNA vez)
5. Anotar el **Key ID**

#### 3.3 Datos necesarios
| Variable        | Descripción                          | Ejemplo                           |
|-----------------|--------------------------------------|-----------------------------------|
| `APPLE_TEAM_ID` | Tu Team ID en Apple Developer        | `ABC123DEF4`                      |
| `APPLE_KEY_ID`  | ID de la Private Key creada          | `ABCD123456`                      |
| `APPLE_KEY`     | Contenido del archivo `.p8`          | `-----BEGIN PRIVATE KEY-----...`  |
| `APPLE_SERVICE_ID` | Services ID creado               | `cl.stdin.parkcontrol.signin`     |
| `APPLE_REDIRECT_URI` | URL de callback registrada     | `https://parkcontrol.stdin.cl/auth/apple/callback` |

#### 3.4 Implementar el callback en la API
El redirect de Apple envía el token a `APPLE_REDIRECT_URI`. El servidor debe:
1. Recibir el POST de Apple con `code` e `id_token`
2. Validar el `id_token` contra las Apple JWKs
3. Si es válido, emitir un JWT propio y redirigir a la app via deep link

Para el flujo Android en la app, el paquete `@invertase/react-native-apple-authentication`
abre un WebView, el usuario autentica con Apple, y Apple hace POST al redirect URI. El servidor
redirige a la app con un deep link del tipo `parkcontrol://auth/apple?token=xxx`.

#### 3.5 Configurar en la app
En `park-control-app/park-control/app/Login.tsx`, actualizar:
```ts
const APPLE_SERVICE_ID = 'cl.stdin.parkcontrol.signin';
const APPLE_REDIRECT_URI = 'https://parkcontrol.stdin.cl/auth/apple/callback';
```
(Ya están configurados con estos valores)

#### 3.6 Configurar en la API
En `.env` de `park-control-api`:
```env
APPLE_TEAM_ID=ABC123DEF4
APPLE_KEY_ID=ABCD123456
APPLE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----"
APPLE_SERVICE_ID=cl.stdin.parkcontrol.signin
APPLE_REDIRECT_URI=https://parkcontrol.stdin.cl/auth/apple/callback
```

---

## 4. Validación Apple JWT en la API (producción)

Reemplazar el método `verifyAppleToken` en `AuthController.php` por validación real:
```php
// Instalar: composer require web-token/jwt-framework
use Jose\Component\Core\JWKSet;
use Jose\Component\Signature\JWSVerifier;

private function verifyAppleToken(string $token): ?array
{
    try {
        // 1. Obtener las claves públicas de Apple
        $jwks = Http::get('https://appleid.apple.com/auth/keys')->json();
        // 2. Verificar firma del JWT contra las JWKs
        // 3. Validar iss = "https://appleid.apple.com", aud = App Bundle ID o Services ID, exp > now()
        // 4. Retornar payload si es válido
    } catch (\Exception $e) {
        return null;
    }
}
```

---

## 5. Resumen de credenciales para .env

### `park-control-api/.env`
```env
# Google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Apple
APPLE_TEAM_ID=ABC123DEF4
APPLE_KEY_ID=ABCD123456
APPLE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_SERVICE_ID=cl.stdin.parkcontrol.signin
APPLE_REDIRECT_URI=https://parkcontrol.stdin.cl/auth/apple/callback
```

### `park-control-app/App.tsx`
```ts
const GOOGLE_WEB_CLIENT_ID = 'tu-web-client-id.apps.googleusercontent.com';
```

### Archivos a colocar
- `park-control-app/android/app/google-services.json` — descargar de Google Cloud Console
- `park-control-app/ios/ParkControlApp/GoogleService-Info.plist` — descargar de Google Cloud Console
- La Private Key de Apple **no se sube al repositorio**, se agrega al `.env`

---

## 6. Notas de seguridad
- **Nunca subir** `google-services.json`, `GoogleService-Info.plist` ni archivos `.p8` al repositorio
- Agregar todos estos archivos a `.gitignore`
- El `APPLE_KEY` debe estar en el `.env` del servidor, nunca en la app
- El `GOOGLE_CLIENT_SECRET` es solo del servidor, el `webClientId` sí va en la app
