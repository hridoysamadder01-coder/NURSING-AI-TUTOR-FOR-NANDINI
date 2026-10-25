// On-device LLM engine for Nandini's Tutor: llama.cpp behind a tiny JNI surface.
// One model, one context, one generation at a time. Tokens are streamed to Java as raw UTF-8
// bytes because a Bengali character can be split across tokens (and NewStringUTF needs valid input).
#include <jni.h>
#include <atomic>
#include <chrono>
#include <mutex>
#include <string>
#include <vector>
#include "llama.h"
#include "ggml-backend.h"

#ifdef __ANDROID__
#include <android/log.h>
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, "NandiniLlm", __VA_ARGS__)
#else
#include <cstdio>
#define LOGI(...) (std::fprintf(stderr, __VA_ARGS__), std::fputc('\n', stderr))
#endif

namespace {
std::mutex g_mutex;
llama_model *g_model = nullptr;
llama_context *g_ctx = nullptr;
std::atomic<bool> g_stop{false};
bool g_backends_loaded = false;

std::string jstr(JNIEnv *env, jstring s) {
    if (!s) return {};
    const char *c = env->GetStringUTFChars(s, nullptr);
    std::string out(c);
    env->ReleaseStringUTFChars(s, c);
    return out;
}

void unload_locked() {
    if (g_ctx) { llama_free(g_ctx); g_ctx = nullptr; }
    if (g_model) { llama_model_free(g_model); g_model = nullptr; }
}

// Length of the longest prefix of buf that ends on a complete UTF-8 character.
size_t utf8_complete(const std::string &buf) {
    size_t i = buf.size();
    size_t back = 0;
    while (i > 0 && back < 4) {
        unsigned char c = (unsigned char) buf[i - 1];
        if ((c & 0xC0) != 0x80) {  // lead byte (or ASCII)
            size_t need = c < 0x80 ? 1 : (c >> 5) == 0x6 ? 2 : (c >> 4) == 0xE ? 3 : (c >> 3) == 0x1E ? 4 : 1;
            return (back + 1 >= need) ? buf.size() : i - 1;
        }
        --i; ++back;
    }
    return buf.size();
}

std::string json_escape(const std::string &s) {
    std::string o;
    for (char c : s) {
        if (c == '"' || c == '\\') { o += '\\'; o += c; }
        else if (c == '\n') o += "\\n";
        else if ((unsigned char) c < 0x20) o += ' ';
        else o += c;
    }
    return o;
}
}  // namespace

extern "C" JNIEXPORT jstring JNICALL
Java_ai_nandini_nursingstudy_llm_NativeLlm_load(JNIEnv *env, jclass, jstring jpath, jint threads, jint n_ctx, jstring jlibdir) {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (!g_backends_loaded) {
        // The CPU backend is built in several variants (armv8.0 … armv8.6); ggml picks the best one this phone supports.
        ggml_backend_load_all_from_path(jstr(env, jlibdir).c_str());
        llama_backend_init();
        g_backends_loaded = true;
    }
    unload_locked();
    auto mparams = llama_model_default_params();
    mparams.n_gpu_layers = 0;
    mparams.use_mmap = true;
    g_model = llama_model_load_from_file(jstr(env, jpath).c_str(), mparams);
    if (!g_model) return env->NewStringUTF("model_load_failed");
    auto cparams = llama_context_default_params();
    cparams.n_ctx = (uint32_t) n_ctx;
    cparams.n_batch = 512;
    cparams.n_ubatch = 512;
    cparams.n_threads = threads;
    cparams.n_threads_batch = threads;
    cparams.no_perf = true;
    g_ctx = llama_init_from_model(g_model, cparams);
    if (!g_ctx) { unload_locked(); return env->NewStringUTF("context_failed"); }
    LOGI("loaded model with %d threads, n_ctx %d", threads, n_ctx);
    return env->NewStringUTF("");
}

extern "C" JNIEXPORT void JNICALL
Java_ai_nandini_nursingstudy_llm_NativeLlm_unload(JNIEnv *, jclass) {
    std::lock_guard<std::mutex> lock(g_mutex);
    unload_locked();
}

extern "C" JNIEXPORT void JNICALL
Java_ai_nandini_nursingstudy_llm_NativeLlm_stop(JNIEnv *, jclass) { g_stop = true; }

extern "C" JNIEXPORT jstring JNICALL
Java_ai_nandini_nursingstudy_llm_NativeLlm_systemInfo(JNIEnv *env, jclass) {
    return env->NewStringUTF(llama_print_system_info());
}

