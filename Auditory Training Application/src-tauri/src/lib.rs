// src-tauri/src/lib.rs

pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Build and attach application menu
        .setup(|app| {
            use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

            // View → Toggle Sidebar (CmdOrCtrl+B)
            let toggle_sidebar = MenuItemBuilder::new("Toggle Sidebar")
                .id("toggle_sidebar")
                .accelerator("CmdOrCtrl+B")
                .build(app)?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .items(&[&toggle_sidebar])
                .build()?;

            let app_menu = MenuBuilder::new(app)
                .items(&[&view_menu])
                .build()?;

            // Attach the menu to the app
            app.set_menu(app_menu).expect("failed to set app menu");
            Ok(())
        })
        // Keep the existing invoke handler registrations
        .invoke_handler(tauri::generate_handler![
            commands::fs::fs_bank_dir,
            commands::fs::fs_write_text,
            commands::fs::fs_read_text,
            commands::fs::fs_read_dir,
            commands::fs::fs_remove,
            commands::fs::fs_exists
        ])
        // Handle menu clicks and broadcast an event to the frontend
        .on_menu_event(|app, event| {
            if event.id() == "toggle_sidebar" {
                // Emit to all windows
                #[allow(unused_imports)]
                use tauri::Emitter;
                let _ = app.emit("toggle-sidebar", true);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}