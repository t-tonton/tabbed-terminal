# Agent Tab - 開発進捗まとめ

## 概要

Tauri v2 + React + TypeScript + Tailwind で構築する「タブ付きマルチペイン AI ターミナル IDE」

---

## 実装済み機能

### 1. 基本レイアウト
- **AppLayout**: メインレイアウト（左サイドバー + タブバー + コンテンツエリア）
- **IconSidebar**: 左サイドバーのアイコンメニュー（VSCode風の縦並び）
- **TabBar**: ワークスペースタブの管理

### 2. ワークスペース管理
- ワークスペースの作成・削除・切り替え
- テンプレートからの作成（Blank, New Product, Maintenance, Spike）
- タブのドラッグ&ドロップによる並び替え

### 3. ペイン管理
- **3x3 グリッドレイアウト**: CSS Grid による配置
- **ペインの追加・削除・複製**
- **ドラッグ&ドロップ**: ペイン同士の位置交換
- **空セルへの移動**: 空いているグリッドセルにペインをドロップ可能
- **リサイズ機能**:
  - 右端・下端・角からのドラッグでサイズ変更
  - 他のペインを押し出すプッシュ機能（右方向・下方向）
  - 衝突検出でオーバーラップ防止
- **レイアウトバリデーション**: グリッド境界を超えないよう自動補正

### 4. ターミナル機能
- **xterm.js + FitAddon**: 本格的なターミナルエミュレーション
- **PTY (portable-pty)**: Rust バックエンドでシェル実行
- **フォントサイズ調整**: Cmd+/- でズームイン・アウト、Cmd+0 でリセット
- **自動リサイズ**: ペインサイズ変更時にターミナルも追従
- **スクロールバック**: 10000行の履歴保持

