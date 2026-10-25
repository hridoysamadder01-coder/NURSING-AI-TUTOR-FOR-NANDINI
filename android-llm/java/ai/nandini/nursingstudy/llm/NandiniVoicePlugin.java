package ai.nandini.nursingstudy.llm;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognitionService;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Voice for Nandini's Tutor, using the phone's own Android engines: Bangla text-to-speech, and Bangla speech
 * recognition that by default only runs on the device (EXTRA_PREFER_OFFLINE), so her voice does not leave the phone.
 * Google's recognition service is preferred: on the owner's vivo the default engine failed every time (errors 5 and 11).
 * If the in-app recognizer still fails, the system speech dialog is opened instead. JavaScript side: src/voice.js.
 */
@CapacitorPlugin(name = "NandiniVoice", permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") })
public class NandiniVoicePlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private volatile int ttsLanguage = TextToSpeech.LANG_NOT_SUPPORTED;
    private SpeechRecognizer recognizer;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            if (status != TextToSpeech.SUCCESS) return;
            ttsLanguage = tts.setLanguage(Locale.forLanguageTag("bn-BD"));
            if (ttsLanguage < 0) ttsLanguage = tts.setLanguage(Locale.forLanguageTag("bn-IN"));
            ttsReady = true;
        });
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String id) {}

            @Override
            public void onDone(String id) {
                notifyListeners("speakDone", new JSObject().put("id", id));
            }

            @Override
            public void onError(String id) {
                notifyListeners("speakDone", new JSObject().put("id", id).put("error", true));
            }
        });
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();
        out.put("tts", ttsReady);
        out.put("bangla", ttsReady && ttsLanguage >= 0);
        out.put("stt", SpeechRecognizer.isRecognitionAvailable(getContext()));
        out.put("onDevice", Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext()));
        out.put("mic", getPermissionState("microphone") == PermissionState.GRANTED);
        JSArray engines = new JSArray();
        for (ComponentName c : recognitionServices()) engines.put(c.getPackageName());
        out.put("engines", engines);
        ComponentName chosen = preferredRecognizer();
        out.put("engine", chosen == null ? "default" : chosen.getPackageName());
        call.resolve(out);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (!ttsReady) {
            call.reject("tts_not_ready");
            return;
        }
        if (ttsLanguage < 0) {
            call.reject("bangla_voice_missing");
            return;
        }
        tts.setSpeechRate(call.getFloat("rate", 0.95f));
        String id = "u" + System.nanoTime();
        if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) != TextToSpeech.SUCCESS) call.reject("speak_failed");
        else call.resolve(new JSObject().put("id", id));
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        if (tts != null) tts.stop();
        call.resolve();
    }

    /** Opens the system screen where the Bangla voice data can be downloaded. */
    @PluginMethod
    public void installVoice(PluginCall call) {
        Intent intent = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("no_settings");
        }
    }

    @PluginMethod
    public void listen(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micPermission");
            return;
        }
        startListening(call);
    }

    @PermissionCallback
    private void micPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) startListening(call);
        else call.reject("mic_denied");
    }

    private List<ComponentName> recognitionServices() {
        List<ComponentName> out = new ArrayList<>();
        List<ResolveInfo> found = getContext().getPackageManager().queryIntentServices(new Intent(RecognitionService.SERVICE_INTERFACE), 0);
        if (found != null) for (ResolveInfo r : found) out.add(new ComponentName(r.serviceInfo.packageName, r.serviceInfo.name));
        return out;
    }

    /** Google's recognizer knows Bangla (and has offline packs); phone makers' own engines often do not. */
    private ComponentName preferredRecognizer() {
        ComponentName google = null;
        for (ComponentName c : recognitionServices()) {
            if (c.getPackageName().equals("com.google.android.googlequicksearchbox")) return c;
            if (google == null && c.getPackageName().startsWith("com.google.android")) google = c;
        }
        return google;
    }

    private Intent recognizeIntent(String lang, boolean offlineOnly) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, offlineOnly);
        return intent;
    }

    private void releaseRecognizer() {
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
    }

    private void startListening(PluginCall call) {
        String lang = call.getString("lang", "bn-BD");
        boolean offlineOnly = call.getBoolean("offlineOnly", true);
        // SpeechRecognizer must be created and used on the main thread. Each session gets a fresh one and releases it
        // when it ends, so a dying session cannot break the next one (error 5, "client").
        main.post(() -> {
            releaseRecognizer();
            ComponentName engine = preferredRecognizer();
            recognizer = engine != null ? SpeechRecognizer.createSpeechRecognizer(getContext(), engine) : SpeechRecognizer.createSpeechRecognizer(getContext());
            AtomicBoolean done = new AtomicBoolean(false);
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override
                public void onResults(Bundle results) {
                    if (done.getAndSet(true)) return;
                    main.post(NandiniVoicePlugin.this::releaseRecognizer);
                    ArrayList<String> heard = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (heard == null || heard.isEmpty() || heard.get(0).trim().isEmpty()) call.reject("no_match");
                    else call.resolve(new JSObject().put("text", heard.get(0)));
                }

                @Override
                public void onPartialResults(Bundle partial) {
                    ArrayList<String> heard = partial.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (heard != null && !heard.isEmpty()) notifyListeners("partial", new JSObject().put("text", heard.get(0)));
                }

                @Override
                public void onError(int error) {
                    // Some engines report an error after the final result; the call is already answered then.
                    if (done.getAndSet(true)) return;
                    main.post(NandiniVoicePlugin.this::releaseRecognizer);
                    // The engine itself failed (not "heard nothing"): let the system speech dialog try.
                    boolean engineFailed = error == SpeechRecognizer.ERROR_CLIENT || error == SpeechRecognizer.ERROR_SERVER || error == 11 || error == 12 || error == 13;
                    if (engineFailed) main.post(() -> openDialog(call, lang, offlineOnly, errorName(error)));
                    else call.reject(errorName(error));
                }

                @Override
                public void onReadyForSpeech(Bundle params) {
                    notifyListeners("listening", new JSObject().put("ready", true));
                }

                @Override
                public void onBeginningOfSpeech() {}

                @Override
                public void onRmsChanged(float rmsdB) {}

                @Override
                public void onBufferReceived(byte[] buffer) {}

                @Override
                public void onEndOfSpeech() {}

                @Override
                public void onEvent(int eventType, Bundle params) {}
            });
            recognizer.startListening(recognizeIntent(lang, offlineOnly));
        });
    }

    private String dialogFirstError;

    private void openDialog(PluginCall call, String lang, boolean offlineOnly, String firstError) {
        dialogFirstError = firstError;
        Intent intent = recognizeIntent(lang, offlineOnly).putExtra(RecognizerIntent.EXTRA_PROMPT, "বাংলায় বলো…");
        try {
            startActivityForResult(call, intent, "dialogResult");
        } catch (Exception e) {
            call.reject(firstError);
        }
    }

    @ActivityCallback
    private void dialogResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        ArrayList<String> heard = data == null ? null : data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (result.getResultCode() == Activity.RESULT_OK && heard != null && !heard.isEmpty() && !heard.get(0).trim().isEmpty()) {
            call.resolve(new JSObject().put("text", heard.get(0)).put("dialog", true));
        } else {
            call.reject(result.getResultCode() == Activity.RESULT_CANCELED ? "dialog_cancelled" : dialogFirstError);
        }
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        main.post(() -> {
            if (recognizer != null) recognizer.stopListening();
        });
        call.resolve();
    }

    private static String errorName(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "network_timeout";
            case SpeechRecognizer.ERROR_NETWORK: return "network";
            case SpeechRecognizer.ERROR_AUDIO: return "audio";
            case SpeechRecognizer.ERROR_SERVER: return "server";
            case SpeechRecognizer.ERROR_CLIENT: return "client";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "timeout";
            case SpeechRecognizer.ERROR_NO_MATCH: return "no_match";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "busy";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "mic_denied";
            case 11: return "disconnected"; // ERROR_SERVER_DISCONNECTED (API 31)
            case 12: return "language"; // ERROR_LANGUAGE_NOT_SUPPORTED (API 31)
            case 13: return "language"; // ERROR_LANGUAGE_UNAVAILABLE (API 31)
            default: return "error_" + error;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) tts.shutdown();
        main.post(this::releaseRecognizer);
    }
}
