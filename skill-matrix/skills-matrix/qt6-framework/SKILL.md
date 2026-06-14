---
name: qt6-framework
description: "Qt6 resuelve el desarrollo de interfaces gráficas multiplataforma (desktop, embedded, mobile) con un framework integral que incluye desde widgets clásicos hasta UI declarativa con QML"
---
# Qt6 Framework — Cross-Platform UI

## Semantic Triggers
```
Qt6 CMake AUTOMOC AUTORCC AUTOUIC, QWidgets desktop application layout, QML QtQuick declarative UI components, signals and slots compile-time connect, QSS Qt Style Sheets theming, C++ QML bridge setContextProperty
```

---

## 1. Definición Teórica

Qt6 resuelve el desarrollo de interfaces gráficas multiplataforma (desktop, embedded, mobile) con un framework integral que incluye desde widgets clásicos hasta UI declarativa con QML. El principio fundamental es el modelo de señal-slots (signal-slot): los objetos QObject emiten señales cuando ocurre un evento, y las slots (funciones miembro) conectadas reciben la notificación, con seguridad de tipos en las conexiones functor-based (compile-time checked). Arquitectónicamente, Qt6 se divide en módulos (Core, Gui, Widgets, Quick, Network, Sql, Charts, Multimedia) y proporciona CMake integración con AUTOMOC (Meta-Object Compiler), AUTORCC (Resource Compiler) y AUTOUIC (UI Compiler). QML/QtQuick ofrece UI declarativa con animaciones fluidas y vinculación de datos, mientras QWidgets proporciona widgets clásicos para aplicaciones de escritorio con muchos datos.

---

## 2. Implementación de Referencia

Qt ≥6.8 LTS. CMake ≥3.31 con `CMAKE_AUTOMOC ON`. Idiomas: C++17/20 (backend), QML (frontend declarativo).

### Ejemplo Práctico Avanzado

```cmake
# CMakeLists.txt — Qt6 moderno
cmake_minimum_required(VERSION 3.31)
project(MyQtApp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_AUTOMOC ON)    # Meta-Object Compiler
set(CMAKE_AUTORCC ON)    # Resource Compiler
set(CMAKE_AUTOUIC ON)    # UI Compiler

find_package(Qt6 REQUIRED COMPONENTS
    Core Gui Widgets Quick QuickControls2 Network Sql)

# QML module
qt_add_executable(myapp
    main.cpp
    mainwindow.cpp mainwindow.h
    backend.cpp backend.h
    resources.qrc
)

target_link_libraries(myapp PRIVATE
    Qt6::Core Qt6::Gui Qt6::Widgets
    Qt6::Quick Qt6::QuickControls2
    Qt6::Network Qt6::Sql
)
```

```cpp
// backend.h — C++ ↔ QML bridge
#pragma once
#include <QObject>
#include <QString>
#include <QTimer>

class Backend : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString message READ message NOTIFY messageChanged)
    Q_PROPERTY(int counter READ counter WRITE setCounter NOTIFY counterChanged)

public:
    explicit Backend(QObject *parent = nullptr)
        : QObject(parent), m_counter(0) {
        auto *timer = new QTimer(this);
        connect(timer, &QTimer::timeout, this, [this]() {
            setCounter(m_counter + 1);
            setMessage(QString("Count: %1").arg(m_counter));
        });
        timer->start(1000);
    }

    QString message() const { return m_message; }
    int counter() const { return m_counter; }

    void setCounter(int c) {
        if (m_counter != c) {
            m_counter = c;
            emit counterChanged();
        }
    }

    Q_INVOKABLE void processText(const QString& text) {
        setMessage(text.toUpper());
    }

signals:
    void messageChanged();
    void counterChanged();

private:
    QString m_message = "Ready";
    int m_counter;
};
```

```qml
// main.qml — UI declarativa con QtQuick
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ApplicationWindow {
    visible: true
    width: 800
    height: 600
    title: "Qt6 QML App"

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 20

        Label {
            text: backend.message  // binding a Q_PROPERTY
            font.pixelSize: 24
            color: "#333"
        }

        Button {
            text: "Process"
            onClicked: backend.processText(input.text)
        }

        TextField {
            id: input
            placeholderText: "Enter text..."
        }

        ProgressBar {
            value: backend.counter / 100.0
        }
    }
}
```

