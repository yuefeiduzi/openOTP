fn main() {
    tauri_build::build();

    // The biometric bridge is Swift, and libswift_Concurrency is the one Swift
    // runtime dylib the linker records as `@rpath/libswift_Concurrency.dylib`
    // (the rest are absolute `/usr/lib/swift` paths). apple-localauthentication
    // asks for that rpath in its own build script, but Cargo does not propagate
    // a library's link-args to the final binary, so the only rpath left came
    // from the local toolchain — `/Library/Developer/CommandLineTools/...` here,
    // nothing at all on the CI runner. Without a copy of the dylib on that path
    // dyld aborts the process before main: the test binary failed on CI with
    // "Library not loaded: @rpath/libswift_Concurrency.dylib", and the app would
    // do the same on a Mac without Xcode or the Command Line Tools.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");
    }
}
