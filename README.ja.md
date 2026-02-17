# Tabbed Terminal

Tauri + React で構築したデスクトップ向けターミナルワークスペースアプリです。

[English README](README.md)

## 主な機能

- 複数ワークスペース（タブ）
- ワークスペースごとに複数パネル
- パネルのリネーム / クローズ / リサイズ
- ネイティブのターミナルコピー＆ペースト（`Cmd/Ctrl + C`, `Cmd/Ctrl + V`）
- よく使うコマンド用の Snippets Picker
  - スニペットの保存 / 編集 / 削除
  - スニペット検索
  - コマンドをクリップボードへコピー

## ショートカット

- `Cmd/Ctrl + T`: 新しいワークスペース
- `Cmd/Ctrl + W`: 現在のワークスペースを閉じる
- `Cmd/Ctrl + N`: 新しいパネル
- `Cmd/Ctrl + Shift + P`: Snippets Picker を開く
- `Cmd/Ctrl + F`: フォーカス中のPane内検索
- `Cmd/Ctrl + 1..9`: 番号でワークスペース切り替え
- `Cmd/Ctrl + Shift + [` / `]`: 前 / 次のワークスペース
- `Cmd/Ctrl + =`, `-`, `0`: ズームイン / ズームアウト / リセット

## 既知の制限

- Snippets Picker は現状モーダル表示（表示中は背景操作をロック）
- スニペットは現時点ではローカルブラウザストレージに保存
- Vite のビルドで chunk-size warning が出る（リリースブロッカーではない）

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

- 公開後の不具合報告 / 機能要望はこのリポジトリで管理します。
- 内部フェーズ中のリリース作業は別途管理します。

## コントリビューションガイド

ブランチ戦略・PRルール・マージ方針は `CONTRIBUTING.md` を参照してください。
