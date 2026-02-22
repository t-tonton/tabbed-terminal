# Tabbed Terminal

Tauri + React で構築したデスクトップ向けターミナルワークスペースアプリです。

[English README](README.md)

## 主な機能

- 複数ワークスペース（タブ）
- タブのドラッグ＆ドロップによるワークスペース並び替え
- ワークスペースごとに複数ペイン
- ペインのリネーム / クローズ / リサイズ
- ネイティブのターミナルコピー＆ペースト（`Cmd/Ctrl + C`, `Cmd/Ctrl + V`）
- よく使うコマンド用の Snippets Picker
  - スニペットの保存 / 編集 / 削除
  - スニペット検索
  - コマンドをクリップボードへコピー

## ショートカット

- `Cmd/Ctrl + T`: 新しいワークスペース
- `Cmd/Ctrl + W`: 現在のワークスペースを閉じる
- `Cmd/Ctrl + N`: 新しいペイン
- `Cmd/Ctrl + S`: 現在のワークスペース状態を保存
- `Cmd/Ctrl + Shift + P`: Snippets Picker を開く
- `Cmd/Ctrl + F`: フォーカス中のPane内検索
- `Cmd/Ctrl + Shift + F`: ワークスペース内の全Pane履歴を横断検索
- `Cmd/Ctrl + 1..9`: 番号でワークスペース切り替え
- `Cmd/Ctrl + Shift + [` / `]`: 前 / 次のワークスペース
- `Cmd/Ctrl + =`, `-`, `0`: ズームイン / ズームアウト / リセット

## 既知の制限

- サイドバーは現時点で利用中の機能のみ表示（検索 / 新規Pane / Snippets）
- Snippets Picker は現状モーダル表示（表示中は背景操作をロック）
- スニペットは現時点ではローカルブラウザストレージに保存
- ワークスペース保存/復元は現時点で localStorage ベース（Tauri fs 化は今後対応）
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
