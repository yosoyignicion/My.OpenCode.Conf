---
name: react-native-mobile
description: "React Native permite construir aplicaciones móviles nativas para iOS y Android usando React y JavaScript/TypeScript"
---
# React Native Mobile

## Semantic Triggers
```
React Native Expo Router FlatList FlashList, Reanimated 4 animations Gesture Handler, React Navigation native stack bottom tabs, MMKV fast storage Hermes engine, TanStack Query React Native caching, React Hook Form Zod validation mobile forms
```

---

## 1. Definición Teórica

React Native permite construir aplicaciones móviles nativas para iOS y Android usando React y JavaScript/TypeScript. A diferencia de Flutter (que pinta todo con Skia), React Native utiliza un puente JavaScript ↔ nativo para comunicarse con componentes nativos reales (UIView en iOS, View en Android). Expo es el framework recomendado que abstrae la configuración nativa y proporciona EAS Build para CI/CD. Hermes es el motor de JavaScript optimizado para móvil (por defecto desde RN 0.74) que reduce el tiempo de inicio y el uso de memoria. FlashList (de Shopify) reemplaza a FlatList para listas de >50 ítems con rendimiento optimizado. Reanimated 4 ejecuta animaciones en el hilo UI (no en el JS thread), garantizando 60 fps incluso durante operaciones pesadas.

---

## 2. Implementación de Referencia

Expo SDK 52+ con Expo Router para navegación basada en archivos. FlashList para listas grandes, Reanimated 4 + Gesture Handler para animaciones, Zustand para estado global, TanStack Query para datos de servidor, MMKV para almacenamiento local ultrarrápido.

### Ejemplo Práctico Avanzado

```typescript
import { View, Text, StyleSheet, FlatList, TextInput, Button } from "react-native"
import { FlashList } from "@shopify/flash-list"
import Animated, { FadeInDown, Layout } from "react-native-reanimated"
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import FastImage from "react-native-fast-image"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

// Navigation types
type RootStackParamList = {
  Home: undefined
  Profile: { userId: string }
  Settings: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

// FlashList optimizado para >50 items
function PostList({ posts }: { posts: Post[] }) {
  return (
    <FlashList
      data={posts}
      keyExtractor={(item) => item.id}
      estimatedItemSize={120}
      renderItem={({ item }) => (
        <Animated.View entering={FadeInDown.duration(300)} layout={Layout.springify()}>
          <Swipeable
            renderRightActions={() => (
              <View style={styles.deleteAction}>
                <Text style={styles.deleteText}>Delete</Text>
              </View>
            )}
          >
            <View style={styles.card}>
              <FastImage
                source={{
                  uri: item.imageUrl,
                  priority: FastImage.priority.high,
                  cache: FastImage.cacheControl.immutable,
                }}
                style={styles.image}
              />
              <Text style={styles.title}>{item.title}</Text>
            </View>
          </Swipeable>
        </Animated.View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No posts yet</Text>}
    />
  )
}

// TanStack Query
function PostsScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetch("https://api.example.com/posts").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (newPost: { title: string }) =>
      fetch("https://api.example.com/posts", {
        method: "POST",
        body: JSON.stringify(newPost),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  })

  if (isLoading) return <ActivityIndicator />
  if (error) return <Text>Error: {error.message}</Text>
  return <PostList posts={data} />
}

// React Hook Form + Zod
const formSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  name: z.string().min(2, "Min 2 characters"),
})

type FormData = z.infer<typeof formSchema>

function RegisterForm() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = (data: FormData) => {
    fetch("/api/register", { method: "POST", body: JSON.stringify(data) })
  }

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
          </>
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
          </>
        )}
      />
      <Button title="Register" onPress={handleSubmit(onSubmit)} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", padding: 16, borderRadius: 12, backgroundColor: "#fff", marginVertical: 4 },
  image: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  title: { fontSize: 16, fontWeight: "600", flex: 1 },
  deleteAction: { backgroundColor: "red", justifyContent: "center", paddingHorizontal: 20 },
  deleteText: { color: "white", fontWeight: "bold" },
  empty: { textAlign: "center", marginTop: 40, fontSize: 16, color: "#666" },
  form: { padding: 16, gap: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: "red", fontSize: 12 },
})
```

**Fuente oficial:** https://reactnative.dev/docs/getting-started

### Alternativa de Implementación Específica

**SwiftUI + Jetpack Compose** para equipos que quieren rendimiento nativo máximo y acceso completo a las APIs de plataforma. No hay código compartido, pero cada plataforma ofrece la mejor experiencia posible.

```swift
// SwiftUI
struct PostView: View {
    let post: Post
    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: post.imageUrl)) { phase in
                phase.image?.resizable() ?? Color.gray
            }
            .frame(width: 60, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            Text(post.title).font(.headline)
        }
        .padding()
    }
}
```

```kotlin
// Jetpack Compose
@Composable
fun PostCard(post: Post) {
    Row(modifier = Modifier.padding(16.dp)) {
        AsyncImage(model = post.imageUrl, contentDescription = null,
            modifier = Modifier.size(60.dp).clip(RoundedCornerShape(8.dp)))
        Spacer(modifier = Modifier.width(12.dp))
        Text(text = post.title, style = MaterialTheme.typography.titleMedium)
    }
}
```