```cpp
// main.cpp
#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include "backend.h"

int main(int argc, char *argv[]) {
    QGuiApplication app(argc, argv);
    QQmlApplicationEngine engine;

    Backend backend;
    engine.rootContext()->setContextProperty("backend", &backend);

    engine.load("qrc:/main.qml");
    if (engine.rootObjects().isEmpty()) return -1;

    return app.exec();
}
```

**Fuente oficial:** https://doc.qt.io/qt-6/ — https://doc.qt.io/qt-6/cmake-integration.html

### Alternativa de Implementación Específica

**QWidgets (imperativo, para apps con muchos datos):**

```cpp
// mainwindow.cpp — QWidgets style
#include <QMainWindow>
#include <QPushButton>
#include <QTextEdit>
#include <QVBoxLayout>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QTableWidget>

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    MainWindow(QWidget *parent = nullptr) : QMainWindow(parent) {
        resize(1024, 768);

        auto *central = new QWidget(this);
        auto *layout = new QVBoxLayout(central);
        auto *table = new QTableWidget(0, 3, this);
        table->setHorizontalHeaderLabels({"ID", "Name", "Email"});

        auto *btn = new QPushButton("Load Data", this);
        connect(btn, &QPushButton::clicked, this, [this, table]() {
            QSqlQuery q("SELECT id, name, email FROM users");
            while (q.next()) {
                int row = table->rowCount();
                table->insertRow(row);
                table->setItem(row, 0, new QTableWidgetItem(q.value(0).toString()));
                table->setItem(row, 1, new QTableWidgetItem(q.value(1).toString()));
                table->setItem(row, 2, new QTableWidgetItem(q.value(2).toString()));
            }
        });

        layout->addWidget(table);
        layout->addWidget(btn);
        setCentralWidget(central);
    }
};
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aplicaciones de escritorio multiplataforma, tools CAD/CAM, software de música/audio, visualización de datos, dashboards embebidos, apps con requisitos de accesibilidad |
| **Cuándo evitar** | Aplicaciones web (usar HTML/React), apps mobile-first (Flutter/React Native mejor), prototipado rápido de UI simple (Python + Tkinter/Streamlit), sistemas sin Qt runtime (contenedores mínimos) |
| **Alternativas** | Flutter (UI moderna, rendimiento similar), Electron (web stack, más RAM), wxWidgets (nativo, menos features), Dear ImGui (tool/debug UI, sin producción) |
| **Coste/Complejidad** | Medio: Qt6 es extenso (módulos, tooling). CMake integration es sólida. QML requiere aprender JavaScript-like pero es productivo. La desventaja es el tamaño del framework (∼500MB SDK) y las licencias (GPL/LGPL/comercial) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: QML no encuentra la propiedad de C++ (undefined)

**¿Qué ocasionó el error?**
La propiedad `message` declarada con `Q_PROPERTY` no se registró correctamente porque faltaba `Q_INVOKABLE` o `Q_PROPERTY` no tenía `NOTIFY` signal. QML necesita la señal `NOTIFY` para saber cuándo actualizar el binding.

**¿Cómo se solucionó?**
Verificar que la macro `Q_PROPERTY` incluya `NOTIFY` y que el header tenga `Q_OBJECT`:

```cpp
// ✅ Correcto
class Backend : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString message READ message NOTIFY messageChanged)
public:
    QString message() const { return m_message; }
signals:
    void messageChanged();
private:
    QString m_message;
};
```

Si la propiedad es solo lectura para QML, `WRITE` no es necesario. El `NOTIFY` signal es obligatorio para que QML detecte cambios.

**¿Por qué funciona esta técnica?**
QML usa el meta-object system de Qt para acceder a propiedades. `Q_PROPERTY` expone la propiedad, y `NOTIFY` especifica qué señal se emite cuando la propiedad cambia. Sin `NOTIFY`, QML lee la propiedad una vez pero no se actualiza cuando cambia (binding roto).

### Caso: Functor-based connect no compila

**¿Qué ocasionó el error?**
El compilador no puede deducir los tipos de la sobrecarga. Por ejemplo, `QComboBox::currentIndexChanged` tiene dos sobrecargas (int y QString). `connect(combo, &QComboBox::currentIndexChanged, ...)` falla por ambigüedad.

**¿Cómo se solucionó?**
Usar `QOverload` para desambiguar:

```cpp
connect(combo, QOverload<int>::of(&QComboBox::currentIndexChanged),
        this, [](int index) {
    qDebug() << "Selected index:" << index;
});

