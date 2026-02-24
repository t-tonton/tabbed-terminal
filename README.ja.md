# Tabbed Terminal

Tauri + React で構築したデスクトップ向けターミナルワークスペースアプリです。

[English README](README.md)

## 主な機能

- 複数ワークスペース（タブ）
- タブのドラッグ＆ドロップによるワークスペース並び替え
- ワークスペースごとに複数ペイン
- ペインのリネーム / クローズ / リサイズ
- ペイングリッドサイズの切り替え（`3x3` / `4x4`）
- ネイティブのターミナルコピー＆ペースト（`Cmd/Ctrl + C`, `Cmd/Ctrl + V`）
- よく使うコマンド用の Snippets Picker
  - スニペットの保存 / 編集 / 削除
  - スニペット検索
  - コマンドをクリップボードへコピー
- Relay コマンド送信ウィンドウ
  - Tauri 実行時は独立ウィンドウとして表示
  - アクティブPaneから他Paneへコマンド送信（1Pane時は自Paneに送信）

## ショートカット

- `Cmd/Ctrl + T`: 新しいワークスペース
- `Cmd/Ctrl + W`: 現在のワークスペースを閉じる
- `Cmd/Ctrl + N`: 新しいペイン
- `Cmd/Ctrl + Shift + P`: Snippets Picker を開く
- `Cmd/Ctrl + Shift + G`: グリッド設定（`3x3` / `4x4`）を開く
- `Cmd/Ctrl + Shift + R`: Relay ウィンドウを開く
- `Cmd/Ctrl + F`: フォーカス中のPane内検索
- `Cmd/Ctrl + Shift + F`: ワークスペース内の全Pane履歴を横断検索
- `Cmd/Ctrl + 1..9`: 番号でワークスペース切り替え
- `Cmd/Ctrl + Shift + [` / `]`: 前 / 次のワークスペース
- `Cmd/Ctrl + =`, `-`, `0`: ズームイン / ズームアウト / リセット

## 既知の制限

- Snippets Picker は現状モーダル表示（表示中は背景操作をロック）
- スニペットは現時点ではローカルブラウザストレージに保存
- Vite のビルドで chunk-size warning が出る（リリースブロッカーではない）

## 前提環境

- Node.js `22.12+` または `24.x`（LTS推奨: `24.x`）
- npm `10+`
- Tauri のビルド/チェック用に Rust toolchain（`cargo`）

## 開発

```bash
npm install
npm run tauri dev
```

## ビルド

```bash
npm run build
npm run tauri build
```

## 品質ゲート

```bash
npm run lint
npm run test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Issue 報告

- 不具合報告 / 機能要望は以下の Issue からお願いします。
  - `https://github.com/t-tonton/tabbed-terminal/issues`

## コントリビューションガイド

ブランチ戦略・PRルール・マージ方針は `CONTRIBUTING.md` を参照してください。