**Fuente oficial:** https://developer.apple.com/swiftui/ | https://developer.android.com/compose

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cross-platform mobile con equipo JavaScript existente; apps que necesitan compartir código con web React |
| **Cuándo evitar** | Apps con animaciones muy complejas (60fps sostenido); apps que necesitan rendimiento gráfico extremo (juegos); equipos dispuestos a mantener código nativo separado |
| **Alternativas** | Flutter (mejor performance, peor integración con ecosistema JS); Kotlin Multiplatform (lógica compartida, UI nativa); SwiftUI + Compose (mejor rendimiento, doble código) |
| **Coste/Complejidad** | Medio — el puente JS ↔ nativo introduce latencia (mitigado por Hermes y JSI). La configuración nativa (Xcode, Android Studio) es compleja pero Expo la abstrae. Las actualizaciones de versión pueden requerir cambios en módulos nativos |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: "Unable to resolve module" con módulos nativos en Expo

**¿Qué ocasionó el error?**
Usar un módulo nativo que no está incluido en el SDK de Expo, o no está configurado correctamente en `app.json`.

**¿Cómo se solucionó?**
Usar `expo-dev-client` para proyectos con módulos nativos personalizados:

```bash
# Crear proyecto con dev-client
npx create-expo-app my-app --template blank-typescript
npx expo install expo-dev-client

# Configurar plugin en app.json
{
  "expo": {
    "plugins": [
      ["expo-camera", { "cameraPermission": "Allow access" }]
    ]
  }
}

# Compilar dev-client
npx expo run:ios
npx expo run:android
```

**¿Por qué funciona esta técnica?**
Expo SDK incluye un conjunto predefinido de módulos nativos. Para módulos nativos personalizados o no incluidos, `expo-dev-client` permite ejecutar un build nativo local con los módulos adicionales configurados.

### Caso: ListView con scroll lento y frames perdidos

**¿Qué ocasionó el error?**
Usar `FlatList` sin optimizaciones, o renderizar componentes pesados en cada item.

**¿Cómo se solucionó?**
Migrar a `FlashList` y optimizar items:

```typescript
import { FlashList } from "@shopify/flash-list"

;<FlashList
  data={items}
  estimatedItemSize={120}
  renderItem={({ item }) => <MemoizedItem item={item} />}
  keyExtractor={i => i.id}
  getItemType={(item) => item.type} // tipos diferentes = layouts diferentes
/>
```

**¿Por qué funciona esta técnica?**
FlashList recicla vistas (como RecyclerView en Android), estima tamaños para cálculos de layout sin renderizar, y evita work en items fuera de pantalla. `React.memo` en cada item previene re-renders innecesarios.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "react native", "mobile", "expo", "flashlist", "reanimated" en la consulta
- **Prioridad de carga:** Alta — React Native es el framework cross-platform móvil más usado
- **Dependencias:** `07-01-react-ui-development`, `07-04-typescript-type-system`, `07-05-state-management-frontend`

### Tool Integration

```json
{
  "tool_name": "react-native-mobile",
  "description": "Guía de React Native: Expo, FlashList, Reanimated, Gesture Handler, TanStack Query, navegación",
  "triggers": ["react native", "expo", "mobile", "flashlist", "reanimated", "react-navigation"],
  "context_hint": "Inyectar sección 2 (Implementación) para ejemplos de navegación, listas y formularios. FAQ para rendimiento y módulos nativos.",
  "output_format": "markdown",
  "max_tokens": 2900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre desarrollo móvil con React Native, carga el skill react-native-mobile.
Expo es la opción por defecto. FlashList para listas >50 items.
Reanimated 4 para animaciones. TanStack Query para datos de servidor.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear proyecto Expo
npx create-expo-app@latest my-app

# Desarrollo
npx expo start                  # Inicia dev server + QR
npx expo start --ios            # Abre simulador iOS
npx expo start --android        # Abre emulador Android

# Build
npx expo build:ios              # EAS Build
npx expo build:android
npx eas build --platform all --profile production

# Testing
npx expo test                   # Jest
npx detox test                  # E2E

# Hermes profiler (rendimiento)
npx react-native profile-hermes
```

### GUI / Web

- **Expo Go:** App en iOS/Android para escanear QR y correr el proyecto sin compilar nativo
- **React Native DevTools:** Chrome DevTools para debugging JS, network, console. Se abre automáticamente con `d` en terminal
- **Flipper (Facebook):** Debugger nativo para React Native: inspeccionar store, CRUD de base de datos, network inspector, layout inspector
- **React Native Debugger:** App standalone que combina Redux DevTools + React DevTools + Inspector
- **Expo Orbit:** Desktop app para gestionar builds y simuladores

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Recargar JS | `r` en terminal | `Cmd+R` (iOS sim) / `R+R` (Android) |
| Abrir dev menu | `m` en terminal | `Cmd+D` (iOS sim) / `Cmd+M` (Android) |
| Toggle inspector | `d` en terminal | Dev Menu → Toggle Inspector |
| Abrir perf monitor | `p` en terminal | Dev Menu → Show Perf Monitor |

---

## 7. Cheatsheet Rápido

```typescript
// Expo Router (file-based routing)
// app/index.tsx → /
// app/profile/[id].tsx → /profile/:id
export default function Home() {
  const router = useRouter()
  return <Button title="Go" onPress={() => router.push("/profile/1")} />
}

// FlashList
;<FlashList data={items} estimatedItemSize={120} renderItem={renderItem} />

// Animated entry
;<Animated.View entering={FadeInDown.duration(300)} layout={Layout.springify()} />

// TanStack Query
const { data, isLoading } = useQuery({ queryKey: ["key"], queryFn: fetchData })
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-01-react-ui-development` | Dependiente | Sí |
| `07-04-typescript-type-system` | Complementario | Sí |
| `07-05-state-management-frontend` | Complementario | Sí |
| `07-08-flutter-dart-mobile` | Alternativa | No |

---

## 9. Metadatos del Skill

```yaml
---
id: react-native-mobile
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/react-native
tags: [react-native, expo, mobile, ios, android, typescript, frontend]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
