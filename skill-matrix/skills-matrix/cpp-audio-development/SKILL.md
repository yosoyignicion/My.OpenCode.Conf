---
name: cpp-audio-development
description: "El desarrollo de audio en C++ resuelve el procesamiento de señales de audio en tiempo real con restricciones estrictas: sin asignaciones de memoria, sin locks, sin I/O en el hilo de audio (audio th..."
---
# C++ Audio Development — DSP & Plugins

## Semantic Triggers
```
JUCE audio plugin VST3 AU AAX, real-time audio DSP allocation-free, PortAudio callback audio I/O, biquad filter RBJ cookbook DSP, synth voice ADSR oscillator, FFT convolution reverb compressor
```

---

## 1. Definición Teórica

El desarrollo de audio en C++ resuelve el procesamiento de señales de audio en tiempo real con restricciones estrictas: sin asignaciones de memoria, sin locks, sin I/O en el hilo de audio (audio thread). El principio fundamental es que el audio digital se procesa en buffers de tamaño fijo (típicamente 64-512 samples) a frecuencias de muestreo de 44.1kHz o 48kHz, con precisión `float` de 32 bits. Arquitectónicamente, los plugins de audio (VST3, AU, AAX, CLAP, LV2) se integran en DAWs (Digital Audio Workstations) mediante una interfaz de host que llama a `processBlock()` con buffers de entrada/salida y MIDI. JUCE es el framework dominante para desarrollo de plugins comerciales, proporcionando abstracción de formatos, GUI, y gestión de parámetros.

---

## 2. Implementación de Referencia

JUCE ≥8.0 (framework CMake-based, C++20). Formatos: VST3 (universal), AU (macOS), AAX (Pro Tools), CLAP (moderno), LV2 (Linux). Idiomas: C++20, DSP con SIMD opcional.

### Ejemplo Práctico Avanzado

```cpp
// PluginProcessor.h — procesador de síntesis con filtro biquad
class SynthProcessor : public juce::AudioProcessor {
public:
    SynthProcessor()
        : AudioProcessor(BusesProperties()
              .withInput("Input", juce::AudioChannelSet::stereo())
              .withOutput("Output", juce::AudioChannelSet::stereo()))
    {
        addParameter(mGain = new juce::AudioParameterFloat("gain", "Gain",
            juce::NormalisableRange<float>(0.f, 1.f, 0.001f), 0.8f));
    }

    void prepareToPlay(double sampleRate, int blockSize) override {
        mSynth.setCurrentPlaybackSampleRate(sampleRate);
        // Pre-allocar buffers DSP (prohibido alloc en audio thread)
        mFilter.reset();
        mFilter.setLowpass(800.f, 0.707f, sampleRate);
    }

    void processBlock(juce::AudioBuffer<float>& buffer,
                      juce::MidiBuffer& midiMessages) override {
        juce::ScopedNoDenormals noDenormals;  // evitar denormals
        auto totalNumOutputChannels = getTotalNumOutputChannels();

        // Limpiar canales no usados
        for (int i = totalNumOutputChannels; i < getTotalNumOutputChannels(); ++i)
            buffer.clear(i, 0, buffer.getNumSamples());

        // Renderizar sintetizador
        buffer.clear();
        mSynth.renderNextBlock(buffer, midiMessages, 0, buffer.getNumSamples());

        // Aplicar procesamiento
        for (int ch = 0; ch < totalNumOutputChannels; ++ch) {
            auto* channelData = buffer.getWritePointer(ch);
            for (int s = 0; s < buffer.getNumSamples(); ++s) {
                channelData[s] = mFilter.process(channelData[s]);
                channelData[s] *= mGain->get();
            }
        }
    }

private:
    juce::Synthesiser mSynth;
    juce::AudioParameterFloat* mGain;
    BiquadFilter mFilter;  // implementación DSP abajo
};

// DSP: Biquad filter (RBJ Cookbook)
struct BiquadFilter {
    float b0, b1, b2, a1, a2, z1, z2;

    void reset() { z1 = z2 = 0.f; }

    void setLowpass(float freq, float q, float sr) {
        auto w0 = 2.f * std::numbers::pi_v<float> * freq / sr;
        auto a = std::sin(w0) / (2.f * q);
        auto c = std::cos(w0);
        b0 = (1.f - c) / (2.f * (1.f + a));
        b1 = (1.f - c) / (1.f + a);
        b2 = b0;
        a1 = -2.f * c / (1.f + a);
        a2 = (1.f - a) / (1.f + a);
    }

    float process(float x) {
        auto y = b0 * x + z1;
        z1 = b1 * x + z2 - a1 * y;
        z2 = b2 * x - a2 * y;
        return y;
    }
};
```

