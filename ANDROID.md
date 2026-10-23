# নন্দিনীর Android অ্যাপ: ব্যবহার নির্দেশিকা

## কী আছে
GitHub-এর private repository থেকে তৈরি পরীক্ষামূলক **Nandini Nursing Study** debug APK। অ্যাপের ভেতরেই আছে:
- Open RN-এর ৪টি উৎসসহ টেক্সটবই: Nursing Fundamentals 2e (141), Nursing Skills 2e (214), Medical Terminology 2e (148), Nursing Mental Health & Community Concepts 2e (129), সর্বমোট ৬৩২টি উৎস-অধ্যায়।
- সাত বিষয়ের Study Coach, ৪১টি শেখার লক্ষ্য, পড়ার অগ্রগতি, নোট, ১/৩/৭ দিনের রিভিশন।
- মূল বইয়ের অধ্যায় সার্চ ও মূল উৎস-লিংক, প্রাথমিক MCQ।
- অফলাইন পাঠ: অ্যাপের ভেতর আগেই রাখা টেক্সটবই ও নোটে আলাদা ইন্টারনেট লাগে না। বাহ্যিক ওয়েববই/PDF ডাউনলোড ও নতুন AI সার্ভারে যোগাযোগে নেটওয়ার্ক লাগবে।

এই বইগুলো সহায়ক রেফারেন্স; নন্দিনীর ফরিদপুরের কলেজের নির্ধারিত প্রকাশনা বলে দাবি করা হচ্ছে না। মূল বইয়ের ছবি/চিত্র/উপকরণ টেক্সট সংস্করণে সম্পূর্ণ নেই।

## APK সংগ্রহ
1. GitHub repository → Actions → **Build Nandini Offline Android APK** → সর্বশেষ **সবুজ Success** run।
2. Artifacts অংশে `nandini-nursing-study-android-debug` ডাউনলোড করো।
3. Android-এ ZIP extract করে `app-debug.apk` চালাও।
4. ফোন চাইলে শুধু ঐ APK-এর জন্য **Install unknown apps** অনুমতি দাও, ইন্সটল শেষ হলে অনুমতি ফিরিয়ে নিতে পারো।

এটি ব্যক্তিগত পরীক্ষা করার **debug** APK, Play Store-এর production signed app নয়। উৎস যাচাই ছাড়া অন্য APK ইন্সটল করবে না। GitHub Actions artifact ৩০ দিনের জন্য রাখা হয়।

**আপডেট সতর্কতা:** GitHub-এর প্রত্যেকটি ephemeral debug build আলাদা signing key দিয়ে স্বাক্ষরিত হতে পারে। নতুন APK আগেরটার ওপর ইন্সটল না হলে পুরোনোটি আনইন্সটল করতে হতে পারে, এবং ঐ অ্যাপের লোকাল নোট/অগ্রগতি হারাতে পারে। গুরুত্বপূর্ণ নোট বাইরে আলাদা করে রেখে দাও। স্থায়ী distribution-এর জন্য পরে persistent release-signing প্রয়োজন।

## লোকাল AI সার্ভার যুক্ত করা (ঐচ্ছিক)
বই পড়ার জন্য API লাগে না। শুধু নিজের সার্ভারে AI চালু হলে:

1. অ্যাপে Study Coach → **AI Server সেটিংস**।
2. নিজের নিয়ন্ত্রিত HTTPS nursing tutor server-এর মূল URL সেভ করো (যেমন `https://nursing.example.com`)।
3. **সংযোগ পরীক্ষা** চাপো। সঠিক সার্ভারের `/healthz`-এ সাড়া পেতে হবে।
4. Study Coach-এ প্রশ্ন লিখে ব্যক্তিগত access code দিয়ে উত্তর চাও।

সার্ভারে `NANDINI_AI_PROVIDER=ollama`, `NANDINI_STUDENT_CODE` এবং অ্যান্ড্রয়েডের সুরক্ষিত cross-origin যোগাযোগের জন্য `NANDINI_ALLOW_ANDROID_ORIGIN=true` প্রয়োজন। এ সেটিং অনুমোদিত HTTPS proxy-র পেছনে মাত্র চালু করতে হবে। VPS-এ ইতিমধ্যেই চলমান কাজকে বিঘ্নিত করা যাবে না। বিস্তারিত `LOCAL_AI.md` ও `DEPLOYMENT.md`।

## মান যাচাই
GitHub-এর green CI ও browser smoke test কোড ও মোবাইল viewport যাচাই করে। নন্দিনীর নিজের Android ফোনে ইনস্টল, স্ক্রল, নোট, বই, ডাউনলোড ও AI পরীক্ষা না হওয়া পর্যন্ত **field verified** বলব না।

অ্যাপটি পড়াশোনার সহায়ক, রোগীর চিকিৎসার নির্দেশ নয়।