// O usar static_cast (menos readable):
connect(combo, static_cast<void(QComboBox::*)(int)>(&QComboBox::currentIndexChanged),
        this, [](int i) { qDebug() << i; });
```

**¿Por qué funciona esta técnica?**
`QOverload<int>::of()` es una plantilla que genera el tipo de puntero a función correcto para la sobrecarga con `int`. Esto resuelve la ambigüedad y permite que el compilador verifique la conexión en tiempo de compilación (a diferencia del string-based connect).

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~200 tokens estimados al invocar este skill
- **Trigger de activación:** `Qt6 CMake AUTOMOC AUTORCC AUTOUIC`
- **Prioridad de carga:** Alta — Qt6 es framework UI multiplataforma principal para C++
- **Dependencias:** `26-modern-cpp-development` (CMake + toolchain), `32-cpp-graphics-rendering` (Qt6 + OpenGL/Vulkan)

### Tool Integration

```json
{
  "tool_name": "qt6-framework",
  "description": "Desarrollo de UI multiplataforma con Qt6: QWidgets, QML/QtQuick, CMake, signals/slots, QML bridge",
  "triggers": ["Qt6", "QML", "QtQuick", "QWidgets", "CMake AUTOMOC", "signals and slots", "Q_PROPERTY"],
  "context_hint": "Inyectar ejemplo de CMake + QML + C++ bridge con Q_PROPERTY y Q_INVOKABLE",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre UI multiplataforma con Qt6, carga el skill
qt6-framework. Proporciona ejemplos de CMakeLists.txt con AUTOMOC, QML ↔ C++ bridge
con Q_PROPERTY, y signals/slots compile-time connect.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Configurar y compilar
cmake -B build -G Ninja -DCMAKE_PREFIX_PATH=/path/to/Qt/6.8.0/gcc_64
cmake --build build

# Qt tools CLI
qmlscene main.qml  # preview rápido sin compilar
qtdiag              # diagnóstico de Qt
qmlformat -i main.qml  # formatear QML

# QML profiling
qmllint main.qml
```

### GUI / Web

- **Qt Creator**: IDE oficial con designer visual para QML y QWidgets
- **QML Profiler**: profiling de rendimiento de UI QML (frame rate, binding evaluations)
- **Qt Design Studio**: diseño de UI QML para diseñadores gráficos
- **GammaRay**: inspector Qt en tiempo real (property values, signal emissions)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Compilar | `cmake --build build` | `Ctrl+B (Qt Creator)` |
| Preview QML | `qmlscene main.qml` | `Qt Creator → Design mode` |
| Profiling | `qmllint main.qml` | `Qt Creator → QML Profiler` |

---

## 7. Cheatsheet Rápido

```cmake
# Qt6 CMake essentials — 10 líneas
set(CMAKE_AUTOMOC ON)
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Quick)
qt_add_executable(app main.cpp resources.qrc)
target_link_libraries(app PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets Qt6::Quick)

// QML bridge:
Q_PROPERTY(Type name READ name NOTIFY nameChanged)
Q_INVOKABLE void method();
engine.rootContext()->setContextProperty("obj", &obj);
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `26-modern-cpp-development` | dependiente — CMake + toolchain | Sí |
| `32-cpp-graphics-rendering` | complementario — Qt6 + OpenGL widget | Sí |
| `31-cpp-audio-development` | complementario — Qt6 Multimedia module | No |
| `06-seguridad-sdlc/18-integration-testing-wiremock-testcontainers` | complementario — testing de apps Qt | No |

---

## 9. Metadatos del Skill

```yaml
---
id: qt6-framework
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/33-qt6-framework
tags: [Qt6, QML, QtQuick, QWidgets, CMake, signals-slots, Q_PROPERTY, cross-platform]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