**Fuente oficial:** https://juce.com/learn/documentation — https://www.w3.org/TR/audio-eq-cookbook/

### Alternativa de Implementación Específica

**PortAudio + DSP directo (sin JUCE), para apps standalone:**

```cpp
#include "portaudio.h"

static int audioCallback(const void* input, void* output,
    unsigned long framesPerBuffer, const PaStreamCallbackTimeInfo* timeInfo,
    PaStreamCallbackFlags statusFlags, void* userData) {
    float* out = (float*)output;
    // NO allocations, NO locks, NO I/O here
    for (unsigned i = 0; i < framesPerBuffer; i++) {
        *out++ = generateSample();  // tu DSP aquí
    }
    return paContinue;  // o paComplete para detener
}

int main() {
    Pa_Initialize();
    PaStream* stream;
    Pa_OpenDefaultStream(&stream, 0, 2, paFloat32, 44100, 256,
                         audioCallback, nullptr);
    Pa_StartStream(stream);
    // ...
    Pa_StopStream(stream);
    Pa_Terminate();
    return 0;
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Plugins de audio comerciales, síntesis y procesamiento en tiempo real, instrumentos virtuales, efectos de audio, herramientas de producción musical |
| **Cuándo evitar** | Aplicaciones de reproducción simple (bibliotecas como minimp3, libsndfile bastan), análisis de audio offline (Python + librosa es más productivo), sistemas sin capacidad de tiempo real (overruns en buffer de audio causan pops/clicks) |
| **Alternativas** | Python + librosa (análisis offline), Pure Data / Max/MSP (prototipado visual), Rust (nih-plug, fundsp — más seguro), JavaScript (Tone.js, Web Audio API — navegador) |
| **Coste/Complejidad** | Alto: JUCE es un framework grande (∼500MB SDK). El desarrollo de audio requiere entender sampling rate, buffer size, anti-aliasing, y las restricciones del audio thread (real-time safety). El testing requiere una DAW o test host |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Audio crackling/pops al mover un parámetro

**¿Qué ocasionó el error?**
El parámetro `gain` cambiaba abruptamente de un valor a otro en un solo sample, causando un salto discontinuo en la forma de onda (zipper noise).

**¿Cómo se solucionó?**
Aplicar smoothing (interpolación lineal) al parámetro:

```cpp
class SmoothedParameter {
    float current = 0.f;
    float target = 0.8f;
    float rampLen = 0.01f;  // 10ms
    float step = 0;
    int samplesLeft = 0;

public:
    void setTarget(float t, float sampleRate) {
        target = t;
        samplesLeft = int(sampleRate * rampLen);
        step = (target - current) / samplesLeft;
    }