### 5. キーボードショートカット
| ショートカット | 機能 |
|---------------|------|
| Cmd+T | 新規ワークスペース |
| Cmd+W | ワークスペースを閉じる |
| Cmd+N | 新規ペイン |
| Cmd+1-9 | タブ切り替え |
| Cmd+Shift+]/[ | 次/前のタブ |
| Ctrl+Tab | 次のタブ |
| Cmd+= / Cmd+- | ズームイン/アウト |
| Cmd+0 | ズームリセット |

### 6. 状態管理 (Zustand)
- **workspacesSlice**: ワークスペース管理
- **panesSlice**: ペイン管理（CRUD, レイアウト更新）
- **settingsSlice**: 設定（フォントサイズ、APIキーなど）

---

## アーキテクチャ

```
src/
├── components/
│   └── layout/
│       ├── AppLayout.tsx      # メインレイアウト
│       ├── IconSidebar.tsx    # 左サイドバー
│       └── TabBar.tsx         # タブバー
├── features/
│   ├── panes/
│   │   └── components/
│   │       ├── Pane.tsx       # ペインコンテナ
│   │       └── Terminal.tsx   # ターミナル (xterm.js)
│   └── workspaces/
│       └── components/
│           └── WorkspaceContainer.tsx  # グリッドレイアウト + D&D
├── stores/
│   ├── appStore.ts            # Zustand ストア統合
│   └── slices/
│       ├── workspacesSlice.ts
│       ├── panesSlice.ts
│       └── settingsSlice.ts
├── hooks/
│   └── useKeyboardShortcuts.ts
├── types/
│   └── index.ts
└── utils/
    ├── index.ts
    └── templates.ts           # ワークスペーステンプレート

src-tauri/
└── src/
    ├── main.rs
    ├── lib.rs
    └── pty.rs                 # PTY管理（spawn, write, resize, kill）
```

### 主要ライブラリ
- **@dnd-kit/core, @dnd-kit/sortable**: ドラッグ&ドロップ
- **@xterm/xterm, @xterm/addon-fit**: ターミナルエミュレーション
- **zustand**: 状態管理
- **portable-pty** (Rust): PTY管理

---

## 開発・デバッグ・ビルド

### 前提条件

```bash
# Node.js (v18+)
node -v

# Rust
rustc --version
cargo --version

# Tauri CLI
cargo install tauri-cli
```

### 起動方法

#### 開発モード（ホットリロード付き）

```bash
npm run tauri dev
```

- フロントエンド: Vite dev server (ホットリロード)
- バックエンド: Rust (変更時に自動再ビルド)
- DevTools: アプリ内で右クリック → 「Inspect」または Cmd+Option+I

#### フロントエンドのみ（ブラウザ）

```bash
npm run dev
```

- `http://localhost:5173` でアクセス
- Tauri API は動作しない（PTY など）
- UIの確認・スタイリングに便利

### デバッグ方法

#### フロントエンド (React)

1. **DevTools Console**
   - アプリ内で Cmd+Option+I
   - `console.log` でデバッグ出力

2. **React Developer Tools**
   - Chrome拡張をインストール
   - DevTools の「Components」タブでコンポーネント状態確認

3. **Zustand DevTools**
   ```typescript
   // stores/appStore.ts で devtools ミドルウェアを有効化
   import { devtools } from 'zustand/middleware';
   ```

#### バックエンド (Rust)

1. **println! マクロ**
   ```rust
   println!("Debug: {:?}", value);
   ```
   - ターミナルに出力される

2. **Tauri ログ**
   ```rust
   use log::{info, error, debug};
   info!("PTY spawned: {}", id);
   ```

3. **VSCode + rust-analyzer**
   - ブレークポイント設定可能
   - `launch.json` で Tauri アプリをデバッグ構成

#### ログ確認

```bash
# macOS - アプリログ
tail -f ~/Library/Logs/agent-tab/agent-tab.log

# 開発時はターミナルに直接出力される
```

### ビルド方法

#### 開発ビルド（型チェック）

```bash
# TypeScript 型チェック + Vite ビルド
npm run build
```

#### プロダクションビルド

```bash
# macOS .app / .dmg 生成
npm run tauri build

# 出力先
# src-tauri/target/release/bundle/
#   ├── macos/Agent Tab.app
#   └── dmg/Agent Tab_x.x.x_aarch64.dmg
```

#### プラットフォーム別ビルド

```bash
# macOS (Intel)
npm run tauri build -- --target x86_64-apple-darwin

# macOS (Apple Silicon)
npm run tauri build -- --target aarch64-apple-darwin

# Universal Binary
npm run tauri build -- --target universal-apple-darwin
```

### トラブルシューティング

#### PTY が起動しない

```bash
# Rust 依存関係を再ビルド
cd src-tauri
cargo clean
cargo build
```

#### ホットリロードが効かない

```bash
# node_modules を再インストール
rm -rf node_modules
npm install
```

#### ビルドエラー

```bash
# キャッシュクリア
rm -rf src-tauri/target
rm -rf dist
npm run tauri build
```

### 便利なスクリプト

```bash
# package.json に追加可能
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "lint": "eslint src --ext ts,tsx",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 残りのTODO

### 高優先度

#### 1. ペイン間コマンド送信機能 (バックログ #1)
- AIチャットペインからターミナルペインにコマンドを送信
- `invoke('pty_write', { id: targetPaneId, data: command })` を活用
- ターゲットペイン選択UI
- **用途**: AIが提案したコードをターミナルで実行

#### 2. ペインタイプの追加
- 現在: Terminal のみ
- 追加予定:
  - **Chat**: Claude API と連携したチャットペイン
  - **Editor**: コード/テキストエディタ
  - **Preview**: マークダウンプレビューなど

#### 3. Claude API 統合
- API キー設定UI + セキュア保存（Tauri secure storage）
- Claude API クライアント実装
- システムプロンプト + コンテキスト管理
- ストリーミングレスポンス対応

### 中優先度

#### 4. 永続化
- Tauri fs plugin でワークスペース状態をJSON保存
- 起動時の自動復元
- Cmd+S で手動保存

#### 5. サイドパネル機能
- ファイルエクスプローラー
- 検索パネル
- Git 統合
- 設定パネル

#### 6. UX改善
- Dirty インジケーター（未保存マーク）
- 確認ダイアログ（閉じる前の確認）
- エラーハンドリング・通知

### 低優先度

#### 7. その他
- プロジェクトコンテキスト管理
- テーマカスタマイズ
- プラグインシステム
- マルチウィンドウ対応

---

## 最近の修正履歴

1. **ターミナル高さ問題の修正**
   - xterm CSS に `height: 100%` 追加
   - Pane コンポーネントで absolute positioning 使用
   - ResizeObserver で複数回 fit() 呼び出し

2. **ペインリサイズ時のオーバーラップ修正**
   - 衝突検出ロジック追加
   - プッシュ機能で他ペインを押し出し

3. **空セルへのドロップ機能**
   - EmptyCell コンポーネント（useDroppable）
   - 境界チェックと自動位置調整

4. **レイアウトバリデーション**
   - updatePaneLayouts でグリッド境界を超えないよう補正

---

## 実行コマンド

```bash
# 開発
npm run tauri dev

# ビルド
npm run tauri build

# 型チェック
npm run build
```

---

## 次のステップ

1. 左サイドバーのアイコン調整（余白追加）を完了
2. ペイン間コマンド送信機能の実装に着手
3. Chat ペインタイプの追加
