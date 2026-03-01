use serde::Serialize;
use std::cmp::Ordering;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileTreeNode>>,
}

#[derive(Serialize)]
pub struct FileTreeResponse {
    pub root: FileTreeNode,
}

fn is_hidden_name(name: &str) -> bool {
    name.starts_with('.')
}

fn should_skip_name(name: &str, include_hidden: bool, excludes: &HashSet<&str>) -> bool {
    (!include_hidden && is_hidden_name(name)) || excludes.contains(name)
}

fn resolve_root_path(root_path: Option<String>) -> Result<PathBuf, String> {
    let selected = match root_path {
        Some(raw) if !raw.trim().is_empty() => PathBuf::from(raw),
        _ => match std::env::var("HOME") {
            Ok(home) => PathBuf::from(home),
            Err(_) => std::env::current_dir().map_err(|e| e.to_string())?,
        },
    };

    if !selected.exists() {
        return Err(format!("Path does not exist: {}", selected.to_string_lossy()));
    }

    if selected.is_file() {
        if let Some(parent) = selected.parent() {
            return Ok(parent.to_path_buf());
        }
    }

    Ok(selected)
}

fn build_node(
    path: &Path,
    depth: usize,
    max_depth: usize,
    include_hidden: bool,
    excludes: &HashSet<&str>,
) -> Result<FileTreeNode, String> {
    let metadata = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    let is_dir = metadata.is_dir();
    let name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    let mut node = FileTreeNode {
        name,
        path: path.to_string_lossy().to_string(),
        is_dir,
        children: None,
    };

    if !is_dir || depth >= max_depth {
        return Ok(node);
    }

    let mut entries: Vec<PathBuf> = fs::read_dir(path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok().map(|ok| ok.path()))
        .filter(|entry_path| {
            let name = entry_path
                .file_name()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();
            !should_skip_name(&name, include_hidden, excludes)
        })
        .collect();

    entries.sort_by(|a, b| {
        let a_name = a
            .file_name()
            .map(|value| value.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        let b_name = b
            .file_name()
            .map(|value| value.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        let a_dir = a.is_dir();
        let b_dir = b.is_dir();

        match (a_dir, b_dir) {
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            _ => a_name.cmp(&b_name),
        }
    });

    let mut children = Vec::new();
    for entry in entries {
        if let Ok(child) = build_node(&entry, depth + 1, max_depth, include_hidden, excludes) {
            children.push(child);
        }
    }

    node.children = Some(children);
    Ok(node)
}

#[tauri::command]
pub fn list_file_tree(
    root_path: Option<String>,
    max_depth: Option<usize>,
    include_hidden: Option<bool>,
) -> Result<FileTreeResponse, String> {
    let root = resolve_root_path(root_path)?;
    let depth = max_depth.unwrap_or(3).clamp(1, 6);
    let include_hidden = include_hidden.unwrap_or(false);
    let excludes: HashSet<&str> = HashSet::from([
        ".git",
        "node_modules",
        "target",
        "dist",
        "build",
        ".next",
        ".cache",
    ]);

    let root_node = build_node(&root, 0, depth, include_hidden, &excludes)?;
    Ok(FileTreeResponse { root: root_node })
}
