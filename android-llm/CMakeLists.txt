# Builds libnandini_llm.so plus llama.cpp/ggml as shared libraries.
# LLAMA_DIR is llama.cpp from the pinned llama-cpp-python sdist (see scripts/add-local-llm.mjs).
cmake_minimum_required(VERSION 3.22.1)
project(nandini_llm C CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT LLAMA_DIR)
  set(LLAMA_DIR ${CMAKE_CURRENT_SOURCE_DIR}/llama.cpp)
endif()

set(BUILD_SHARED_LIBS ON CACHE BOOL "" FORCE)
set(LLAMA_BUILD_COMMON OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TOOLS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_CURL OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
# One CPU backend per ARM generation (armv8.0 … armv8.6); the best one is chosen at runtime,
# so older chips (e.g. Snapdragon 680) get a safe build and newer ones get dot-product kernels.
set(GGML_BACKEND_DL ON CACHE BOOL "" FORCE)
set(GGML_CPU_ALL_VARIANTS ON CACHE BOOL "" FORCE)
add_subdirectory(${LLAMA_DIR} llama-build)

add_library(nandini_llm SHARED nandini_llm.cpp)
target_link_libraries(nandini_llm PRIVATE llama ggml)
if(ANDROID)
  target_link_libraries(nandini_llm PRIVATE log)
else()
  find_package(JNI REQUIRED)
  target_include_directories(nandini_llm PRIVATE ${JNI_INCLUDE_DIRS})
endif()