// Returns a small JSON object with timing stats, or {"error": "..."}; tokens go to callback.onToken(byte[]).
extern "C" JNIEXPORT jstring JNICALL
Java_ai_nandini_nursingstudy_llm_NativeLlm_generate(JNIEnv *env, jclass, jobjectArray jroles, jobjectArray jcontents,
                                                    jint max_tokens, jfloat temperature, jobject callback) {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (!g_model || !g_ctx) return env->NewStringUTF("{\"error\":\"not_loaded\"}");
    g_stop = false;
    jclass cb_class = env->GetObjectClass(callback);
    jmethodID on_token = env->GetMethodID(cb_class, "onToken", "([B)V");

    // Apply the model's own chat template (Gemma, Llama, Qwen … are all built in to llama.cpp).
    const jsize n = env->GetArrayLength(jroles);
    std::vector<std::string> roles(n), contents(n);
    std::vector<llama_chat_message> msgs(n);
    size_t chars = 0;
    for (jsize i = 0; i < n; ++i) {
        roles[i] = jstr(env, (jstring) env->GetObjectArrayElement(jroles, i));
        contents[i] = jstr(env, (jstring) env->GetObjectArrayElement(jcontents, i));
        chars += roles[i].size() + contents[i].size();
    }
    for (jsize i = 0; i < n; ++i) msgs[i] = {roles[i].c_str(), contents[i].c_str()};
    const char *tmpl = llama_model_chat_template(g_model, nullptr);
    std::vector<char> buf(chars * 2 + 1024);
    int32_t len = llama_chat_apply_template(tmpl, msgs.data(), msgs.size(), true, buf.data(), (int32_t) buf.size());
    if (len > (int32_t) buf.size()) {
        buf.resize(len + 1);
        len = llama_chat_apply_template(tmpl, msgs.data(), msgs.size(), true, buf.data(), (int32_t) buf.size());
    }
    if (len < 0) return env->NewStringUTF("{\"error\":\"chat_template_failed\"}");
    const std::string prompt(buf.data(), len);

    const llama_vocab *vocab = llama_model_get_vocab(g_model);
    int32_t n_tok = -llama_tokenize(vocab, prompt.c_str(), (int32_t) prompt.size(), nullptr, 0, true, true);
    std::vector<llama_token> tokens(n_tok);
    if (llama_tokenize(vocab, prompt.c_str(), (int32_t) prompt.size(), tokens.data(), n_tok, true, true) < 0)
        return env->NewStringUTF("{\"error\":\"tokenize_failed\"}");
    const int n_ctx = (int) llama_n_ctx(g_ctx);
    if (n_tok + max_tokens > n_ctx) return env->NewStringUTF("{\"error\":\"prompt_too_long\"}");

    llama_memory_clear(llama_get_memory(g_ctx), true);
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < n_tok; i += 512) {
        int chunk = std::min(512, n_tok - i);
        if (llama_decode(g_ctx, llama_batch_get_one(tokens.data() + i, chunk)) != 0)
            return env->NewStringUTF("{\"error\":\"decode_failed\"}");
        if (g_stop) break;
    }
    auto t1 = std::chrono::steady_clock::now();

    llama_sampler *smpl = llama_sampler_chain_init(llama_sampler_chain_default_params());
    llama_sampler_chain_add(smpl, llama_sampler_init_penalties(64, 1.1f, 0.0f, 0.0f));
    llama_sampler_chain_add(smpl, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(smpl, llama_sampler_init_top_p(0.9f, 1));
    llama_sampler_chain_add(smpl, llama_sampler_init_temp(temperature));
    llama_sampler_chain_add(smpl, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));

    std::string pending;
    int generated = 0;
    char piece[256];
    while (!g_stop && generated < max_tokens) {
        llama_token tok = llama_sampler_sample(smpl, g_ctx, -1);
        if (llama_vocab_is_eog(vocab, tok)) break;
        int32_t m = llama_token_to_piece(vocab, tok, piece, sizeof(piece), 0, false);
        if (m > 0) pending.append(piece, m);
        size_t ready = utf8_complete(pending);
        if (ready > 0) {
            jbyteArray bytes = env->NewByteArray((jsize) ready);
            env->SetByteArrayRegion(bytes, 0, (jsize) ready, reinterpret_cast<const jbyte *>(pending.data()));
            env->CallVoidMethod(callback, on_token, bytes);
            env->DeleteLocalRef(bytes);
            pending.erase(0, ready);
            if (env->ExceptionCheck()) { env->ExceptionClear(); g_stop = true; }
        }
        ++generated;
        if (llama_decode(g_ctx, llama_batch_get_one(&tok, 1)) != 0) break;
    }
    llama_sampler_free(smpl);
    auto t2 = std::chrono::steady_clock::now();
    auto ms = [](auto a, auto b) { return (long) std::chrono::duration_cast<std::chrono::milliseconds>(b - a).count(); };
    std::string out = "{\"promptTokens\":" + std::to_string(n_tok) + ",\"generatedTokens\":" + std::to_string(generated) +
                      ",\"prefillMs\":" + std::to_string(ms(t0, t1)) + ",\"generateMs\":" + std::to_string(ms(t1, t2)) +
                      ",\"stopped\":" + (g_stop ? "true" : "false") + ",\"template\":\"" + json_escape(tmpl ? "model" : "default") + "\"}";
    return env->NewStringUTF(out.c_str());
}
