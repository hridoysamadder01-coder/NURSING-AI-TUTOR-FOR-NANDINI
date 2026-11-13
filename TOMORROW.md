# কাল যা করতে হবে

## মামা (হৃদয়) যা করবে
### সবার আগে: GitHub Actions চালু করা (না হলে নতুন APK হবে না)
0. এই পাতাটা খোলো: https://github.com/hridoysamadder01-coder/NURSING-AI-TUTOR-FOR-NANDINI/actions/runs/43211807434
   উপরে লাল বা হলুদ বাক্সে যে কারণ লেখা, তার স্ক্রিনশট পাঠাও। সাধারণত তিনটার একটা হয়:
   - Actions-এর ফ্রি মিনিট শেষ বা খরচের সীমা (GitHub → Settings → Billing and plans);
   - repo-র Settings → Actions → General-এ Actions বন্ধ বা সীমিত করা;
   - GitHub-এর নিজের সাময়িক সমস্যা (তখন কিছুক্ষণ পর আবার চেষ্টা করলেই হয়)।
   ঠিক হলে বলো "build চালাও"; আমি APK build চালু করে লিংক দেব। **টাকা খরচের কিছু চালু করার আগে আমাকে জিজ্ঞেস কোরো।**

### বইয়ের কাজের জন্য (Issue #2)
1. draft PR দেখো। ঠিক মনে হলে বলো "merge করো"। না বলা পর্যন্ত merge হবে না।
2. APK তৈরি হলে ইনস্টল করে দেখো:
   - "বই" পাতায় ১২টা বই আর নিচে Neuron-এর ৬টা বইয়ের নাম আসছে কি না।
   - Anatomy and Physiology 2e খুলতে কত সেকেন্ড লাগে (বড় বই)।
   - শায়নিকে "নেফ্রন কী?" জিজ্ঞেস করে উত্তরের নিচের "বইয়ের অধ্যায়ে পড়ো" লিংকে চাপ দাও।
3. এই ৪টা সিদ্ধান্ত জানাও:
   - **Behavioral Science** কি নন্দিনীর এ বছরের বিষয়? হলে পড়ার প্ল্যানে যোগ করব।
   - OpenStax-এর বইয়ে **বাংলা অনুবাদ** (ফোনের ভেতরে চলে) চালু থাকবে, নাকি বন্ধ করব?
   - OpenStax-এর কাছে শায়নির AI-তে বই ব্যবহারের **লিখিত অনুমতি** চাইবে কি না। চাইলে চিঠির খসড়া লিখে দেব।
   - নন্দিনীর নিজের বইয়ের পাতা ফোনে আনার কাজ (ধাপ ২) কি এরপর শুরু করব?
   - পুরো কাজের **স্বাধীন যাচাই** আবার চালাব কি না। আগেরবার একসঙ্গে ১৫ জন পরীক্ষক চালিয়ে তোমার Claude-এর ৫ ঘণ্টার সীমা শেষ হয়ে গিয়েছিল, ফল আসেনি। চালালে একবারে ২–৩ জন করে চালাব; তবু অনেকটা সীমা খরচ হবে।
