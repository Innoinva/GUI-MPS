use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager}; // ← Manager brings `.path()` into scope

fn bank_root(app: &AppHandle) -> Result<PathBuf, String> {
    // Windows: %APPDATA%/com.innoinva.auditory-training-app/AuditoryTraining/SoundBank
    // macOS:   ~/Library/Application Support/com.innoinva.auditory-training-app/AuditoryTraining/SoundBank
    // Linux:   ~/.config/com.innoinva.auditory-training-app/AuditoryTraining/SoundBank
    let base = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(base.join("AuditoryTraining").join("SoundBank"))
}

#[tauri::command]
pub fn fs_bank_dir(app: AppHandle) -> Result<String, String> {
    let root = bank_root(&app)?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    Ok(root.to_string_lossy().into())
}

#[tauri::command]
pub fn fs_write_text(app: AppHandle, rel_path: String, contents: String) -> Result<(), String> {
    let root = bank_root(&app)?;
    let path = root.join(rel_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_read_text(app: AppHandle, rel_path: String) -> Result<String, String> {
    let root = bank_root(&app)?;
    let path = root.join(rel_path);
    let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(data)
}

#[tauri::command]
pub fn fs_read_dir(app: AppHandle, rel_dir: String) -> Result<Vec<String>, String> {
    let root = bank_root(&app)?;
    let dir = root.join(rel_dir);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_type().map_err(|e| e.to_string())?.is_file() {
            if let Some(name) = entry.file_name().to_str() {
                out.push(name.to_string());
            }
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn fs_remove(app: AppHandle, rel_path: String) -> Result<(), String> {
    let root = bank_root(&app)?;
    let path = root.join(rel_path);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn fs_exists(app: AppHandle, rel_path: String) -> Result<bool, String> {
    let root = bank_root(&app)?;
    let path = root.join(rel_path);
    Ok(path.exists())
}