"use client";

import { useCallback, useEffect, useState } from "react";

const VOICE_STORAGE_KEY = "vania-aurora-voice-v1";

function voiceScore(voice: SpeechSynthesisVoice) {
  const name = voice.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  // A Web Speech API não informa gênero. Nomes conhecidos são uma preferência;
  // a escolha manual permite conferir a voz disponível em cada dispositivo.
  const feminine =
    /\b(francisca|heloisa|maria|raquel|vitoria|camila|luciana|joana|catarina|female|feminina)\b/.test(
      name,
    );
  const masculine =
    /\b(antonio|daniel|duarte|fabio|joao|ricardo|felipe|male|masculina)\b/.test(
      name,
    );
  return (
    (feminine ? 100 : 0) -
    (masculine ? 100 : 0) +
    (voice.lang.replace("_", "-").toLowerCase() === "pt-br" ? 30 : 0) +
    (/natural|online|premium/.test(name) ? 5 : 0)
  );
}

export function useAuroraSpeech(onError: (message: string) => void) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferredVoice, setPreferredVoice] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    let active = true;
    if (!("speechSynthesis" in window)) return;
    const synthesis = window.speechSynthesis;
    function loadVoices() {
      if (!active) return;
      setSpeechSupported(true);
      setVoices(
        synthesis
          .getVoices()
          .filter((voice) => /^pt(?:[-_]|$)/i.test(voice.lang))
          .sort(
            (a, b) =>
              voiceScore(b) - voiceScore(a) ||
              a.name.localeCompare(b.name, "pt-BR"),
          ),
      );
    }
    queueMicrotask(() => {
      if (!active) return;
      try {
        setPreferredVoice(window.localStorage.getItem(VOICE_STORAGE_KEY) || "");
      } catch {
        /* Preferência não é obrigatória para falar. */
      }
      loadVoices();
    });
    synthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      active = false;
      synthesis.removeEventListener("voiceschanged", loadVoices);
      synthesis.cancel();
    };
  }, []);

  const selectedVoice =
    voices.find((voice) => voice.voiceURI === preferredVoice) || voices[0];

  function chooseVoice(value: string) {
    window.speechSynthesis?.cancel();
    setPreferredVoice(value);
    try {
      if (value) window.localStorage.setItem(VOICE_STORAGE_KEY, value);
      else window.localStorage.removeItem(VOICE_STORAGE_KEY);
    } catch {
      /* A seleção continua válida durante esta visita. */
    }
  }

  const speak = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) {
        onError("Seu navegador não oferece leitura por voz.");
        return;
      }
      if (!selectedVoice) {
        onError(
          "Ainda não há uma voz em português disponível. Confira as vozes do navegador e tente novamente.",
        );
        return;
      }
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(text.slice(0, 4000));
      speech.voice = selectedVoice;
      speech.lang = selectedVoice.lang;
      speech.rate = 0.96;
      speech.pitch = 1.08;
      speech.volume = 0.9;
      speech.onerror = (event) => {
        if (event.error !== "canceled" && event.error !== "interrupted")
          onError(
            "Não consegui reproduzir esta voz. Experimente outra voz em português.",
          );
      };
      window.speechSynthesis.speak(speech);
    },
    [selectedVoice, onError],
  );

  return {
    voices,
    preferredVoice,
    selectedVoice,
    speechSupported,
    chooseVoice,
    speak,
  };
}
