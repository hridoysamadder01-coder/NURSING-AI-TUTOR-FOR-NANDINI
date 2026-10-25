package ai.nandini.nursingstudy.llm;

/** JNI surface of libnandini_llm.so (android-llm/nandini_llm.cpp). Only one generation runs at a time. */
public final class NativeLlm {
    static {
        System.loadLibrary("nandini_llm");
    }

    private NativeLlm() {}

    /** Receives each streamed piece as UTF-8 bytes that always end on a complete character. */
    public interface TokenCallback {
        void onToken(byte[] utf8);
    }

    /** Returns "" on success or an error code. libDir holds the per-CPU ggml backend variants. */
    public static native String load(String modelPath, int threads, int nCtx, String libDir);

    /** Returns JSON stats (promptTokens, generatedTokens, prefillMs, generateMs, stopped) or {"error": …}. */
    public static native String generate(String[] roles, String[] contents, int maxTokens, float temperature, TokenCallback callback);

    public static native void stop();

    public static native void unload();

    public static native String systemInfo();
}
