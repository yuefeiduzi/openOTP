#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  openotp_lib::run();
}