    float getNext() {
        if (samplesLeft > 0) {
            current += step;
            samplesLeft--;
        }
        return current;
    }
};
```

**¿Por qué funciona esta técnica?**
El oído humano es sensible a cambios abruptos (transients). El smoothing con rampa de 10ms elimina el salto (zipper noise) haciendo la transición imperceptible. JUCE incluye `juce::SmoothedValue<float>` que implementa este patrón.

### Caso: Underflow de buffer de audio en tiempo real

**¿Qué ocasionó el error?**
El callback de audio tardaba más que el tiempo del buffer (e.g., >5.8ms para buffer de 256 samples a 44.1kHz). El driver de audio reportaba "buffer underrun" (el buffer de salida no se llenó a tiempo).

**¿Cómo se solucionó?**
Identificar las partes del procesamiento que exceden el presupuesto de tiempo (∼90μs por sample a 44.1kHz):

```cpp
// Usar Tracy o mediciones simples para detectar overruns:
void processBlock(...) {
    auto start = juce::Time::getMillisecondCounterHiRes();

    // Procesamiento...

    auto elapsed = juce::Time::getMillisecondCounterHiRes() - start;
    auto budgetMs = buffer.getNumSamples() / sampleRate * 1000;
    if (elapsed > budgetMs * 0.8) {  // >80% de presupuesto
        // Log: high CPU, reducir calidad DSP
    }
}
```

**¿Por qué funciona esta técnica?**
El audio en tiempo real tiene un presupuesto fijo: para 256 samples @ 44.1kHz, son 5.8ms. Si el procesamiento excede este tiempo, el buffer no se llena y ocurre un underrun (click audible). Identificar los módulos DSP que consumen más tiempo permite optimizarlos o desactivarlos dinámicamente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~190 tokens estimados al invocar este skill
- **Trigger de activación:** `JUCE audio plugin VST3 AU AAX`
- **Prioridad de carga:** Media — dominio especializado de audio
- **Dependencias:** `10-simd-vectorization` (SIMD para DSP), `26-modern-cpp-development` (CMake + JUCE)

### Tool Integration

```json
{
  "tool_name": "cpp-audio-development",
  "description": "Desarrollo de audio en C++: JUCE, DSP en tiempo real, plugins VST3/AU/CLAP, PortAudio",
  "triggers": ["JUCE", "audio plugin", "DSP", "VST3", "PortAudio", "biquad", "real-time audio"],
  "context_hint": "Inyectar ejemplo de PluginProcessor con biquad filter y smoothing de parámetros",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre desarrollo de audio o plugins VST/JUCE, carga el skill
cpp-audio-development. Proporciona ejemplos de PluginProcessor con biquad filter,
restricciones de real-time safety, y smoothing de parámetros.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear proyecto JUCE con CMake
juce_create_project MyPlugin
cd MyPlugin
cmake -B build -G Ninja -DCMAKE_CXX_STANDARD=20
cmake --build build

# Validar plugin con validateplugin (JUCE)
build/MyPlugin_artefacts/ValidatePlugin/ValidatePlugin

# Test con test audio host
build/MyPlugin_artefacts/AudioPluginHost/AudioPluginHost
```

### GUI / Web

- **JUCE Audio Plugin Host**: test host integrado en JUCE
- **RenderDoc**: captura de frames de UI del plugin (si usa OpenGL)
- **Pluginval (JUCE)**: validación automática de plugin
- **DAW (REAPER, Ableton, Logic)**: carga y prueba del plugin

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Compilar plugin | `cmake --build build` | `CLion → Build` |
| Validar plugin | `build/ValidatePlugin/ValidatePlugin` | `Pluginval GUI` |
| Test en host | `build/AudioPluginHost` | `REAPER → Insert VST3` |

---

## 7. Cheatsheet Rápido

```cpp
// JUCE plugin essentials — 12 líneas
void processBlock(AudioBuffer<float>& buf, MidiBuffer& midi) override {
    ScopedNoDenormals noDenormals;
    buf.clear();
    synth.renderNextBlock(buf, midi, 0, buf.getNumSamples());
    // No allocs, no locks, no I/O
    for (int ch = 0; ch < buf.getNumChannels(); ++ch) {
        auto* d = buf.getWritePointer(ch);
        for (int s = 0; s < buf.getNumSamples(); ++s)
            d[s] = filter.process(d[s]);
    }
}
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `26-modern-cpp-development` | dependiente — CMake + JUCE toolchain | Sí |
| `10-simd-vectorization` | complementario — SIMD para DSP | Sí |
| `32-cpp-graphics-rendering` | complementario — UI del plugin (OpenGL) | No |
| `33-qt6-framework` | alternativo — UI con Qt6 (no recomendado para plugins) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: cpp-audio-development
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/31-cpp-audio-development
tags: [JUCE, audio, DSP, VST3, PortAudio, real-time, biquad, plugin, synthesis]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
