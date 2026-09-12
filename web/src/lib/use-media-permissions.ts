import { useState, useEffect, useRef, useCallback } from "react";

export interface MediaConstraintsConfig {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

export const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
};

export interface UseMediaPermissionsReturn {
  isSupported: boolean;
  permissionState: "prompt" | "granted" | "denied" | "unsupported";
  micEnabled: boolean;
  cameraEnabled: boolean;
  mediaStream: MediaStream | null;
  errorMessage: string | null;
  requestPermissions: (overrideMic?: boolean, overrideCam?: boolean) => Promise<MediaStream | null>;
  toggleMic: () => void;
  toggleCamera: () => void;
  stopAllTracks: () => void;
}

export function useMediaPermissions(
  initialMicState = false,
  initialCameraState = false
): UseMediaPermissionsReturn {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unsupported">("prompt");
  const [micEnabled, setMicEnabled] = useState<boolean>(initialMicState);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(initialCameraState);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  // Helper to safely stop all media hardware streams (turns off camera/mic LEDs)
  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch { /* ignore */ }
      });
      streamRef.current = null;
      setMediaStream(null);
    }
  }, []);

  // 2. Main Permission & Media Stream Requester
  const requestPermissions = useCallback(
    async (overrideMic?: boolean, overrideCam?: boolean): Promise<MediaStream | null> => {
      if (!isSupported) return null;

      setErrorMessage(null);

      const targetMic = overrideMic !== undefined ? overrideMic : micEnabled;
      const targetCam = overrideCam !== undefined ? overrideCam : cameraEnabled;

      try {
        stopAllTracks();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: DEFAULT_AUDIO_CONSTRAINTS,
          video: DEFAULT_VIDEO_CONSTRAINTS,
        });

        streamRef.current = stream;
        setMediaStream(stream);
        setPermissionState("granted");

        setMicEnabled(targetMic);
        setCameraEnabled(targetCam);

        stream.getAudioTracks().forEach((t) => (t.enabled = targetMic));
        stream.getVideoTracks().forEach((t) => (t.enabled = targetCam));

        return stream;
      } catch (err: unknown) {
        const errorName = (err as { name?: string })?.name ?? "";
        console.error("Media permission error:", err);
        setPermissionState("denied");

        if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
          setErrorMessage("Camera or Microphone access was denied by your browser.");
        } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
          setErrorMessage("No camera or microphone hardware found on this device.");
        } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
          setErrorMessage("Your camera/mic is in use by another application (e.g. Zoom, Teams).");
        } else {
          setErrorMessage("Unable to access media devices.");
        }

        setCameraEnabled(false);
        setMicEnabled(false);
        return null;
      }
    },
    [isSupported, micEnabled, cameraEnabled, stopAllTracks]
  );

  // 1. Detect HTTPS & Auto-acquire if permission was already granted previously by browser
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    setIsSupported(supported);
    if (!supported) {
      setPermissionState("unsupported");
      setErrorMessage("Camera/Microphone access requires HTTPS or localhost context.");
      return;
    }

    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      Promise.all([
        navigator.permissions.query({ name: "camera" as PermissionName }).catch(() => null),
        navigator.permissions.query({ name: "microphone" as PermissionName }).catch(() => null),
      ]).then(([camPerm, micPerm]) => {
        if (camPerm?.state === "granted" || micPerm?.state === "granted") {
          requestPermissions();
        }
      });
    }
  }, [requestPermissions]);

  // 3. Toggle Mic State (Mute/Unmute track without destroying stream)
  const toggleMic = useCallback(() => {
    setMicEnabled((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = next;
        });
      }
      return next;
    });
  }, []);

  // 4. Toggle Camera State
  const toggleCamera = useCallback(() => {
    setCameraEnabled((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = next;
        });
      }
      return next;
    });
  }, []);

  // 5. Automatic cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
    };
  }, [stopAllTracks]);

  return {
    isSupported,
    permissionState,
    micEnabled,
    cameraEnabled,
    mediaStream,
    errorMessage,
    requestPermissions,
    toggleMic,
    toggleCamera,
    stopAllTracks,
  };
}
