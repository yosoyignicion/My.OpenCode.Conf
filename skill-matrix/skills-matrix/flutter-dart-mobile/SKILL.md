---
name: flutter-dart-mobile
description: "Flutter es un framework de UI multiplataforma de Google que compila a código nativo (ARM para iOS/Android, JavaScript para web, y código de escritorio)"
---
# Flutter & Dart Mobile

## Semantic Triggers
```
Flutter Material Design 3 cross-platform mobile, Dart 3 records pattern matching sealed classes, Riverpod state management FutureProvider StreamProvider, GoRouter navigation ShellRoute, Flutter animations Implicit explicit AnimationController, Platform channels method channel Flutter native
```

---

## 1. Definición Teórica

Flutter es un framework de UI multiplataforma de Google que compila a código nativo (ARM para iOS/Android, JavaScript para web, y código de escritorio). A diferencia de React Native (que usa un puente JavaScript ↔ nativo), Flutter usa su propio motor de renderizado (Impeller/Skia) pintando cada píxel, lo que elimina el overhead del puente y permite 60/120 fps consistentes. El lenguaje Dart 3 ofrece records, pattern matching con sealed classes, y extension types. Material Design 3 (M3) con `useMaterial3: true` proporciona un sistema de diseño adaptativo con color dinámico y temas. Riverpod es el estándar recomendado para manejo de estado, con GoRouter para navegación declarativa.

---

## 2. Implementación de Referencia

Flutter 3.32+, Dart 3.7+. Material Design 3 habilitado. Riverpod para estado, GoRouter para navegación, Freezed para modelos inmutables, y `json_serializable` para serialización.

### Ejemplo Práctico Avanzado

```dart
// Material Design 3 App
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(ProviderScope(child: const MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Flutter M3',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.indigo,
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.indigo,
        brightness: Brightness.dark,
      ),
      routerConfig: router,
    );
  }
}

// GoRouter with ShellRoute for persistent navigation shell
final router = GoRouter(
  initialLocation: '/',
  routes: [
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/profile/:id',
          builder: (context, state) => ProfileScreen(
            id: state.pathParameters['id']!,
          ),
        ),
      ],
    ),
  ],
);

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

// Riverpod state
final counterProvider = StateProvider<int>((ref) => 0);

final dataProvider = FutureProvider<List<Item>>((ref) async {
  final response = await http.get(Uri.parse('https://api.example.com/items'));
  if (response.statusCode != 200) throw Exception('Failed to load');
  return Item.fromJsonList(response.body);
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final counter = ref.watch(counterProvider);
    final data = ref.watch(dataProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: data.when(
        data: (items) => ListView.builder(
          itemCount: items.length,
          itemBuilder: (context, index) => ListTile(
            title: Text(items[index].name),
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => ref.read(counterProvider.notifier).state++,
        child: const Icon(Icons.add),
      ),
    );
  }
}

// Dart 3 — sealed classes + pattern matching
sealed class Result<T> {}
class Success<T> extends Result<T> {
  final T value;
  Success(this.value);
}
class Failure<T> extends Result<T> {
  final String message;
  Failure(this.message);
}

String handleResult(Result<int> result) => switch (result) {
  Success(value: let v) => 'Got $v',
  Failure(message: let m) => 'Error: $m',
};
```

**Fuente oficial:** https://docs.flutter.dev/

### Alternativa de Implementación Específica

**Kotlin Multiplatform Mobile (KMM)** para compartir lógica de negocio entre Android (Kotlin) e iOS (Swift) sin compartir UI. KMM comparte la capa de datos, red y lógica, mientras la UI es nativa en cada plataforma. Ideal para equipos con experiencia nativa existente.

```kotlin
// Shared module — Kotlin
class PostRepository(private val api: ApiClient) {
    suspend fun getPosts(): List<Post> {
        return api.fetch("/posts").body()
    }
}

// iOS consume desde Swift
class PostService {
    private let repository = PostRepository(api: ApiClient())
    func getPosts() async throws -> [Post] {
        return try await repository.getPosts()
    }
}
```

**Fuente oficial:** https://kotlinlang.org/docs/multiplatform-mobile.html

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Apps multiplataforma con UI altamente personalizada (animaciones complejas, gráficos); MVPs que necesitan iOS + Android rápido |
| **Cuándo evitar** | Apps que necesitan muchas integraciones nativas no cubiertas por plugins; equipos sin experiencia en Dart; apps que requieren renderizado web (rendimiento web limitado) |
| **Alternativas** | React Native (ecosistema JS, Hot Reload, compartir código con web); Kotlin Multiplatform (lógica compartida, UI nativa); SwiftUI + Jetpack Compose (nativo puro, mejor performance) |
| **Coste/Complejidad** | Medio — Dart es fácil de aprender. El ecosistema de plugins cubre el 90% de necesidades. El tamaño de APK (~15 MB mínimo) puede ser problema. El renderizado web tiene soporte limitado |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: "PlatformException" al invocar método de plugin

**¿Qué ocasionó el error?**
El método channel no está registrado en el lado nativo, o el nombre del método no coincide entre Dart y plataforma.

**¿Cómo se solucionó?**
Verificar el registro del método channel en el lado nativo y el nombre exacto:

