package ai.nandini.nursingstudy.llm;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

/**
 * Local (on-device) LLM for Nandini's Tutor. The model is downloaded once into the app's private
 * storage and then everything runs offline through llama.cpp. JavaScript side: src/local-llm.js.
 */
@CapacitorPlugin(name = "NandiniLlm")
public class NandiniLlmPlugin extends Plugin {
    private final ExecutorService modelThread = Executors.newSingleThreadExecutor();
    private final ExecutorService downloadThread = Executors.newSingleThreadExecutor();
    private final AtomicBoolean cancelDownload = new AtomicBoolean(false);
    private String loadedFile = null;

    private File modelDir() {
        File dir = new File(getContext().getFilesDir(), "models");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    /** Only plain file names are accepted, so JavaScript cannot point outside the models folder. */
    private File modelFile(String name) {
        if (name == null || !name.matches("[A-Za-z0-9._-]+\\.gguf")) return null;
        return new File(modelDir(), name);
    }

    private static int threadCount() {
        int cores = Runtime.getRuntime().availableProcessors();
        return Math.max(2, Math.min(4, cores / 2));
    }

    @PluginMethod
    public void status(PluginCall call) {
        ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo mem = new ActivityManager.MemoryInfo();
        am.getMemoryInfo(mem);
        JSObject out = new JSObject();
        JSArray files = new JSArray();
        File[] list = modelDir().listFiles();
        if (list != null) for (File f : list) {
            JSObject o = new JSObject();
            o.put("name", f.getName());
            o.put("bytes", f.length());
            files.put(o);
        }
        out.put("files", files);
        out.put("loaded", loadedFile);
        out.put("totalRamMb", mem.totalMem / (1024 * 1024));
        out.put("availRamMb", mem.availMem / (1024 * 1024));
        out.put("freeSpaceMb", modelDir().getUsableSpace() / (1024 * 1024));
        out.put("cores", Runtime.getRuntime().availableProcessors());
        out.put("threads", threadCount());
        out.put("abi", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "");
        out.put("device", Build.MANUFACTURER + " " + Build.MODEL);
        call.resolve(out);
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        File dest = modelFile(call.getString("fileName"));
        long size = (long) (double) call.getDouble("bytes", 0.0);
        if (url == null || !url.startsWith("https://") || dest == null || size <= 0) {
            call.reject("bad_request");
            return;
        }
        if (dest.exists() && dest.length() == size) {
            call.resolve(new JSObject().put("done", true));
            return;
        }
        File part = new File(dest.getPath() + ".part");
        long have = part.exists() ? part.length() : 0;
        if (modelDir().getUsableSpace() < size - have + 200L * 1024 * 1024) {
            call.reject("no_space");
            return;
        }
        cancelDownload.set(false);
        downloadThread.execute(() -> {
            HttpURLConnection conn = null;
            try {
                long got = part.exists() ? part.length() : 0;
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(30000);
                conn.setInstanceFollowRedirects(true);
                if (got > 0) conn.setRequestProperty("Range", "bytes=" + got + "-");
                int code = conn.getResponseCode();
                if (code == 200) got = 0; // server ignored the range: start over
                else if (code != 206) throw new Exception("http_" + code);
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(part, got > 0)) {
                    byte[] buf = new byte[1 << 16];
                    long lastEvent = 0;
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        if (cancelDownload.get()) throw new Exception("cancelled");
                        out.write(buf, 0, n);
                        got += n;
                        long now = System.currentTimeMillis();
                        if (now - lastEvent > 400) {
                            lastEvent = now;
                            notifyListeners("downloadProgress", new JSObject().put("received", got).put("total", size));
                        }
                    }
                }
                if (part.length() != size) throw new Exception("size_mismatch");
                byte[] magic = new byte[4];
                try (FileInputStream check = new FileInputStream(part)) {
                    if (check.read(magic) != 4 || !"GGUF".equals(new String(magic, StandardCharsets.US_ASCII))) throw new Exception("not_gguf");
                }
                if (!part.renameTo(dest)) throw new Exception("rename_failed");
                notifyListeners("downloadProgress", new JSObject().put("received", size).put("total", size));
                call.resolve(new JSObject().put("done", true));
            } catch (Exception e) {
                if ("size_mismatch".equals(e.getMessage()) || "not_gguf".equals(e.getMessage())) part.delete();
                call.reject(e.getMessage() == null ? "download_failed" : e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        cancelDownload.set(true);
        call.resolve();
    }

    @PluginMethod
    public void deleteModel(PluginCall call) {
        File f = modelFile(call.getString("fileName"));
        if (f == null) {
            call.reject("bad_request");
            return;
        }
        modelThread.execute(() -> {
            if (f.getName().equals(loadedFile)) {
                NativeLlm.unload();
                loadedFile = null;
            }
            f.delete();
            new File(f.getPath() + ".part").delete();
            call.resolve();
        });
    }

    @PluginMethod
    public void load(PluginCall call) {
        File f = modelFile(call.getString("fileName"));
        int nCtx = call.getInt("nCtx", 2048);
        if (f == null || !f.exists()) {
            call.reject("model_missing");
            return;
        }
        modelThread.execute(() -> {
            if (f.getName().equals(loadedFile)) {
                call.resolve(new JSObject().put("ms", 0).put("threads", threadCount()));
                return;
            }
            long t = System.currentTimeMillis();
            String err = NativeLlm.load(f.getPath(), threadCount(), nCtx, getContext().getApplicationInfo().nativeLibraryDir);
            if (!err.isEmpty()) {
                loadedFile = null;
                call.reject(err);
                return;
            }
            loadedFile = f.getName();
            call.resolve(new JSObject().put("ms", System.currentTimeMillis() - t).put("threads", threadCount()).put("system", NativeLlm.systemInfo()));
        });
    }

    @PluginMethod
    public void generate(PluginCall call) {
        JSArray messages = call.getArray("messages");
        int maxTokens = call.getInt("maxTokens", 256);
        float temperature = call.getFloat("temperature", 0.3f);
        if (messages == null || loadedFile == null) {
            call.reject(loadedFile == null ? "not_loaded" : "bad_request");
            return;
        }
        modelThread.execute(() -> {
            try {
                int n = messages.length();
                String[] roles = new String[n];
                String[] contents = new String[n];
                for (int i = 0; i < n; i++) {
                    JSONObject m = messages.getJSONObject(i);
                    roles[i] = m.getString("role");
                    contents[i] = m.getString("content");
                }
                String stats = NativeLlm.generate(roles, contents, maxTokens, temperature,
                        bytes -> notifyListeners("token", new JSObject().put("text", new String(bytes, StandardCharsets.UTF_8))));
                JSObject result = new JSObject(stats);
                if (result.has("error")) call.reject(result.getString("error"));
                else call.resolve(result);
            } catch (Exception e) {
                call.reject("generate_failed");
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        NativeLlm.stop();
        call.resolve();
    }

    @PluginMethod
    public void unload(PluginCall call) {
        modelThread.execute(() -> {
            NativeLlm.unload();
            loadedFile = null;
            call.resolve();
        });
    }
}
