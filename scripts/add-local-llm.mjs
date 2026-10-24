// Adds the on-device LLM (llama.cpp + NandiniLlm Capacitor plugin) to the generated android/ project.
// Run after `npx cap add android && npx cap sync android`. llama.cpp comes from the pinned
// llama-cpp-python sdist on PyPI (same source the desktop evaluation used), checked by SHA-256.
import {mkdir,cp,readFile,writeFile,rm,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join,basename,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const SDIST={url:'https://files.pythonhosted.org/packages/e4/b4/c8cd17629ced0b9644a71d399a91145aedef109c0333443bef015e45b704/llama_cpp_python-0.3.16.tar.gz',
 sha256:'34ed0f9bd9431af045bb63d9324ae620ad0536653740e9bb163a2e1fcb973be6',dir:'llama_cpp_python-0.3.16'};
const app='android/app/src/main';
const cppDir=join(app,'cpp');
const javaDir=join(app,'java/ai/nandini/nursingstudy');

const res=await fetch(SDIST.url);if(!res.ok)throw Error('llama.cpp source download failed: '+res.status);
const tarball=Buffer.from(await res.arrayBuffer());
const digest=createHash('sha256').update(tarball).digest('hex');
if(digest!==SDIST.sha256)throw Error('llama.cpp source checksum mismatch: '+digest);
const work=join(tmpdir(),'nandini-llama');await rm(work,{recursive:true,force:true});await mkdir(work,{recursive:true});
await writeFile(join(work,'src.tar.gz'),tarball);
execFileSync('tar',['-xzf','src.tar.gz',SDIST.dir+'/vendor/llama.cpp'],{cwd:work});

await rm(cppDir,{recursive:true,force:true});await mkdir(cppDir,{recursive:true});
await cp(join(work,SDIST.dir,'vendor/llama.cpp'),join(cppDir,'llama.cpp'),{recursive:true});
await cp('android-llm/CMakeLists.txt',join(cppDir,'CMakeLists.txt'));
await cp('android-llm/nandini_llm.cpp',join(cppDir,'nandini_llm.cpp'));
await mkdir(join(javaDir,'llm'),{recursive:true});
for(const f of await readdir('android-llm/java/ai/nandini/nursingstudy/llm'))await cp(join('android-llm/java/ai/nandini/nursingstudy/llm',f),join(javaDir,'llm',f));

// Register the local plugin (Capacitor only auto-registers npm plugins).
const mainActivity=join(javaDir,'MainActivity.java');
if(!(await readFile(mainActivity,'utf8')).includes('class MainActivity'))throw Error('unexpected MainActivity');
await writeFile(mainActivity,`package ai.nandini.nursingstudy;

import android.os.Bundle;
import ai.nandini.nursingstudy.llm.NandiniLlmPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NandiniLlmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);

// Native build: arm64 only, Release-optimised even in debug APKs, and the per-CPU ggml libraries
// extracted to nativeLibraryDir so ggml can pick the right one at runtime.
const ndk=process.env.ANDROID_NDK_LATEST_HOME?basename(process.env.ANDROID_NDK_LATEST_HOME):'';
// One fixed debug key for every build: Android refuses to install an APK signed with another key over the
// old app, and uninstalling would delete the 2.4 GB downloaded model. (A personal-testing key, not a secret.)
const keystore=resolve('android-signing/debug.keystore');await stat(keystore);
const gradlePath='android/app/build.gradle';
let gradle=await readFile(gradlePath,'utf8');
if(gradle.includes('nandini_llm'))throw Error('build.gradle already patched');
gradle+=`
// nandini_llm: on-device LLM (added by scripts/add-local-llm.mjs)
android {
${ndk?`    ndkVersion "${ndk}"\n`:''}    defaultConfig {
        ndk { abiFilters "arm64-v8a" }
        externalNativeBuild {
            cmake {
                arguments "-DANDROID_STL=c++_shared", "-DCMAKE_BUILD_TYPE=Release"
            }
        }
    }
    externalNativeBuild {
        cmake { path "src/main/cpp/CMakeLists.txt" }
    }
    packagingOptions {
        jniLibs { useLegacyPackaging = true }
    }
    signingConfigs {
        debug {
            storeFile file("${keystore}")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
}
`;
await writeFile(gradlePath,gradle);
console.log(JSON.stringify({status:'local_llm_added',llama:SDIST.dir,ndk:ndk||'(default)'}));
