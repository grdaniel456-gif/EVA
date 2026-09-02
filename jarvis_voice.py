import sys
import asyncio
import edge_tts

VOZ_SELECCIONADA = "es-MX-JorgeNeural"

async def generar_audio(texto, archivo_salida):
    communicate = edge_tts.Communicate(texto, VOZ_SELECCIONADA)
    await communicate.save(archivo_salida)

if __name__ == "__main__":
    nombre_docente = sys.argv[1] if len(sys.argv) > 1 else "Docente"
    archivo_salida = sys.argv[2] if len(sys.argv) > 2 else "public/jarvis_temp.mp3"

    texto_mensaje = f"Bienvenido Ingeniero {nombre_docente}, ¿qué te gustaría realizar hoy?"
    
    asyncio.run(generar_audio(texto_mensaje, archivo_salida))