4. এই ছবিগুলো পাঠাও (GitHub issue #2-তে বা chat-এ):
   - **ICT বইয়ের মলাট** আর ভেতরের নামের পাতা।
   - Neuron-এর ৬টা বইয়ের **সূচিপত্রের (Contents) সব পাতা**। এগুলো পেলে অধ্যায় ধরে মিলের টেবিল বানাব।
   - বাকি ৫টা বইয়ের নামের পাতা, যেখানে **সংস্করণ (Edition)** লেখা।

### আগের বাকি কাজ (ফোনে পরীক্ষা)
5. 🎤 দিয়ে ৩–৪টা প্রশ্ন বলো; কথা বলার মোডে ১০–১৫ মিনিট কথা বলো (হিন্দি আসে কি না, ইয়ারফোনে থামে কি না)।
6. **নেট পুরো বন্ধ করে** একবার লিখে প্রশ্ন করো, আর একবার কথা বলার মোড চালাও (স্তর ৩)।
7. https://aistudio.google.com/rate-limit খুলে **gemini-3.8-live** লাইনের স্ক্রিনশট নাও।
8. নামের বানান ঠিক করো: **শায়নি** নাকি **শায়্নি**।
9. ঐচ্ছিক: environment-এর secrets-এ `GEMINI_API_KEY` আর `GROQ_API_KEY` দিয়ে বলো "key দিয়েছি"। key কখনো chat-এ দেবে না।

## ✅ Milestone 2B শেষ: `scan.html`-এ অফলাইন OCR + পাতা ধরে শায়নির ব্যাখ্যা + গোপনীয়তা। বিস্তারিত STATUS.md-এ।
## ✅ Milestone 2C শেষ (এই session): 2A+2B মিলিয়ে অফলাইন ও কম-দামি ফোনের UX যাচাই; আসল ভুল ঠিক (service worker অফলাইন প্রশ্ন, cache-first/ডেটা সাশ্রয়, OCR install, Scan অফলাইন fallback)। বিস্তারিত STATUS.md-এ। **শুধু dev-এ মাপা; আসল ফোন বাকি।**

## মামা, APK হাতে পেলে এই অফলাইন journey-গুলো ফোনে দেখো (2C-র আসল প্রমাণ)
A. **নেট পুরো বন্ধ করে** হোমের সার্চ বাক্সে "osmosis কী?" লিখে পাঠাও — উত্তর আসে কি না (আগে অফলাইনে এটা ভাঙত; ঠিক করা হয়েছে, ফোনে নিশ্চিত করা দরকার)।
B. নেট বন্ধ রেখেই "বিষয় ধরে পড়ি" → যেকোনো পাঠ → "🤖 শায়নিকে জিজ্ঞেস করি" বোতাম কাজ করে কি না।
C. নেট বন্ধ রেখে "পাতার ছবি বুঝি"-তে একটা পাতার ছবি নাও — লেখা পড়ে কি না, আর (ফোনের AI নামানো থাকলে) অফলাইনেই ব্যাখ্যা দেয় কি না।
D. একই বই দ্বিতীয়বার খুললে দ্রুত খোলে কি না (cache), আর ১০-১৫ মিনিট ব্যবহারে ডেটা খরচ আগের চেয়ে কম কি না।

## Claude পরের session-এ যা করবে
নতুন session-এর প্রথম বার্তা: "CLAUDE.md, STATUS.md, TOMORROW.md আর Issue #2-এর 12 Nov OWNER CLARIFICATION পড়ো। আজকের কাজ: শায়নির জন্য OpenAI realistic female voice যোগ করা।"

### 🎙️ ১ (মালিকের নতুন অনুরোধ, ১৩ নভেম্বর): শায়নির OpenAI realistic friendly female voice
মালিক চান শায়নি কথা বললে **মানুষের মতো বন্ধুত্বপূর্ণ নারীকণ্ঠে** শোনাক, আর Settings-এ **OpenAI API key** বসানোর জায়গা থাকুক। **⚠️ OpenAI voice API পেইড — মালিকের নিজের key, নিজের বিল; মালিক স্পষ্ট অনুমতি দিয়েছেন। key শুধু ফোনের Settings-এ, chat-এ নয়।**
- **Settings slot:** `src/cloud-ai.js`-এর `keys()/setKeys()`-এ `openai` যোগ (Gemini/Groq-এর মতোই localStorage)। `settings.html`-এর "শক্তিশালী মোড" কার্ডে একটা নতুন field: "OpenAI API key (ভয়েস) — `sk-…`" (type=password)। চাইলে ছোট voice-পিকার (shimmer / nova / coral)।
- **TTS কল:** OpenAI `POST https://api.openai.com/v1/audio/speech`, model `gpt-4o-mini-tts` (সস্তা, `instructions`-এ টোন দেওয়া যায়), voice ডিফল্ট **`coral`** বা **`shimmer`** (বন্ধুত্বপূর্ণ নারীকণ্ঠ), `instructions:"Warm, friendly, natural Bengali female tutor; calm and encouraging"`, response_format `mp3`/`opus` → ফেরত audio `Audio`/WebAudio দিয়ে বাজানো। নতুন মডিউল `src/openai-voice.js` (তাহলে `sw.js`+`server.mjs`+`scripts/prepare-android.mjs`-এ যোগ করতে হবে — `tests/packaging.test.js` enforce করে)।
- **কোথায় জোড়া:** উত্তর পড়ে শোনানো আর "কথা বলা" মোডের ফোন-কণ্ঠ ধাপে — key থাকলে OpenAI voice আগে, নইলে এখনকার ফোনের TTS (fallback)। `src/voice.js`/`src/talk-audio.js` দেখে সবচেয়ে কম-ছোঁয়া জায়গায় বসাও। নেট না থাকলে চুপচাপ ফোনের TTS-এ ফিরবে।
- **যাচাই:** `npm test`-এ একটা টেস্ট (key থাকলে OpenAI endpoint ডাকে, fake fetch; key না থাকলে ফোনের TTS), `browser-smoke`-এ stub দিয়ে। তারপর APK rebuild (নিচের recipe)।
- মনে রাখা: "robot voice" অভিযোগ এখান থেকেই এসেছে — এটাই তার সমাধান।

### 📦 APK নিজে build করার recipe (GitHub Actions billing-hold-এ আটকা থাকলে — ১৩ নভেম্বর যেভাবে করা হয়েছে)
GitHub Actions `startup_failure` (অ্যাকাউন্টে পেমেন্ট ফেল; public করেও চলে না)। তাই এই environment-এই build করা যায় (dl.google.com + maven + services.gradle.org সব reachable; একসাথে অনেক parallel download দিলে সাময়িক 403 আসে, একটা করে চালাও):
```
# SDK (একবার): cmdline-tools নামিয়ে ~/android-sdk-এ, তারপর
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" "ndk;27.1.12297006" "cmake;3.22.1"
export ANDROID_HOME=~/android-sdk ANDROID_NDK_LATEST_HOME=$ANDROID_HOME/ndk/27.1.12297006
npm install --no-save @capacitor/core@8 @capacitor/cli@8 @capacitor/android@8 @capacitor-mlkit/translation@8 esbuild@0.25.12
./node_modules/.bin/esbuild src/native-translation.js --bundle --format=esm --target=es2022 --outfile=www/src/native-translation.bundle.js
node scripts/prepare-android.mjs && npx cap add android && npx cap sync android && node scripts/add-local-llm.mjs
cd android && ./gradlew --no-daemon assembleDebug   # native "unknown target CPU" warning-গুলো non-fatal
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk` (~২০.৭ MB, সই `f7e1b16c…` = fixed debug key, পুরোনোর উপর বসে)। `android/` gitignored। browser-smoke চালাতে `ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`।
**Actions ঠিক হলে:** মামার billing/Actions ঠিক হলে push-করা commit-এ `build-android.yml` চালিয়ে official artifact দেওয়া যাবে (তখন এই হাতে-build লাগবে না)।
### বাকি কাজ (মালিকের ফোন-টেস্টের পর)
1. মামার অফলাইন-journey (উপরের A–D) স্ক্রিনশট দেখে আসল ফোনের ভুল ঠিক করা; প্রতিটা ঠিকের পর `npm test` + `node scripts/browser-smoke.mjs`।
2. **বাংলা OCR নির্ভুলতা** আসল বাংলা ছাপা পাতার ছবিতে মেপে দেখা (এই environment-এ বাংলা ফন্ট নেই বলে মাপা যায়নি)। কম হলে: tessdata "best" (বড়), ছবি আগে পরিষ্কার (greyscale/threshold), বা ডিফল্ট ইংরেজি।
3. key থাকলে `node scripts/cloud-live-check.mjs out/` চালানো; vivo-তে স্তর ৩ কাজ না করলে `android-llm/java/.../NandiniVoicePlugin.java` ঠিক করা।
4. পুরনো PDF reader (`index.html`-এর "নিজের পুরো PDF বই") এখনো CDN থেকে PDF.js আনে, প্রথম ১০০ পাতা পড়ে, মনে রাখে না — একই কায়দায় অ্যাপের ভেতরে + মনে-রাখা করা যায়।
5. **পরে:** সূচিপত্রের ছবি পেলে `data/books/shelf.json`-এ অধ্যায় লিখে মিলের টেবিল বানানো।
6. প্যারাসাইটোলজি: CDC DPDx-এর লাইসেন্স-প্রমাণ দেখে আমদানি। WisTech Open-এর বই GitHub Actions দিয়ে আনা (এই environment থেকে সাইট খোলে না)।
7. মামা বললে স্বাধীন যাচাই, একবারে ২–৩ জন পরীক্ষক: আগে লাইসেন্সের শর্ত আর "OpenStax-এর লেখা AI-তে যায় না", তারপর বাংলা লেখা, গতি, টেস্টের জোর, নতুন UI-র ব্যবহারযোগ্যতা।