```dart
// Dart
const platform = MethodChannel('com.example/channel');
final result = await platform.invokeMethod('getDeviceInfo');
```

```kotlin
// Android — MainActivity.kt
override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
    super.configureFlutterEngine(flutterEngine)
    MethodChannel(flutterEngine.dartExecutor, "com.example/channel").setMethodCallHandler { call, result ->
        if (call.method == "getDeviceInfo") {
            result.success(mapOf("model" to Build.MODEL))
        } else {
            result.notImplemented()
        }
    }
}
```

**¿Por qué funciona esta técnica?**
Flutter se comunica con la plataforma nativa a través de un bus de mensajes binario. Si el nombre del canal o el método no coincide exactamente, la plataforma no puede enrutar la llamada.

### Caso: Scroll performance pobre con listas largas

**¿Qué ocasionó el error?**
Usar `Column` + `ListView.builder` anidados sin `shrinkWrap` o con widgets complejos dentro de celdas que no se cachean.

**¿Cómo se solucionó?**
Usar `ListView.builder` con itemExtent para altura fija, evitar wrap en columnas innecesarias:

```dart
ListView.builder(
  itemCount: items.length,
  itemExtent: 80, // altura fija — cachea offsets
  addAutomaticKeepAlives: true,
  cacheExtent: 500, // píxeles extra de cache
  itemBuilder: (context, index) => ItemCard(item: items[index]),
)
```

**¿Por qué funciona esta técnica?**
`itemExtent` permite a Flutter calcular el scroll offset sin renderizar cada item, mejorando el rendimiento. `cacheExtent` mantiene widgets extra fuera de pantalla para evitar rebuilds en scroll rápido.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "flutter", "dart", "mobile", "cross-platform", "riverpod", "gorouter" en la consulta
- **Prioridad de carga:** Media — Flutter es relevante pero no universal como React Native
- **Dependencias:** Ninguna directa

### Tool Integration

```json
{
  "tool_name": "flutter-dart-mobile",
  "description": "Guía de Flutter/Dart: Material Design 3, Riverpod, GoRouter, Dart 3 sealed classes, platform channels",
  "triggers": ["flutter", "dart", "mobile", "riverpod", "gorouter", "cross-platform"],
  "context_hint": "Inyectar sección 2 (Implementación) para ejemplos de app M3 con Riverpod y GoRouter. FAQ para platform channels y performance.",
  "output_format": "markdown",
  "max_tokens": 2900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre desarrollo móvil con Flutter, carga el skill flutter-dart-mobile.
Usa Riverpod para estado, GoRouter con ShellRoute para navegación,
y Material Design 3 con useMaterial3: true.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear proyecto
flutter create my_app --org com.example --platforms ios,android,web

# Ejecutar
flutter run
flutter run -d chrome     # web
flutter run -d ios        # iOS simulator

# Build
flutter build apk --split-per-abi
flutter build ios --release
flutter build web

# Testing
flutter test
flutter test --coverage

# Análisis
flutter analyze
dart format .
dart fix --apply

# Code generation
dart run build_runner build --delete-conflicting-outputs
```

### GUI / Web

- **Flutter DevTools:** Suite de debugging en browser: inspector de widget tree, timeline de rendimiento, memory profiler, network tab
- **Dart DevTools:** Analizador de memoria, CPU profiler, log view
- **Hot Reload:** `r` en terminal o guardar archivo → cambios reflejados en <1s sin perder estado
- **Hot Restart:** `R` en terminal → reset completo del estado
- **Android Studio / VS Code:** Extensión Flutter con widget inspector, layout explorer, emulator integration

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Hot Reload | `r` en terminal | `Cmd+\` (VS Code) / `Ctrl+\` |
| Hot Restart | `R` en terminal | `Shift+Cmd+\` / `Shift+Ctrl+\` |
| Abrir DevTools | `flutter devtools` | VS Code → `Ctrl+Shift+P` → "Flutter: Open DevTools" |
| Widget inspector | — | DevTools → Flutter Inspector tab |

---

## 7. Cheatsheet Rápido

```dart
// StatelessWidget
class MyWidget extends StatelessWidget {
  const MyWidget({super.key});
  @override Widget build(BuildContext context) => const Text('Hello');
}

// StatefulWidget
class Counter extends StatefulWidget {
  const Counter({super.key});
  @override State<Counter> createState() => _CounterState();
}
class _CounterState extends State<Counter> {
  int count = 0;
  @override Widget build(BuildContext context) => ElevatedButton(
    onPressed: () => setState(() => count++),
    child: Text('$count'),
  );
}

// Riverpod
final provider = StateProvider<int>((ref) => 0);
// En widget: ref.watch(provider), ref.read(provider.notifier).state++

// GoRouter
final router = GoRouter(routes: [GoRoute(path: '/', builder: (_, __) => const Home())]);
// MaterialApp.router(routerConfig: router)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-09-react-native-mobile` | Alternativa | No |
| `07-12-rest-api-integration-client` | Complementario | Sí |
| `07-04-typescript-type-system` | Independiente | No |
| `07-06-a11y-accessibility-wcag` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: flutter-dart-mobile
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/flutter
tags: [flutter, dart, mobile, cross-platform, material-design, riverpod, gorouter]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
